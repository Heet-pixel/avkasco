const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const app = require('./app');
const connectDB = require('./config/db');
const ensureAdmin = require('./utils/ensureAdmin');

const port = process.env.PORT || 3000;
(async () => {
  try {
    if (!process.env.JWT_SECRET) console.warn('JWT_SECRET is missing in .env: login will not work.');
    if (await connectDB()) await ensureAdmin();
  } catch (err) { console.error('Startup problem:', err.message); }
  app.listen(port, () => console.log(`Running at http://localhost:${port}`));
})();
