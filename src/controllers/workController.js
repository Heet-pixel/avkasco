const mongoose = require('mongoose');
const Work = require('../models/Work');
const Client = require('../models/Client');
const User = require('../models/User');
const h = require('../utils/asyncHandler');
const { log } = require('../utils/activity');
const { SERVICES, STATUSES, STATUS_LABEL } = require('../utils/constants');
const { validDate } = require('../utils/dates');

const populate = (q) => q.populate('client', 'name').populate('assignedTo', 'name');

exports.list = h(async (req, res) => {
  const f = req.user.role === 'admin' ? {} : { assignedTo: req.user._id };
  const { service, status, client, from, to } = req.query;
  if (SERVICES.includes(service)) f.service = service;
  if (STATUSES.includes(status)) f.status = status;
  if (mongoose.isValidObjectId(client)) f.client = client;
  if (validDate(from) || validDate(to)) f.dueDate = { ...(validDate(from) && { $gte: from }), ...(validDate(to) && { $lte: to }) };
  res.json({ works: await populate(Work.find(f).sort({ dueDate: 1 }).limit(1000)).lean() });
});

async function fields(b = {}) {
  const d = {};
  if (b.client !== undefined) {
    if (!mongoose.isValidObjectId(b.client) || !(await Client.exists({ _id: b.client }))) throw Object.assign(new Error('Choose a client.'), { status: 400 });
    d.client = b.client;
  }
  if (b.title !== undefined) {
    if (String(b.title).trim().length < 2) throw Object.assign(new Error('Enter the work title.'), { status: 400 });
    d.title = String(b.title).trim();
  }
  if (b.service !== undefined) d.service = SERVICES.includes(b.service) ? b.service : 'Others';
  if (b.dueDate !== undefined) {
    if (!validDate(b.dueDate)) throw Object.assign(new Error('Choose a valid due date.'), { status: 400 });
    d.dueDate = b.dueDate;
  }
  if (b.assignedTo !== undefined) {
    if (b.assignedTo === '' || b.assignedTo === null) d.assignedTo = null;
    else if (mongoose.isValidObjectId(b.assignedTo) && (await User.exists({ _id: b.assignedTo, active: true }))) d.assignedTo = b.assignedTo;
    else throw Object.assign(new Error('Choose a valid employee.'), { status: 400 });
  }
  if (b.status !== undefined) {
    if (!STATUSES.includes(b.status)) throw Object.assign(new Error('Invalid status.'), { status: 400 });
    d.status = b.status;
    d.completedAt = b.status === 'completed' ? new Date() : null;
  }
  if (b.notes !== undefined) d.notes = String(b.notes).trim();
  return d;
}

exports.create = h(async (req, res) => {
  const d = await fields(req.body);
  if (!d.client || !d.title || !d.dueDate) return res.status(400).json({ message: 'Client, title and due date are required.' });
  const work = await Work.create({ ...d, createdBy: req.user._id });
  const full = await populate(Work.findById(work._id)).lean();
  log(`New work added: ${full.title} for ${full.client.name}${full.assignedTo ? ` (assigned to ${full.assignedTo.name})` : ''}`, { actor: req.user._id, client: full.client._id, work: work._id });
  res.status(201).json({ work: full });
});

exports.edit = h(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ message: 'Work not found.' });
  const d = await fields(req.body);
  const work = await Work.findByIdAndUpdate(req.params.id, d, { new: true });
  if (!work) return res.status(404).json({ message: 'Work not found.' });
  res.json({ work: await populate(Work.findById(work._id)).lean() });
});

// Assigned employee (or admin) posts a status change and/or a note
exports.update = h(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ message: 'Work not found.' });
  const work = await Work.findById(req.params.id).populate('client', 'name');
  if (!work) return res.status(404).json({ message: 'Work not found.' });
  if (req.user.role !== 'admin' && String(work.assignedTo) !== String(req.user._id)) return res.status(403).json({ message: 'This work is not assigned to you.' });
  const { status } = req.body || {};
  const note = String(req.body?.note || '').trim().slice(0, 300);
  if (status && !STATUSES.includes(status)) return res.status(400).json({ message: 'Invalid status.' });
  if (!(status && status !== work.status) && !note) return res.status(400).json({ message: 'Choose a new status or write a note.' });
  if (status && status !== work.status) { work.status = status; work.completedAt = status === 'completed' ? new Date() : undefined; }
  await work.save();
  log(`${req.user.name} updated ${work.title} (${work.client.name})${status ? `: ${STATUS_LABEL[status]}` : ''}${note ? ` - ${note}` : ''}`, { actor: req.user._id, client: work.client._id, work: work._id });
  res.json({ work: await populate(Work.findById(work._id)).lean() });
});
