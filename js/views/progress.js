/* progress.js — heatmap of all 286 ayāt, stats, and backup (export/import). */
(function (BA) {
  const { el, clear } = BA.util;
  (BA.views = BA.views || {}).progress = {
    mount(sec) {
      const { store, data, nav } = BA;
      store.setLast({ view: 'progress' });
      clear(sec);
      const pct = store.percent(), c = store.counts();

      const heat = el('div', { class: 'heat' });
      for (let n = 1; n <= data.count; n++) {
        const st = store.status('2:' + n);
        heat.append(el('i', {
          dataset: { s: st }, title: `Ayah ${n} · ${st}`,
          onclick: () => { store.setLast({ ayah: n }); nav.go('memorize'); },
        }));
      }

      const fileIn = el('input', { type: 'file', accept: 'application/json', style: 'display:none',
        onchange: e => importFile(e.target.files[0]) });

      sec.append(
        el('h1', { class: 'page-title' }, 'Your progress'),
        el('div', { class: 'grid2' },
          mini(`${pct}%`, 'Memorized', el('div', { class: 'meter' }, el('i', { style: `width:${pct}%` }))),
          mini(`🔥 ${store.streak.current || 0}`, `Streak · best ${store.streak.best || 0}`),
          mini(`${c.mastered}`, 'Mastered'),
          mini(`${c.solid}`, 'Solid')),

        store.dueCount()
          ? el('div', { class: 'card' },
              el('div', { class: 'row spread' },
                el('div', {}, el('strong', {}, `🎯 ${store.dueCount()} due for review`),
                  el('div', { class: 'muted', style: 'font-size:.85rem' }, 'Spaced-repetition queue')),
                el('button', { class: 'btn', onclick: () => nav.go('review') }, 'Start')))
          : el('span'),

        el('div', { class: 'card' },
          el('div', { class: 'row spread' }, el('h3', { style: 'margin:0' }, 'All 286 ayāt'),
            el('span', { class: 'muted', style: 'font-size:.8rem' }, 'tap a cell to study it')),
          heat,
          el('div', { class: 'legend' },
            leg('var(--border)', 'new'), leg('#e7c98a', 'learning'),
            leg('#7bbf97', 'solid'), leg('var(--emerald)', 'mastered'))),

        el('div', { class: 'card' },
          el('h3', {}, 'Backup & restore'),
          el('div', { class: 'muted', style: 'font-size:.85rem;margin-bottom:.6rem' },
            'Progress lives only on this device. Export a file to keep it safe or move it to another phone.'),
          el('div', { class: 'row' },
            el('button', { class: 'btn', onclick: exportFile }, '⬇ Export backup'),
            el('button', { class: 'btn ghost', onclick: () => fileIn.click() }, '⬆ Import backup'),
            el('button', { class: 'btn ghost', onclick: reset }, '⌫ Reset'),
            fileIn))
      );

      function exportFile() {
        const blob = new Blob([store.exportJSON()], { type: 'application/json' });
        const a = el('a', { href: URL.createObjectURL(blob), download: 'baqarah-hifz-backup.json' });
        document.body.append(a); a.click(); a.remove();
        BA.util.toast('Backup downloaded');
      }
      function importFile(file) {
        if (!file) return;
        const rd = new FileReader();
        rd.onload = () => { try { store.importJSON(rd.result); BA.util.toast('Backup restored'); BA.app.refreshStreak(); BA.views.progress.mount(sec); } catch (e) { BA.util.toast('Invalid backup file'); } };
        rd.readAsText(file);
      }
      function reset() {
        if (confirm('Reset ALL progress and streak on this device? This cannot be undone.')) {
          store.resetProgress(); BA.app.refreshStreak(); BA.views.progress.mount(sec); BA.util.toast("Progress reset");
        }
      }
    },
  };
  function mini(big, label, extra) {
    return el('div', { class: 'card', style: 'margin:0' }, el('div', { class: 'big-num' }, big),
      el('div', { class: 'muted', style: 'margin:.2rem 0 .4rem' }, label), extra || '');
  }
  function leg(color, label) { return el('span', {}, el('b', { style: `background:${color}` }), label); }
})(window.BA = window.BA || {});
