const mongoose = require('mongoose');
const Notice = require('../models/Notice');
const User = require('../models/User');
const h = require('../utils/asyncHandler');
const { log } = require('../utils/activity');

// Admins see everything they've sent (broadcast + direct, to track what went out).
// Employees see broadcasts (recipient: null) plus anything sent directly to them.
exports.list = h(async (req, res) => {
  const filter = req.user.role === 'admin' ? {} : { $or: [{ recipient: null }, { recipient: req.user._id }] };
  res.json({ notices: await Notice.find(filter).sort({ createdAt: -1 }).limit(100).populate('author', 'name').populate('recipient', 'name').lean() });
});

exports.create = h(async (req, res) => {
  const title = String(req.body?.title || '').trim();
  const body = String(req.body?.body || '').trim();
  if (title.length < 2 || body.length < 2) return res.status(400).json({ message: 'Enter a title and a message.' });

  let recipient = null;
  if (req.body?.recipient) {
    if (!mongoose.isValidObjectId(req.body.recipient)) return res.status(400).json({ message: 'Choose a valid employee.' });
    const target = await User.findById(req.body.recipient).select('name role active');
    if (!target || !target.active) return res.status(400).json({ message: 'Choose an active team member.' });
    recipient = target._id;
  }

  const notice = await Notice.create({ title, body, author: req.user._id, recipient });
  log(`${req.user.name} sent a message${recipient ? '' : ' to everyone'}: "${title}"`, { actor: req.user._id });
  res.status(201).json({ notice: await notice.populate('recipient', 'name') });
});

exports.remove = h(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ message: 'Not found.' });
  await Notice.findByIdAndDelete(req.params.id);
  res.json({ ok: true });
});
