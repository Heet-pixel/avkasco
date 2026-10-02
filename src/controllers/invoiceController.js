const mongoose = require('mongoose');
const Invoice = require('../models/Invoice');
const Client = require('../models/Client');
const h = require('../utils/asyncHandler');
const { log } = require('../utils/activity');
const { validDate } = require('../utils/dates');

exports.list = h(async (req, res) => {
  res.json({ invoices: await Invoice.find().sort({ createdAt: -1 }).limit(500).populate('client', 'name').lean() });
});

exports.create = h(async (req, res) => {
  const { client, amount, dueDate, notes } = req.body || {};
  if (!mongoose.isValidObjectId(client) || !(await Client.exists({ _id: client }))) return res.status(400).json({ message: 'Choose a client.' });
  if (!(Number(amount) > 0)) return res.status(400).json({ message: 'Enter an amount greater than zero.' });
  if (!validDate(dueDate)) return res.status(400).json({ message: 'Choose a valid due date.' });
  let invoice;
  for (let i = 0; !invoice && i < 5; i++) {
    const number = `INV-${String((await Invoice.countDocuments()) + 1 + i).padStart(4, '0')}`;
    try { invoice = await Invoice.create({ number, client, amount: Number(amount), dueDate, notes }); } catch (e) { if (e.code !== 11000) throw e; }
  }
  if (!invoice) return res.status(500).json({ message: 'Could not create the invoice. Try again.' });
  log(`Invoice ${invoice.number} created`, { actor: req.user._id, client });
  res.status(201).json({ invoice });
});

exports.setStatus = h(async (req, res) => {
  const { status } = req.body || {};
  if (!['paid', 'unpaid'].includes(status)) return res.status(400).json({ message: 'Invalid status.' });
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ message: 'Invoice not found.' });
  const inv = await Invoice.findByIdAndUpdate(req.params.id, { status, paidAt: status === 'paid' ? new Date() : null }, { new: true }).populate('client', 'name');
  if (!inv) return res.status(404).json({ message: 'Invoice not found.' });
  log(`${req.user.name} marked invoice ${inv.number} as ${status}`, { actor: req.user._id, client: inv.client?._id });
  res.json({ invoice: inv });
});
