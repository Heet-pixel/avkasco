const Activity = require('../models/Activity');
// Records a line in the activity feeds (never blocks the request if it fails).
exports.log = (text, { actor, client, work } = {}) => Activity.create({ text, actor, client, work }).catch((e) => console.error('activity:', e.message));
