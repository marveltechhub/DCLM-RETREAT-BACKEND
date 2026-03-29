import multer from 'multer';

const MAX_BYTES = 2 * 1024 * 1024; // 2MB
const ALLOWED = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

const storage = multer.memoryStorage();

function fileFilter(req, file, cb) {
  if (ALLOWED.includes(file.mimetype)) {
    cb(null, true);
  } else {
    const err = new Error('Only JPEG, PNG, GIF, or WebP images are allowed');
    err.status = 400;
    cb(err);
  }
}

export const uploadProfile = multer({
  storage,
  limits: { fileSize: MAX_BYTES, files: 1 },
  fileFilter,
});

export const UPLOAD_ERROR_MAP = {
  LIMIT_FILE_SIZE: 'Image must be 2MB or smaller',
  LIMIT_UNEXPECTED_FILE: 'Only JPEG, PNG, GIF, or WebP images are allowed',
};
