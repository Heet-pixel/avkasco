import { api } from '/js/api.js';

const $ = (s, r = document) => r.querySelector(s);
const state = { email: '', mode: 'setup', token: '' };
const sections = [...document.querySelectorAll('[data-view]')];
const home = (role) => (role === 'admin' ? '/admin/' : '/employee/');

// already signed in? go straight to the right dashboard
if (localStorage.getItem('ca_token') || sessionStorage.getItem('ca_token')) {
  api('/auth/me', { auth: true }).then((r) => location.replace(home(r.user.role))).catch(() => { localStorage.removeItem('ca_token'); sessionStorage.removeItem('ca_token'); });
}

function show(name) {
  sections.forEach((s) => (s.hidden = s.dataset.view !== name));
  $(`[data-view="${name}"] input:not([type=checkbox])`)?.focus();
}

document.addEventListener('click', (e) => {
  const go = e.target.closest('[data-go]');
  if (go) { if (go.dataset.mode) setSend(go.dataset.mode); return show(go.dataset.go); }
  const eye = e.target.closest('.eye');
  if (eye) {
    const input = eye.parentElement.querySelector('input');
    const visible = input.type === 'text';
    input.type = visible ? 'password' : 'text';
    eye.setAttribute('aria-pressed', String(!visible));
    eye.setAttribute('aria-label', visible ? 'Show password' : 'Hide password');
  }
});

function handle(form, fn) {
  const err = $('.err', form);
  const btn = $('button[type=submit]', form);
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    err.textContent = '';
    btn.disabled = true;
    try { await fn(new FormData(form)); } catch (ex) { err.textContent = ex.message; } finally { btn.disabled = false; }
  });
}
const post = (path, body) => api(path, { method: 'POST', body });
const finish = (token, user, remember) => {
  (remember ? localStorage : sessionStorage).setItem('ca_token', token);
  (remember ? sessionStorage : localStorage).removeItem('ca_token');
  location.href = home(user.role);
};

function setSend(mode) {
  state.mode = mode;
  $('#send-title').textContent = mode === 'setup' ? 'Set up your account' : 'Reset your password';
  $('#send-text').textContent = (mode === 'setup' ? 'This is your first time here. ' : '') + `We will email a 6-digit code (OTP) to ${state.masked}.`;
}

// 1) email first: only registered emails may continue
handle($('#f-email'), async (d) => {
  state.email = String(d.get('email')).trim();
  const r = await post('/auth/identify', { email: state.email });
  state.masked = r.masked;
  $('#who').textContent = r.name ? `, ${r.name.split(' ')[0]}` : '';
  $('#who-email').textContent = state.email;
  if (r.status === 'password') return show('password');   // password already created before
  setSend('setup');                                        // first time: send OTP, then create a password
  show('send');
});

// 2) returning users: email + password
handle($('#f-login'), async (d) => {
  const remember = d.get('remember') === 'on';
  const r = await post('/auth/login', { email: state.email, password: d.get('password'), remember });
  finish(r.token, r.user, remember);
});

// 3) send the OTP (first time or forgot password)
const resend = $('#resend');
let timer;
function cooldown() {
  let left = 60;
  clearInterval(timer);
  resend.disabled = true;
  resend.textContent = `Resend code in ${left}s`;
  timer = setInterval(() => {
    left -= 1;
    if (left <= 0) { clearInterval(timer); resend.disabled = false; resend.textContent = 'Resend code'; }
    else resend.textContent = `Resend code in ${left}s`;
  }, 1000);
}
handle($('#f-send'), async () => {
  const r = await post('/auth/forgot/send', { email: state.email });
  $('#otp-note').textContent = r.message;
  cooldown();
  show('otp');
});
resend.addEventListener('click', async () => {
  const err = $('#f-otp .err');
  err.textContent = '';
  try { const r = await post('/auth/forgot/send', { email: state.email }); $('#otp-note').textContent = r.message; cooldown(); }
  catch (ex) { err.textContent = ex.message; }
});

// 4) verify the OTP
handle($('#f-otp'), async (d) => {
  const r = await post('/auth/forgot/verify', { email: state.email, otp: String(d.get('otp')).trim() });
  state.token = r.resetToken;
  show('new');
});

// 5) create the password (twice), then Continue to the dashboard
handle($('#f-new'), async (d) => {
  const password = String(d.get('password'));
  if (password.length < 8) throw new Error('Use at least 8 characters for your password.');
  if (password !== d.get('confirm')) throw new Error('The two passwords do not match.');
  const r = await post('/auth/forgot/reset', { resetToken: state.token, password });
  finish(r.token, r.user, true);
});
