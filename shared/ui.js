import { esc } from './core.js';
import { icon } from './icons.js';

export function toast(msg, ok = true) {
  let t = document.querySelector('.toast');
  if (!t) { t = document.createElement('div'); t.className = 'toast'; t.setAttribute('role', 'status'); document.body.append(t); }
  t.textContent = msg;
  t.dataset.ok = ok;
  t.classList.add('show');
  clearTimeout(t._t);
  t._t = setTimeout(() => t.classList.remove('show'), 4000);
}

export function openModal({ title, body, wide = false }) {
  const d = document.createElement('dialog');
  d.className = 'modal' + (wide ? ' wide' : '');
  d.innerHTML = `<header><h3>${esc(title)}</h3><button class="icon-btn" data-close aria-label="Close">${icon('x', 20)}</button></header><div class="mbody">${body}</div>`;
  d.addEventListener('click', (e) => { if (e.target === d || e.target.closest('[data-close]')) d.close(); });
  d.addEventListener('close', () => d.remove());
  document.body.append(d);
  d.showModal();
  return d;
}

const input = (f, v = '') => {
  const req = f.required ? ' required' : '';
  if (f.type === 'select') return `<select name="${f.name}"${req}>${(f.options || []).map(([val, label]) => `<option value="${esc(val)}"${String(val) === String(v) ? ' selected' : ''}>${esc(label)}</option>`).join('')}</select>`;
  if (f.type === 'textarea') return `<textarea name="${f.name}" rows="3"${req}>${esc(v)}</textarea>`;
  if (f.type === 'file') return `<input name="${f.name}" type="file"${f.accept ? ` accept="${f.accept}"` : ''}${req}>`;
  return `<input name="${f.name}" type="${f.type || 'text'}" value="${esc(v)}"${f.step ? ` step="${f.step}"` : ''}${f.placeholder ? ` placeholder="${esc(f.placeholder)}"` : ''}${req}>`;
};

// Form pop-up. fields: [{ name, label, type, options, required, full }]. onSubmit(FormData) may throw to show an error.
export function formModal({ title, fields, values = {}, submit = 'Save', onSubmit, wide = false }) {
  const d = openModal({
    title, wide,
    body: `<form class="mform" novalidate>${fields.map((f) => `<label class="${f.full ? 'full' : ''}">${esc(f.label)}${f.required ? '' : ' <em>(optional)</em>'}${input(f, values[f.name])}</label>`).join('')}
      <p class="err full" role="alert"></p>
      <div class="mactions full"><button type="button" class="btn ghost" data-close>Cancel</button><button class="btn primary" type="submit">${esc(submit)}</button></div></form>`,
  });
  const form = d.querySelector('form');
  const err = form.querySelector('.err');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    err.textContent = '';
    for (const f of fields) {
      const el = form.elements[f.name];
      if (f.required && !(f.type === 'file' ? el.files.length : el.value.trim())) { err.textContent = `${f.label} is required.`; el.focus(); return; }
    }
    const btn = form.querySelector('[type=submit]');
    btn.disabled = true;
    try { await onSubmit(new FormData(form)); d.close(); } catch (ex) { err.textContent = ex.message; } finally { btn.disabled = false; }
  });
  form.querySelector('input,select,textarea')?.focus();
  return d;
}
export const json = (fd) => Object.fromEntries(fd);

// Table that turns into stacked cards on phones. cols: [{ h, c: (row) => html, cls }]
export const tbl = (cols, rows, empty = 'Nothing here yet.') => `
  <div class="tscroll"><table class="tbl"><thead><tr>${cols.map((c) => `<th>${esc(c.h)}</th>`).join('')}</tr></thead>
  <tbody>${rows.length ? rows.map((r) => `<tr>${cols.map((c) => `<td data-label="${esc(c.h)}" class="${c.cls || ''}">${c.c(r)}</td>`).join('')}</tr>`).join('') : `<tr class="empty"><td colspan="${cols.length}">${esc(empty)}</td></tr>`}</tbody></table></div>`;

export const pageHead = (title, actions = '', sub = '') => `<div class="phead"><div><h1>${esc(title)}</h1>${sub ? `<p class="muted">${sub}</p>` : ''}</div><div class="pactions">${actions}</div></div>`;
export const avatar = (name, color) => `<span class="av" style="background:${color}">${esc((name || '?').split(' ').filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join(''))}</span>`;
