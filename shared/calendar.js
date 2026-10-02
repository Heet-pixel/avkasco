import { esc, ymd, today } from './core.js';
import { icon } from './icons.js';

// Month calendar. load('YYYY-MM') must return [{ date, title, cls }]. Tap a day to see its items below.
export function calendar(el, { load, mini = false }) {
  let cur = new Date();
  cur.setDate(1);
  let selected = today();
  const cache = {};

  async function draw() {
    const y = cur.getFullYear(), m = cur.getMonth();
    const ym = `${y}-${String(m + 1).padStart(2, '0')}`;
    el.innerHTML = '<p class="muted center pad">Loading...</p>';
    let events = [];
    try { events = cache[ym] || (cache[ym] = await load(ym)); } catch (e) { el.innerHTML = `<p class="err">${esc(e.message)}</p>`; return; }
    const first = new Date(y, m, 1).getDay();
    const days = new Date(y, m + 1, 0).getDate();
    const by = {};
    events.forEach((e) => (by[e.date] = by[e.date] || []).push(e));
    let cells = ['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d) => `<div class="cal-h">${d}</div>`).join('');
    for (let i = 0; i < first; i++) cells += '<div class="cal-c off"></div>';
    for (let d = 1; d <= days; d++) {
      const key = `${ym}-${String(d).padStart(2, '0')}`;
      const list = by[key] || [];
      cells += `<button type="button" class="cal-c${key === today() ? ' today' : ''}${key === selected ? ' sel' : ''}" data-d="${key}" aria-label="${key}, ${list.length} items">
        <span>${d}</span>${list.length ? `<span class="dots">${list.slice(0, 3).map((e) => `<i class="${e.cls}"></i>`).join('')}</span>` : ''}
        ${!mini ? list.slice(0, 2).map((e) => `<small class="ev ${e.cls}">${esc(e.title)}</small>`).join('') : ''}</button>`;
    }
    const sel = by[selected] || [];
    el.innerHTML = `<div class="cal${mini ? ' mini' : ''}">
      <div class="cal-top"><button class="icon-btn" data-nav="-1" aria-label="Previous month">${icon('left', 18)}</button>
        <strong>${cur.toLocaleString('en-US', { month: 'long', year: 'numeric' })}</strong>
        <button class="icon-btn" data-nav="1" aria-label="Next month">${icon('right', 18)}</button></div>
      <div class="cal-grid">${cells}</div>
      <div class="cal-day"><strong>${selected}</strong>${sel.length ? `<ul>${sel.map((e) => `<li><i class="${e.cls}"></i>${esc(e.title)}</li>`).join('')}</ul>` : '<p class="muted">Nothing due.</p>'}</div></div>`;
    el.querySelectorAll('[data-nav]').forEach((b) => b.addEventListener('click', () => { cur = new Date(y, m + +b.dataset.nav, 1); selected = ymd(cur); draw(); }));
    el.querySelectorAll('[data-d]').forEach((b) => b.addEventListener('click', () => { selected = b.dataset.d; draw(); }));
  }
  draw();
}
