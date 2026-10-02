import { api, esc, avatarColor, chip } from '/shared/core.js';
import { icon } from '/shared/icons.js';
import { formModal, json, tbl, pageHead, avatar, toast } from '/shared/ui.js';

export function employeeForm(refresh, emp, isSuperAdmin) {
  const accessOptions = [['employee', 'Employee (assigned work only)']];
  if (isSuperAdmin) accessOptions.push(['admin', 'Partner / Admin (full control)']);
  formModal({
    title: emp ? 'Edit employee' : 'Add employee', submit: emp ? 'Save changes' : 'Add employee', values: emp || { role: 'employee' },
    fields: [
      { name: 'name', label: 'Full name', required: true, full: true },
      ...(emp ? [] : [{ name: 'email', label: 'Email (they log in with this)', type: 'email', required: true, full: true }]),
      { name: 'designation', label: 'Designation (e.g. Senior Associate)' },
      ...(isSuperAdmin ? [{ name: 'role', label: 'Access', type: 'select', required: true, options: accessOptions }] : []),
    ],
    onSubmit: async (fd) => {
      await api(emp ? `/employees/${emp._id}` : '/employees', { method: emp ? 'PATCH' : 'POST', body: json(fd) });
      toast(emp ? 'Employee updated.' : 'Employee added. They can now log in with their email and set a password.');
      refresh();
    },
  });
}

export default async function employees(el, { user, refresh }) {
  const { employees: list } = await api('/employees');
  const status = (e) => (!e.active ? chip('Disabled', 'grey') : e.passwordSet ? chip('Active', 'green') : chip('Password not set', 'orange'));
  const access = (e) => e.isSuperAdmin ? chip('Main Admin', 'indigo') : chip(e.role === 'admin' ? 'Partner / Admin' : 'Employee', e.role === 'admin' ? 'indigo' : 'blue');
  const cols = [
    { h: 'Name', c: (e) => `<span class="who">${avatar(e.name, avatarColor(e.name))}<span><b>${esc(e.name)}</b><small>${esc(e.designation || '')}</small></span></span>` },
    { h: 'Email', c: (e) => esc(e.email) },
    { h: 'Access', c: access },
    { h: 'Clients', c: (e) => e.clients },
    { h: 'Open work', c: (e) => e.openWork },
    { h: 'Status', c: status },
    {
      h: 'Action', cls: 'act', c: (e) => {
        if (e._id === user._id) return `<button class="btn sm" data-edit="${e._id}">${icon('edit', 14)} Edit</button>`;
        const canDelete = !e.isSuperAdmin && (e.role !== 'admin' || user.isSuperAdmin);
        return `<button class="btn sm" data-edit="${e._id}">${icon('edit', 14)} Edit</button> ` +
          `<button class="btn sm" data-toggle="${e._id}">${e.active ? 'Disable' : 'Enable'}</button>` +
          (canDelete ? ` <button class="btn sm danger" data-del="${e._id}">${icon('trash', 14)} Delete</button>` : '');
      },
    },
  ];
  el.innerHTML = pageHead('Employees', `<button class="btn primary" id="add">${icon('plus', 18)} Add Employee</button>`,
    user.isSuperAdmin
      ? `New people set their own password the first time they log in (a code is emailed to them). As the main admin, you can add up to 4 admin accounts in total and remove any of them.`
      : `New people set their own password the first time they log in (a code is emailed to them).`) +
    `<div class="card">${tbl(cols, list, 'No employees yet.')}</div>`;
  el.querySelector('#add').addEventListener('click', () => employeeForm(refresh, null, user.isSuperAdmin));
  el.addEventListener('click', async (e) => {
    const ed = e.target.closest('[data-edit]');
    if (ed) return employeeForm(refresh, list.find((x) => x._id === ed.dataset.edit), user.isSuperAdmin);
    const tg = e.target.closest('[data-toggle]');
    if (tg) {
      const emp = list.find((x) => x._id === tg.dataset.toggle);
      try { await api(`/employees/${emp._id}`, { method: 'PATCH', body: { active: !emp.active } }); refresh(); } catch (ex) { toast(ex.message, false); }
      return;
    }
    const del = e.target.closest('[data-del]');
    if (del) {
      const emp = list.find((x) => x._id === del.dataset.del);
      if (!confirm(`Remove ${emp.name}? This cannot be undone.`)) return;
      try { await api(`/employees/${emp._id}`, { method: 'DELETE' }); toast('Removed.'); refresh(); } catch (ex) { toast(ex.message, false); }
    }
  });
}
