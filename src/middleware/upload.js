const path = require('path');
const multer = require('multer');

// Checks the first bytes so a renamed file cannot pass: PDF, zip-based Office (docx/xlsx), old Office (doc/xls), PNG, JPG.
exports.validSignature = (buf) => {
  const h = buf.subarray(0, 4).toString('hex');
  return ['25504446', '504b0304', 'd0cf11e0', '89504e47'].includes(h) || h.startsWith('ffd8ff');
};

function make(exts, maxMb, field) {
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: maxMb * 1024 * 1024, files: 1 },
    fileFilter: (req, file, cb) => {
      if (exts.includes(path.extname(file.originalname).toLowerCase())) return cb(null, true);
      cb(Object.assign(new Error(`Allowed file types: ${exts.join(', ')}`), { status: 400 }));
    },
  });
  return (req, res, next) => upload.single(field)(req, res, (err) => {
    if (!err) return next();
    const message = err.code === 'LIMIT_FILE_SIZE' ? `The file must be ${maxMb} MB or smaller.` : err.status ? err.message : 'The file could not be uploaded.';
    res.status(400).json({ message });
  });
}
exports.resumeUpload = make(['.pdf', '.doc', '.docx'], 5, 'resume');
exports.docUpload = make(['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.png', '.jpg', '.jpeg'], 10, 'file');
