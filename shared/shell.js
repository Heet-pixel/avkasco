// The dashboard frame (sidebar, top bar, router) used by both the admin and employee views.
import { api, signOut, esc, initials, avatarColor, ago } from './core.js';
import { icon } from './icons.js';
import { toast } from './ui.js';

export async function mountShell({ role, nav, routes, home = 'dashboard' }) {
  let user;
  try { ({ user } = await api('/auth/me')); } catch { return; }
  if (user.role !== role) return location.replace(user.role === 'admin' ? '/admin/' : '/employee/');

  const navHtml = nav.filter((n) => !n.superAdminOnly || user.isSuperAdmin).map((n) => n.section
    ? `<h6>${esc(n.section)}</h6>`
    : `<a class="nav" href="${n.to}" data-to="${n.to}">${icon(n.icon, 20)}<span>${esc(n.label)}</span></a>`).join('');

  document.getElementById('app').innerHTML = `
    <div class="shell">
      <aside class="side" id="side" aria-label="Main menu">
        <a class="sbrand" href="#/${home}"><img src="/images/logo-96.png" alt="" width="40" height="40"><span><b>AVKAS &amp; Co.</b><small>CHARTERED ACCOUNTANTS</small></span></a>
        <nav>${navHtml}</nav>
        <a class="nav settings" href="#/settings" data-to="#/settings">${icon('settings', 20)}<span>Settings</span></a>
      </aside>
      <div class="scrim" id="scrim"></div>
      <div class="content">
        <header class="top">
          <button class="icon-btn menu" id="menu" aria-label="Open menu">${icon('menu', 22)}</button>
          <label class="search">${icon('search', 18)}<input id="search" type="search" placeholder="Search in this page..." aria-label="Search this page"></label>
          <div class="popwrap"><button class="icon-btn bell" id="bell" aria-label="Announcements">${icon('bell', 22)}<i id="dot" hidden></i></button><div class="pop" id="bellpop" hidden></div></div>
          <div class="popwrap"><button class="icon-btn bell" id="chatbell" aria-label="Messages">${icon('message', 22)}<i id="chatdot" class="count" hidden></i></button><div class="pop" id="chatpop" hidden></div></div>
          <div class="popwrap"><button class="profile" id="prof" aria-label="Account menu"><span class="av" style="background:${avatarColor(user.name)}">${esc(initials(user.name))}</span><span class="pname"><b>${esc(user.name)}</b><small>${esc(user.designation || (role === 'admin' ? 'Partner / Admin' : 'Employee'))}</small></span>${icon('down', 16)}</button>
            <div class="pop small" id="profpop" hidden><a href="#/settings">${icon('settings', 16)} Settings</a><button id="logout">${icon('logout', 16)} Log out</button></div></div>
        </header>
        <main class="page" id="page" tabindex="-1"></main>
      </div>
    </div>`;

  const $ = (id) => document.getElementById(id);
  const page = $('page');
  const side = $('side');
  const setDrawer = (open) => { side.classList.toggle('open', open); $('scrim').classList.toggle('show', open); };
  $('menu').addEventListener('click', () => setDrawer(true));
  $('scrim').addEventListener('click', () => setDrawer(false));
  $('logout').addEventListener('click', signOut);

  // pop-ups (announcements bell, messages bell, account menu)
  const pops = { bell: $('bellpop'), chatbell: $('chatpop'), prof: $('profpop') };
  const closePops = () => Object.values(pops).forEach((p) => (p.hidden = true));
  Object.entries(pops).forEach(([k, p]) => $(k).addEventListener('click', (e) => { e.stopPropagation(); const open = p.hidden; closePops(); p.hidden = !open; if (k === 'bell' && open) showNotices(); if (k === 'chatbell' && open) showChat(); }));
  document.addEventListener('click', (e) => { if (!e.target.closest('.popwrap')) closePops(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') { closePops(); setDrawer(false); } });
  $('profpop').addEventListener('click', closePops);

  let notices = [];
  const seen = () => +localStorage.getItem('ca_seen_notices') || 0;
  async function loadNotices() {
    try { notices = (await api('/notices')).notices; } catch { notices = []; }
    $('dot').hidden = !notices.some((n) => new Date(n.createdAt) > seen());
  }
  function showNotices() {
    $('bellpop').innerHTML = `<h4>Announcements</h4>${notices.length ? notices.slice(0, 5).map((n) => `<div class="pi"><b>${esc(n.title)}</b><p>${esc(n.body)}</p><small>${ago(n.createdAt)}</small></div>`).join('') : '<p class="muted pad">No announcements yet.</p>'}`;
    localStorage.setItem('ca_seen_notices', Date.now());
    $('dot').hidden = true;
  }
  loadNotices();

  // Chat: badge count, a popup of what's unread, and a toast the moment something new arrives.
  // Applies the same way for admins and employees — everyone gets the same bell.
  let seenIds = new Set();
  let firstChatPoll = true;
  async function pollChat() {
    let s;
    try { s = await api('/chat/summary'); } catch { return; }
    $('chatdot').hidden = !s.total;
    $('chatdot').textContent = s.total > 9 ? '9+' : String(s.total);
    if (!firstChatPoll) {
      s.items.filter((it) => !seenIds.has(it._id)).forEach((it) => toast(`${it.from}: ${it.body}`));
    }
    firstChatPoll = false;
    seenIds = new Set(s.items.map((it) => it._id));
    if (!$('chatpop').hidden) renderChat(s);
  }
  function renderChat(s) {
    $('chatpop').innerHTML = `<h4>Messages</h4>${s.items.length ? s.items.map((it) => `<button class="pi chatpi" data-go="${it.room === 'team' ? '#/teamchat' : `#/clientchat?id=${it.client._id}`}"><b>${esc(it.from)}${it.room === 'client' ? ` · ${esc(it.client.name)}` : ''}</b><p>${esc(it.body)}</p><small>${ago(it.createdAt)}</small></button>`).join('') : '<p class="muted pad">No new messages.</p>'}`;
  }
  async function showChat() {
    let s;
    try { s = await api('/chat/summary'); } catch { s = { items: [] }; }
    renderChat(s);
    if (s.total) { try { await api('/chat/read-all', { method: 'POST' }); } catch {} }
    $('chatdot').hidden = true;
  }
  $('chatpop').addEventListener('click', (e) => { const b = e.target.closest('[data-go]'); if (b) { closePops(); location.hash = b.dataset.go; } });
  pollChat();
  setInterval(pollChat, 15000);

  // search filters the rows/cards on the current page
  const applySearch = () => {
    const q = $('search').value.toLowerCase().trim();
    page.querySelectorAll('.tbl tbody tr:not(.empty), .feed li, .ann').forEach((el) => { el.hidden = !!q && !el.textContent.toLowerCase().includes(q); });
  };
  $('search').addEventListener('input', applySearch);

  const parse = () => {
    const [name, q] = location.hash.replace(/^#\/?/, '').split('?');
    return { name: name || home, params: Object.fromEntries(new URLSearchParams(q || '')) };
  };
  async function route() {
    const { name, params } = parse();
    const fn = routes[name] || routes[home];
    const hash = location.hash || `#/${home}`;
    side.querySelectorAll('.nav').forEach((a) => a.classList.toggle('on', a.dataset.to === hash || (!a.dataset.to.includes('?') && a.dataset.to === `#/${name}`)));
    setDrawer(false);
    $('search').value = '';
    page.innerHTML = '<div class="loading">Loading...</div>';
    try { await fn(page, { user, role, params, refresh: route }); }
    catch (e) { page.innerHTML = `<div class="card"><p class="err">${esc(e.message)}</p><button class="btn ghost" id="retry">Try again</button></div>`; $('retry').onclick = route; }
    window.scrollTo(0, 0);
  }
  addEventListener('hashchange', route);
  route();
}
