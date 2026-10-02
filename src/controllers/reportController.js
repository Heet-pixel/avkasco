const mongoose = require('mongoose');
const Report = require('../models/Report');
const User = require('../models/User');
const h = require('../utils/asyncHandler');

const dateOk = (v) => /^\d{4}-\d{2}-\d{2}$/.test(v || '');

exports.create = h(async (req, res) => {
  const date = dateOk(req.body?.date) ? req.body.date : new Date().toISOString().slice(0, 10);
  const summary = String(req.body?.summary || '').trim();
  if (summary.length < 5) return res.status(400).json({ message: 'Describe what you worked on (at least a few words).' });

  const report = await Report.findOneAndUpdate(
    { employee: req.user._id, date },
    { summary },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
  res.status(201).json({ report });
});

// Employees see only their own reports. Admins see everyone's, optionally
// filtered to one employee via ?employee=<id>. Date range filtering (day /
// week / month) happens client-side against this same list.
exports.list = h(async (req, res) => {
  const filter = {};
  if (req.user.role === 'admin') {
    if (req.query.employee && mongoose.isValidObjectId(req.query.employee)) filter.employee = req.query.employee;
  } else {
    filter.employee = req.user._id;
  }
  const reports = await Report.find(filter).sort({ date: -1 }).limit(500).populate('employee', 'name').lean();
  res.json({ reports });
});
