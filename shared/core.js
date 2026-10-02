// Shared helpers for the admin and employee dashboards.
export const token = () => localStorage.getItem('ca_token') || sessionStorage.getItem('ca_token');

export function signOut() {
  localStorage.removeItem('ca_token');
  sessionStorage.removeItem('ca_token');
  location.href = '/login/';
}

export async function api(path, { method = 'GET', body } = {}) {
  const headers = { Authorization: 'Bearer ' + token() };
  let payload = body;
  if (body && !(body instanceof FormData)) { headers['Content-Type'] = 'application/json'; payload = JSON.stringify(body); }
  let res;
  try { res = await fetch('/api' + path, { method, headers, body: payload }); }
  catch { throw new Error('Cannot reach the server. Check your internet connection.'); }
  const data = await res.json().catch(() => ({}));
  if (res.status === 401 && path !== '/auth/login') signOut();
  if (!res.ok) throw Object.assign(new Error(data.message || 'Request failed.'), { status: res.status });
  return data;
}

// downloads a stored file: the server returns a short-lived S3 link, or streams the file in local mode
export async function downloadFile(path, name) {
  const res = await fetch('/api' + path, { headers: { Authorization: 'Bearer ' + token() } });
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).message || 'Could not download the file.');
  if ((res.headers.get('content-type') || '').includes('application/json')) return location.assign((await res.json()).url);
  const url = URL.createObjectURL(await res.blob());
  const a = Object.assign(document.createElement('a'), { href: url, download: name });
  a.click();
  URL.revokeObjectURL(url);
}

export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const pad = (n) => String(n).padStart(2, '0');
export const ymd = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const today = () => ymd(new Date());
const parts = (s) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
export const fmtDate = (s) => (s ? parts(s).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '-');
export const money = (n) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n || 0);
export const daysLeft = (s) => Math.round((parts(s) - parts(today())) / 86400000);
export const initials = (n = '') => n.split(' ').filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join('') || '?';
export const ago = (d) => {
  const m = Math.round((Date.now() - new Date(d)) / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m} min ago`;
  if (m < 1440) return `${Math.round(m / 60)} hours ago`;
  return `${Math.round(m / 1440)} day${Math.round(m / 1440) > 1 ? 's' : ''} ago`;
};
export const avatarColor = (n = '') => ['#3B6FD8', '#D94F70', '#E07B2E', '#7A5AF8', '#12A38A', '#C2872A'][[...n].reduce((a, c) => a + c.charCodeAt(0), 0) % 6];

export const SERVICES = ['GST', 'Income Tax', 'TDS', 'Audit', 'ROC Compliance', 'Accounting & Bookkeeping', 'Advisory', 'Others'];
export const STATUS = {
  not_started: ['Not Started', 'grey'], in_progress: ['In Progress', 'blue'], documents_pending: ['Documents Pending', 'orange'],
  under_review: ['Under Review', 'indigo'], completed: ['Completed', 'green'],
};
export const chip = (label, cls) => `<span class="chip ${cls}">${esc(label)}</span>`;
export const isOverdue = (w) => w.status !== 'completed' && w.dueDate < today();
export const statusChip = (w) => chip(...STATUS[w.status]) + (isOverdue(w) ? ' ' + chip('Overdue', 'red') : '');
export function dueChip(dueDate) {
  const n = daysLeft(dueDate);
  if (n < 0) return chip(`${-n} day${n === -1 ? '' : 's'} late`, 'red');
  if (n === 0) return chip('Today', 'red');
  return chip(`${n} day${n === 1 ? '' : 's'}`, n <= 3 ? 'red' : n <= 7 ? 'orange' : 'green');
}
export function dateBadge(s) {
  const d = parts(s);
  return `<span class="dbadge"><small>${d.toLocaleString('en-US', { month: 'short' }).toUpperCase()}</small><b>${d.getDate()}</b></span>`;
}
export const csv = (rows) => rows.map((r) => r.map((c) => `"${String(c ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
export function saveText(name, text, type = 'text/csv') {
  const url = URL.createObjectURL(new Blob([text], { type }));
  Object.assign(document.createElement('a'), { href: url, download: name }).click();
  URL.revokeObjectURL(url);
}
