const { Schema, model } = require('mongoose');

module.exports = model('Application', new Schema({
  name: { type: String, required: true, trim: true, maxlength: 100 },
  email: { type: String, trim: true, lowercase: true, maxlength: 120 },   // optional
  phone: { type: String, required: true, trim: true, maxlength: 20 },
  position: { type: String, required: true, trim: true, maxlength: 100 },
  message: { type: String, trim: true, maxlength: 2000 },
  resumePath: { type: String, required: true },   // S3 key (or local file name when S3 is not set up)
  resumeName: { type: String, required: true },
  status: { type: String, enum: ['new', 'reviewed', 'shortlisted', 'rejected'], default: 'new' },
  emailed: { type: Boolean, default: false },
  confirmationSent: { type: Boolean, default: false },
}, { timestamps: true }));
