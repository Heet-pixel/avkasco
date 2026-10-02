const Enquiry = require('../models/Enquiry');
const { send, firm } = require('../utils/mailer');

const emailOk = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v || '');
const phoneOk = (v) => { const d = String(v || '').replace(/\D/g, ''); return d.length >= 8 && d.length <= 15; };

exports.create = async (req, res, next) => {
  try {
    const { name, email, phone, message } = req.body || {};
    if (!name || String(name).trim().length < 2) return res.status(400).json({ message: 'Enter your name.' });
    if (email && !emailOk(String(email).trim())) return res.status(400).json({ message: 'Enter a valid email address or leave it empty.' });
    if (!phoneOk(phone)) return res.status(400).json({ message: 'Enter a valid mobile number so we can contact you.' });
    if (!message || String(message).trim().length < 10) return res.status(400).json({ message: 'Write at least 10 characters in your message.' });
    const mail = email ? String(email).trim() : '';

    // 1) email the firm, 2) email the person a confirmation (if they gave an address), 3) save for the dashboard
    const emailed = await send({
      to: process.env.MAIL_TO,
      subject: `New website enquiry from ${name}`,
      replyTo: mail || undefined,
      lines: [['Name', name], ['Mobile', phone], ['Email', mail || '-'], ['Message', message]],
    });
    const confirmationSent = mail ? await send({
      to: mail,
      subject: `We received your message | ${firm()}`,
      text: `Hi ${name},\n\nThank you for contacting ${firm()}. We will contact you within 2 working days.\n\nYour message:\n${message}\n\nRegards,\n${firm()} Chartered Accountants`,
    }) : false;
    await Enquiry.create({ name, email: mail, phone, message, emailed, confirmationSent });
    res.status(201).json({ message: 'Thank you. We will contact you within 2 working days.' + (confirmationSent ? ' A confirmation has been sent to your email.' : '') });
  } catch (err) { next(err); }
};

exports.list = async (req, res, next) => {
  try {
    res.json({ enquiries: await Enquiry.find().sort({ createdAt: -1 }).limit(300) });
  } catch (err) { next(err); }
};

exports.setStatus = async (req, res, next) => {
  try {
    const { status } = req.body || {};
    if (!['new', 'contacted', 'closed'].includes(status)) return res.status(400).json({ message: 'Invalid status.' });
    const doc = await Enquiry.findByIdAndUpdate(req.params.id, { status }, { new: true });
    if (!doc) return res.status(404).json({ message: 'Enquiry not found.' });
    res.json({ enquiry: doc });
  } catch (err) { next(err); }
};
