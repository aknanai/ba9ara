/* settings.js — reading, default reciter, loop defaults, theme, font, offline audio. */
(function (BA) {
  const { el, clear, clamp } = BA.util;
  const R = BA.reciters;
  const AUDIO_CACHE = 'ba9ara-audio-v1';

  (BA.views = BA.views || {}).settings = {
    mount(sec) {
      const { store, data } = BA;
      store.setLast({ view: 'settings' });
      const s = store.settings;
      clear(sec);

      // reading
      const riSel = el('select', { onchange: () => { BA.app.onRiwayahChange(riSel.value); BA.views.settings.mount(sec); } });
      data.riwayahList().forEach(ri => { const o = el('option', { value: ri }, `${data.riwayahLabel(ri)} (${data.riwayat[ri].label_ar})`); if (ri === s.riwayah) o.selected = true; riSel.append(o); });

      // default reciter
      const recSel = el('select', { onchange: () => { store.setSetting('reciter', recSel.value); BA.app.reconfigure(); BA.views.settings.mount(sec); } });
      data.recitersFor(s.riwayah).forEach(r => { const o = el('option', { value: r.id }, r.name_en); if (r.id === s.reciter) o.selected = true; recSel.append(o); });
      if (!data.recitersFor(s.riwayah).some(r => r.id === s.reciter)) recSel.selectedIndex = 0;

      // loop defaults
      const reps = num(s.repsPerAyah, 1, 20, v => store.setSetting('repsPerAyah', v));
      const rng = num(s.rangeReps, 1, 50, v => store.setSetting('rangeReps', v));
      const gap = el('input', { type: 'range', min: 0, max: 4000, step: 100, value: s.gapMs });
      const gapV = el('span', { class: 'muted' }, (s.gapMs / 1000).toFixed(1) + 's');
      gap.addEventListener('input', () => { gapV.textContent = (gap.value / 1000).toFixed(1) + 's'; store.setSetting('gapMs', +gap.value); });

      // playback speed
      const speedBtns = el('div', { class: 'seg' });
      const renderSpeed = () => { clear(speedBtns); [0.5, 0.75, 1, 1.25, 1.5].forEach(r => speedBtns.append(
        el('button', { class: 'seg-btn' + (Math.abs((s.speed || 1) - r) < 0.001 ? ' on' : ''), type: 'button',
          onclick: () => { s.speed = r; store.setSetting('speed', r); BA.audio.setRate(r); renderSpeed(); } }, r + '×'))); };
      renderSpeed();

      // theme + font
      const themeBtns = el('div', { class: 'row' },
        themeBtn('light', '☀️ Light'), themeBtn('dark', '🌙 Dark'));
      const fontSel = el('select', { onchange: () => { store.setSetting('font', fontSel.value); applyFont(fontSel.value); } });
      [['scheherazade', 'Scheherazade New (covers Ḥafṣ + Warsh)'], ['amiri', 'Amiri Quran (best for Ḥafṣ)']]
        .forEach(([v, l]) => { const o = el('option', { value: v }, l); if (v === (s.font || 'scheherazade')) o.selected = true; fontSel.append(o); });

      // offline
      const r = data.reciter(s.reciter);
      const dlInfo = el('div', { class: 'muted', style: 'font-size:.82rem;margin:.3rem 0' });
      const dlBar = el('div', { class: 'meter', style: 'margin:.4rem 0' }, el('i', {}));
      const dlBtn = el('button', { class: 'btn', onclick: () => downloadReciter(r, dlBtn, dlBar, dlInfo) }, '⬇ Download for offline');
      const clrBtn = el('button', { class: 'btn ghost', onclick: clearAudio }, 'Clear cached audio');

      sec.append(
        el('h1', { class: 'page-title' }, 'Settings'),
        installCard(),
        el('div', { class: 'card' }, el('h3', {}, 'Reading & audio'),
          field('Reading (riwāyah)', riSel),
          field('Default reciter', recSel)),
        el('div', { class: 'card' }, el('h3', {}, 'Loop defaults'),
          el('div', { class: 'grid2' }, field('Repeat each ayah', reps), field('Loop the range', rng),
            field('Gap between repeats', el('div', { class: 'row' }, gap, gapV)), field('Speed', speedBtns))),
        el('div', { class: 'card' }, el('h3', {}, 'Appearance'),
          field('Theme', themeBtns), field('Arabic font', fontSel)),
        el('div', { class: 'card' }, el('h3', {}, 'Offline'),
          el('div', { class: 'muted', style: 'font-size:.85rem' },
            r && R.canLoop(r) ? `Save all 286 ayāt of “${r.name_en}” on this device (~35–45 MB) so loops work with no signal.`
                              : `Save the whole-surah recording of “${r ? r.name_en : ''}” (~30–40 MB) for offline listening.`),
          dlInfo, dlBar, el('div', { class: 'row' }, dlBtn, clrBtn))
      );

      function themeBtn(t, label) {
        return el('button', { class: 'btn ' + (document.documentElement.dataset.theme === t ? '' : 'ghost') + ' sm',
          onclick: () => { BA.app.setTheme(t); BA.views.settings.mount(sec); } }, label);
      }
    },
  };

  function installCard() {
    if (BA.app.isStandalone()) {
      return el('div', { class: 'card' }, el('h3', {}, '📲 Installed'),
        el('div', { class: 'muted', style: 'font-size:.85rem' }, 'You’re running the installed app. Download a reciter below to use it fully offline.'));
    }
    const body = el('div', { class: 'muted', style: 'font-size:.85rem' });
    const card = el('div', { class: 'card' }, el('h3', {}, '📲 Install app'), body);
    if (BA.app.canInstall()) {
      body.append('Add Al-Baqarah to your home screen for full-screen, app-like use that works offline.',
        el('div', { class: 'row', style: 'margin-top:.55rem' },
          el('button', { class: 'btn', onclick: () => BA.app.promptInstall() }, '⬇ Install app')));
    } else if (BA.app.isIOS()) {
      body.append(el('div', { html: 'On iPhone/iPad: open in <b>Safari</b>, tap the <b>Share</b> button (⬆️ box-with-arrow), then choose <b>“Add to Home Screen”</b>.' }));
    } else {
      body.append(el('div', { html: 'Use your browser menu → <b>Install app</b> / <b>Add to Home Screen</b> (works in Chrome, Edge, Safari, Samsung Internet).' }));
    }
    return card;
  }

  function applyFont(font) {
    document.documentElement.style.setProperty('--ar-font', font === 'amiri' ? "'Amiri Quran'" : "'Scheherazade New'");
  }

  async function downloadReciter(r, btn, bar, info) {
    if (!('caches' in window)) { BA.util.toast('Offline storage needs HTTPS (works once deployed).'); return; }
    if (!r) return;
    btn.disabled = true;
    const urls = R.canLoop(r) ? R.allAyahUrls(r, BA.data.count) : [R.surahUrl(r)];
    const cache = await caches.open(AUDIO_CACHE);
    let done = 0, failed = 0; const total = urls.length;
    const fill = bar.firstElementChild;
    const queue = urls.slice();
    async function worker() {
      while (queue.length) {
        const u = queue.shift();
        try { const resp = await fetch(u, { mode: 'cors' }); if (resp.ok) await cache.put(u, resp.clone()); else failed++; }
        catch (e) { failed++; }
        done++; fill.style.width = (done / total * 100).toFixed(1) + '%';
        info.textContent = `Downloaded ${done}/${total}${failed ? ' · ' + failed + ' failed' : ''}`;
      }
    }
    await Promise.all([worker(), worker(), worker(), worker()]); // small concurrency
    btn.disabled = false;
    BA.util.toast(failed ? `Saved with ${failed} skipped` : 'Saved for offline ✓');
  }
  async function clearAudio() {
    if ('caches' in window) { await caches.delete(AUDIO_CACHE); BA.util.toast('Cached audio cleared'); }
  }

  function field(label, control) { return el('div', { class: 'field' }, el('label', {}, label), control); }
  function num(val, min, max, on) {
    const s = BA.util.stepper(val, min, max);
    s.input.addEventListener('change', () => on(clamp(+s.input.value || min, min, max)));
    return s.wrap;
  }
  BA.settings = { applyFont };
})(window.BA = window.BA || {});
