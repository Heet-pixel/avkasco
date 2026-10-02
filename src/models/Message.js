const { Schema, model } = require('mongoose');

// One chat message. room 'team' = the group chat everyone shares; room 'client' = the
// conversation about one client (admins + the employees who work on that client).
const schema = new Schema({
  room: { type: String, enum: ['team', 'client'], required: true },
  client: { type: Schema.Types.ObjectId, ref: 'Client', default: null },
  sender: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  body: { type: String, required: true, trim: true, maxlength: 2000 },
  // A message can be edited once. The first version is kept so everyone can still see it.
  edited: { type: Boolean, default: false },
  originalBody: { type: String, maxlength: 2000 },
  editedAt: { type: Date },
  readBy: [{ type: Schema.Types.ObjectId, ref: 'User' }],
}, { timestamps: true });
schema.index({ room: 1, client: 1, createdAt: -1 });

module.exports = model('Message', schema);
