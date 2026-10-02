import { api, esc } from '/shared/core.js';
import { pageHead, toast } from '/shared/ui.js';

export default async function settings(el, { user }) {
  el.innerHTML = pageHead('Settings') + `
    <div class="grid2e">
      <div class="card"><div class="chead"><h3>My account</h3></div>
        <dl class="kv"><dt>Name</dt><dd>${esc(user.name)}</dd><dt>Email</dt><dd>${esc(user.email)}</dd><dt>Role</dt><dd>${user.role === 'admin' ? 'Partner / Admin' : 'Employee'}</dd>${user.designation ? `<dt>Designation</dt><dd>${esc(user.designation)}</dd>` : ''}</dl></div>
      <div class="card"><div class="chead"><h3>Change password</h3></div>
        <form class="mform" id="pw" novalidate>
          <label class="full">Current password<input name="current" type="password" autocomplete="current-password" required></label>
          <label class="full">New password (at least 8 characters)<input name="password" type="password" autocomplete="new-password" required></label>
          <label class="full">Confirm new password<input name="confirm" type="password" autocomplete="new-password" required></label>
          <p class="err full" role="alert"></p>
          <div class="mactions full"><button class="btn primary" type="submit">Change password</button></div>
        </form></div>
    </div>`;
  const form = el.querySelector('#pw');
  const err = form.querySelector('.err');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    err.textContent = '';
    const d = Object.fromEntries(new FormData(form));
    if (d.password.length < 8) return (err.textContent = 'Use at least 8 characters.');
    if (d.password !== d.confirm) return (err.textContent = 'The two new passwords do not match.');
    try { await api('/auth/change-password', { method: 'POST', body: { current: d.current, password: d.password } }); form.reset(); toast('Password changed.'); }
    catch (ex) { err.textContent = ex.message; }
  });
}
