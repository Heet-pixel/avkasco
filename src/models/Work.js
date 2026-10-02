const { Schema, model } = require('mongoose');
const { SERVICES, STATUSES } = require('../utils/constants');

module.exports = model('Work', new Schema({
  client: { type: Schema.Types.ObjectId, ref: 'Client', required: true },
  title: { type: String, required: true, trim: true, maxlength: 140 },      // e.g. "GST Return - Aug 2026"
  service: { type: String, enum: SERVICES, default: 'Others' },
  assignedTo: { type: Schema.Types.ObjectId, ref: 'User' },
  dueDate: { type: String, required: true },                                // YYYY-MM-DD
  status: { type: String, enum: STATUSES, default: 'not_started' },
  notes: { type: String, trim: true, maxlength: 1000 },
  completedAt: Date,
  createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true }));
