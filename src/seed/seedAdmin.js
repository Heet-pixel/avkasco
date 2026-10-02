const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });
const mongoose = require('mongoose');
const ensureAdmin = require('../utils/ensureAdmin');

(async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/ca_v4', { serverSelectionTimeoutMS: 4000 });
    await ensureAdmin({ reset: true });
  } catch (err) { console.error('Seed failed:', err.message); process.exitCode = 1; }
  await mongoose.disconnect();
})();
