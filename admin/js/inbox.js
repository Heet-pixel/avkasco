// Communication: website messages, job applications (resumes from AWS S3) and announcements.
import { api, esc, ago, downloadFile, chip } from '/shared/core.js';
import { tbl, pageHead, toast } from '/shared/ui.js';
import { renderNotices } from '/shared/pages/notices.js';

const badges = (q) => `${chip(q.emailed ? 'Firm email sent' : 'Firm email not sent', q.emailed ? 'green' : 'red')} ${chip(q.confirmationSent ? 'Confirmation sent' : q.email ? 'Confirmation not sent' : 'No email given', q.confirmationSent ? 'green' : 'grey')}`;
const select = (id, cur, opts) => `<select data-id="${id}" aria-label="Status">${opts.map((s) => `<option${s === cur ? ' selected' : ''}>${s}</option>`).join('')}</select>`;

export default async function inbox(el, ctx) {
  const tab = ctx.params.tab || 'enquiries';
  const tabs = [['enquiries', 'Website messages'], ['applications', 'Job applications'], ['notices', 'Announcements']];
  el.innerHTML = pageHead('Communication') + `<div class="tabs" role="tablist">${tabs.map(([k, l]) => `<button role="tab" data-tab="${k}" aria-selected="${k === tab}">${l}</button>`).join('')}</div><div id="tabbody"></div>`;
  el.querySelector('.tabs').addEventListener('click', (e) => { const b = e.target.closest('[data-tab]'); if (b) location.hash = `#/communication?tab=${b.dataset.tab}`; });
  const body = el.querySelector('#tabbody');

  if (tab === 'notices') return renderNotices(body, ctx, false);

  const isApp = tab === 'applications';
  const { [tab]: rows } = await api('/' + tab);
  const contact = (q) => `${esc(q.phone)}<br>${esc(q.email || '-')}`;
  const cols = isApp
    ? [{ h: 'Received', c: (q) => `${ago(q.createdAt)}<br>${badges(q)}` }, { h: 'Applicant', c: (q) => `<b>${esc(q.name)}</b>` }, { h: 'Contact', c: contact }, { h: 'Position', c: (q) => esc(q.position) }, { h: 'Message', c: (q) => esc(q.message || '-') },
       { h: 'Resume', c: (q) => `<button class="btn sm" data-resume="${q._id}" data-name="${esc(q.resumeName)}">Download</button>` }, { h: 'Status', c: (q) => select(q._id, q.status, ['new', 'reviewed', 'shortlisted', 'rejected']) }]
    : [{ h: 'Received', c: (q) => `${ago(q.createdAt)}<br>${badges(q)}` }, { h: 'Name', c: (q) => `<b>${esc(q.name)}</b>` }, { h: 'Contact', c: contact }, { h: 'Message', c: (q) => esc(q.message) },
       { h: 'Status', c: (q) => select(q._id, q.status, ['new', 'contacted', 'closed']) }];
  body.innerHTML = `<div class="card">${tbl(cols, rows, 'Nothing here yet. New submissions from the website appear here.')}</div>`;
  body.addEventListener('change', async (e) => {
    if (e.target.tagName !== 'SELECT') return;
    try { await api(`/${tab}/${e.target.dataset.id}`, { method: 'PATCH', body: { status: e.target.value } }); } catch (ex) { toast(ex.message, false); ctx.refresh(); }
  });
  body.addEventListener('click', async (e) => {
    const b = e.target.closest('[data-resume]');
    if (!b) return;
    try { await downloadFile(`/applications/${b.dataset.resume}/resume`, b.dataset.name); } catch (ex) { toast(ex.message, false); }
  });
}
