const multer = require('multer');
const createAppError = require('../utils/appError');

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];

const storage = multer.memoryStorage();

const fileFilter = (req, file, callback) => {
  if (!ALLOWED_TYPES.includes(file.mimetype)) {
    return callback(createAppError('Only JPG, PNG, WEBP, and PDF files are allowed', 400));
  }

  return callback(null, true);
};

const upload = multer({
  storage,
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: 5,
  },
  fileFilter,
});

module.exports = upload;
