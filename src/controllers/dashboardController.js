const Work = require('../models/Work');
const Client = require('../models/Client');
const User = require('../models/User');
const Activity = require('../models/Activity');
const h = require('../utils/asyncHandler');
const { todayStr, monthRange } = require('../utils/dates');

const pct = (cur, prev) => (prev === 0 ? (cur > 0 ? 100 : 0) : Math.round(((cur - prev) / prev) * 100));
const counts = (works, today) => {
  const total = works.length;
  const completed = works.filter((w) => w.status === 'completed').length;
  const overdue = works.filter((w) => w.status !== 'completed' && w.dueDate < today).length;
  return { total, completed, overdue, inProgress: total - completed - overdue };
};

exports.get = h(async (req, res) => {
  const today = todayStr();
  const ym = /^\d{4}-\d{2}$/.test(req.query.month || '') ? req.query.month : today.slice(0, 7);
  const { start, end, prevStart } = monthRange(ym);
  const year = +ym.slice(0, 4);
  const admin = req.user.role === 'admin';
  const scope = admin ? {} : { assignedTo: req.user._id };

  const [monthWorks, prevWorks, yearWorks, upcoming, recent] = await Promise.all([
    Work.find({ ...scope, dueDate: { $gte: start, $lt: end } }).select('dueDate status service').lean(),
    Work.find({ ...scope, dueDate: { $gte: prevStart, $lt: start } }).select('dueDate status').lean(),
    Work.find({ ...scope, dueDate: { $gte: `${year}-01-01`, $lt: `${year + 1}-01-01` } }).select('dueDate status').lean(),
    Work.find({ ...scope, status: { $ne: 'completed' }, dueDate: { $gte: today } }).sort({ dueDate: 1 }).limit(5).populate('client', 'name').lean(),
    Work.find(scope).sort({ updatedAt: -1 }).limit(5).populate('client', 'name').lean(),
  ]);

  const cur = counts(monthWorks, today);
  const prev = counts(prevWorks, today);
  const monthly = Array.from({ length: 12 }, () => ({ completed: 0, inProgress: 0, overdue: 0 }));
  yearWorks.forEach((w) => {
    const i = +w.dueDate.slice(5, 7) - 1;
    if (w.status === 'completed') monthly[i].completed++; else if (w.dueDate < today) monthly[i].overdue++; else monthly[i].inProgress++;
  });
  const byService = {};
  monthWorks.forEach((w) => { byService[w.service] = (byService[w.service] || 0) + 1; });

  const out = {
    month: ym, today, monthly, byService, upcoming, recent,
    stats: { ...cur, delta: { total: pct(cur.total, prev.total), completed: pct(cur.completed, prev.completed), overdue: pct(cur.overdue, prev.overdue) } },
  };

  if (admin) {
    const [clients, newNow, newPrev, employees, grouped, clientCounts, activity] = await Promise.all([
      Client.countDocuments({ active: true }),
      Client.countDocuments({ createdAt: { $gte: new Date(start), $lt: new Date(end) } }),
      Client.countDocuments({ createdAt: { $gte: new Date(prevStart), $lt: new Date(start) } }),
      User.find({ role: 'employee', active: true }).select('name designation').lean(),
      Work.aggregate([{ $match: { assignedTo: { $ne: null } } }, { $group: { _id: { u: '$assignedTo', done: { $eq: ['$status', 'completed'] } }, n: { $sum: 1 } } }]),
      Client.aggregate([{ $match: { assignedTo: { $ne: null } } }, { $group: { _id: '$assignedTo', n: { $sum: 1 } } }]),
      // Full attributed activity history is only for the main admin (superadmin) — see the dedicated History page.
      req.user.isSuperAdmin ? Activity.find().sort({ createdAt: -1 }).limit(6).populate('client', 'name').lean() : [],
    ]);
    const clientMap = Object.fromEntries(clientCounts.map((c) => [String(c._id), c.n]));
    out.stats.clients = clients;
    out.stats.delta.clients = pct(newNow, newPrev);
    out.team = employees.map((e) => {
      const n = (done) => grouped.filter((g) => String(g._id.u) === String(e._id) && g._id.done === done).reduce((a, g) => a + g.n, 0);
      return { ...e, active: n(false), completed: n(true), clients: clientMap[String(e._id)] || 0 };
    });
    out.activity = activity;
  } else {
    const mine = await Work.find(scope).select('status dueDate').lean();
    out.my = counts(mine, today);
    out.updates = await Activity.find({ $or: [{ actor: req.user._id }, { work: { $in: mine.map((w) => w._id) } }] }).sort({ createdAt: -1 }).limit(5).lean();
  }
  res.json(out);
});
