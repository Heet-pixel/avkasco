import { api, esc, avatarColor } from '/shared/core.js';
import { avatar, pageHead } from '/shared/ui.js';
import { bubbles, wireThread } from '/shared/chatUi.js';

export default async function teamChat(el, { user }) {
  let { members, messages } = await api('/chat/team');

  el.innerHTML = pageHead('Team Chat', '', 'Everyone in the firm — admins and employees — shares this conversation.') + `
    <div class="chatwrap">
      <div class="roster">
        <h4>Team (${members.length})</h4>
        <ul>${members.map((m) => `<li>${avatar(m.name, avatarColor(m.name))}<span><b>${esc(m.name)}</b><small>${esc(m.role === 'admin' ? (m.designation || 'Admin') : (m.designation || 'Employee'))}</small></span></li>`).join('')}</ul>
      </div>
      <div class="chatpane">
        <div class="thread">${bubbles(messages, user._id)}</div>
        <form class="composer"><textarea rows="1" placeholder="Message the team... (Enter to send, Shift+Enter for a new line)"></textarea><button class="btn primary" type="submit">Send</button></form>
      </div>
    </div>`;

  const { scrollDown } = wireThread(el, user._id, {
    send: async (body) => {
      const { message } = await api('/chat/team', { method: 'POST', body: { body } });
      messages = [...messages, message];
      el.querySelector('.thread').innerHTML = bubbles(messages, user._id);
      scrollDown();
    },
    edit: async (id, body) => {
      const { message } = await api(`/chat/messages/${id}`, { method: 'PATCH', body: { body } });
      messages = messages.map((m) => (m._id === id ? message : m));
      el.querySelector('.thread').innerHTML = bubbles(messages, user._id);
    },
  });
  scrollDown();
  api('/chat/read', { method: 'POST', body: { room: 'team' } }).catch(() => {});
}
