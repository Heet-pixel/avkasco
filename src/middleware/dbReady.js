const mongoose = require('mongoose');

module.exports = (req, res, next) => {
  if (mongoose.connection.readyState === 1) return next();
  res.status(503).json({ message: 'The database is not connected. Start MongoDB and restart the server.' });
};
