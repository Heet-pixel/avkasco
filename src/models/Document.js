const { Schema, model } = require('mongoose');

module.exports = model('Document', new Schema({
  client: { type: Schema.Types.ObjectId, ref: 'Client', required: true },
  title: { type: String, required: true, trim: true, maxlength: 140 },
  fileKey: { type: String, required: true },
  fileName: { type: String, required: true },
  size: Number,
  uploadedBy: { type: Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true }));
