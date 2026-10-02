const { Schema, model } = require('mongoose');

module.exports = model('Invoice', new Schema({
  number: { type: String, required: true, unique: true },
  client: { type: Schema.Types.ObjectId, ref: 'Client', required: true },
  amount: { type: Number, required: true, min: 1 },
  dueDate: { type: String, required: true },
  status: { type: String, enum: ['unpaid', 'paid'], default: 'unpaid' },
  paidAt: Date,
  notes: { type: String, trim: true, maxlength: 500 },
}, { timestamps: true }));
