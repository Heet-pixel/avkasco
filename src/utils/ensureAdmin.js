const bcrypt = require('bcryptjs');
const User = require('../models/User');
const { mainEmail } = require('./mainAdmin');

// Creates the admin (from .env) and a starter employee if they do not exist yet.
// With { reset: true } the admin and starter employee passwords are reset to the values below.
async function ensure({ email, name, role, designation, password, isSuperAdmin }, reset) {
  const existing = await User.findOne({ email });
  if (!existing) {
    await User.create({ email, name, role, designation, isSuperAdmin: !!isSuperAdmin, password: await bcrypt.hash(password, 10) });
    console.log(`${role} created: ${email}`);
    return;
  }
  let changed = false;
  if (existing.role !== role) { existing.role = role; changed = true; }
  if (isSuperAdmin && !existing.isSuperAdmin) { existing.isSuperAdmin = true; changed = true; }
  if (reset || !existing.password) { existing.password = await bcrypt.hash(password, 10); changed = true; console.log(`${role} password set from .env: ${email}`); }
  if (changed) await existing.save();
  else console.log(`${role} exists: ${email}`);
}

module.exports = async function ensureAdmin({ reset = false } = {}) {
  const email = (process.env.ADMIN_EMAIL || '').toLowerCase().trim();
  if (email && process.env.ADMIN_PASSWORD) {
    await ensure({ email, name: process.env.ADMIN_NAME || 'Admin', role: 'admin', designation: 'Partner / Admin', password: process.env.ADMIN_PASSWORD }, reset);
  } else console.warn('ADMIN_EMAIL / ADMIN_PASSWORD missing in .env: no admin user created.');
  // Exactly one main admin (heetshah@gmail.com unless SUPER_ADMIN_EMAIL says otherwise):
  // only they can add/remove other admins and see the activity history.
  await User.updateMany({ email: { $ne: mainEmail() }, isSuperAdmin: true }, { isSuperAdmin: false });
  const { modifiedCount, matchedCount } = await User.updateOne({ email: mainEmail(), role: 'admin' }, { isSuperAdmin: true });
  if (matchedCount) console.log(`main admin: ${mainEmail()}${modifiedCount ? '' : ' (already set)'}`);
  // Starter employee for testing (skipped when NODE_ENV=production)
  if (process.env.NODE_ENV !== 'production') {
    await ensure({ email: 'deepshah@gmail.com', name: 'Deep Shah', role: 'employee', designation: 'Associate', password: '12312312' }, reset);
  }
};
