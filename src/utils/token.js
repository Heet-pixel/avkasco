const jwt = require('jsonwebtoken');

exports.sign = (user, expiresIn) =>
  jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: expiresIn || process.env.JWT_EXPIRES || '1d' });

// Short-lived token proving the OTP was verified. Stops working once the password changes.
exports.signReset = (user) =>
  jwt.sign({ id: user._id, purpose: 'reset', pv: (user.password || '').slice(-10) }, process.env.JWT_SECRET, { expiresIn: '10m' });
