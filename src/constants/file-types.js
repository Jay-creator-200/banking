export const MAX_FILE_SIZE_MB = 5;

export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

export const ALLOWED_DOCUMENT_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];

export const FOLDERS = {
  KYC: 'kyc',
  LOANS: 'loans',
  MEMBERS: 'members',
  SIGNATURES: 'signatures',
  STATEMENTS: 'statements',
};

const fileTypes = {
  MAX_FILE_SIZE_MB,
  ALLOWED_IMAGE_TYPES,
  ALLOWED_DOCUMENT_TYPES,
  FOLDERS,
};

export default fileTypes;

