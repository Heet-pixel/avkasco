import { api, esc, money, csv, saveText, isOverdue, SERVICES, STATUS, fmtDate } from '/shared/core.js';
import { icon } from '/shared/icons.js';
import { tbl, pageHead } from '/shared/ui.js';

export default async function reports(el) {
  const [{ works }, { invoices }, { employees }] = await Promise.all([api('/works'), api('/invoices'), api('/employees')]);
  const done = works.filter((w) => w.status === 'completed').length;
  const overdue = works.filter(isOverdue).length;
  const paid = invoices.filter((i) => i.status === 'paid').reduce((a, i) => a + i.amount, 0);
  const row = (name, list) => ({ name, total: list.length, done: list.filter((w) => w.status === 'completed').length, late: list.filter(isOverdue).length });
  const byService = SERVICES.map((s) => row(s, works.filter((w) => w.service === s))).filter((r) => r.total);
  const byPerson = employees.map((e) => ({ ...row(e.name, works.filter((w) => w.assignedTo?._id === e._id)), clients: e.clients })).filter((r) => r.total || r.clients);
  const cols = (first) => [{ h: first, c: (r) => `<b>${esc(r.name)}</b>` }, { h: 'Total', c: (r) => r.total }, { h: 'Completed', c: (r) => r.done }, { h: 'Overdue', c: (r) => r.late }];
  const personCols = [...cols('Employee').slice(0, 1), { h: 'Clients', c: (r) => r.clients }, ...cols('Employee').slice(1)];
  el.innerHTML = pageHead('Reports', `<button class="btn" id="cw">${icon('download', 16)} Work (CSV)</button><button class="btn" id="ci">${icon('download', 16)} Invoices (CSV)</button>`) +
    `<div class="cards4"><div class="sc"><span class="ico b">${icon('work', 24)}</span><div><small>All work items</small><b>${works.length}</b></div></div>
      <div class="sc"><span class="ico g">${icon('check', 24)}</span><div><small>Completion rate</small><b>${works.length ? Math.round((done / works.length) * 100) : 0}%</b></div></div>
      <div class="sc"><span class="ico r">${icon('alert', 24)}</span><div><small>Overdue</small><b>${overdue}</b></div></div>
      <div class="sc"><span class="ico o">${icon('invoices', 24)}</span><div><small>Revenue collected</small><b>${money(paid)}</b></div></div></div>
     <div class="grid2e"><div class="card"><div class="chead"><h3>By service</h3></div>${tbl(cols('Service'), byService, 'No data yet.')}</div>
      <div class="card"><div class="chead"><h3>By employee</h3></div>${tbl(personCols, byPerson, 'No assigned work yet.')}</div></div>`;
  el.querySelector('#cw').addEventListener('click', () => saveText('work.csv', csv([['Client', 'Work', 'Service', 'Assigned to', 'Due date', 'Status'], ...works.map((w) => [w.client?.name, w.title, w.service, w.assignedTo?.name || '', fmtDate(w.dueDate), STATUS[w.status][0]])])));
  el.querySelector('#ci').addEventListener('click', () => saveText('invoices.csv', csv([['Invoice', 'Client', 'Amount', 'Due date', 'Status'], ...invoices.map((i) => [i.number, i.client?.name, i.amount, fmtDate(i.dueDate), i.status])])));
}
