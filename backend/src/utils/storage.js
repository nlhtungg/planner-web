const Minio = require('minio');

// Initialize MinIO client
const minioClient = new Minio.Client({
    endPoint: process.env.MINIO_ENDPOINT || 'minio',
    port: parseInt(process.env.MINIO_PORT || '9000'),
    useSSL: process.env.MINIO_USE_SSL === 'true',
    accessKey: process.env.MINIO_ACCESS_KEY || 'minioadmin',
    secretKey: process.env.MINIO_SECRET_KEY || 'minioadmin',
});

const BUCKET_NAME = 'workspace-media';

// Upload file to MinIO
const uploadFile = async (fileBuffer, fileName, mimeType, workspaceId, folderPath = null) => {
    try {
        // Organize files: workspaceId/folder/filename
        let objectName = `${workspaceId}/`;

        if (folderPath) {
            // Add folder path if provided (e.g., "Projects/2024")
            objectName += `${folderPath}/`;
        }

        objectName += `${Date.now()}-${fileName}`;

        await minioClient.putObject(
            BUCKET_NAME,
            objectName,
            fileBuffer,
            fileBuffer.length,
            { 'Content-Type': mimeType }
        );

        return getFileUrl(objectName);
    } catch (error) {
        console.error('MinIO upload error:', error);
        throw error;
    }
};

// Get file URL
const getFileUrl = (objectName) => {
    const protocol = process.env.MINIO_USE_SSL === 'true' ? 'https' : 'http';
    const host = process.env.MINIO_PUBLIC_HOST || 'localhost:9000';
    return `${protocol}://${host}/${BUCKET_NAME}/${objectName}`;
};

// Delete file from MinIO
const deleteFile = async (objectName) => {
    try {
        // Extract object name from full URL if needed
        const name = objectName.includes(BUCKET_NAME)
            ? objectName.split(`${BUCKET_NAME}/`)[1]
            : objectName;
        await minioClient.removeObject(BUCKET_NAME, name);
    } catch (error) {
        console.error('MinIO delete error:', error);
        throw error;
    }
};

module.exports = {
    uploadFile,
    getFileUrl,
    deleteFile,
    minioClient,
    BUCKET_NAME
};
