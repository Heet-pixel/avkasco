const mongoose = require('mongoose');
const Client = require('../models/Client');
const Work = require('../models/Work');
const User = require('../models/User');
const h = require('../utils/asyncHandler');
const { log } = require('../utils/activity');

const emailOk = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
const pick = async (b = {}) => {
  const d = {
    name: String(b.name || '').trim(), contactPerson: String(b.contactPerson || '').trim(),
    email: String(b.email || '').trim(), phone: String(b.phone || '').trim(), notes: String(b.notes || '').trim(),
  };
  if (b.assignedTo !== undefined) {
    if (b.assignedTo === '' || b.assignedTo === null) d.assignedTo = null;
    else if (mongoose.isValidObjectId(b.assignedTo) && (await User.exists({ _id: b.assignedTo, active: true }))) d.assignedTo = b.assignedTo;
    else throw Object.assign(new Error('Choose a valid employee to assign.'), { status: 400 });
  }
  return d;
};
const check = (d) => (d.name.length < 2 ? 'Enter the client name.' : d.email && !emailOk(d.email) ? 'Enter a valid email address or leave it empty.' : null);

// clients an employee may see = clients they have work for, or clients handed directly to them
exports.allowedIds = async (user) => {
  if (user.role === 'admin') return null;
  const [viaWork, viaAssignment] = await Promise.all([
    Work.distinct('client', { assignedTo: user._id }),
    Client.distinct('_id', { assignedTo: user._id }),
  ]);
  return [...new Set([...viaWork, ...viaAssignment].map(String))];
};

exports.list = h(async (req, res) => {
  const ids = await exports.allowedIds(req.user);
  const clients = await Client.find(ids ? { _id: { $in: ids } } : {}).sort({ name: 1 }).populate('assignedTo', 'name').lean();
  const open = await Work.aggregate([{ $match: { status: { $ne: 'completed' } } }, { $group: { _id: '$client', n: { $sum: 1 } } }]);
  const map = Object.fromEntries(open.map((o) => [String(o._id), o.n]));
  res.json({ clients: clients.map((c) => ({ ...c, openWork: map[String(c._id)] || 0 })) });
});

exports.create = h(async (req, res) => {
  const d = await pick(req.body);
  const problem = check(d);
  if (problem) return res.status(400).json({ message: problem });
  const client = await Client.create({ ...d, createdBy: req.user._id });
  const assignee = d.assignedTo ? await User.findById(d.assignedTo).select('name') : null;
  log(`New client added: ${client.name}${assignee ? ` (assigned to ${assignee.name})` : ''}`, { actor: req.user._id, client: client._id });
  res.status(201).json({ client });
});

exports.update = h(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ message: 'Client not found.' });
  const before = await Client.findById(req.params.id);
  if (!before) return res.status(404).json({ message: 'Client not found.' });
  const d = await pick(req.body);
  const problem = check(d);
  if (problem) return res.status(400).json({ message: problem });

  const changes = [];
  if (d.name !== before.name) changes.push('name');
  if (d.email !== (before.email || '')) changes.push('email');
  if (d.phone !== (before.phone || '')) changes.push('phone');
  if (d.assignedTo !== undefined && String(d.assignedTo || '') !== String(before.assignedTo || '')) changes.push('assigned employee');

  const client = await Client.findByIdAndUpdate(req.params.id, d, { new: true }).populate('assignedTo', 'name');
  if (changes.length) log(`${req.user.name} edited client ${client.name}: ${changes.join(', ')}`, { actor: req.user._id, client: client._id });
  res.json({ client });
});
