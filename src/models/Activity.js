const { Schema, model } = require('mongoose');

module.exports = model('Activity', new Schema({
  text: { type: String, required: true, maxlength: 400 },
  actor: { type: Schema.Types.ObjectId, ref: 'User' },
  client: { type: Schema.Types.ObjectId, ref: 'Client' },
  work: { type: Schema.Types.ObjectId, ref: 'Work' },
}, { timestamps: true }));
