const { Schema, model } = require('mongoose');

module.exports = model('Client', new Schema({
  name: { type: String, required: true, trim: true, maxlength: 120 },
  contactPerson: { type: String, trim: true, maxlength: 100 },
  email: { type: String, trim: true, lowercase: true, maxlength: 120 },
  phone: { type: String, trim: true, maxlength: 20 },
  notes: { type: String, trim: true, maxlength: 1000 },
  active: { type: Boolean, default: true },
  assignedTo: { type: Schema.Types.ObjectId, ref: 'User', default: null },   // the employee this client has been handed to
  createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true }));
