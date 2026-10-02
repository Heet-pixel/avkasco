const { Schema, model } = require('mongoose');

// One entry per employee per day, describing what they worked on. The
// "weekly" / "monthly" views in the UI are just this same list filtered
// by date range — there is no separate rollup document.
module.exports = model('Report', new Schema({
  employee: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  date: { type: String, required: true },   // YYYY-MM-DD, the day the report is for
  summary: { type: String, required: true, trim: true, maxlength: 2000 },
}, { timestamps: true }));
