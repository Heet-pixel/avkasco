import { api, esc, today, fmtDate, csv, saveText } from '/shared/core.js';
import { icon } from '/shared/icons.js';
import { pageHead, toast } from '/shared/ui.js';

function inRange(dateStr, range) {
  if (range === 'all') return true;
  const d = new Date(dateStr), now = new Date();
  const days = range === 'day' ? 1 : range === 'week' ? 7 : 31;
  return (now - d) / 86400000 < days;
}

export default async function workReports(el, { role, user }) {
  const admin = role === 'admin';
  const [{ reports }, employees] = await Promise.all([
    api('/work-reports'),
    admin ? api('/employees').then((d) => d.employees) : Promise.resolve([]),
  ]);

  let range = 'week', empFilter = 'all';

  const form = admin ? '' : `
    <div class="card">
      <h3 style="margin-bottom:12px">Add today's report</h3>
      <form id="rf" class="mform">
        <label class="full">What did you work on today?<textarea name="summary" rows="4" placeholder="e.g. Completed GST filing for ABC Traders, started TDS reconciliation for XYZ Pvt Ltd..." required></textarea></label>
        <div class="mactions full"><button class="btn primary" type="submit">${icon('plus', 16)} Save report</button></div>
      </form>
    </div>`;

  function renderList() {
    const filterBar = `<div class="phead" style="margin-top:18px"><div></div><div class="pactions">
      ${admin ? `<select id="empSel"><option value="all">All employees</option>${employees.map((e) => `<option value="${e._id}">${esc(e.name)}</option>`).join('')}</select>` : ''}
      <select id="rangeSel">
        <option value="day">Today</option><option value="week" selected>This week</option><option value="month">This month</option><option value="all">All time</option>
      </select>
      <button class="btn sm" id="exp">${icon('download', 14)} Export CSV</button>
    </div></div>`;

    const filtered = reports.filter((r) => inRange(r.date, range) && (!admin || empFilter === 'all' || r.employee?._id === empFilter));
    const list = `<div class="card">${filtered.length ? filtered.map((r) => `
        <div class="ann"><h4>${fmtDate(r.date)}${admin ? ` · ${esc(r.employee?.name || '')}` : ''}</h4><p>${esc(r.summary)}</p></div>`).join('')
      : '<p class="muted pad center">No reports in this range.</p>'}</div>`;

    return filterBar + list;
  }

  el.innerHTML = pageHead(admin ? 'Work Reports' : 'My Reports', '', admin ? "Everyone's day-by-day reports — filter by employee or time range." : 'Log what you worked on each day, and review your week or month.')
    + form + '<div id="listWrap"></div>';
  el.querySelector('#listWrap').innerHTML = renderList();

  function wireList() {
    el.querySelector('#rangeSel').value = range;
    el.querySelector('#rangeSel').addEventListener('change', (e) => { range = e.target.value; refreshList(); });
    el.querySelector('#empSel')?.addEventListener('change', (e) => { empFilter = e.target.value; refreshList(); });
    el.querySelector('#exp').addEventListener('click', () => {
      const filtered = reports.filter((r) => inRange(r.date, range) && (!admin || empFilter === 'all' || r.employee?._id === empFilter));
      saveText('work-reports.csv', csv([['Date', 'Employee', 'Summary'], ...filtered.map((r) => [r.date, r.employee?.name || '', r.summary])]));
    });
  }

  function refreshList() {
    el.querySelector('#listWrap').innerHTML = renderList();
    wireList();
  }

  wireList();

  el.querySelector('#rf')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const summary = new FormData(e.target).get('summary');
    try {
      const { report } = await api('/work-reports', { method: 'POST', body: { date: today(), summary } });
      const idx = reports.findIndex((r) => r.date === report.date && r.employee === user._id);
      if (idx >= 0) reports[idx] = { ...report, employee: { _id: user._id, name: user.name } };
      else reports.unshift({ ...report, employee: { _id: user._id, name: user.name } });
      e.target.reset();
      toast('Report saved.');
      refreshList();
    } catch (ex) { toast(ex.message, false); }
  });
}
