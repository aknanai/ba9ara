/* review.js — the daily spaced-repetition session: walk the due queue, recall,
   reveal, grade (Again / Good / Easy). New ayāt are shown in full to learn; due
   ones are shown hidden (first-letter hints) so you recall before revealing. */
(function (BA) {
  const { el, clear } = BA.util;
  (BA.views = BA.views || {}).review = {
    mount(sec) {
      const { store, data, audio, reveal } = BA;
      store.setLast({ view: 'review' });
      const ri = store.settings.riwayah;
      clear(sec);

      const queue = store.reviewQueue();
      const total = queue.length;
      let pos = 0;
      const tally = { good: 0, again: 0, easy: 0 };

      // whole-surah reciters can't isolate one ayah → loop with a per-ayah voice.
      const curRec = data.reciter(store.settings.reciter);
      const isFull = !!(curRec && curRec.capability === 'full-surah');
      const paRec = isFull ? data.defaultReciter(ri) : null;
      const loopRec = (isFull && paRec) ? paRec : (curRec || data.defaultReciter(ri));

      if (!total) return renderEmpty();

      const bar = el('div', { class: 'meter', style: 'margin:.2rem 0 1rem' }, el('i', {}));
      const leftPill = el('span', { class: 'pill' }, '');
      const heading = el('div', { class: 'row spread' },
        el('strong', {}, 'Review'), leftPill);
      const badge = el('span', { class: 'pill' }, '');
      const arEl = el('div', { class: 'ar', dataset: { riwayah: ri } });
      const card = el('div', { class: 'ayah-card' }, arEl);
      const trBox = el('div', { class: 'tr-box' });
      const hint = el('div', { class: 'muted', style: 'font-size:.85rem;margin:.2rem 0 .8rem' }, '');

      const showBtn = el('button', { class: 'btn', onclick: revealAll }, '👁 Show answer');
      const loopBtn = el('button', { class: 'btn ghost', onclick: loop }, '🔁 Listen');
      const preRow = el('div', { class: 'row', style: 'margin:.2rem 0 1rem' }, showBtn, loopBtn);

      const grades = el('div', { class: 'row', style: 'margin:.2rem 0 1rem', hidden: true },
        el('button', { class: 'btn ghost', onclick: () => grade('again') }, '✗ Again'),
        el('button', { class: 'btn', onclick: () => grade('good') }, '✓ Good'),
        el('button', { class: 'btn gold', onclick: () => grade('easy') }, '⚡ Easy'));

      sec.append(
        el('div', { class: 'card' }, heading, bar,
          el('div', { class: 'row', style: 'margin-bottom:.4rem' }, badge),
          card, trBox, hint, preRow, grades));

      let revealed = false;
      function renderItem() {
        const item = queue[pos];
        const n = item.n;
        revealed = item.isNew;                          // new ayāt start revealed (you're learning them)
        leftPill.textContent = `${pos + 1} / ${total}`;
        bar.firstElementChild.style.width = (pos / total * 100).toFixed(1) + '%';
        badge.textContent = item.isNew ? '🌱 New ayah' : '🔁 Due review';
        badge.style.background = item.isNew ? 'var(--gold-soft)' : 'var(--border)';
        badge.style.color = 'var(--text)';
        clear(arEl);
        if (revealed) arEl.append(document.createTextNode(data.text(n, ri) + ' '));
        else reveal.render(arEl, data.words(n, ri), 3);  // first-letter hints; tap a word to peek
        arEl.append(el('span', { class: 'ayah-num' }, n));
        clear(trBox);
        if (revealed) { const tr = BA.app.translationEl(n); if (tr) trBox.append(tr); }
        hint.textContent = item.isNew
          ? 'Read it, recite it a few times, then grade how well it sticks.'
          : 'Recall the ayah from the hints (tap a word to peek), then show the answer.';
        showBtn.hidden = revealed;
        grades.hidden = !revealed;
        card.classList.remove('playing');
      }

      function revealAll() {
        const n = queue[pos].n;
        revealed = true;
        clear(arEl);
        arEl.append(document.createTextNode(data.text(n, ri) + ' '), el('span', { class: 'ayah-num' }, n));
        clear(trBox); const tr = BA.app.translationEl(n); if (tr) trBox.append(tr);
        showBtn.hidden = true; grades.hidden = false; hint.textContent = 'How well did you recall it?';
      }

      function loop() {
        const n = queue[pos].n;
        audio.configure({ reciterId: loopRec.id, riwayah: ri });
        audio.playSingle(n, { reps: store.settings.repsPerAyah, gapMs: store.settings.gapMs });
        card.classList.add('playing');
      }

      function grade(g) {
        const n = queue[pos].n;
        store.review('2:' + n, g);
        tally[g] = (tally[g] || 0) + 1;
        BA.app.refreshStreak();
        if (g === 'again') queue.push({ n, isNew: false });   // re-surface later this session
        pos++;
        if (pos >= queue.length) return renderDone();
        renderItem();
      }

      function renderDone() {
        audio.stop();
        clear(sec);
        const reviewed = tally.good + tally.easy + tally.again;
        const next = store.nextDueTime();
        sec.append(
          el('div', { class: 'card', style: 'text-align:center' },
            el('div', { style: 'font-size:2.2rem' }, '🎉'),
            el('h2', { style: 'margin:.3rem 0' }, 'Review complete'),
            el('div', { class: 'muted' }, `${reviewed} graded · ${tally.good + tally.easy} recalled · ${tally.again} to revisit`),
            el('div', { class: 'muted', style: 'margin-top:.4rem' },
              next ? `Next review due ${relDay(next)}.` : 'Nothing else scheduled — add new ayāt anytime.'),
            el('div', { class: 'row', style: 'justify-content:center;margin-top:1rem' },
              el('button', { class: 'btn', onclick: () => BA.nav.go('progress') }, '📊 Progress'),
              el('button', { class: 'btn ghost', onclick: () => BA.nav.go('listen') }, '🔁 Listen'))));
      }

      function renderEmpty() {
        const next = store.nextDueTime();
        const news = store.newAyat(1).length > 0;
        sec.append(
          el('h1', { class: 'page-title' }, 'Review'),
          el('div', { class: 'card', style: 'text-align:center' },
            el('div', { style: 'font-size:2.2rem' }, '✅'),
            el('h2', { style: 'margin:.3rem 0' }, "You're all caught up"),
            el('div', { class: 'muted' },
              next ? `Nothing due right now. Next review ${relDay(next)}.`
                   : (news ? 'No reviews due. Raise “new ayāt per day” in Settings to learn more today.'
                           : 'Every ayah is scheduled — wonderful work. 🤲')),
            el('div', { class: 'row', style: 'justify-content:center;margin-top:1rem' },
              el('button', { class: 'btn', onclick: () => BA.nav.go('memorize') }, '🙈 Memorize'),
              el('button', { class: 'btn ghost', onclick: () => BA.nav.go('listen') }, '🔁 Listen'))));
      }

      BA.app.onAyah((a) => { card && card.classList.toggle('playing', a === (queue[pos] && queue[pos].n)); });
      renderItem();
    },
  };

  // "today" / "tomorrow" / "in N days" for a due timestamp
  function relDay(ms) {
    const today = BA.util.todayStr();
    const d = new Date(ms); const that = `${d.getFullYear()}-${BA.util.pad2(d.getMonth() + 1)}-${BA.util.pad2(d.getDate())}`;
    const n = BA.util.daysBetween(today, that);
    return n <= 0 ? 'today' : n === 1 ? 'tomorrow' : `in ${n} days`;
  }
})(window.BA = window.BA || {});
