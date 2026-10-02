const fs = require('fs');
const Application = require('../models/Application');
const { send, firm } = require('../utils/mailer');
const { validSignature } = require('../middleware/upload');
const storage = require('../utils/storage');

const emailOk = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v || '');
const phoneOk = (v) => { const d = String(v || '').replace(/\D/g, ''); return d.length >= 8 && d.length <= 15; };

exports.create = async (req, res, next) => {
  const file = req.file;
  let key;
  try {
    const { name, email, phone, position, message } = req.body || {};
    if (!name || String(name).trim().length < 2) return res.status(400).json({ message: 'Enter your full name.' });
    if (email && !emailOk(String(email).trim())) return res.status(400).json({ message: 'Enter a valid email address or leave it empty.' });
    if (!phoneOk(phone)) return res.status(400).json({ message: 'Enter a valid mobile number.' });
    if (!position || String(position).trim().length < 2) return res.status(400).json({ message: 'Enter the position you are applying for.' });
    if (!file) return res.status(400).json({ message: 'Attach your resume (PDF, DOC or DOCX, max 5 MB).' });
    if (!validSignature(file.buffer)) return res.status(400).json({ message: 'That file is not a valid PDF, DOC or DOCX.' });
    const mail = email ? String(email).trim() : '';

    // 1) upload the resume to S3, 2) email the firm (CV attached), 3) confirm to the applicant, 4) save for the dashboard
    key = await storage.saveResume(file);
    const emailed = await send({
      to: process.env.MAIL_TO,
      subject: `New job application: ${position} - ${name}`,
      replyTo: mail || undefined,
      lines: [['Name', name], ['Mobile', phone], ['Email', mail || '-'], ['Position', position], ['Message', message || '-']],
      attachments: [{ filename: file.originalname, content: file.buffer }],
    });
    const confirmationSent = mail ? await send({
      to: mail,
      subject: `We received your application | ${firm()}`,
      text: `Hi ${name},\n\nThank you for applying for ${position} at ${firm()}. We have received your application and will get back to you if your profile matches an opening.\n\nRegards,\n${firm()} Chartered Accountants`,
    }) : false;
    await Application.create({ name, email: mail, phone, position, message, resumePath: key, resumeName: file.originalname, emailed, confirmationSent });
    res.status(201).json({ message: 'Application received. We will contact you if your profile matches an opening.' + (confirmationSent ? ' A confirmation has been sent to your email.' : '') });
  } catch (err) {
    if (key) storage.deleteResume(key);
    next(err);
  }
};

exports.list = async (req, res, next) => {
  try {
    res.json({ applications: await Application.find().sort({ createdAt: -1 }).limit(300) });
  } catch (err) { next(err); }
};

exports.setStatus = async (req, res, next) => {
  try {
    const { status } = req.body || {};
    if (!['new', 'reviewed', 'shortlisted', 'rejected'].includes(status)) return res.status(400).json({ message: 'Invalid status.' });
    const doc = await Application.findByIdAndUpdate(req.params.id, { status }, { new: true });
    if (!doc) return res.status(404).json({ message: 'Application not found.' });
    res.json({ application: doc });
  } catch (err) { next(err); }
};

// S3: returns a 5-minute download link. Local testing mode: streams the file.
exports.resume = async (req, res, next) => {
  try {
    const doc = await Application.findById(req.params.id);
    if (!doc) return res.status(404).json({ message: 'Application not found.' });
    const access = await storage.resumeAccess(doc.resumePath, doc.resumeName);
    if (access.url) return res.json({ url: access.url });
    if (!fs.existsSync(access.file)) return res.status(404).json({ message: 'The resume file is missing.' });
    res.download(access.file, doc.resumeName);
  } catch (err) { next(err); }
};
