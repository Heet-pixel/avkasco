// Optional sample data so the dashboards are not empty:  npm run seed:demo
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });
const mongoose = require('mongoose');
const ensureAdmin = require('../utils/ensureAdmin');
const User = require('../models/User');
const Client = require('../models/Client');
const Work = require('../models/Work');
const Activity = require('../models/Activity');
const Invoice = require('../models/Invoice');

const day = (offset) => { const d = new Date(); d.setDate(d.getDate() + offset); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };

(async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/ca_v4', { serverSelectionTimeoutMS: 4000 });
    await ensureAdmin();
    if (await Client.countDocuments()) { console.log('Clients already exist, skipping demo data.'); return; }
    const deep = await User.findOne({ email: 'deepshah@gmail.com' });
    const names = ['ABC Pvt. Ltd.', 'Shree Traders', 'Ketan Shah', 'Mittal Enterprises', 'Patel & Sons', 'Ravi Industries'];
    const clients = await Client.insertMany(names.map((name) => ({ name, phone: '9000000000' })));
    const c = (n) => clients[names.indexOf(n)]._id;
    const rows = [
      ['ABC Pvt. Ltd.', 'GST Return', 'GST', 3, 'in_progress'], ['Shree Traders', 'TDS Return - Q2', 'TDS', 5, 'documents_pending'],
      ['Ketan Shah', 'Income Tax Return', 'Income Tax', 5, 'under_review'], ['Mittal Enterprises', 'ROC Filing', 'ROC Compliance', 10, 'not_started'],
      ['Patel & Sons', 'Bookkeeping', 'Accounting & Bookkeeping', 15, 'in_progress'], ['Ravi Industries', 'Audit Report Submission', 'Audit', 8, 'in_progress'],
      ['ABC Pvt. Ltd.', 'TDS Return', 'TDS', -6, 'completed'], ['Ketan Shah', 'GST Return', 'GST', -12, 'completed'],
      ['Shree Traders', 'Advisory Review', 'Advisory', -3, 'in_progress'], ['Patel & Sons', 'GST Return', 'GST', -20, 'completed'],
    ];
    const works = await Work.insertMany(rows.map(([client, title, service, off, status]) => ({
      client: c(client), title, service, dueDate: day(off), status, assignedTo: deep._id, completedAt: status === 'completed' ? new Date() : undefined,
    })));
    await Activity.insertMany([
      { text: 'ABC Pvt. Ltd. uploaded documents for GST Return', client: c('ABC Pvt. Ltd.'), work: works[0]._id },
      { text: 'Ketan Shah approved the ITR draft', client: c('Ketan Shah'), work: works[2]._id },
      { text: 'Shree Traders requested a meeting', client: c('Shree Traders'), work: works[1]._id },
    ]);
    await Invoice.insertMany([{ number: 'INV-0001', client: c('ABC Pvt. Ltd.'), amount: 25000, dueDate: day(10) }, { number: 'INV-0002', client: c('Shree Traders'), amount: 12000, dueDate: day(-2), status: 'paid', paidAt: new Date() }]);
    console.log('Demo data added.');
  } catch (err) { console.error('Demo seed failed:', err.message); process.exitCode = 1; }
  await mongoose.disconnect();
})();
