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

// Magic-byte signatures per stored extension. The declared mimetype is
// client-controlled, so after saving we verify the actual file content:
// %PDF for PDFs, the OLE header for .doc, the ZIP header for .docx.
const FILE_SIGNATURES = {
  '.pdf': [Buffer.from('%PDF')],
  '.doc': [Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1])],
  '.docx': [Buffer.from([0x50, 0x4b, 0x03, 0x04])],
};

async function hasValidSignature(file) {
  const handle = await fs.promises.open(file.path, 'r');
  try {
    const header = Buffer.alloc(8);
    await handle.read(header, 0, 8, 0);
    const signatures = FILE_SIGNATURES[path.extname(file.filename)] ?? [];
    return signatures.some((sig) => header.subarray(0, sig.length).equals(sig));
  } finally {
    await handle.close();
  }
}

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
  uploadResume(req, res, async (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return next(ApiError.badRequest('Resume must be at most 5 MB'));
      }
      return next(ApiError.badRequest(`Upload error: ${err.message}`));
    }
    if (err) {
      return next(err); // ApiError from fileFilter, or unexpected
    }

    // Content check: a file whose bytes don't match its declared type is
    // deleted immediately and rejected.
    if (req.file) {
      try {
        if (!(await hasValidSignature(req.file))) {
          await fs.promises.unlink(req.file.path).catch(() => {});
          return next(
            ApiError.badRequest('Resume content does not match its file type (PDF, DOC or DOCX)')
          );
        }
      } catch (readErr) {
        return next(readErr);
      }
    }
    return next();
  });
}

const resolveUploadPath = (filename) => path.join(env.uploadDir, filename);

module.exports = { resumeUpload, resolveUploadPath, MAX_FILE_SIZE, ALLOWED_TYPES };
