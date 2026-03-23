const pdfParse = require('pdf-parse');
const axios = require('axios');
const cheerio = require('cheerio');
const logger = require('../utils/logger').child({ module: 'services/documentProcessorService' });

/**
 * Document Processing Service
 * Handles PDF parsing and URL scraping
 */
class DocumentProcessorService {
  /**
   * Extract text from PDF buffer
   */
  async extractTextFromPDF(pdfBuffer) {
    try {
      logger.info({
        sizeBytes: pdfBuffer.length,
        sizeKb: Number((pdfBuffer.length / 1024).toFixed(2)),
      }, 'Starting PDF parsing');

      const data = await pdfParse(pdfBuffer);

      logger.info({
        pageCount: data.numpages,
        textLength: data.text.length,
      }, 'PDF parsed successfully');

      return {
        text: data.text,
        pageCount: data.numpages,
        metadata: {
          info: data.info,
          metadata: data.metadata,
        },
      };
    } catch (error) {
      logger.error({ err: error }, 'Error parsing PDF');
      throw new Error('Failed to parse PDF file');
    }
  }

  /**
   * Scrape text content from URL
   */
  async extractTextFromURL(url) {
    try {
      logger.info({ url }, 'Starting URL scraping');

      const urlObj = new URL(url);
      if (!['http:', 'https:'].includes(urlObj.protocol)) {
        throw new Error('Invalid URL protocol');
      }

      const response = await axios.get(url, {
        timeout: 30000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
        maxRedirects: 5,
      });

      const $ = cheerio.load(response.data);
      $('script, style, nav, footer, header, aside').remove();

      let text = '';
      const mainSelectors = [
        'main',
        'article',
        '[role="main"]',
        '.content',
        '.main-content',
        '#content',
        'body',
      ];

      for (const selector of mainSelectors) {
        const element = $(selector).first();
        if (element.length) {
          text = element.text();
          break;
        }
      }

      text = text
        .replace(/\s+/g, ' ')
        .replace(/\n+/g, '\n')
        .trim();

      if (!text || text.length < 100) {
        throw new Error('Insufficient content extracted from URL');
      }

      const title = $('title').text()
        || $('h1').first().text()
        || $('meta[property="og:title"]').attr('content')
        || 'Untitled';

      logger.info({
        url,
        title: title.trim(),
        textLength: text.length,
      }, 'URL scraped successfully');

      return {
        text,
        title: title.trim(),
        url,
        scrapedAt: new Date(),
      };
    } catch (error) {
      logger.error({ err: error, url }, 'Error scraping URL');
      if (error.response) {
        throw new Error(`Failed to fetch URL: ${error.response.status} ${error.response.statusText}`);
      }
      throw new Error(error.message || 'Failed to scrape URL');
    }
  }

  /**
   * Split text into chunks for embeddings
   * Uses overlapping chunks for better context
   */
  splitIntoChunks(text, chunkSize = 1000, overlap = 200) {
    const chunks = [];
    const paragraphs = text.split(/\n\n+/);

    let currentChunk = '';
    let currentSize = 0;

    for (const paragraph of paragraphs) {
      const paragraphSize = paragraph.length;

      if (currentSize + paragraphSize > chunkSize && currentChunk) {
        chunks.push({
          text: currentChunk.trim(),
          size: currentSize,
        });

        const overlapText = currentChunk.slice(-overlap);
        currentChunk = `${overlapText}\n\n${paragraph}`;
        currentSize = overlapText.length + paragraphSize;
      } else {
        currentChunk += `${currentChunk ? '\n\n' : ''}${paragraph}`;
        currentSize += paragraphSize;
      }
    }

    if (currentChunk) {
      chunks.push({
        text: currentChunk.trim(),
        size: currentSize,
      });
    }

    return chunks;
  }

  /**
   * Process document and prepare for RAG
   */
  async processDocument(source, type, options = {}) {
    let extractedData;

    if (type === 'pdf') {
      if (!Buffer.isBuffer(source)) {
        throw new Error('PDF source must be a Buffer');
      }
      extractedData = await this.extractTextFromPDF(source);
    } else if (type === 'url') {
      if (typeof source !== 'string') {
        throw new Error('URL source must be a string');
      }
      extractedData = await this.extractTextFromURL(source);
    } else {
      throw new Error('Invalid document type');
    }

    const chunks = this.splitIntoChunks(
      extractedData.text,
      options.chunkSize || 1000,
      options.overlap || 200,
    );

    return {
      text: extractedData.text,
      chunks,
      metadata: {
        pageCount: extractedData.pageCount,
        title: extractedData.title,
        url: extractedData.url,
        scrapedAt: extractedData.scrapedAt,
        chunkCount: chunks.length,
      },
    };
  }
}

module.exports = new DocumentProcessorService();
