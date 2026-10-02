// Forgot password: 1) check email  2) send OTP by email (AWS SES)  3) verify OTP  4) set new password
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { send, firm } = require('../utils/mailer');
const { sign, signReset } = require('../utils/token');
const { publicUser } = require('./authController');

const OTP_MINUTES = 10, MAX_ATTEMPTS = 5, COOLDOWN_MS = 60 * 1000;
const norm = (e) => String(e || '').toLowerCase().trim();
const validEmail = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
const hashOtp = (otp) => crypto.createHmac('sha256', process.env.JWT_SECRET || '').update(String(otp)).digest('hex');
const mask = (e) => { const [u, d] = e.split('@'); return `${u.slice(0, 2)}***@${d}`; };

exports.sendOtp = async (req, res, next) => {
  try {
    const email = norm(req.body.email);
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: 'We could not find a staff account with this email.' });
    const wait = user.resetOtpSentAt ? COOLDOWN_MS - (Date.now() - user.resetOtpSentAt) : 0;
    if (wait > 0) return res.status(429).json({ message: `Please wait ${Math.ceil(wait / 1000)} seconds before requesting another code.` });

    const otp = String(crypto.randomInt(100000, 1000000));
    user.resetOtpHash = hashOtp(otp);
    user.resetOtpExpires = new Date(Date.now() + OTP_MINUTES * 60 * 1000);
    user.resetOtpAttempts = 0;
    user.resetOtpSentAt = new Date();
    await user.save();

    const sent = await send({
      to: email,
      subject: `${firm()} password reset code`,
      text: `Your verification code is ${otp}.\n\nIt expires in ${OTP_MINUTES} minutes. If you did not ask to reset your password, you can ignore this email.`,
    });
    if (!sent) {
      user.resetOtpHash = undefined; user.resetOtpExpires = undefined; user.resetOtpSentAt = undefined;
      await user.save();
      return res.status(502).json({ message: 'We could not send the code. Check the AWS SES settings and that this email is verified in SES.' });
    }
    res.json({ message: `We sent a 6-digit code to ${mask(email)}.` });
  } catch (err) { next(err); }
};

exports.verify = async (req, res, next) => {
  try {
    const email = norm(req.body.email);
    const otp = String(req.body.otp || '').trim();
    if (!/^\d{6}$/.test(otp)) return res.status(400).json({ message: 'Enter the 6-digit code.' });
    const user = await User.findOne({ email }).select('+resetOtpHash');
    if (!user || !user.resetOtpHash || !user.resetOtpExpires || user.resetOtpExpires < new Date()) return res.status(400).json({ message: 'This code has expired. Request a new one.' });
    if (user.resetOtpAttempts >= MAX_ATTEMPTS) return res.status(429).json({ message: 'Too many wrong attempts. Request a new code.' });
    const ok = crypto.timingSafeEqual(Buffer.from(hashOtp(otp)), Buffer.from(user.resetOtpHash));
    if (!ok) {
      user.resetOtpAttempts += 1;
      await user.save();
      return res.status(400).json({ message: 'That code is not correct.' });
    }
    user.resetOtpHash = undefined; user.resetOtpExpires = undefined; user.resetOtpAttempts = 0;
    await user.save();
    res.json({ resetToken: signReset(user) });
  } catch (err) { next(err); }
};

exports.reset = async (req, res, next) => {
  try {
    const { resetToken, password } = req.body || {};
    let payload;
    try { payload = jwt.verify(String(resetToken || ''), process.env.JWT_SECRET); } catch { return res.status(400).json({ message: 'This reset session has expired. Please start again.' }); }
    if (payload.purpose !== 'reset') return res.status(400).json({ message: 'Invalid reset session.' });
    if (String(password || '').length < 8) return res.status(400).json({ message: 'Use at least 8 characters for your password.' });
    const user = await User.findById(payload.id);
    if (!user || (user.password || '').slice(-10) !== payload.pv) return res.status(400).json({ message: 'This reset link was already used. Please start again.' });
    user.password = await bcrypt.hash(String(password), 10);
    await user.save();
    res.json({ message: 'Your password has been saved.', token: sign(user, '30d'), user: publicUser(user) });
  } catch (err) { next(err); }
};
