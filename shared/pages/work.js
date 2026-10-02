import { api, esc, fmtDate, statusChip, SERVICES, STATUS } from '/shared/core.js';
import { icon } from '/shared/icons.js';
import { formModal, json, tbl, pageHead, toast } from '/shared/ui.js';

// Add / edit work (admin). Loads clients and employees for the drop-downs.
export async function workForm(refresh, work) {
  const [{ clients }, { employees }] = await Promise.all([api('/clients'), api('/employees')]);
  formModal({
    title: work ? 'Edit work' : 'Add work', submit: work ? 'Save changes' : 'Add work', wide: true,
    values: work ? { client: work.client?._id, title: work.title, service: work.service, assignedTo: work.assignedTo?._id || '', dueDate: work.dueDate, status: work.status, notes: work.notes } : { status: 'not_started', service: 'GST' },
    fields: [
      { name: 'client', label: 'Client', type: 'select', required: true, options: [['', 'Choose a client'], ...clients.map((c) => [c._id, c.name])] },
      { name: 'title', label: 'Work (e.g. GST Return - Aug 2026)', required: true },
      { name: 'service', label: 'Service', type: 'select', required: true, options: SERVICES.map((s) => [s, s]) },
      { name: 'assignedTo', label: 'Assign to', type: 'select', options: [['', 'Not assigned'], ...employees.filter((e) => e.active).map((e) => [e._id, e.name])] },
      { name: 'dueDate', label: 'Due date', type: 'date', required: true },
      { name: 'status', label: 'Status', type: 'select', required: true, options: Object.entries(STATUS).map(([k, v]) => [k, v[0]]) },
      { name: 'notes', label: 'Notes', type: 'textarea', full: true },
    ],
    onSubmit: async (fd) => {
      await api(work ? `/works/${work._id}` : '/works', { method: work ? 'PATCH' : 'POST', body: json(fd) });
      toast(work ? 'Work updated.' : 'Work added.');
      refresh();
    },
  });
}

export default async function workPage(el, { params, refresh }) {
  const q = new URLSearchParams();
  if (params.service) q.set('service', params.service);
  if (params.status) q.set('status', params.status);
  const { works } = await api('/works' + (q.toString() ? `?${q}` : ''));
  const opts = (list, cur, all) => `<option value="">${all}</option>` + list.map(([v, l]) => `<option value="${esc(v)}"${v === cur ? ' selected' : ''}>${esc(l)}</option>`).join('');
  const cols = [
    { h: 'Client', c: (w) => `<b>${esc(w.client?.name || '-')}</b>` },
    { h: 'Work', c: (w) => esc(w.title) },
    { h: 'Service', c: (w) => esc(w.service) },
    { h: 'Assigned to', c: (w) => esc(w.assignedTo?.name || 'Not assigned') },
    { h: 'Due date', c: (w) => fmtDate(w.dueDate) },
    { h: 'Status', c: statusChip },
    { h: 'Action', cls: 'act', c: (w) => `<button class="btn sm" data-edit="${w._id}">${icon('edit', 14)} Edit</button>` },
  ];
  el.innerHTML = pageHead(params.service ? `${params.service} work` : 'Work Management',
    `<select id="fs" aria-label="Service">${opts(SERVICES.map((s) => [s, s]), params.service, 'All services')}</select>
     <select id="ft" aria-label="Status">${opts(Object.entries(STATUS).map(([k, v]) => [k, v[0]]), params.status, 'All statuses')}</select>
     <button class="btn primary" id="add">${icon('plus', 18)} Add Work</button>`) +
    `<div class="card">${tbl(cols, works, 'No work found. Add work for a client.')}</div>`;
  const go = () => { const p = new URLSearchParams(); if (el.querySelector('#fs').value) p.set('service', el.querySelector('#fs').value); if (el.querySelector('#ft').value) p.set('status', el.querySelector('#ft').value); location.hash = '#/work' + (p.toString() ? `?${p}` : ''); };
  el.querySelector('#fs').addEventListener('change', go);
  el.querySelector('#ft').addEventListener('change', go);
  el.querySelector('#add').addEventListener('click', () => workForm(refresh));
  el.addEventListener('click', (e) => { const b = e.target.closest('[data-edit]'); if (b) workForm(refresh, works.find((w) => w._id === b.dataset.edit)); });
}
