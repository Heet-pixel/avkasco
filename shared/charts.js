import { esc } from './core.js';

const NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const COLORS = { completed: '#16A34A', inProgress: '#2563EB', overdue: '#EF4444' };

// Stacked monthly bars (SVG scales to any screen width). monthly = [{completed, inProgress, overdue} x 12]
export function stackedBars(monthly) {
  const W = 640, H = 250, L = 34, B = 26, T = 10;
  const max = Math.max(4, ...monthly.map((m) => m.completed + m.inProgress + m.overdue));
  const step = Math.ceil(max / 4);
  const top = step * 4;
  const y = (v) => T + (H - T - B) * (1 - v / top);
  const bw = ((W - L) / 12) * 0.5;
  const grid = [0, 1, 2, 3, 4].map((i) => `<line x1="${L}" x2="${W}" y1="${y(i * step)}" y2="${y(i * step)}" stroke="#E6EAF2"/><text x="${L - 8}" y="${y(i * step) + 4}" text-anchor="end" font-size="11" fill="#7A879C">${i * step}</text>`).join('');
  const bars = monthly.map((m, i) => {
    const x = L + ((W - L) / 12) * i + ((W - L) / 12 - bw) / 2;
    let acc = 0;
    const seg = ['completed', 'inProgress', 'overdue'].map((k) => {
      const h = (m[k] / top) * (H - T - B);
      const r = h ? `<rect x="${x}" y="${y(acc + m[k])}" width="${bw}" height="${h}" fill="${COLORS[k]}" rx="2"><title>${NAMES[i]}: ${m[k]} ${k}</title></rect>` : '';
      acc += m[k];
      return r;
    }).join('');
    return seg + `<text x="${x + bw / 2}" y="${H - 8}" text-anchor="middle" font-size="11" fill="#7A879C">${NAMES[i]}</text>`;
  }).join('');
  return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Monthly work progress">${grid}${bars}</svg>
    <div class="legend"><span><i style="background:${COLORS.completed}"></i>Completed</span><span><i style="background:${COLORS.inProgress}"></i>In Progress</span><span><i style="background:${COLORS.overdue}"></i>Overdue</span></div>`;
}

export const SERVICE_COLORS = { GST: '#2563EB', 'Income Tax': '#16A34A', TDS: '#F5B301', Audit: '#7C3AED', 'ROC Compliance': '#F97316', 'Accounting & Bookkeeping': '#0EA5A4', Advisory: '#EF4444', Others: '#94A3B8' };

// Donut with the total in the middle and a legend (count + percent)
export function donut(byService) {
  const entries = Object.entries(byService).sort((a, b) => b[1] - a[1]);
  const total = entries.reduce((a, [, n]) => a + n, 0);
  if (!total) return '<p class="muted center pad">No work due in this month.</p>';
  const r = 52, c = 2 * Math.PI * r;
  let off = 0;
  const arcs = entries.map(([k, n]) => {
    const len = (n / total) * c;
    const s = `<circle cx="70" cy="70" r="${r}" fill="none" stroke="${SERVICE_COLORS[k] || '#94A3B8'}" stroke-width="22" stroke-dasharray="${len} ${c - len}" stroke-dashoffset="${-off}" transform="rotate(-90 70 70)"><title>${esc(k)}: ${n}</title></circle>`;
    off += len;
    return s;
  }).join('');
  return `<div class="donut"><svg viewBox="0 0 140 140" role="img" aria-label="Work by service type">${arcs}<text x="70" y="68" text-anchor="middle" font-size="24" font-weight="700" fill="#10203C">${total}</text><text x="70" y="86" text-anchor="middle" font-size="10" fill="#7A879C">Total Works</text></svg>
    <ul>${entries.map(([k, n]) => `<li><i style="background:${SERVICE_COLORS[k] || '#94A3B8'}"></i><span>${esc(k)}</span><b>${n}</b><em>(${Math.round((n / total) * 100)}%)</em></li>`).join('')}</ul></div>`;
}
