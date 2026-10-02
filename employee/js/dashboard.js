import { api, esc, fmtDate, dateBadge, dueChip, statusChip, ago, avatarColor, STATUS} from '/shared/core.js';
import { icon } from '/shared/icons.js';
import { calendar } from '/shared/calendar.js';
import { workEvents } from '/shared/pages/calendar.js';
import { tbl, avatar, formModal, json, toast, openModal } from '/shared/ui.js';

const card = (cls, ic, label, value) => `<div class="sc"><span class="ico ${cls}">${icon(ic, 24)}</span><div><small>${label}</small><b>${value}</b></div></div>`;
const statusOptions = Object.entries(STATUS).map(([k, v]) => [k, v[0]]);

export default async function dashboard(el, { user, refresh }) {
  const [d, { works }] = await Promise.all([api('/dashboard'), api('/works')]);
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good Morning' : hour < 17 ? 'Good Afternoon' : 'Good Evening';
  const groups = { ongoing: works.filter((w) => w.status !== 'completed'), completed: works.filter((w) => w.status === 'completed'), all: works };
  let tab = 'ongoing';

  const saveUpdate = (workId) => async (fd) => {
    await api(`/works/${workId}/update`, { method: 'POST', body: json(fd) });
    toast('Update saved.');
    refresh();
  };
  const updateFields = (workOptions) => [
    ...(workOptions ? [{ name: 'work', label: 'Work', type: 'select', required: true, full: true, options: workOptions }] : []),
    { name: 'status', label: 'Status', type: 'select', required: true, full: true, options: statusOptions },
    { name: 'note', label: 'Note', type: 'textarea', full: true },
  ];

  const cols = [
    { h: 'Client', c: (w) => `<b>${esc(w.client?.name || '-')}</b>` }, { h: 'Work type', c: (w) => esc(w.title) },
    { h: 'Due date', c: (w) => fmtDate(w.dueDate) }, { h: 'Status', c: statusChip },
    { h: 'Action', cls: 'act', c: (w) => `<button class="btn sm" data-view="${w._id}">View</button>` },
  ];
  const upcoming = [{ h: 'Date', c: (w) => dateBadge(w.dueDate) }, { h: 'Work', c: (w) => `<b>${esc(w.client?.name || '')}</b><br><small class="muted">${esc(w.title)}</small>` }, { h: 'Due', c: (w) => dueChip(w.dueDate) }];

  function drawTable() {
    el.querySelector('#mywork').innerHTML = tbl(cols, groups[tab], tab === 'completed' ? 'Nothing completed yet.' : 'No work assigned to you here.');
    el.querySelectorAll('[data-tab]').forEach((b) => b.setAttribute('aria-selected', b.dataset.tab === tab));
  }

  el.innerHTML = `<div class="phead greet"><div><h1>${greeting}, ${esc(user.name.split(' ')[0])} &#128075;</h1><p class="muted">Here are your assigned tasks.</p></div></div>
    <div class="cards4">
      ${card('b', 'work', 'My Work Items', d.my.total)}${card('g', 'check', 'Completed', d.my.completed)}
      ${card('b', 'clock', 'In Progress', d.my.inProgress)}${card('r', 'alert', 'Overdue', d.my.overdue)}</div>
    <div class="card" style="margin-bottom:16px">
      <div class="chead"><h3>My Assigned Work</h3><button class="btn primary" id="addupd">${icon('plus', 16)} Add Update</button></div>
      <div class="tabs" role="tablist">${['ongoing', 'completed', 'all'].map((k) => `<button role="tab" data-tab="${k}" aria-selected="false">${k[0].toUpperCase() + k.slice(1)} (${groups[k].length})</button>`).join('')}</div>
      <div id="mywork"></div></div>
    <div class="grid2e">
      <div class="card"><div class="chead"><h3>Upcoming Deadlines (My Work)</h3><a href="#/calendar">View All</a></div>${tbl(upcoming, d.upcoming, 'No upcoming deadlines.')}</div>
      <div class="card"><div class="chead"><h3>My Calendar</h3></div><div id="minical"></div></div></div>
    <div class="card"><div class="chead"><h3>Recent Updates</h3></div>
      <ul class="feed">${d.updates.length ? d.updates.map((a) => `<li>${avatar('U', avatarColor(a.text))}<p>${esc(a.text)}</p><span class="t">${ago(a.createdAt)}</span></li>`).join('') : '<li class="muted">No updates yet.</li>'}</ul></div>`;

  drawTable();
  calendar(el.querySelector('#minical'), { load: workEvents, mini: true });
  el.querySelector('.tabs').addEventListener('click', (e) => { const b = e.target.closest('[data-tab]'); if (b) { tab = b.dataset.tab; drawTable(); } });

  el.querySelector('#addupd').addEventListener('click', () => {
    const open = groups.ongoing;
    if (!open.length) return toast('You have no ongoing work to update.', false);
    formModal({
      title: 'Add update', submit: 'Save update', fields: updateFields(open.map((w) => [w._id, `${w.client?.name}: ${w.title}`])),
      values: { status: open[0].status },
      onSubmit: (fd) => saveUpdate(fd.get('work'))(fd),
    });
  });

  el.addEventListener('click', (e) => {
    const b = e.target.closest('[data-view]');
    if (!b) return;
    const w = works.find((x) => x._id === b.dataset.view);
    const m = openModal({
      title: w.title,
      body: `<dl class="kv"><dt>Client</dt><dd>${esc(w.client?.name || '-')}</dd><dt>Service</dt><dd>${esc(w.service)}</dd><dt>Due date</dt><dd>${fmtDate(w.dueDate)}</dd><dt>Status</dt><dd>${statusChip(w)}</dd>${w.notes ? `<dt>Notes</dt><dd>${esc(w.notes)}</dd>` : ''}</dl><div id="upd"></div>`,
    });
    m.querySelector('#upd').innerHTML = '<button class="btn primary" id="go">Update status or add a note</button>';
    m.querySelector('#go').addEventListener('click', () => {
      m.close();
      formModal({ title: 'Update work', submit: 'Save update', fields: updateFields(null), values: { status: w.status }, onSubmit: saveUpdate(w._id) });
    });
  });
}
