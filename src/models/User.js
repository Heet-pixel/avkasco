const { Schema, model } = require('mongoose');

module.exports = model('User', new Schema({
  name: { type: String, default: 'User', trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  role: { type: String, enum: ['admin', 'employee'], default: 'employee' },
  isSuperAdmin: { type: Boolean, default: false },   // the one main admin (heetshah@gmail.com) — can add/remove other admins and view the activity history
  designation: { type: String, trim: true, maxlength: 80 },
  active: { type: Boolean, default: true },
  password: String,                       // empty until the person sets it (first login, by OTP)
  resetOtpHash: { type: String, select: false },
  resetOtpExpires: Date,
  resetOtpAttempts: { type: Number, default: 0 },
  resetOtpSentAt: Date,
}, { timestamps: true }));
