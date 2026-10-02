// Tiny per-IP limiter for public forms (stops spam and email flooding).
module.exports = ({ windowMs = 15 * 60 * 1000, max = 10 } = {}) => {
  const hits = new Map();
  return (req, res, next) => {
    const now = Date.now();
    const recent = (hits.get(req.ip) || []).filter((t) => now - t < windowMs);
    if (recent.length >= max) return res.status(429).json({ message: 'Too many submissions. Please try again in a few minutes.' });
    recent.push(now);
    hits.set(req.ip, recent);
    next();
  };
};
