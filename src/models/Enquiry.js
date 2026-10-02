const { Schema, model } = require('mongoose');

module.exports = model('Enquiry', new Schema({
  name: { type: String, required: true, trim: true, maxlength: 100 },
  email: { type: String, trim: true, lowercase: true, maxlength: 120 },   // optional
  phone: { type: String, required: true, trim: true, maxlength: 20 },
  message: { type: String, required: true, trim: true, maxlength: 2000 },
  status: { type: String, enum: ['new', 'contacted', 'closed'], default: 'new' },
  emailed: { type: Boolean, default: false },
  confirmationSent: { type: Boolean, default: false },
}, { timestamps: true }));
