import { api, esc, ago } from '/shared/core.js';
import { icon } from '/shared/icons.js';
import { toast } from '/shared/ui.js';

// Renders one thread's messages as bubbles (mine on the right, others' on the left),
// with a one-time edit control and an "(edited)" note that still shows the original.
export function bubbles(messages, me) {
  if (!messages.length) return '<p class="muted pad center">No messages yet. Say hello.</p>';
  return messages.map((m) => {
    const mine = m.sender?._id === me;
    return `<div class="msg ${mine ? 'me' : ''}" data-msg="${m._id}">
      <div class="bub">
        ${mine ? '' : `<b class="who">${esc(m.sender?.name || 'Someone')}</b>`}
        <p class="body">${esc(m.body)}</p>
        <div class="meta">
          <small>${ago(m.createdAt)}${m.edited ? ' · edited' : ''}</small>
          ${mine && !m.edited ? `<button class="editm" data-edit="${m._id}" title="Edit (once)">${icon('edit', 12)}</button>` : ''}
        </div>
        ${m.edited ? `<details class="orig"><summary>See original</summary><p>${esc(m.originalBody)}</p></details>` : ''}
      </div>
    </div>`;
  }).join('');
}

// Wires the composer form + edit buttons for a thread rendered into `threadEl`,
// where `send(body)` and `edit(id, body)` do the actual API calls and return the
// updated message list (or throw, which is surfaced as a toast).
export function wireThread(root, me, { send, edit }) {
  const threadEl = root.querySelector('.thread');
  const form = root.querySelector('.composer');
  const input = form.querySelector('textarea');

  function scrollDown() { threadEl.scrollTop = threadEl.scrollHeight; }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const body = input.value.trim();
    if (!body) return;
    input.disabled = true;
    try { await send(body); input.value = ''; } catch (ex) { toast(ex.message, false); }
    input.disabled = false; input.focus();
  });
  form.addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.shiftKey) form.requestSubmit(); });

  threadEl.addEventListener('click', (e) => {
    const b = e.target.closest('[data-edit]');
    if (!b) return;
    const msgDiv = b.closest('.msg');
    const bub = msgDiv.querySelector('.bub');
    const bodyP = bub.querySelector('.body');
    const original = bodyP.textContent;
    bub.classList.add('editing');
    bodyP.outerHTML = `<form class="editf"><textarea rows="2">${esc(original)}</textarea><div class="editf-actions"><button type="button" class="btn sm" data-cancel>Cancel</button><button type="submit" class="btn sm primary">Save</button></div></form>`;
    const ef = bub.querySelector('.editf');
    const ta = ef.querySelector('textarea');
    ta.focus(); ta.setSelectionRange(ta.value.length, ta.value.length);
    ef.querySelector('[data-cancel]').addEventListener('click', () => { ef.outerHTML = `<p class="body">${esc(original)}</p>`; bub.classList.remove('editing'); });
    ef.addEventListener('submit', async (ev) => {
      ev.preventDefault();
      const next = ta.value.trim();
      if (!next || next === original) { ef.outerHTML = `<p class="body">${esc(original)}</p>`; bub.classList.remove('editing'); return; }
      try { await edit(b.dataset.edit, next); } catch (ex) { toast(ex.message, false); ef.outerHTML = `<p class="body">${esc(original)}</p>`; bub.classList.remove('editing'); }
    });
  });

  return { scrollDown };
}
