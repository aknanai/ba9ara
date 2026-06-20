/* app.js — bootstrap + global wiring (theme, riwāyah, the persistent player, SW). */
(function (BA) {
  const { store, data, audio, nav, util } = BA;
  let curAyah = 1;
  let highlighter = null;   // the active view's "an ayah started playing" hook
  let deferredPrompt = null; // captured Android/Chrome install prompt
  window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); deferredPrompt = e; });
  window.addEventListener('appinstalled', () => { deferredPrompt = null; util.toast && util.toast('App installed ✓'); });

  function setTheme(t) {
    document.documentElement.dataset.theme = t;
    document.getElementById('themeToggle').textContent = t === 'dark' ? '☀️' : '🌙';
    document.querySelector('meta[name=theme-color]').setAttribute('content', t === 'dark' ? '#14110d' : '#1F6B4C');
    store.setSetting('theme', t);
  }

  function refreshStreak() {
    document.getElementById('streakNum').textContent = store.streak.current || 0;
  }

  function fillRiwayahSelect() {
    const sel = document.getElementById('riwayahSelect');
    util.clear(sel);
    data.riwayahList().forEach(ri => {
      const short = data.riwayahLabel(ri).split(' ')[0];   // "Ḥafṣ" / "Warsh" — compact for the bar
      const o = util.el('option', { value: ri }, short);
      if (ri === store.settings.riwayah) o.selected = true;
      sel.append(o);
    });
  }

  function reconfigure() {
    const r = audio.configure({ reciterId: store.settings.reciter, riwayah: store.settings.riwayah });
    if (r && r.id !== store.settings.reciter) store.setSetting('reciter', r.id);
  }

  // ---- player ----
  const P = {};
  function initPlayer() {
    ['pPrev', 'pPlay', 'pNext', 'pStop', 'player', 'pTitle', 'pSub', 'playerProgress']
      .forEach(id => P[id] = document.getElementById(id));
    P.pPlay.addEventListener('click', () => audio.toggle());
    P.pStop.addEventListener('click', () => { audio.stop(); hide(); });
    P.pPrev.addEventListener('click', () => { if (curAyah > 1) audio.playSingle(curAyah - 1, { reps: store.settings.repsPerAyah, gapMs: store.settings.gapMs }); });
    P.pNext.addEventListener('click', () => { if (curAyah < data.count) audio.playSingle(curAyah + 1, { reps: store.settings.repsPerAyah, gapMs: store.settings.gapMs }); });

    audio.on('statechange', s => {
      P.pPlay.textContent = (s === 'playing' || s === 'gap') ? '⏸' : '▶';
      if (s !== 'stopped') show();
    });
    audio.on('ayahstart', (n, item) => {
      curAyah = n; store.setLast({ ayah: n });
      const r = audio.getReciter();
      P.pTitle.textContent = item && item.isFull ? `Surah Al-Baqarah` : `Ayah ${n}`;
      P.pSub.textContent = (r ? r.name_en : '') + (item && item.isFull ? '' : ` · ${data.riwayahLabel(audio.getRiwayah())}`);
      show();
      if (highlighter) { try { highlighter(n, item); } catch (e) {} }
    });
    audio.on('progress', frac => { P.playerProgress.firstElementChild.style.width = (frac * 100).toFixed(1) + '%'; });
    audio.on('rangedone', () => { P.playerProgress.firstElementChild.style.width = '0%'; });
  }
  function show() { P.player.hidden = false; }
  function hide() { P.player.hidden = true; }

  function onRiwayahChange(ri) {
    store.setSetting('riwayah', ri);
    audio.stop(); hide();
    reconfigure();
    nav.route(); // re-mount current view with new riwāyah
  }
  BA.app = {
    setTheme, refreshStreak, onRiwayahChange, reconfigure,
    onAyah(fn) { highlighter = fn; },     // view registers a highlight hook (replaces previous)
    clearAyah() { highlighter = null; },
    get curAyah() { return curAyah; },
    canInstall() { return !!deferredPrompt; },
    async promptInstall() {
      if (!deferredPrompt) return false;
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      deferredPrompt = null;
      return outcome === 'accepted';
    },
    isIOS() { return /iphone|ipad|ipod/i.test(navigator.userAgent) && !window.MSStream; },
    isStandalone() { return matchMedia('(display-mode: standalone)').matches || navigator.standalone === true; },
  };

  async function boot() {
    setTheme(store.settings.theme || 'light');
    audio.init(); initPlayer();

    const main = document.getElementById('main');
    try {
      await data.load();
    } catch (e) {
      main.innerHTML = '<div class="card">Could not load the Qur’an data. If you opened the file directly, please serve the folder over HTTP (e.g. <code>python3 -m http.server</code>).</div>';
      console.error(e); return;
    }
    fillRiwayahSelect();
    reconfigure();
    audio.setRate(store.settings.speed || 1);
    refreshStreak();
    if (BA.settings) BA.settings.applyFont(store.settings.font || 'scheherazade');
    nav.buildSidebar();

    // top-bar events
    document.getElementById('themeToggle').addEventListener('click',
      () => setTheme(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark'));
    document.getElementById('riwayahSelect').addEventListener('change', e => onRiwayahChange(e.target.value));
    document.getElementById('menuToggle').addEventListener('click', () => nav.openMobile());
    document.getElementById('scrim').addEventListener('click', () => nav.closeMobile());

    // router
    window.addEventListener('hashchange', nav.route);
    if (!location.hash) location.hash = '#/' + (store.last.view || 'home');
    nav.route();

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('./sw.js').catch(() => {});
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})(window.BA = window.BA || {});
