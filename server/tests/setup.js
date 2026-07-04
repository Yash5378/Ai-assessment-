const fs = require('fs');
const os = require('os');
const path = require('path');

// Point resume uploads at a throwaway temp dir so tests never write into the
// project. Set before any module reads env.uploadDir.
const tmpUploadDir = fs.mkdtempSync(path.join(os.tmpdir(), 'recruit-uploads-'));
process.env.UPLOAD_DIR = tmpUploadDir;
process.env.JWT_SECRET = 'test-secret';

global.__TEST_UPLOAD_DIR__ = tmpUploadDir;
