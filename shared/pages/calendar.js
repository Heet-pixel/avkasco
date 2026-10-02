import { api, STATUS, isOverdue } from '/shared/core.js';
import { calendar } from '/shared/calendar.js';
import { pageHead } from '/shared/ui.js';

// Calendar of work due dates. Employees only ever receive their own work from the server.
export const workEvents = async (ym) => {
  const { works } = await api(`/works?from=${ym}-01&to=${ym}-31`);
  return works.map((w) => ({ date: w.dueDate, title: `${w.client?.name || ''}: ${w.title}`, cls: isOverdue(w) ? 'red' : STATUS[w.status][1] }));
};

export default async function calendarPage(el) {
  el.innerHTML = pageHead('Calendar', '', 'Work due dates. Tap a day to see what is due.') + '<div class="card" id="cal"></div>';
  calendar(el.querySelector('#cal'), { load: workEvents });
}
