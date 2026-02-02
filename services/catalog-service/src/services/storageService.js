const fs = require('fs').promises;
const path = require('path');
const sharp = require('sharp');
const { createLogger } = require('@cloudretail/shared');

const logger = createLogger('storage-service');

class StorageService {
  constructor() {
    this.storageType = process.env.STORAGE_TYPE || 'local';
    this.uploadDir = process.env.UPLOAD_DIR || path.join(process.cwd(), '../../uploads');
  }

  /**
   * Save uploaded file
   * @param {Buffer} buffer - File buffer
   * @param {string} filename - Original filename
   * @param {string} folder - Subfolder (e.g., 'products')
   * @returns {Promise<{url: string, thumbnailUrl: string}>}
   */
  async saveFile(buffer, filename, folder = 'products') {
    if (this.storageType === 'local') {
      return await this.saveLocalFile(buffer, filename, folder);
    } else if (this.storageType === 's3') {
      // TODO: Implement S3 upload for AWS migration
      throw new Error('S3 storage not implemented yet');
    }

    throw new Error(`Unsupported storage type: ${this.storageType}`);
  }

  /**
   * Save file locally
   */
  async saveLocalFile(buffer, filename, folder) {
    try {
      const timestamp = Date.now();
      const ext = path.extname(filename);
      const baseName = path.basename(filename, ext);
      const sanitizedName = baseName.replace(/[^a-zA-Z0-9-_]/g, '_');
      const newFilename = `${sanitizedName}_${timestamp}${ext}`;
      const thumbnailFilename = `${sanitizedName}_${timestamp}_thumb${ext}`;

      const folderPath = path.join(this.uploadDir, folder);
      const filePath = path.join(folderPath, newFilename);
      const thumbnailPath = path.join(folderPath, thumbnailFilename);

      // Ensure directory exists
      await fs.mkdir(folderPath, { recursive: true });

      // Resize and optimize original image
      await sharp(buffer)
        .resize(1200, 1200, {
          fit: 'inside',
          withoutEnlargement: true,
        })
        .jpeg({ quality: 85 })
        .toFile(filePath);

      // Create thumbnail
      await sharp(buffer)
        .resize(300, 300, {
          fit: 'cover',
        })
        .jpeg({ quality: 80 })
        .toFile(thumbnailPath);

      logger.info('File saved successfully', { filename: newFilename, folder });

      return {
        url: `/uploads/${folder}/${newFilename}`,
        thumbnailUrl: `/uploads/${folder}/${thumbnailFilename}`,
      };
    } catch (error) {
      logger.error('Error saving file', { error: error.message });
      throw new Error('Failed to save file');
    }
  }

  /**
   * Delete file
   * @param {string} fileUrl - File URL to delete
   */
  async deleteFile(fileUrl) {
    if (this.storageType === 'local') {
      return await this.deleteLocalFile(fileUrl);
    }

    // For S3, implement deletion
    throw new Error('Delete not implemented for this storage type');
  }

  /**
   * Delete local file
   */
  async deleteLocalFile(fileUrl) {
    try {
      const filePath = path.join(process.cwd(), '../..', fileUrl);
      await fs.unlink(filePath);
      logger.info('File deleted', { fileUrl });
    } catch (error) {
      logger.warn('Failed to delete file', { fileUrl, error: error.message });
    }
  }

  /**
   * Validate file
   * @param {object} file - Multer file object
   * @returns {boolean}
   */
  validateFile(file) {
    const allowedMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    const maxSize = parseInt(process.env.MAX_FILE_SIZE || 5242880); // 5MB default

    if (!allowedMimeTypes.includes(file.mimetype)) {
      throw new Error('Invalid file type. Only JPEG, PNG, and WebP are allowed.');
    }

    if (file.size > maxSize) {
      throw new Error(`File size exceeds maximum allowed size of ${maxSize / 1024 / 1024}MB`);
    }

    return true;
  }
}

module.exports = new StorageService();
