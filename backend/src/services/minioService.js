const { Client } = require('minio');

// Force IPv4 DNS resolution to avoid IPv6 issues in Docker
const dns = require('dns');
dns.setDefaultResultOrder('ipv4first');

class MinioService {
  constructor() {
    this.userMediaBucket = 'user-media';
   this.messageMediaBucket = 'message-media';
    this.chatbotDocumentsBucket = 'chatbot-documents';
    this.client = new Client({
      endPoint: process.env.MINIO_ENDPOINT || 'minio',
      port: parseInt(process.env.MINIO_PORT) || 9000,
      useSSL: process.env.MINIO_USE_SSL === 'true' || false,
      accessKey: process.env.MINIO_ACCESS_KEY || 'minioadmin',
      secretKey: process.env.MINIO_SECRET_KEY || 'minioadmin'
    });

    // Delay initialization to allow MinIO to be fully ready
    setTimeout(() => this.initializeBuckets(), 5000);
  }

  async initializeBuckets() {
    try {
      // Verify that buckets exist
      const userBucketExists = await this.client.bucketExists(this.userMediaBucket);
      const messageBucketExists = await this.client.bucketExists(this.messageMediaBucket);
      const chatbotBucketExists = await this.client.bucketExists(this.chatbotDocumentsBucket);
      
      if (userBucketExists) {
        console.log(`✅ MinIO connected successfully - ${this.userMediaBucket} bucket is ready`);
      } else {
        console.log(`⚠️  MinIO bucket ${this.userMediaBucket} not found`);
      }
      
      if (messageBucketExists) {
        console.log(`✅ MinIO ${this.messageMediaBucket} bucket is ready`);
      } else {
        console.log(`⚠️  MinIO bucket ${this.messageMediaBucket} not found`);
      }
      
      if (chatbotBucketExists) {
        console.log(`✅ MinIO ${this.chatbotDocumentsBucket} bucket is ready`);
      } else {
        console.log(`⚠️  MinIO bucket ${this.chatbotDocumentsBucket} not found`);
      }
    } catch (error) {
      console.error('❌ MinIO connection failed:', error.message);
    }
  }

  async uploadAvatar(userId, fileBuffer, fileName, mimeType) {
    try {
      console.log('🚀 MinIO uploadAvatar called with:', { userId, fileName, mimeType, bufferSize: fileBuffer.length });
      const fileExtension = fileName.split('.').pop();
      const objectName = `${userId}/avatar.${fileExtension}`;
      console.log('📂 Object name:', objectName);
      
      const metaData = {
        'Content-Type': mimeType,
        'Cache-Control': 'max-age=86400' // 24 hours
      };

      // Upload the file
      console.log('⬆️ Uploading to MinIO bucket:', this.userMediaBucket);
      await this.client.putObject(
        this.userMediaBucket,
        objectName,
        fileBuffer,
        fileBuffer.length,
        metaData
      );
      console.log('✅ MinIO upload successful');

      // Generate the public URL
      const publicUrl = `http://localhost:${process.env.MINIO_PORT || 9000}/${this.userMediaBucket}/${objectName}`;
      console.log('🔗 Generated public URL:', publicUrl);
      
      return {
        success: true,
        url: publicUrl,
        objectName: objectName
      };
    } catch (error) {
      console.error('Error uploading avatar to MinIO:', error);
      throw new Error('Failed to upload avatar');
    }
  }

  async deleteAvatar(userId) {
    try {
      // List all objects in the user's folder
      const objectsList = [];
      const stream = this.client.listObjects(this.userMediaBucket, `${userId}/`, false);
      
      for await (const obj of stream) {
        objectsList.push(obj.name);
      }

      // Delete all objects in the user's folder
      if (objectsList.length > 0) {
        await this.client.removeObjects(this.userMediaBucket, objectsList);
      }

      return { success: true };
    } catch (error) {
      console.error('Error deleting avatar from MinIO:', error);
      throw new Error('Failed to delete avatar');
    }
  }

  async getAvatarUrl(userId, fileName) {
    try {
      const objectName = `${userId}/${fileName}`;
      
      // Check if object exists
      await this.client.statObject(this.userMediaBucket, objectName);
      
      // Generate public URL - use localhost for external access since MinIO is exposed on host port 9000
      const publicUrl = `http://localhost:${process.env.MINIO_PORT || 9000}/${this.userMediaBucket}/${objectName}`;
      
      return publicUrl;
    } catch (error) {
      console.error('Error getting avatar URL:', error);
      return null;
    }
  }

  /**
   * Upload message attachment (file, image, document, etc.)
   */
  async uploadMessageMedia(userId, fileBuffer, fileName, mimeType) {
    try {
      console.log('📤 [MinIO] Starting upload to bucket:', this.messageMediaBucket);
      console.log('   User:', userId);
      console.log('   File:', fileName);
      console.log('   Type:', mimeType);
      console.log('   Size:', (fileBuffer.length/1024).toFixed(2), 'KB');
      
      // Generate unique filename (preserve Unicode characters)
      const timestamp = Date.now();
      // Only remove dangerous characters, keep Unicode (Vietnamese) characters
      const sanitizedFileName = fileName.replace(/[\/\\:*?"<>|]/g, '_');
      const objectName = `${userId}/${timestamp}-${sanitizedFileName}`;
      console.log('   Object:', objectName);
      
      // Encode filename for Content-Disposition header
      const encodedFileName = encodeURIComponent(fileName);
      const metaData = {
        'Content-Type': mimeType,
        'Content-Disposition': `inline; filename*=UTF-8''${encodedFileName}`
      };

      // Upload the file
      console.log('   ⬆️ Uploading to MinIO...');
      await this.client.putObject(
        this.messageMediaBucket,
        objectName,
        fileBuffer,
        fileBuffer.length,
        metaData
      );

      // Generate the public URL
      const publicUrl = `http://localhost:${process.env.MINIO_PORT || 9000}/${this.messageMediaBucket}/${objectName}`;
      console.log('   ✅ Upload complete!');
      console.log('   🔗 URL:', publicUrl);
      
      return {
        success: true,
        url: publicUrl,
        objectName: objectName,
        fileName: fileName,
        mimeType: mimeType,
        size: fileBuffer.length
      };
    } catch (error) {
      console.error('❌ Error uploading message media:', error);
      throw new Error('Failed to upload message media');
    }
  }

  /**
   * Upload chatbot document (PDF)
   */
  async uploadChatbotDocument(userId, fileBuffer, fileName, mimeType) {
    try {
      console.log('📤 [MinIO] Uploading chatbot document to bucket:', this.chatbotDocumentsBucket);
      console.log('   User:', userId);
      console.log('   File:', fileName);
      console.log('   Type:', mimeType);
      console.log('   Size:', (fileBuffer.length/1024).toFixed(2), 'KB');
      
      // Generate unique filename (preserve Unicode characters)
      const timestamp = Date.now();
      // Only remove dangerous characters, keep Unicode (Vietnamese) characters
      const sanitizedFileName = fileName.replace(/[\/\\:*?"<>|]/g, '_');
      const objectName = `${userId}/${timestamp}-${sanitizedFileName}`;
      console.log('   Object:', objectName);
      
      // Encode filename for Content-Disposition header
      const encodedFileName = encodeURIComponent(fileName);
      const metaData = {
        'Content-Type': mimeType,
        'Content-Disposition': `inline; filename*=UTF-8''${encodedFileName}`
      };

      // Upload the file
      console.log('   ⬆️ Uploading to MinIO...');
      await this.client.putObject(
        this.chatbotDocumentsBucket,
        objectName,
        fileBuffer,
        fileBuffer.length,
        metaData
      );

      // Generate the public URL
      const publicUrl = `http://localhost:${process.env.MINIO_PORT || 9000}/${this.chatbotDocumentsBucket}/${objectName}`;
      console.log('   ✅ Upload complete!');
      console.log('   🔗 URL:', publicUrl);
      
      return {
        success: true,
        url: publicUrl,
        objectName: objectName,
        fileName: fileName,
        mimeType: mimeType,
        size: fileBuffer.length
      };
    } catch (error) {
      console.error('❌ Error uploading chatbot document:', error);
      throw new Error('Failed to upload chatbot document');
    }
  }

  /**
   * Delete chatbot document
   */
  async deleteChatbotDocument(objectName) {
    try {
      await this.client.removeObject(this.chatbotDocumentsBucket, objectName);
      console.log('✅ Deleted chatbot document:', objectName);
      return { success: true };
    } catch (error) {
      console.error('❌ Error deleting chatbot document:', error);
      throw new Error('Failed to delete chatbot document');
    }
  }
}

module.exports = new MinioService();