const fs = require('fs');
const path = require('path');
const multer = require('multer');
const env = require('../config/env');
const ApiError = require('../utils/ApiError');

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

// Allowed resume types, mapped to the extension we persist.
const ALLOWED_TYPES = {
  'application/pdf': '.pdf',
  'application/msword': '.doc',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
};

// Ensure the destination exists (Docker mounts a volume here; locally it may
// not exist yet on first run).
fs.mkdirSync(env.uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, env.uploadDir),
  filename: (req, file, cb) => {
    // Filename is fully server-generated — no user input reaches the path,
    // so there is no directory-traversal surface. `Date.now` keeps replaced
    // resumes from colliding.
    const ext = ALLOWED_TYPES[file.mimetype] || '';
    cb(null, `candidate-${req.user.id}-${Date.now()}${ext}`);
  },
});

const fileFilter = (req, file, cb) => {
  if (!ALLOWED_TYPES[file.mimetype]) {
    return cb(ApiError.badRequest('Resume must be a PDF, DOC or DOCX file'));
  }
  return cb(null, true);
};

const uploadResume = multer({
  storage,
  fileFilter,
  limits: { fileSize: MAX_FILE_SIZE, files: 1 },
}).single('resume');

/**
 * Wraps multer so its errors (e.g. file too large) become ApiErrors handled
 * by the global error handler instead of crashing the request.
 */
function resumeUpload(req, res, next) {
  uploadResume(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return next(ApiError.badRequest('Resume must be at most 5 MB'));
      }
      return next(ApiError.badRequest(`Upload error: ${err.message}`));
    }
    if (err) {
      return next(err); // ApiError from fileFilter, or unexpected
    }
    return next();
  });
}

const resolveUploadPath = (filename) => path.join(env.uploadDir, filename);

module.exports = { resumeUpload, resolveUploadPath, MAX_FILE_SIZE, ALLOWED_TYPES };
