import { api, esc, avatarColor } from '/shared/core.js';
import { icon } from '/shared/icons.js';
import { formModal, json, tbl, pageHead, avatar, toast } from '/shared/ui.js';

const baseFields = [
  { name: 'name', label: 'Client name', required: true, full: true },
  { name: 'contactPerson', label: 'Contact person' },
  { name: 'phone', label: 'Phone', type: 'tel' },
  { name: 'email', label: 'Email', type: 'email', full: true },
  { name: 'notes', label: 'Notes', type: 'textarea', full: true },
];

export async function clientForm(refresh, client) {
  const { employees } = await api('/employees');
  const assignOptions = [['', 'Not assigned yet'], ...employees.filter((e) => e.active).map((e) => [e._id, e.name])];
  const fields = [...baseFields, { name: 'assignedTo', label: 'Assign to employee', type: 'select', full: true, options: assignOptions }];
  formModal({
    title: client ? 'Edit client' : 'Add client', fields, submit: client ? 'Save changes' : 'Add client',
    values: client ? { ...client, assignedTo: client.assignedTo?._id || '' } : {},
    onSubmit: async (fd) => {
      await api(client ? `/clients/${client._id}` : '/clients', { method: client ? 'PATCH' : 'POST', body: json(fd) });
      toast(client ? 'Client updated.' : 'Client added.');
      refresh();
    },
  });
}

export default async function clients(el, { role, refresh }) {
  const admin = role === 'admin';
  const { clients: list } = await api('/clients');
  const cols = [
    { h: 'Client', c: (c) => `<span class="who">${avatar(c.name, avatarColor(c.name))}<span><b>${esc(c.name)}</b>${c.notes ? `<small>${esc(c.notes)}</small>` : ''}</span></span>` },
    { h: 'Contact person', c: (c) => esc(c.contactPerson || '-') },
    { h: 'Phone', c: (c) => esc(c.phone || '-') },
    { h: 'Email', c: (c) => esc(c.email || '-') },
  ];
  if (admin) cols.push({ h: 'Assigned to', c: (c) => c.assignedTo ? esc(c.assignedTo.name) : '<span class="muted">Unassigned</span>' });
  cols.push({ h: 'Open work', c: (c) => c.openWork });
  if (admin) cols.push({ h: 'Action', cls: 'act', c: (c) => `<button class="btn sm" data-edit="${c._id}">${icon('edit', 14)} Edit</button>` });
  el.innerHTML = pageHead('Clients', admin ? `<button class="btn primary" id="add">${icon('plus', 18)} Add Client</button>` : '') +
    `<div class="card">${tbl(cols, list, admin ? 'No clients yet. Add your first client.' : 'No clients are assigned to you yet.')}</div>`;
  el.querySelector('#add')?.addEventListener('click', () => clientForm(refresh));
  el.addEventListener('click', (e) => { const b = e.target.closest('[data-edit]'); if (b) clientForm(refresh, list.find((c) => c._id === b.dataset.edit)); });
}
