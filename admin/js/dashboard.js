import { api, esc, fmtDate, dateBadge, dueChip, statusChip, ago, avatarColor } from '/shared/core.js';
import { icon } from '/shared/icons.js';
import { stackedBars, donut } from '/shared/charts.js';
import { tbl, pageHead, avatar } from '/shared/ui.js';
import { workForm } from '/shared/pages/work.js';
import { clientForm } from '/shared/pages/clients.js';
import { employeeForm } from './employees.js';

const delta = (n, badWhenUp = false) => `<em class="${(n >= 0) !== badWhenUp ? 'up' : 'down'}">${n >= 0 ? '&uarr;' : '&darr;'} ${Math.abs(n)}% vs last month</em>`;
const card = (cls, ic, label, value, note) => `<div class="sc"><span class="ico ${cls}">${icon(ic, 24)}</span><div><small>${label}</small><b>${value}</b>${note}</div></div>`;

export default async function dashboard(el, { user, params, refresh }) {
  const d = await api('/dashboard' + (params.month ? `?month=${params.month}` : ''));
  const s = d.stats;
  const upcoming = [
    { h: 'Date', c: (w) => dateBadge(w.dueDate) }, { h: 'Client', c: (w) => `<b>${esc(w.client?.name || '-')}</b>` },
    { h: 'Work type', c: (w) => esc(w.title) }, { h: 'Status', c: (w) => dueChip(w.dueDate) },
  ];
  const recent = [{ h: 'Client', c: (w) => esc(w.client?.name || '-') }, { h: 'Work type', c: (w) => esc(w.title) }, { h: 'Status', c: statusChip }];
  const team = [
    { h: 'Name', c: (m) => `<span class="who">${avatar(m.name, avatarColor(m.name))}<span><b>${esc(m.name)}</b><small>${esc(m.designation || 'Employee')}</small></span></span>` },
    { h: 'Clients', c: (m) => m.clients }, { h: 'Active works', c: (m) => m.active }, { h: 'Completed', c: (m) => m.completed },
  ];
  el.innerHTML = pageHead('Dashboard',
    `<input type="month" id="month" value="${d.month}" aria-label="Month">
     <button class="btn primary" id="aw">${icon('plus', 18)} Add Work</button><button class="btn" id="ac">${icon('plus', 18)} Add Client</button><button class="btn" id="ae">${icon('plus', 18)} Add Employee</button>`) +
    `<div class="cards4">
      ${card('b', 'clients', 'Total Clients', s.clients, delta(s.delta.clients))}
      ${card('b', 'work', 'Work Items (this month)', s.total, delta(s.delta.total))}
      ${card('g', 'check', 'Completed', s.completed, delta(s.delta.completed))}
      ${card('r', 'alert', 'Overdue', s.overdue, delta(s.delta.overdue, true))}</div>
    <div class="grid2">
      <div class="card"><div class="chead"><h3>Work Progress (${d.month.slice(0, 4)})</h3></div>${stackedBars(d.monthly)}</div>
      <div class="card"><div class="chead"><h3>Work by Service Type</h3></div>${donut(d.byService)}</div></div>
    <div class="grid2e">
      <div class="card"><div class="chead"><h3>Upcoming Deadlines</h3><a href="#/work">View All</a></div>${tbl(upcoming, d.upcoming, 'No upcoming deadlines.')}</div>
      <div class="card"><div class="chead"><h3>Recent Work Items</h3><a href="#/work">View All</a></div>${tbl(recent, d.recent, 'No work added yet.')}</div></div>
    <div class="grid2e">
      <div class="card"><div class="chead"><h3>Team Members</h3><a href="#/employees">View All</a></div>${tbl(team, d.team, 'No employees yet.')}</div>
      <div class="card"><div class="chead"><h3>Client Activity</h3><a href="#/communication">View All</a></div>
        <ul class="feed">${d.activity.length ? d.activity.map((a) => `<li>${avatar(a.client?.name || 'A', avatarColor(a.client?.name || 'A'))}<div><p>${esc(a.text)}</p><small>${esc(a.client?.name || '')}</small></div><span class="t">${ago(a.createdAt)}</span></li>`).join('') : '<li class="muted">No activity yet.</li>'}</ul></div></div>`;
  el.querySelector('#month').addEventListener('change', (e) => { if (e.target.value) location.hash = `#/dashboard?month=${e.target.value}`; });
  el.querySelector('#aw').addEventListener('click', () => workForm(refresh));
  el.querySelector('#ac').addEventListener('click', () => clientForm(refresh));
  el.querySelector('#ae').addEventListener('click', () => employeeForm(refresh, null, user.isSuperAdmin));
}
