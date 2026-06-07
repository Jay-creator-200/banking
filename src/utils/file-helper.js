/**
 * Allowed MIME formats for uploads in Banking processes.
 */
export const ALLOWED_FILE_TYPES = {
  IMAGE: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'],
  DOCUMENT: [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'image/jpeg',
    'image/jpg',
    'image/png',
  ],
};

/**
 * Validate size and format type of files uploaded for KYC or loan records.
 *
 * @param {number} sizeBytes - File size in bytes.
 * @param {string} mimeType - The file MIME type.
 * @param {'IMAGE'|'DOCUMENT'} [category='DOCUMENT'] - Allowed category.
 * @param {number} [maxSizeMb=5] - Maximum permitted size in megabytes.
 * @returns {{ valid: boolean, error: string|null }}
 */
export function validateFile(sizeBytes, mimeType, category = 'DOCUMENT', maxSizeMb = 5) {
  const maxBytes = maxSizeMb * 1024 * 1024;

  if (sizeBytes > maxBytes) {
    return {
      valid: false,
      error: `File size exceeds the permitted limit of ${maxSizeMb} MB.`,
    };
  }

  const allowedList = ALLOWED_FILE_TYPES[category.toUpperCase()];
  if (!allowedList) {
    return {
      valid: false,
      error: `Unsupported upload category requested: ${category}`,
    };
  }

  if (!allowedList.includes(mimeType)) {
    return {
      valid: false,
      error: 'Invalid file format. File type is not allowed for security reasons.',
    };
  }

  return { valid: true, error: null };
}

/**
 * Extract file extension from filename.
 *
 * @param {string} filename
 * @returns {string} File extension (e.g. 'pdf', 'png').
 */
export function getFileExtension(filename) {
  if (!filename) return '';
  return filename.split('.').pop().toLowerCase();
}
