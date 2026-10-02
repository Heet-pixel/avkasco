module.exports = (req, res, next) =>
  req.user.isSuperAdmin ? next() : res.status(403).json({ message: 'Only the main admin can access this.' });
