const { Client } = require('minio');
const dns = require('dns');
const logger = require('../utils/logger').child({ module: 'services/minioService' });

// Force IPv4 DNS resolution to avoid IPv6 issues in Docker
dns.setDefaultResultOrder('ipv4first');

class MinioService {
  constructor() {
    this.userMediaBucket = 'user-media';
    this.messageMediaBucket = 'message-media';
    this.chatbotDocumentsBucket = 'chatbot-documents';
    this.client = new Client({
      endPoint: process.env.MINIO_ENDPOINT || 'minio',
      port: parseInt(process.env.MINIO_PORT, 10) || 9000,
      useSSL: process.env.MINIO_USE_SSL === 'true' || false,
      accessKey: process.env.MINIO_ACCESS_KEY || 'minioadmin',
      secretKey: process.env.MINIO_SECRET_KEY || 'minioadmin',
    });

    setTimeout(() => this.initializeBuckets(), 5000);
  }

  async initializeBuckets() {
    try {
      const userBucketExists = await this.client.bucketExists(this.userMediaBucket);
      const messageBucketExists = await this.client.bucketExists(this.messageMediaBucket);
      const chatbotBucketExists = await this.client.bucketExists(this.chatbotDocumentsBucket);

      const bucketStates = [
        { bucket: this.userMediaBucket, exists: userBucketExists },
        { bucket: this.messageMediaBucket, exists: messageBucketExists },
        { bucket: this.chatbotDocumentsBucket, exists: chatbotBucketExists },
      ];

      bucketStates.forEach(({ bucket, exists }) => {
        logger[exists ? 'info' : 'warn']({ bucket }, exists ? 'MinIO bucket ready' : 'MinIO bucket not found');
      });
    } catch (error) {
      logger.error({ err: error }, 'MinIO connection failed');
    }
  }

  async uploadAvatar(userId, fileBuffer, fileName, mimeType) {
    try {
      const fileExtension = fileName.split('.').pop();
      const objectName = `${userId}/avatar.${fileExtension}`;

      logger.info({
        userId: userId.toString(),
        fileName,
        mimeType,
        sizeBytes: fileBuffer.length,
        bucket: this.userMediaBucket,
        objectName,
      }, 'Uploading avatar to MinIO');

      const metaData = {
        'Content-Type': mimeType,
        'Cache-Control': 'max-age=86400',
      };

      await this.client.putObject(
        this.userMediaBucket,
        objectName,
        fileBuffer,
        fileBuffer.length,
        metaData,
      );

      const publicUrl = `/minio/${this.userMediaBucket}/${objectName}`;
      logger.info({
        userId: userId.toString(),
        bucket: this.userMediaBucket,
        objectName,
        publicUrl,
      }, 'Avatar uploaded to MinIO');

      return {
        success: true,
        url: publicUrl,
        objectName,
      };
    } catch (error) {
      logger.error({ err: error, userId, fileName }, 'Error uploading avatar to MinIO');
      throw new Error('Failed to upload avatar');
    }
  }

  async deleteAvatar(userId) {
    try {
      const objectsList = [];
      const stream = this.client.listObjects(this.userMediaBucket, `${userId}/`, false);

      for await (const obj of stream) {
        objectsList.push(obj.name);
      }

      if (objectsList.length > 0) {
        await this.client.removeObjects(this.userMediaBucket, objectsList);
      }

      logger.info({
        userId: userId.toString(),
        deletedCount: objectsList.length,
      }, 'Deleted avatar objects from MinIO');

      return { success: true };
    } catch (error) {
      logger.error({ err: error, userId }, 'Error deleting avatar from MinIO');
      throw new Error('Failed to delete avatar');
    }
  }

  async getAvatarUrl(userId, fileName) {
    try {
      const objectName = `${userId}/${fileName}`;
      await this.client.statObject(this.userMediaBucket, objectName);
      return `/minio/${this.userMediaBucket}/${objectName}`;
    } catch (error) {
      logger.error({ err: error, userId, fileName }, 'Error getting avatar URL');
      return null;
    }
  }

  /**
   * Upload message attachment (file, image, document, etc.)
   */
  async uploadMessageMedia(userId, fileBuffer, fileName, mimeType) {
    try {
      const timestamp = Date.now();
      const sanitizedFileName = fileName.replace(/[\/\\:*?"<>|]/g, '_');
      const objectName = `${userId}/${timestamp}-${sanitizedFileName}`;
      const encodedFileName = encodeURIComponent(fileName);
      const metaData = {
        'Content-Type': mimeType,
        'Content-Disposition': `inline; filename*=UTF-8''${encodedFileName}`,
      };

      logger.info({
        userId: userId.toString(),
        bucket: this.messageMediaBucket,
        fileName,
        mimeType,
        sizeBytes: fileBuffer.length,
        objectName,
      }, 'Uploading message media to MinIO');

      await this.client.putObject(
        this.messageMediaBucket,
        objectName,
        fileBuffer,
        fileBuffer.length,
        metaData,
      );

      const publicUrl = `/minio/${this.messageMediaBucket}/${objectName}`;
      logger.info({
        userId: userId.toString(),
        bucket: this.messageMediaBucket,
        objectName,
        publicUrl,
      }, 'Message media uploaded to MinIO');

      return {
        success: true,
        url: publicUrl,
        objectName,
        fileName,
        mimeType,
        size: fileBuffer.length,
      };
    } catch (error) {
      logger.error({ err: error, userId, fileName }, 'Error uploading message media');
      throw new Error('Failed to upload message media');
    }
  }

  /**
   * Upload chatbot document (PDF)
   */
  async uploadChatbotDocument(userId, fileBuffer, fileName, mimeType) {
    try {
      const timestamp = Date.now();
      const sanitizedFileName = fileName.replace(/[\/\\:*?"<>|]/g, '_');
      const objectName = `${userId}/${timestamp}-${sanitizedFileName}`;
      const encodedFileName = encodeURIComponent(fileName);
      const metaData = {
        'Content-Type': mimeType,
        'Content-Disposition': `inline; filename*=UTF-8''${encodedFileName}`,
      };

      logger.info({
        userId: userId.toString(),
        bucket: this.chatbotDocumentsBucket,
        fileName,
        mimeType,
        sizeBytes: fileBuffer.length,
        objectName,
      }, 'Uploading chatbot document to MinIO');

      await this.client.putObject(
        this.chatbotDocumentsBucket,
        objectName,
        fileBuffer,
        fileBuffer.length,
        metaData,
      );

      const publicUrl = `/minio/${this.chatbotDocumentsBucket}/${objectName}`;
      logger.info({
        userId: userId.toString(),
        bucket: this.chatbotDocumentsBucket,
        objectName,
        publicUrl,
      }, 'Chatbot document uploaded to MinIO');

      return {
        success: true,
        url: publicUrl,
        objectName,
        fileName,
        mimeType,
        size: fileBuffer.length,
      };
    } catch (error) {
      logger.error({ err: error, userId, fileName }, 'Error uploading chatbot document');
      throw new Error('Failed to upload chatbot document');
    }
  }

  /**
   * Delete chatbot document
   */
  async deleteChatbotDocument(objectName) {
    try {
      await this.client.removeObject(this.chatbotDocumentsBucket, objectName);
      logger.info({ bucket: this.chatbotDocumentsBucket, objectName }, 'Deleted chatbot document from MinIO');
      return { success: true };
    } catch (error) {
      logger.error({ err: error, objectName }, 'Error deleting chatbot document');
      throw new Error('Failed to delete chatbot document');
    }
  }
}

module.exports = new MinioService();
