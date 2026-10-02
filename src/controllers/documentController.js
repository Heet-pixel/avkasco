const fs = require('fs');
const mongoose = require('mongoose');
const Document = require('../models/Document');
const Client = require('../models/Client');
const h = require('../utils/asyncHandler');
const storage = require('../utils/storage');
const { log } = require('../utils/activity');
const { validSignature } = require('../middleware/upload');
const { allowedIds } = require('./clientController');

const canSee = async (user, clientId) => {
  const ids = await allowedIds(user);
  return !ids || ids.some((i) => String(i) === String(clientId));
};

exports.list = h(async (req, res) => {
  const ids = await allowedIds(req.user);
  const f = ids ? { client: { $in: ids } } : {};
  if (mongoose.isValidObjectId(req.query.client)) f.client = req.query.client;
  const docs = await Document.find(f).sort({ createdAt: -1 }).limit(300).populate('client', 'name').populate('uploadedBy', 'name').lean();
  res.json({ documents: docs.map(({ fileKey, ...d }) => d) });
});

exports.create = h(async (req, res) => {
  const file = req.file;
  const { client, title } = req.body || {};
  if (!file) return res.status(400).json({ message: 'Choose a file to upload.' });
  if (!validSignature(file.buffer)) return res.status(400).json({ message: 'That file type is not supported.' });
  if (!mongoose.isValidObjectId(client) || !(await Client.exists({ _id: client }))) return res.status(400).json({ message: 'Choose a client.' });
  if (!(await canSee(req.user, client))) return res.status(403).json({ message: 'You cannot add documents for this client.' });
  const key = await storage.saveFile(file, 'documents');
  try {
    const name = String(title || '').trim() || file.originalname;
    const doc = await Document.create({ client, title: name, fileKey: key, fileName: file.originalname, size: file.size, uploadedBy: req.user._id });
    const c = await Client.findById(client).select('name');
    log(`${req.user.name} uploaded a document: ${name} (${c.name})`, { actor: req.user._id, client });
    res.status(201).json({ document: { _id: doc._id } });
  } catch (err) { storage.deleteFile(key); throw err; }
});

exports.download = h(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ message: 'Document not found.' });
  const doc = await Document.findById(req.params.id);
  if (!doc || !(await canSee(req.user, doc.client))) return res.status(404).json({ message: 'Document not found.' });
  const access = await storage.fileAccess(doc.fileKey, doc.fileName);
  if (access.url) return res.json({ url: access.url });
  if (!access.file || !fs.existsSync(access.file)) return res.status(404).json({ message: 'The file is missing.' });
  res.download(access.file, doc.fileName);
});
