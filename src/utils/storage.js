// File storage: AWS S3 when S3_BUCKET is set, otherwise the local "uploads" folder (for testing).
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');

const root = path.join(__dirname, '..', '..', 'uploads');
let s3;
const client = () => (s3 = s3 || new S3Client({ region: process.env.AWS_REGION }));
const localPath = (key) => {
  const p = path.join(root, key.includes('/') ? key : 'resumes/' + key);
  return p.startsWith(root) ? p : null;
};

// folder: "resumes" or "documents". Returns the key to store in the database.
exports.saveFile = async (file, folder) => {
  const key = `${folder}/${crypto.randomBytes(16).toString('hex')}${path.extname(file.originalname).toLowerCase()}`;
  if (process.env.S3_BUCKET) {
    await client().send(new PutObjectCommand({ Bucket: process.env.S3_BUCKET, Key: key, Body: file.buffer, ContentType: file.mimetype, ServerSideEncryption: 'AES256' }));
  } else {
    const p = localPath(key);
    fs.mkdirSync(path.dirname(p), { recursive: true });
    fs.writeFileSync(p, file.buffer);
  }
  return key;
};
exports.saveResume = (file) => exports.saveFile(file, 'resumes');

exports.deleteFile = async (key) => {
  try {
    if (process.env.S3_BUCKET) await client().send(new DeleteObjectCommand({ Bucket: process.env.S3_BUCKET, Key: key }));
    else { const p = localPath(key); if (p) fs.unlink(p, () => {}); }
  } catch (err) { console.error('Could not delete file:', err.message); }
};
exports.deleteResume = exports.deleteFile;

// S3 -> { url } (valid 5 minutes). Local -> { file } path on disk.
exports.fileAccess = async (key, downloadName) => {
  if (process.env.S3_BUCKET) {
    const safe = String(downloadName).replace(/[^\w.\- ]/g, '_');
    const url = await getSignedUrl(client(), new GetObjectCommand({ Bucket: process.env.S3_BUCKET, Key: key, ResponseContentDisposition: `attachment; filename="${safe}"` }), { expiresIn: 300 });
    return { url };
  }
  return { file: localPath(key) };
};
exports.resumeAccess = exports.fileAccess;
