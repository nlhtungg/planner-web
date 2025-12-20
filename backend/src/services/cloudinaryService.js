const cloudinary = require('cloudinary').v2;

// Configure Cloudinary from environment variable
// CLOUDINARY_URL format: cloudinary://api_key:api_secret@cloud_name
if (process.env.CLOUDINARY_URL) {
    // Cloudinary auto-configures from CLOUDINARY_URL env var
    console.log('✅ Cloudinary configured from CLOUDINARY_URL');
} else {
    console.warn('⚠️ CLOUDINARY_URL not set - file uploads will fail in production');
}

class CloudinaryService {
    constructor() {
        this.userMediaFolder = 'user-media';
        this.messageMediaFolder = 'message-media';
        this.workspaceMediaFolder = 'workspace-media';
    }

    /**
     * Upload user avatar
     */
    async uploadAvatar(userId, fileBuffer, fileName, mimeType) {
        try {
            console.log('🚀 Cloudinary uploadAvatar called with:', { userId, fileName, mimeType, bufferSize: fileBuffer.length });

            const fileExtension = fileName.split('.').pop();
            const publicId = `${this.userMediaFolder}/${userId}/avatar`;

            // Convert buffer to base64 data URI
            const base64 = fileBuffer.toString('base64');
            const dataUri = `data:${mimeType};base64,${base64}`;

            const result = await cloudinary.uploader.upload(dataUri, {
                public_id: publicId,
                overwrite: true,
                resource_type: 'image',
                transformation: [
                    { width: 400, height: 400, crop: 'fill', gravity: 'face' }
                ]
            });

            console.log('✅ Cloudinary upload successful:', result.secure_url);

            return {
                success: true,
                url: result.secure_url,
                objectName: publicId
            };
        } catch (error) {
            console.error('Error uploading avatar to Cloudinary:', error);
            throw new Error('Failed to upload avatar');
        }
    }

    /**
     * Delete user avatar
     */
    async deleteAvatar(userId) {
        try {
            const publicId = `${this.userMediaFolder}/${userId}/avatar`;
            await cloudinary.uploader.destroy(publicId);
            return { success: true };
        } catch (error) {
            console.error('Error deleting avatar from Cloudinary:', error);
            throw new Error('Failed to delete avatar');
        }
    }

    /**
     * Get avatar URL (for Cloudinary, just construct the URL)
     */
    async getAvatarUrl(userId, fileName) {
        try {
            const publicId = `${this.userMediaFolder}/${userId}/avatar`;
            return cloudinary.url(publicId, { secure: true });
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
            console.log('📤 [Cloudinary] Starting upload:', { userId, fileName, mimeType });

            const timestamp = Date.now();
            const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
            const publicId = `${this.messageMediaFolder}/${userId}/${timestamp}-${sanitizedFileName}`;

            // Convert buffer to base64 data URI
            const base64 = fileBuffer.toString('base64');
            const dataUri = `data:${mimeType};base64,${base64}`;

            // Determine resource type
            const resourceType = mimeType.startsWith('image/') ? 'image' :
                mimeType.startsWith('video/') ? 'video' : 'raw';

            const result = await cloudinary.uploader.upload(dataUri, {
                public_id: publicId,
                resource_type: resourceType
            });

            console.log('✅ [Cloudinary] Upload complete:', result.secure_url);

            return {
                success: true,
                url: result.secure_url,
                objectName: publicId,
                fileName: fileName,
                mimeType: mimeType,
                size: fileBuffer.length
            };
        } catch (error) {
            console.error('❌ Error uploading message media:', error);
            throw new Error('Failed to upload message media');
        }
    }
}

module.exports = new CloudinaryService();
