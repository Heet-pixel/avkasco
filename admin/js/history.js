import { api, esc, ago } from '/shared/core.js';
import { icon } from '/shared/icons.js';
import { pageHead, toast } from '/shared/ui.js';

export default async function history(el, { refresh }) {
  const { activity } = await api('/activity');

  el.innerHTML = pageHead('Activity History', `<button class="btn danger" id="delSel" disabled>${icon('trash', 16)} Delete selected</button>`,
    'Every change made across the portal, with who did it and when. Only you can see this.') +
    `<div class="card"><div class="tscroll"><table class="tbl">
      <thead><tr><th><input type="checkbox" id="all"></th><th>When</th><th>Who</th><th>What happened</th><th>Client</th></tr></thead>
      <tbody>${activity.length ? activity.map((a) => `<tr>
          <td><input type="checkbox" class="row" value="${a._id}"></td>
          <td><small>${ago(a.createdAt)}</small></td>
          <td>${esc(a.actor?.name || 'System')}</td>
          <td>${esc(a.text)}</td>
          <td>${esc(a.client?.name || '-')}</td>
        </tr>`).join('') : `<tr class="empty"><td colspan="5">Nothing logged yet.</td></tr>`}</tbody>
    </table></div></div>`;

  const rows = () => [...el.querySelectorAll('.row')];
  const delBtn = el.querySelector('#delSel');
  const updateBtn = () => { delBtn.disabled = !rows().some((r) => r.checked); };

  el.querySelector('#all')?.addEventListener('change', (e) => { rows().forEach((r) => (r.checked = e.target.checked)); updateBtn(); });
  el.addEventListener('change', (e) => { if (e.target.classList.contains('row')) updateBtn(); });

  delBtn.addEventListener('click', async () => {
    const ids = rows().filter((r) => r.checked).map((r) => r.value);
    if (!ids.length) return;
    if (!confirm(`Delete ${ids.length} log ${ids.length === 1 ? 'entry' : 'entries'}? This cannot be undone.`)) return;
    try {
      await api('/activity', { method: 'DELETE', body: { ids } });
      toast('Deleted.');
      refresh();
    } catch (ex) { toast(ex.message, false); }
  });
}
