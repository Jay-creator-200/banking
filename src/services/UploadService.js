import cloudinary from '../lib/cloudinary.js';
import { AppError } from '../utils/error-handler.js';

/**
 * Service to handle uploading files (KYC documents, member images, etc.) to Cloudinary.
 * Designed to process buffers, files, base64 strings, or file streams, and delete records cleanly.
 */
export class UploadService {
  /**
   * Upload an image file (e.g. member photos, signatures).
   * Automatically restricts formats to standard web safe images.
   *
   * @param {File|Blob|Buffer|string} file - File buffer or string representation.
   * @param {string} [folder='general'] - Nested folder under main path.
   * @returns {Promise<{ url: string, publicId: string, format: string, sizeBytes: number }>}
   */
  async uploadImage(file, folder = 'general') {
    return this.uploadFile(file, {
      folder: `banking/${folder}`,
      resource_type: 'image',
      allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
    });
  }

  /**
   * Upload document files (e.g. PDFs, statements, signed loan agreements).
   * Sets resource type to 'raw' or 'auto' to support PDFs and document structures.
   *
   * @param {File|Blob|Buffer|string} file - Document data.
   * @param {string} [folder='documents'] - Nested directory.
   * @returns {Promise<{ url: string, publicId: string, format: string, sizeBytes: number }>}
   */
  async uploadDocument(file, folder = 'documents') {
    return this.uploadFile(file, {
      folder: `banking/${folder}`,
      resource_type: 'auto', // Correctly detects PDFs, word sheets, and text formats
    });
  }

  /**
   * Main upload orchestrator. Converts files and buffers into readable streams for Cloudinary.
   *
   * @param {File|Blob|Buffer|string} file - The file resource.
   * @param {Object} [cloudinaryOptions={}] - Cloudinary-specific overrides.
   * @returns {Promise<{ url: string, publicId: string, format: string, sizeBytes: number }>}
   */
  async uploadFile(file, cloudinaryOptions = {}) {
    // Graceful fallback for local development or CI build environments
    if (!process.env.CLOUDINARY_API_KEY) {
      console.warn('Cloudinary API credentials missing. Falling back to Mock file upload.');
      return {
        url: 'https://res.cloudinary.com/demo/image/upload/v1234567890/sample.jpg',
        publicId: `mock_public_id_${Date.now()}`,
        format: 'jpg',
        sizeBytes: 1024,
      };
    }

    try {
      let fileBuffer = file;

      // Handle standard Next.js / Browser File or Blob
      if (file instanceof Blob) {
        const arrayBuffer = await file.arrayBuffer();
        fileBuffer = Buffer.from(arrayBuffer);
      }

      return new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          cloudinaryOptions,
          (error, result) => {
            if (error) {
              console.error('Cloudinary API Upload Exception:', error);
              return reject(new AppError(500, `Cloudinary upload failed: ${error.message}`));
            }
            resolve({
              url: result.secure_url,
              publicId: result.public_id,
              format: result.format,
              sizeBytes: result.bytes,
            });
          }
        );

        if (Buffer.isBuffer(fileBuffer)) {
          uploadStream.end(fileBuffer);
        } else if (typeof fileBuffer === 'string') {
          // Base64 file format (strip prefix if present)
          const base64Data = fileBuffer.replace(/^data:image\/\w+;base64,/, '');
          uploadStream.end(Buffer.from(base64Data, 'base64'));
        } else {
          reject(new AppError(400, 'Invalid file object structure passed to UploadService'));
        }
      });
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError(500, `Upload orchestration exception: ${error.message}`);
    }
  }

  /**
   * Delete resource from Cloudinary storage.
   *
   * @param {string} publicId - The unique Cloudinary identifier.
   * @param {string} [resourceType='image'] - The media format category.
   * @returns {Promise<boolean>} True if deleted successfully.
   */
  async deleteFile(publicId, resourceType = 'image') {
    if (!process.env.CLOUDINARY_API_KEY) {
      console.warn('Cloudinary API credentials missing. Mocking resource deletion.');
      return true;
    }

    try {
      const result = await cloudinary.uploader.destroy(publicId, {
        resource_type: resourceType,
      });
      return result.result === 'ok';
    } catch (error) {
      console.error('Cloudinary Resource Deletion Exception:', error);
      throw new AppError(500, `Failed to destroy resource on Cloudinary: ${error.message}`);
    }
  }
}

export default new UploadService();
