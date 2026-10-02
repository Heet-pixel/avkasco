import { api, esc, fmtDate, money, chip, today } from '/shared/core.js';
import { icon } from '/shared/icons.js';
import { formModal, json, tbl, pageHead, toast } from '/shared/ui.js';

export default async function invoices(el, { refresh }) {
  const { invoices: list } = await api('/invoices');
  const sum = (f) => list.filter(f).reduce((a, i) => a + i.amount, 0);
  const cols = [
    { h: 'Invoice', c: (i) => `<b>${esc(i.number)}</b>` },
    { h: 'Client', c: (i) => esc(i.client?.name || '-') },
    { h: 'Amount', c: (i) => money(i.amount) },
    { h: 'Due date', c: (i) => fmtDate(i.dueDate) },
    { h: 'Status', c: (i) => (i.status === 'paid' ? chip('Paid', 'green') : i.dueDate < today() ? chip('Overdue', 'red') : chip('Unpaid', 'orange')) },
    { h: 'Action', cls: 'act', c: (i) => `<button class="btn sm" data-set="${i._id}" data-to="${i.status === 'paid' ? 'unpaid' : 'paid'}">${i.status === 'paid' ? 'Mark unpaid' : 'Mark paid'}</button>` },
  ];
  el.innerHTML = pageHead('Invoices & Payments', `<button class="btn primary" id="add">${icon('plus', 18)} New Invoice</button>`) +
    `<div class="cards4"><div class="sc"><span class="ico b">${icon('invoices', 24)}</span><div><small>Total billed</small><b>${money(sum(() => true))}</b></div></div>
      <div class="sc"><span class="ico g">${icon('check', 24)}</span><div><small>Paid</small><b>${money(sum((i) => i.status === 'paid'))}</b></div></div>
      <div class="sc"><span class="ico o">${icon('clock', 24)}</span><div><small>Pending</small><b>${money(sum((i) => i.status !== 'paid'))}</b></div></div>
      <div class="sc"><span class="ico r">${icon('alert', 24)}</span><div><small>Overdue</small><b>${money(sum((i) => i.status !== 'paid' && i.dueDate < today()))}</b></div></div></div>
     <div class="card">${tbl(cols, list, 'No invoices yet.')}</div>`;
  el.querySelector('#add').addEventListener('click', async () => {
    const { clients } = await api('/clients');
    if (!clients.length) return toast('Add a client first.', false);
    formModal({
      title: 'New invoice', submit: 'Create invoice',
      fields: [
        { name: 'client', label: 'Client', type: 'select', required: true, full: true, options: clients.map((c) => [c._id, c.name]) },
        { name: 'amount', label: 'Amount (INR)', type: 'number', required: true, step: '0.01' },
        { name: 'dueDate', label: 'Due date', type: 'date', required: true },
        { name: 'notes', label: 'Notes', type: 'textarea', full: true },
      ],
      onSubmit: async (fd) => { await api('/invoices', { method: 'POST', body: json(fd) }); toast('Invoice created.'); refresh(); },
    });
  });
  el.addEventListener('click', async (e) => {
    const b = e.target.closest('[data-set]');
    if (!b) return;
    try { await api(`/invoices/${b.dataset.set}`, { method: 'PATCH', body: { status: b.dataset.to } }); refresh(); } catch (ex) { toast(ex.message, false); }
  });
}
