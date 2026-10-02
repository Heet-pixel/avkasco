import { api, esc, ago } from '/shared/core.js';
import { icon } from '/shared/icons.js';
import { formModal, json, pageHead, toast } from '/shared/ui.js';

// Communication: admins post to everyone or to one employee; employees read what's theirs.
export async function renderNotices(el, { role, refresh }, withHead = true) {
  const admin = role === 'admin';
  const [{ notices }, employeeList] = await Promise.all([
    api('/notices'),
    admin ? api('/employees').then((d) => d.employees.filter((e) => e.active)) : Promise.resolve([]),
  ]);
  const add = admin ? `<button class="btn primary" id="post">${icon('plus', 18)} Send message</button>` : '';
  const who = (n) => n.recipient ? `To ${esc(n.recipient.name)}` : 'To everyone';
  el.innerHTML = (withHead ? pageHead('Communication', add, admin ? 'Message the whole team, or one person directly.' : 'Messages from the partners.') : `<div class="phead"><div></div><div class="pactions">${add}</div></div>`) +
    `<div class="card">${notices.length ? notices.map((n) => `<div class="ann"><h4>${esc(n.title)}</h4><p>${esc(n.body)}</p><small class="muted">${esc(n.author?.name || '')} · ${who(n)} · ${ago(n.createdAt)}</small>${admin ? ` <button class="btn sm" data-del="${n._id}">${icon('trash', 14)} Delete</button>` : ''}</div>`).join('') : '<p class="muted pad center">No messages yet.</p>'}</div>`;
  el.querySelector('#post')?.addEventListener('click', () => formModal({
    title: 'Send message', submit: 'Send',
    fields: [
      { name: 'recipient', label: 'Send to', type: 'select', full: true, options: [['', 'Everyone'], ...employeeList.map((e) => [e._id, e.name])] },
      { name: 'title', label: 'Title', required: true, full: true },
      { name: 'body', label: 'Message', type: 'textarea', required: true, full: true },
    ],
    onSubmit: async (fd) => { await api('/notices', { method: 'POST', body: json(fd) }); toast('Message sent.'); refresh(); },
  }));
  el.addEventListener('click', async (e) => {
    const b = e.target.closest('[data-del]');
    if (!b) return;
    await api(`/notices/${b.dataset.del}`, { method: 'DELETE' });
    refresh();
  });
}
export default (el, ctx) => renderNotices(el, ctx);
