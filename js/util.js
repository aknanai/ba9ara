/* util.js — tiny helpers shared everywhere. */
(function (BA) {
  const U = {
    pad2: n => String(n).padStart(2, '0'),
    pad3: n => String(n).padStart(3, '0'),
    clamp: (n, lo, hi) => Math.max(lo, Math.min(hi, n)),
    todayStr() { const d = new Date(); return `${d.getFullYear()}-${U.pad2(d.getMonth() + 1)}-${U.pad2(d.getDate())}`; },
    daysBetween(a, b) { return Math.round((new Date(b) - new Date(a)) / 86400000); },
    shuffle(arr) { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; },
    el(tag, attrs, ...kids) {
      const e = document.createElement(tag);
      if (attrs) for (const k in attrs) {
        if (k === 'class') e.className = attrs[k];
        else if (k === 'html') e.innerHTML = attrs[k];
        else if (k.startsWith('on') && typeof attrs[k] === 'function') e.addEventListener(k.slice(2), attrs[k]);
        else if (k === 'dataset') Object.assign(e.dataset, attrs[k]);
        else if (attrs[k] != null && attrs[k] !== false) e.setAttribute(k, attrs[k]);
      }
      kids.flat().forEach(k => k != null && e.append(k.nodeType ? k : document.createTextNode(k)));
      return e;
    },
    clear(node) { while (node.firstChild) node.removeChild(node.firstChild); return node; },
    // touch-friendly number input flanked by − / + buttons. Returns {input, wrap}.
    stepper(value, min, max, step = 1) {
      const input = U.el('input', { type: 'number', min, max, step, value, inputmode: 'numeric' });
      const bump = d => {
        const v = U.clamp((parseInt(input.value, 10) || min) + d, min, max);
        input.value = v; input.dispatchEvent(new Event('change', { bubbles: true }));
      };
      const btn = (sym, d) => U.el('button', { class: 'step-btn', type: 'button', 'aria-label': d < 0 ? 'decrease' : 'increase', onclick: () => bump(d) }, sym);
      input.addEventListener('change', () => {           // clamp manual typing too
        const v = U.clamp(parseInt(input.value, 10) || min, min, max);
        if (String(v) !== input.value) input.value = v;
      });
      const wrap = U.el('div', { class: 'stepper-row' }, btn('−', -step), input, btn('+', step));
      return { input, wrap };
    },
    toast(msg, ms = 1900) {
      const t = document.getElementById('toast');
      t.textContent = msg; t.hidden = false;
      clearTimeout(U._tt); U._tt = setTimeout(() => (t.hidden = true), ms);
    },
    // strip combining marks for first-letter hints / comparisons
    bareLetters(word) {
      let out = '';
      for (const ch of word) { const c = ch.codePointAt(0); if (c >= 0x0621 && c <= 0x064A) out += ch; }
      return out;
    },
  };
  BA.util = U;
})(window.BA = window.BA || {});
