const pdfParse = require('pdf-parse');
const axios = require('axios');
const cheerio = require('cheerio');

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
      console.log('📄 [PDF] Starting PDF parsing...');
      console.log('📄 [PDF] Buffer size:', (pdfBuffer.length / 1024).toFixed(2), 'KB');
      
      const data = await pdfParse(pdfBuffer);
      
      console.log('✅ [PDF] Parsed successfully!');
      console.log('📄 [PDF] Pages:', data.numpages);
      console.log('📄 [PDF] Text length:', data.text.length, 'characters');
      
      return {
        text: data.text,
        pageCount: data.numpages,
        metadata: {
          info: data.info,
          metadata: data.metadata
        }
      };
    } catch (error) {
      console.error('Error parsing PDF:', error);
      throw new Error('Failed to parse PDF file');
    }
  }

  /**
   * Scrape text content from URL
   */
  async extractTextFromURL(url) {
    try {
      console.log('🌐 [URL] Starting URL scraping:', url);
      
      // Validate URL
      const urlObj = new URL(url);
      if (!['http:', 'https:'].includes(urlObj.protocol)) {
        throw new Error('Invalid URL protocol');
      }

      console.log('🌐 [URL] Fetching webpage...');
      // Fetch webpage
      const response = await axios.get(url, {
        timeout: 30000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        },
        maxRedirects: 5
      });

      // Parse HTML
      const $ = cheerio.load(response.data);

      // Remove script and style tags
      $('script, style, nav, footer, header, aside').remove();

      // Extract text from main content
      let text = '';
      
      // Try to find main content
      const mainSelectors = [
        'main',
        'article',
        '[role="main"]',
        '.content',
        '.main-content',
        '#content',
        'body'
      ];

      for (const selector of mainSelectors) {
        const element = $(selector).first();
        if (element.length) {
          text = element.text();
          break;
        }
      }

      // Clean up text
      text = text
        .replace(/\s+/g, ' ')
        .replace(/\n+/g, '\n')
        .trim();

      if (!text || text.length < 100) {
        throw new Error('Insufficient content extracted from URL');
      }

      // Get title
      const title = $('title').text() || 
                   $('h1').first().text() || 
                   $('meta[property="og:title"]').attr('content') || 
                   'Untitled';

      console.log('✅ [URL] Scraped successfully!');
      console.log('🌐 [URL] Title:', title.trim());
      console.log('🌐 [URL] Text length:', text.length, 'characters');
      
      return {
        text,
        title: title.trim(),
        url,
        scrapedAt: new Date()
      };
    } catch (error) {
      console.error('Error scraping URL:', error);
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
        // Save current chunk
        chunks.push({
          text: currentChunk.trim(),
          size: currentSize
        });

        // Start new chunk with overlap
        const overlapText = currentChunk.slice(-overlap);
        currentChunk = overlapText + '\n\n' + paragraph;
        currentSize = overlapText.length + paragraphSize;
      } else {
        currentChunk += (currentChunk ? '\n\n' : '') + paragraph;
        currentSize += paragraphSize;
      }
    }

    // Add last chunk
    if (currentChunk) {
      chunks.push({
        text: currentChunk.trim(),
        size: currentSize
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

    // Split into chunks
    const chunks = this.splitIntoChunks(
      extractedData.text,
      options.chunkSize || 1000,
      options.overlap || 200
    );

    return {
      text: extractedData.text,
      chunks,
      metadata: {
        pageCount: extractedData.pageCount,
        title: extractedData.title,
        url: extractedData.url,
        scrapedAt: extractedData.scrapedAt,
        chunkCount: chunks.length
      }
    };
  }
}

module.exports = new DocumentProcessorService();
