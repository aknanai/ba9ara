/* store.js — all persistent state in one namespaced localStorage key. */
(function (BA) {
  const KEY = 'ba9ara.v1';
  const DEFAULT = {
    version: 1,
    settings: {
      riwayah: 'hafs', reciter: 'husary_muallim',
      repsPerAyah: 3, rangeReps: 2, gapMs: 800, speed: 1,
      theme: 'light', hideLevel: 0, font: 'scheherazade',
    },
    progress: {},                         // "2:3": {status, reviews, lastSeen}
    streak: { current: 0, best: 0, lastActiveDay: null },
    last: { view: 'home', ayah: 1, rangeFrom: 1, rangeTo: 5 },
  };
  const STATUS = ['unseen', 'learning', 'solid', 'mastered'];

  let state = load();

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return structuredClone(DEFAULT);
      const s = JSON.parse(raw);
      s.settings = Object.assign({}, DEFAULT.settings, s.settings);
      s.streak = Object.assign({}, DEFAULT.streak, s.streak);
      s.last = Object.assign({}, DEFAULT.last, s.last);
      s.progress = s.progress || {};
      return s;
    } catch (e) { return structuredClone(DEFAULT); }
  }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) {} }

  const Store = {
    get settings() { return state.settings; },
    get last() { return state.last; },
    get streak() { return state.streak; },
    STATUS,

    setSetting(k, v) { state.settings[k] = v; save(); },
    setLast(patch) { Object.assign(state.last, patch); save(); },

    status(key) { return (state.progress[key] && state.progress[key].status) || 'unseen'; },
    progressEntry(key) { return state.progress[key] || null; },

    markAyah(key, status) {
      if (!STATUS.includes(status)) return;
      const e = state.progress[key] || { status: 'unseen', reviews: 0, lastSeen: 0 };
      e.status = status; e.reviews = (e.reviews || 0) + 1; e.lastSeen = Date.now();
      state.progress[key] = e; this.touchStreak(); save();
    },
    // bump status one notch toward mastered, or knock back to learning
    bump(key, dir) {
      const cur = this.status(key);
      let i = STATUS.indexOf(cur);
      i = BA.util.clamp(dir > 0 ? i + 1 : 1, 1, STATUS.length - 1);
      this.markAyah(key, STATUS[i]);
      return STATUS[i];
    },

    counts() {
      const c = { unseen: 0, learning: 0, solid: 0, mastered: 0 };
      for (let n = 1; n <= 286; n++) c[this.status('2:' + n)]++;
      return c;
    },
    percent() { const c = this.counts(); return Math.round(((c.solid + c.mastered) / 286) * 100); },

    touchStreak() {
      const today = BA.util.todayStr(), s = state.streak;
      if (s.lastActiveDay === today) return;
      if (!s.lastActiveDay) s.current = 1;
      else { const d = BA.util.daysBetween(s.lastActiveDay, today); s.current = d === 1 ? s.current + 1 : 1; }
      s.best = Math.max(s.best || 0, s.current);
      s.lastActiveDay = today;
    },

    exportJSON() { return JSON.stringify(state, null, 2); },
    importJSON(text) {
      const s = JSON.parse(text);
      if (!s || typeof s !== 'object' || !s.settings) throw new Error('Not a valid backup');
      state = s; state.settings = Object.assign({}, DEFAULT.settings, s.settings); save();
    },
    resetProgress() { state.progress = {}; state.streak = structuredClone(DEFAULT.streak); save(); },
  };
  BA.store = Store;
})(window.BA = window.BA || {});
