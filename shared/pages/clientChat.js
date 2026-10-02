import { api, esc, ago, avatarColor } from '/shared/core.js';
import { avatar, pageHead } from '/shared/ui.js';
import { bubbles, wireThread } from '/shared/chatUi.js';

export default async function clientChat(el, { user, params }) {
  const { clients } = await api('/chat/clients');
  let activeId = params.id && clients.some((c) => String(c._id) === params.id) ? params.id : null;
  let messages = [];

  function listHtml() {
    if (!clients.length) return '<p class="muted pad center">No clients to message yet.</p>';
    return clients.map((c) => `<button class="cchat-item ${String(c._id) === activeId ? 'active' : ''}" data-open="${c._id}">
        ${avatar(c.name, avatarColor(c.name))}
        <span class="cchat-info">
          <b>${esc(c.name)}</b>
          <small>${c.last ? `${esc(c.last.by)}: ${esc(c.last.body)}` : 'No messages yet'}</small>
        </span>
        <span class="cchat-side">
          ${c.last ? `<small>${ago(c.last.at)}</small>` : ''}
          ${c.unread ? `<i class="unread">${c.unread > 9 ? '9+' : c.unread}</i>` : ''}
        </span>
      </button>`).join('');
  }

  function shellHtml() {
    return `<div class="chatwrap cchatwrap ${activeId ? 'show-thread' : ''}">
      <div class="roster cchat-list"><h4>Clients (${clients.length})</h4><div class="cchat-scroll">${listHtml()}</div></div>
      <div class="chatpane">${activeId ? `
        <div class="cchat-head"><button class="back" id="back" aria-label="Back to clients">\u2190</button><b>${esc(clients.find((c) => String(c._id) === activeId)?.name || '')}</b></div>
        <div class="thread"></div>
        <form class="composer"><textarea rows="1" placeholder="Write about this client... (Enter to send, Shift+Enter for a new line)"></textarea><button class="btn primary" type="submit">Send</button></form>
      ` : '<p class="muted pad center cchat-empty">Choose a client on the left to see or start the conversation.</p>'}</div>
    </div>`;
  }

  async function openThread(id) {
    activeId = id;
    el.innerHTML = pageHead('Client Chat', '', 'Pick a client to message — the assigned employee and every admin share this thread.') + shellHtml();
    history.replaceState(null, '', `#/clientchat?id=${id}`);
    wire();
    const data = await api(`/chat/clients/${id}`);
    messages = data.messages;
    const threadEl = el.querySelector('.thread');
    if (threadEl) { threadEl.innerHTML = bubbles(messages, user._id); threadEl.scrollTop = threadEl.scrollHeight; }
    api('/chat/read', { method: 'POST', body: { room: 'client', client: id } }).catch(() => {});
  }

  function wire() {
    el.querySelectorAll('[data-open]').forEach((b) => b.addEventListener('click', () => openThread(b.dataset.open)));
    el.querySelector('#back')?.addEventListener('click', () => { activeId = null; render(); });
    if (activeId) {
      wireThread(el, user._id, {
        send: async (body) => {
          const { message } = await api(`/chat/clients/${activeId}`, { method: 'POST', body: { body } });
          messages = [...messages, message];
          el.querySelector('.thread').innerHTML = bubbles(messages, user._id);
          el.querySelector('.thread').scrollTop = 1e9;
        },
        edit: async (id, body) => {
          const { message } = await api(`/chat/messages/${id}`, { method: 'PATCH', body: { body } });
          messages = messages.map((m) => (m._id === id ? message : m));
          el.querySelector('.thread').innerHTML = bubbles(messages, user._id);
        },
      });
    }
  }

  function render() {
    el.innerHTML = pageHead('Client Chat', '', 'Pick a client to message — the assigned employee and every admin share this thread.') + shellHtml();
    wire();
  }

  if (activeId) openThread(activeId); else render();
}
