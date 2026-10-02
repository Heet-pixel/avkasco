const mongoose = require('mongoose');
const User = require('../models/User');
const Work = require('../models/Work');
const Client = require('../models/Client');
const h = require('../utils/asyncHandler');
const { log } = require('../utils/activity');
const { send, firm } = require('../utils/mailer');
const { isMainAdmin } = require('../utils/mainAdmin');

const emailOk = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
const ADMIN_CAP = 4; // total admin-role accounts allowed, main admin included

exports.list = h(async (req, res) => {
  const users = await User.find().sort({ name: 1 }).lean();
  const open = await Work.aggregate([{ $match: { status: { $ne: 'completed' }, assignedTo: { $ne: null } } }, { $group: { _id: '$assignedTo', n: { $sum: 1 } } }]);
  const clients = await Client.aggregate([{ $match: { assignedTo: { $ne: null } } }, { $group: { _id: '$assignedTo', n: { $sum: 1 } } }]);
  const openMap = Object.fromEntries(open.map((o) => [String(o._id), o.n]));
  const clientMap = Object.fromEntries(clients.map((c) => [String(c._id), c.n]));
  res.json({
    employees: users.map((u) => ({
      _id: u._id, name: u.name, email: u.email, role: u.role, isSuperAdmin: isMainAdmin(u), designation: u.designation,
      active: u.active, passwordSet: !!u.password, openWork: openMap[String(u._id)] || 0, clients: clientMap[String(u._id)] || 0,
    })),
  });
});

exports.create = h(async (req, res) => {
  const name = String(req.body?.name || '').trim();
  const email = String(req.body?.email || '').toLowerCase().trim();
  if (name.length < 2) return res.status(400).json({ message: 'Enter the employee name.' });
  if (!emailOk(email)) return res.status(400).json({ message: 'Enter a valid email address.' });
  if (await User.exists({ email })) return res.status(409).json({ message: 'This email already has an account.' });

  const wantsAdmin = req.body?.role === 'admin';
  if (wantsAdmin && !req.user.isSuperAdmin) return res.status(403).json({ message: 'Only the main admin can add another admin.' });
  if (wantsAdmin && (await User.countDocuments({ role: 'admin' })) >= ADMIN_CAP) return res.status(400).json({ message: `There can only be ${ADMIN_CAP} admin accounts at a time.` });

  const role = wantsAdmin ? 'admin' : 'employee';
  const user = await User.create({ name, email, designation: String(req.body?.designation || '').trim(), role });
  const site = process.env.SITE_URL || `http://localhost:${process.env.PORT || 3000}`;
  send({ to: email, subject: `You have been added to the ${firm()} portal`, text: `Hi ${name},\n\nYou have been added to the ${firm()} team portal as ${role === 'admin' ? 'an admin' : 'an employee'}.\n\nOpen ${site}/login/ , enter this email address, and follow the steps to set your password.\n\nRegards,\n${firm()}` });
  log(`${req.user.name} added ${role === 'admin' ? 'admin' : 'employee'}: ${name} (${email})`, { actor: req.user._id });
  res.status(201).json({ employee: { _id: user._id, name, email, role: user.role } });
});

exports.update = h(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ message: 'Employee not found.' });
  const target = await User.findById(req.params.id);
  if (!target) return res.status(404).json({ message: 'Employee not found.' });

  const d = {};
  const changes = [];
  if (req.body?.name !== undefined && String(req.body.name).trim() && req.body.name !== target.name) { d.name = String(req.body.name).trim(); changes.push('name'); }
  if (req.body?.designation !== undefined) d.designation = String(req.body.designation).trim();

  if (req.body?.role !== undefined) {
    const wantsAdmin = req.body.role === 'admin';
    const isAdminNow = target.role === 'admin';
    if (wantsAdmin !== isAdminNow) {
      if (!req.user.isSuperAdmin) return res.status(403).json({ message: 'Only the main admin can change admin access.' });
      if (isMainAdmin(target)) return res.status(400).json({ message: "The main admin's access cannot be changed." });
      if (wantsAdmin && (await User.countDocuments({ role: 'admin' })) >= ADMIN_CAP) return res.status(400).json({ message: `There can only be ${ADMIN_CAP} admin accounts at a time.` });
      d.role = wantsAdmin ? 'admin' : 'employee';
      changes.push(wantsAdmin ? 'promoted to admin' : 'moved back to employee');
    }
  }
  if (req.body?.active !== undefined && !!req.body.active !== target.active) { d.active = !!req.body.active; changes.push(d.active ? 'enabled' : 'disabled'); }

  if (String(req.user._id) === req.params.id && (d.active === false || (d.role && d.role !== 'admin'))) return res.status(400).json({ message: 'You cannot disable or demote your own account.' });
  if (isMainAdmin(target) && d.active === false) return res.status(400).json({ message: 'The main admin cannot be disabled.' });

  await User.findByIdAndUpdate(req.params.id, d);
  if (changes.length) log(`${req.user.name} updated ${target.name}: ${changes.join(', ')}`, { actor: req.user._id });
  res.json({ ok: true });
});

// Any admin may delete an employee. Only the main admin may delete another admin.
// The main admin account itself can never be deleted, and nobody can delete themselves.
exports.remove = h(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ message: 'Employee not found.' });
  if (String(req.user._id) === req.params.id) return res.status(400).json({ message: 'You cannot remove your own account.' });
  const target = await User.findById(req.params.id);
  if (!target) return res.status(404).json({ message: 'Employee not found.' });
  if (isMainAdmin(target)) return res.status(400).json({ message: 'The main admin account cannot be removed.' });
  if (target.role === 'admin' && !req.user.isSuperAdmin) return res.status(403).json({ message: 'Only the main admin can remove another admin.' });

  await User.findByIdAndDelete(req.params.id);
  log(`${req.user.name} removed ${target.role}: ${target.name} (${target.email})`, { actor: req.user._id });
  res.json({ ok: true });
});
