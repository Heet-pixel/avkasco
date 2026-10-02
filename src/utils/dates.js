// Dates are stored as "YYYY-MM-DD" text so time zones never shift a due date.
const pad = (n) => String(n).padStart(2, '0');
exports.todayStr = () => { const d = new Date(); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };
exports.validDate = (s) => /^\d{4}-\d{2}-\d{2}$/.test(s || '') && !Number.isNaN(new Date(s).getTime());
exports.monthRange = (ym) => {
  const [y, m] = ym.split('-').map(Number);
  const next = m === 12 ? `${y + 1}-01` : `${y}-${pad(m + 1)}`;
  const prev = m === 1 ? `${y - 1}-12` : `${y}-${pad(m - 1)}`;
  return { start: `${ym}-01`, end: `${next}-01`, prevStart: `${prev}-01` };
};
