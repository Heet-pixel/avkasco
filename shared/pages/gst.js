import { pageHead } from '/shared/ui.js';

const RATES = [5, 12, 18, 28];
const fmt = (n) => `\u20B9${(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function gst(el) {
  el.innerHTML = pageHead('GST Calculator', '', 'Work out GST from an amount, either way round.') + `
    <div class="card gst-card">
      <div class="grid2">
        <div class="field">
          <label>Amount (\u20B9)</label>
          <input type="number" id="amt" min="0" step="0.01" placeholder="e.g. 10000">
        </div>
        <div class="field">
          <label>GST rate</label>
          <select id="rate">
            ${RATES.map((r) => `<option value="${r}"${r === 18 ? ' selected' : ''}>${r}%</option>`).join('')}
            <option value="custom">Custom</option>
          </select>
        </div>
      </div>
      <div class="grid2">
        <div class="field" id="customWrap" hidden>
          <label>Custom rate (%)</label>
          <input type="number" id="customRate" min="0" step="0.01">
        </div>
        <div class="field">
          <label>Amount entered is</label>
          <select id="mode">
            <option value="exclusive">Exclusive of GST (add GST on top)</option>
            <option value="inclusive">Inclusive of GST (GST already included)</option>
          </select>
        </div>
      </div>
      <div class="field">
        <label><input type="checkbox" id="split" checked> Split into CGST + SGST (same state) instead of IGST</label>
      </div>
      <div class="gst-out" id="out"></div>
    </div>`;

  const $ = (s) => el.querySelector(s);
  const rateSel = $('#rate'), customWrap = $('#customWrap'), customRate = $('#customRate');

  function rate() { return rateSel.value === 'custom' ? Number(customRate.value || 0) : Number(rateSel.value); }

  function calc() {
    const amount = Number($('#amt').value || 0);
    const r = rate();
    const mode = $('#mode').value;
    const split = $('#split').checked;
    let base, gstAmount, total;
    if (mode === 'inclusive') { total = amount; base = amount / (1 + r / 100); gstAmount = total - base; }
    else { base = amount; gstAmount = base * (r / 100); total = base + gstAmount; }

    const rows = [
      ['Base amount', fmt(base)],
      ...(split ? [[`CGST (${(r / 2).toFixed(2)}%)`, fmt(gstAmount / 2)], [`SGST (${(r / 2).toFixed(2)}%)`, fmt(gstAmount / 2)]]
        : [[`IGST (${r}%)`, fmt(gstAmount)]]),
      ['Total GST', fmt(gstAmount)],
    ];
    $('#out').innerHTML = `<table class="tbl">${rows.map(([l, v]) => `<tr><td>${l}</td><td class="num">${v}</td></tr>`).join('')}</table>
      <div class="gst-total">Total amount<span>${fmt(total)}</span></div>`;
  }

  rateSel.addEventListener('change', () => { customWrap.hidden = rateSel.value !== 'custom'; calc(); });
  el.addEventListener('input', calc);
  el.addEventListener('change', calc);
  calc();
}
