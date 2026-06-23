/* memorize.js — one ayah at a time: hide progressively, peek, loop, mark. */
(function (BA) {
  const { el, clear, clamp } = BA.util;
  (BA.views = BA.views || {}).memorize = {
    mount(sec) {
      const { store, data, audio, reveal } = BA;
      store.setLast({ view: 'memorize' });
      const ri = store.settings.riwayah;
      let n = clamp(store.last.ayah || 1, 1, data.count);
      let level = store.settings.hideLevel || 0;
      clear(sec);

      // whole-surah reciters (Qazābrī/Kūshī) have no per-ayah file, so "Loop this ayah"
      // can't isolate one ayah → fall back to a per-ayah voice of the same reading.
      const shortName = r => (r && r.name_en ? r.name_en.split(' (')[0] : '');
      const curRec = data.reciter(store.settings.reciter);
      const isFull = !!(curRec && curRec.capability === 'full-surah');
      const paRec = isFull ? data.defaultReciter(ri) : null;
      const canFallback = !!(isFull && paRec && paRec.capability === 'per-ayah');

      const heading = el('strong', {}, '');
      const jump = el('input', { type: 'number', min: 1, max: data.count, value: n, style: 'width:5.5em' });
      jump.addEventListener('change', () => go(clamp(+jump.value || 1, 1, data.count)));

      const levelSlider = el('input', { type: 'range', min: 0, max: 4, step: 1, value: level });
      const levelLabel = el('span', { class: 'pill' }, '');
      levelSlider.addEventListener('input', () => { level = +levelSlider.value; store.setSetting('hideLevel', level); render(); });

      const arEl = el('div', { class: 'ar', dataset: { riwayah: ri } });
      const card = el('div', { class: 'ayah-card' }, arEl);
      const trBox = el('div', { class: 'tr-box' });
      const statusPill = el('span', { class: 'pill' }, '');

      const nav = el('div', { class: 'card' },
        el('div', { class: 'row spread' },
          el('div', { class: 'row' },
            el('button', { class: 'icon-btn', onclick: () => go(n - 1) }, '◀'),
            heading,
            el('button', { class: 'icon-btn', onclick: () => go(n + 1) }, '▶')),
          el('div', { class: 'row' }, el('span', { class: 'muted' }, 'Go to'), jump)),
        el('div', { class: 'field', style: 'margin-top:.5rem' },
          el('label', {}, 'Hide level — tap a hidden word to peek'),
          el('div', { class: 'row' }, levelSlider, levelLabel)),
        el('div', { class: 'field', style: 'margin-top:.5rem' },
          el('label', {}, 'Translation'),
          BA.app.makeLangSelect()));

      const actions = el('div', { class: 'row', style: 'margin:.2rem 0 1rem' },
        el('button', { class: 'btn', onclick: loopAyah }, '🔁 Loop this ayah'),
        el('button', { class: 'btn ghost', onclick: () => { level = 0; levelSlider.value = 0; store.setSetting('hideLevel', 0); render(); } }, '👁 Reveal'),
        el('button', { class: 'btn gold', onclick: gotIt }, '✓ Got it'),
        el('button', { class: 'btn ghost', onclick: missed }, '✗ Missed'),
        statusPill);

      // ── search / jump bar ──
      const searchInput = el('input', { type: 'search', class: 'search-input', inputmode: 'search',
        placeholder: 'Jump to ayah # or search words…', autocomplete: 'off' });
      const results = el('div', { class: 'search-results', hidden: true });
      const searchCard = el('div', { class: 'card' },
        el('div', { class: 'search-wrap' }, el('span', { class: 'search-ic' }, '🔍'), searchInput), results);

      function pick(toN) { go(toN); searchInput.value = ''; results.hidden = true; clear(results); }
      function runSearch() {
        const q = searchInput.value.trim();
        clear(results);
        if (!q) { results.hidden = true; return; }
        const matches = data.search(q, ri, 25);
        results.hidden = false;
        if (!matches.length) { results.append(el('div', { class: 'muted', style: 'padding:.5rem' }, 'No matching ayah')); return; }
        matches.forEach(m => {
          const snip = m.text.length > 80 ? m.text.slice(0, 80) + '…' : m.text;
          results.append(el('div', { class: 'search-result', onclick: () => pick(m.n) },
            el('span', { class: 'ayah-num' }, m.n),
            el('span', { class: 'ar sr-text', dataset: { riwayah: ri } }, snip)));
        });
      }
      searchInput.addEventListener('input', runSearch);
      searchInput.addEventListener('keydown', e => {
        if (e.key === 'Enter') { const m = data.search(searchInput.value, ri, 1); if (m.length) pick(m[0].n); }
        else if (e.key === 'Escape') { searchInput.value = ''; runSearch(); }
      });

      const fallbackNote = canFallback
        ? el('div', { class: 'muted', style: 'font-size:.82rem;margin:-.3rem 0 1rem' },
            `🔁 “${shortName(curRec)}” is a whole-surah recording — single-ayah loop uses “${shortName(paRec)}” (per-ayah) for now.`)
        : null;
      sec.append(searchCard, nav, card, trBox, actions, fallbackNote || el('span'));

      function render() {
        levelLabel.textContent = reveal.LEVELS[level];
        clear(arEl);
        if (level === 0) arEl.append(document.createTextNode(data.text(n, ri) + ' '));
        else reveal.render(arEl, data.words(n, ri), level);
        arEl.append(el('span', { class: 'ayah-num' }, n));
        clear(trBox);
        const tr = BA.app.translationEl(n); if (tr) trBox.append(tr);
        heading.textContent = `Ayah ${n} / ${data.count}`;
        jump.value = n;
        const st = store.status('2:' + n);
        statusPill.textContent = ({ unseen: '◌ new', learning: '○ learning', solid: '◐ solid', mastered: '● mastered' })[st];
        statusPill.style.background = st === 'mastered' ? 'var(--emerald)' : st === 'solid' ? '#7bbf97' : st === 'learning' ? 'var(--gold-soft)' : 'var(--border)';
        statusPill.style.color = st === 'mastered' ? '#fff' : 'var(--text)';
      }
      function go(to) { n = clamp(to, 1, data.count); store.setLast({ ayah: n }); render(); }
      function loopAyah() {
        const rec = canFallback ? paRec : (curRec || data.defaultReciter(ri));
        audio.configure({ reciterId: rec.id, riwayah: ri });
        audio.playSingle(n, { reps: store.settings.repsPerAyah, gapMs: store.settings.gapMs });
        card.classList.add('playing');
        if (canFallback) BA.util.toast(`Looping with ${shortName(paRec)} — ${shortName(curRec)} is whole-surah`);
      }
      function gotIt() {
        const e = store.review('2:' + n, 'good'); BA.app.refreshStreak(); render();
        if (e && e.status === 'mastered') BA.util.toast('🎉 Mastered ayah ' + n);
        else BA.util.toast('Saved · ' + (e ? e.status : ''));
      }
      function missed() { store.review('2:' + n, 'again'); BA.app.refreshStreak(); render(); }

      BA.app.onAyah((a) => { card.classList.toggle('playing', a === n); });
      render();
    },
  };
})(window.BA = window.BA || {});
