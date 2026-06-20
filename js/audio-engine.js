/* audio-engine.js — long-lived loop engine. Owns ONE <audio> + a prefetch element so
   it survives view navigation. Sequences per-ayah files with repeat counts, range
   loops and inter-rep gaps; falls back to a single whole-surah file for full-surah
   reciters. Emits events the views/player subscribe to. */
(function (BA) {
  const R = BA.reciters;

  const listeners = {};
  function on(evt, cb) { (listeners[evt] = listeners[evt] || []).push(cb); }
  function emit(evt, ...a) { (listeners[evt] || []).forEach(cb => { try { cb(...a); } catch (e) { console.error(e); } }); }

  let audio, prefetch;
  let reciter = null, riwayah = 'hafs';
  let playlist = [], idx = -1, gapMs = 800, state = 'stopped', gapTimer = null, retried = false;
  let rate = 1;

  function setState(s) { state = s; emit('statechange', s); }

  function init() {
    audio = new Audio(); audio.preload = 'auto';
    prefetch = new Audio(); prefetch.preload = 'auto'; prefetch.muted = true;
    audio.addEventListener('ended', onEnded);
    audio.addEventListener('error', onError);
    audio.addEventListener('timeupdate', () => {
      if (state !== 'playing' || !audio.duration) return;
      emit('progress', audio.currentTime / audio.duration, audio.currentTime, audio.duration);
    });
    audio.addEventListener('play', () => setState('playing'));
  }

  function configure({ reciterId, riwayah: ri }) {
    if (ri) riwayah = ri;
    if (reciterId) reciter = BA.data.reciter(reciterId);
    if (!reciter || reciter.riwayah !== riwayah) reciter = BA.data.defaultReciter(riwayah);
    return reciter;
  }

  function buildPerAyah(from, to, repsPerAyah, rangeReps) {
    const list = [];
    for (let pass = 0; pass < Math.max(1, rangeReps); pass++)
      for (let a = from; a <= to; a++)
        for (let r = 0; r < Math.max(1, repsPerAyah); r++)
          list.push({ ayah: a, url: R.ayahUrl(reciter, a), rep: r, pass, isFull: false });
    return list;
  }

  function playRange(opts) {
    stop();
    const from = BA.util.clamp(opts.from || 1, 1, BA.data.count);
    const to = BA.util.clamp(opts.to || from, from, BA.data.count);
    gapMs = opts.gapMs != null ? opts.gapMs : gapMs;
    if (!R.canLoop(reciter)) {                 // full-surah reciter → single file
      playlist = [{ ayah: from, url: R.surahUrl(reciter), isFull: true, from, to }];
    } else {
      playlist = buildPerAyah(from, to, opts.repsPerAyah, opts.rangeReps);
    }
    idx = -1; advance();
  }

  function playSingle(ayah, opts = {}) {
    stop();
    gapMs = opts.gapMs != null ? opts.gapMs : gapMs;
    if (!R.canLoop(reciter)) { playlist = [{ ayah, url: R.surahUrl(reciter), isFull: true, from: ayah, to: ayah }]; }
    else { playlist = []; for (let r = 0; r < Math.max(1, opts.reps || 1); r++) playlist.push({ ayah, url: R.ayahUrl(reciter, ayah), rep: r, isFull: false }); }
    idx = -1; advance();
  }

  function loadCurrent() {
    const item = playlist[idx];
    if (!item) return finish();
    retried = false;
    audio.src = item.url;
    audio.playbackRate = rate;
    const p = audio.play();
    if (p && p.catch) p.catch(() => {/* autoplay block: wait for user gesture */ setState('paused'); });
    emit('ayahstart', item.ayah, item);
    // warm the next file
    const nxt = playlist[idx + 1];
    if (nxt && nxt.url && nxt.url !== item.url) { try { prefetch.src = nxt.url; } catch (e) {} }
  }

  function onEnded() {
    const item = playlist[idx];
    if (item) emit('ayahend', item.ayah, item);
    if (idx + 1 >= playlist.length) return finish();
    setState('gap');
    gapTimer = setTimeout(() => { if (state === 'gap') advance(); }, item && item.isFull ? 0 : gapMs);
  }

  function onError() {
    const item = playlist[idx];
    if (!retried) { retried = true; setTimeout(() => { try { audio.load(); audio.play(); } catch (e) {} }, 400); return; }
    if (item) emit('error', item.ayah, item);
    if (idx + 1 >= playlist.length) return finish();
    advance();
  }

  function advance() { idx++; loadCurrent(); }
  function finish() { setState('stopped'); emit('rangedone'); }

  function pause() { if (state === 'playing') { audio.pause(); setState('paused'); } else if (state === 'gap') { clearTimeout(gapTimer); setState('paused'); } }
  function resume() { if (state === 'paused') { if (audio.src && audio.currentTime < (audio.duration || 1e9)) audio.play(); else advance(); } }
  function toggle() { (state === 'playing' || state === 'gap') ? pause() : resume(); }
  function stop() { clearTimeout(gapTimer); if (audio) { audio.pause(); } playlist = []; idx = -1; setState('stopped'); }

  function setRate(r) { rate = r; if (audio) audio.playbackRate = r; }
  function getRate() { return rate; }
  function current() { return playlist[idx] || null; }
  function getState() { return state; }
  function getReciter() { return reciter; }
  function getRiwayah() { return riwayah; }

  BA.audio = { init, configure, playRange, playSingle, pause, resume, toggle, stop,
               setRate, getRate, on, current, getState, getReciter, getRiwayah };
})(window.BA = window.BA || {});
