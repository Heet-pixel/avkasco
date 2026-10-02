const mongoose = require('mongoose');
const Activity = require('../models/Activity');
const h = require('../utils/asyncHandler');

exports.list = h(async (req, res) => {
  const activity = await Activity.find().sort({ createdAt: -1 }).limit(1000)
    .populate('actor', 'name email').populate('client', 'name').lean();
  res.json({ activity });
});

exports.removeMany = h(async (req, res) => {
  const ids = Array.isArray(req.body?.ids) ? req.body.ids.filter((id) => mongoose.isValidObjectId(id)) : [];
  if (!ids.length) return res.status(400).json({ message: 'Select at least one entry to delete.' });
  await Activity.deleteMany({ _id: { $in: ids } });
  res.json({ ok: true, removed: ids.length });
});
