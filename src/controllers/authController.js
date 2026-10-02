const bcrypt = require('bcryptjs');
const User = require('../models/User');
const { sign } = require('../utils/token');
const { isMainAdmin } = require('../utils/mainAdmin');

const norm = (e) => String(e || '').toLowerCase().trim();
const mask = (e) => { const [u, d] = e.split('@'); return `${u.slice(0, 2)}***@${d}`; };
const publicUser = (u) => ({ name: u.name, email: u.email, role: u.role, isSuperAdmin: isMainAdmin(u), designation: u.designation });

// Step 1 of every login: is this email allowed, and does it already have a password?
exports.identify = async (req, res, next) => {
  try {
    const email = norm(req.body.email);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ message: 'Enter a valid email address.' });
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: 'You are not authorised. This email is not registered.' });
    if (!user.active) return res.status(403).json({ message: 'Your account is disabled. Please contact the administrator.' });
    res.json({ status: user.password ? 'password' : 'setup', masked: mask(email), name: user.name });
  } catch (err) { next(err); }
};

exports.login = async (req, res, next) => {
  try {
    const { email, password, remember } = req.body || {};
    if (!email || !password) return res.status(400).json({ message: 'Enter your email and password.' });
    const clean = norm(email);
    const user = await User.findOne({ email: clean });
    if (!user) return res.status(401).json({ message: 'You are not authorised. This email is not registered.' });
    if (!user.active) return res.status(403).json({ message: 'Your account is disabled. Please contact the administrator.' });
    if (!user.password) return res.status(409).json({ message: 'Set your password first.', status: 'setup' });
    if (!(await bcrypt.compare(String(password), user.password))) {
      console.warn(`Login failed for ${clean}: wrong password`);
      return res.status(401).json({ message: 'Incorrect password.' });
    }
    res.json({ token: sign(user, remember ? '30d' : undefined), user: publicUser(user) });
  } catch (err) { next(err); }
};

exports.changePassword = async (req, res, next) => {
  try {
    const { current, password } = req.body || {};
    if (String(password || '').length < 8) return res.status(400).json({ message: 'Use at least 8 characters for the new password.' });
    const user = await User.findById(req.user._id);
    if (!user.password || !(await bcrypt.compare(String(current || ''), user.password))) return res.status(400).json({ message: 'Your current password is incorrect.' });
    user.password = await bcrypt.hash(String(password), 10);
    await user.save();
    res.json({ message: 'Password changed.' });
  } catch (err) { next(err); }
};

exports.me = (req, res) => res.json({ user: publicUser(req.user) });
exports.publicUser = publicUser;
