import { api, esc, fmtDate, downloadFile } from '/shared/core.js';
import { icon } from '/shared/icons.js';
import { formModal, tbl, pageHead, toast } from '/shared/ui.js';

export default async function documents(el, { params, refresh }) {
  const [{ clients }, { documents: docs }] = await Promise.all([api('/clients'), api('/documents' + (params.client ? `?client=${params.client}` : ''))]);
  const cols = [
    { h: 'Document', c: (d) => `<b>${esc(d.title)}</b><br><small class="muted">${esc(d.fileName)}</small>` },
    { h: 'Client', c: (d) => esc(d.client?.name || '-') },
    { h: 'Uploaded by', c: (d) => esc(d.uploadedBy?.name || '-') },
    { h: 'Date', c: (d) => fmtDate(d.createdAt.slice(0, 10)) },
    { h: 'File', cls: 'act', c: (d) => `<button class="btn sm" data-dl="${d._id}" data-name="${esc(d.fileName)}">${icon('download', 14)} Download</button>` },
  ];
  el.innerHTML = pageHead('Documents',
    `<select id="fc" aria-label="Client"><option value="">All clients</option>${clients.map((c) => `<option value="${c._id}"${c._id === params.client ? ' selected' : ''}>${esc(c.name)}</option>`).join('')}</select>
     <button class="btn primary" id="up">${icon('upload', 18)} Upload</button>`) +
    `<div class="card">${tbl(cols, docs, 'No documents yet.')}</div>`;
  el.querySelector('#fc').addEventListener('change', (e) => { location.hash = '#/documents' + (e.target.value ? `?client=${e.target.value}` : ''); });
  el.querySelector('#up').addEventListener('click', () => {
    if (!clients.length) return toast('Add a client first.', false);
    formModal({
      title: 'Upload document', submit: 'Upload',
      fields: [
        { name: 'client', label: 'Client', type: 'select', required: true, full: true, options: clients.map((c) => [c._id, c.name]) },
        { name: 'title', label: 'Title', full: true },
        { name: 'file', label: 'File (PDF, Word, Excel, PNG, JPG, max 10 MB)', type: 'file', required: true, full: true, accept: '.pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg' },
      ],
      onSubmit: async (fd) => { await api('/documents', { method: 'POST', body: fd }); toast('Document uploaded.'); refresh(); },
    });
  });
  el.addEventListener('click', async (e) => {
    const b = e.target.closest('[data-dl]');
    if (!b) return;
    try { await downloadFile(`/documents/${b.dataset.dl}/download`, b.dataset.name); } catch (ex) { toast(ex.message, false); }
  });
}
