const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { isMainAdmin } = require('../utils/mainAdmin');

module.exports = async (req, res, next) => {
  try {
    const token = (req.headers.authorization || '').replace('Bearer ', '');
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    if (payload.purpose) throw new Error('not a login token');
    const user = await User.findById(payload.id).select('name email role isSuperAdmin designation active');
    if (!user || !user.active) throw new Error('no active user');
    user.isSuperAdmin = isMainAdmin(user);
    req.user = user;
    next();
  } catch {
    res.status(401).json({ message: 'Please log in again.' });
  }
};
