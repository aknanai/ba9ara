/* home.js — landing: resume, progress glance, quick start, credits. */
(function (BA) {
  const { el, clear } = BA.util;
  (BA.views = BA.views || {}).home = {
    mount(sec) {
      const { store, data, nav } = BA;
      store.setLast({ view: 'home' });
      clear(sec);
      const pct = store.percent(), c = store.counts(), last = store.last.ayah || 1;
      const due = store.dueCount(), newRem = store.newRemaining();

      sec.append(
        el('h1', { class: 'page-title' }, 'Memorize Surah Al-Baqarah ',
          el('span', { class: 'pill' }, '286 ayāt')),

        el('div', { class: 'card' },
          el('div', { class: 'row spread' },
            el('div', {},
              el('div', { class: 'muted' }, "Today’s review"),
              el('div', { html: `<strong style="font-size:1.2rem">${due} due</strong>${newRem ? ` · ${newRem} new` : ''}` })),
            el('button', { class: 'btn', onclick: () => nav.go('review') },
              (due || newRem) ? '🎯 Start review' : '✅ Caught up'))),

        el('div', { class: 'card' },
          el('div', { class: 'bismillah' }, data.bismillah(store.settings.riwayah)),
          el('div', { class: 'row spread' },
            el('div', {},
              el('div', { class: 'muted' }, 'Continue where you left off'),
              el('div', { html: `<strong style="font-size:1.2rem">Ayah ${last}</strong>` })),
            el('div', { class: 'row' },
              el('button', { class: 'btn', onclick: () => { store.setLast({ ayah: last }); nav.go('memorize'); } }, '▶ Continue'),
              el('button', { class: 'btn ghost', onclick: () => nav.go('listen') }, '🔁 Listen')))),

        el('div', { class: 'grid2' },
          stat(`${pct}%`, 'Memorized', el('div', { class: 'meter' }, el('i', { style: `width:${pct}%` }))),
          stat(`🔥 ${store.streak.current || 0}`, `Day streak · best ${store.streak.best || 0}`),
          stat(`${c.mastered}`, 'Mastered'),
          stat(`${c.learning + c.solid}`, 'In progress')),

        el('div', { class: 'card' },
          el('h3', {}, 'How to use it'),
          el('ul', { class: 'muted', style: 'margin:.2rem 0;padding-inline-start:1.1rem;line-height:1.9' },
            el('li', { html: '<b>Listen &amp; Loop</b> — pick a range (e.g. 1–5), set repeats, and let it loop. Listen-and-repeat is the backbone of ḥifẓ.' }),
            el('li', { html: '<b>Memorize</b> — hide the words gradually (last word → half → first letters → blank), peek when stuck, mark each ayah.' }),
            el('li', { html: '<b>Test</b> — fill the blanks and recall the next ayah.' }),
            el('li', { html: 'Switch <b>Reading</b> (Ḥafṣ / Warsh) at the top — text <i>and</i> audio change together.' }))),

        el('div', { class: 'card' },
          el('h3', {}, 'Sources & credits'),
          el('div', { class: 'muted', style: 'font-size:.85rem;line-height:1.8' },
            el('div', { html: 'Ḥafṣ text — <b>Tanzil Project</b> (tanzil.net). Warsh text — QPC Warsh rasm, remapped to the standard ayah numbering.' }),
            el('div', { html: 'Per-ayah audio — <b>EveryAyah</b>. Full-surah Warsh — <b>mp3quran.net</b>. Font — Scheherazade New / Amiri (OFL).' }),
            el('div', { class: 'muted', style: 'margin-top:.4rem' }, 'Your progress is saved only on this device. Back it up in Settings.')))
      );
    },
  };
  function stat(big, label, extra) {
    return el('div', { class: 'card', style: 'margin:0' },
      el('div', { class: 'big-num' }, big),
      el('div', { class: 'muted', style: 'margin:.2rem 0 .4rem' }, label), extra || '');
  }
})(window.BA = window.BA || {});
