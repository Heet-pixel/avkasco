const { Schema, model } = require('mongoose');

module.exports = model('Notice', new Schema({
  title: { type: String, required: true, trim: true, maxlength: 140 },
  body: { type: String, required: true, trim: true, maxlength: 2000 },
  author: { type: Schema.Types.ObjectId, ref: 'User' },
  recipient: { type: Schema.Types.ObjectId, ref: 'User', default: null },   // null = everyone; set = just that one employee
}, { timestamps: true }));
