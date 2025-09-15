let path = require('path');
let fs = require('fs');
let multer = require('multer');
let config = require('../config/index');

let UPLOAD_DIR = config.UPLOAD_DIR || path.join(process.cwd(), 'uploads');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

let storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    let ext = path.extname(file.originalname || '');
    let base = path.basename(file.originalname || 'file', ext).replace(/\s+/g, '_');
    let unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${base}-${unique}${ext}`);
  }
});

function fileFilter(req, file, cb) {
  let allowed = [
    'image/png','image/jpeg','image/jpg','image/gif',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ];
  if (allowed.includes(file.mimetype)) cb(null, true);
  else cb(new Error('Unsupported file type'), false);
}

let upload = multer({
  storage,
  limits: {
    fileSize: Number(config.MAX_UPLOAD_FILESIZE_BYTES || 10 * 1024 * 1024)
  },
  fileFilter
});

module.exports = upload;
