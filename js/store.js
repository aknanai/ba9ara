/* store.js — all persistent state in one namespaced localStorage key. */
(function (BA) {
  const KEY = 'ba9ara.v1';
  const DEFAULT = {
    version: 1,
    settings: {
      riwayah: 'hafs', reciter: 'husary_muallim',
      repsPerAyah: 3, rangeReps: 2, gapMs: 800, speed: 1,
      theme: 'light', hideLevel: 0, font: 'scheherazade', lang: 'off',
      dailyNew: 5,                        // how many fresh ayāt a Review session introduces per day
    },
    progress: {},                         // "2:3": {status, reviews, lastSeen, box, due, lastReview, firstSeen}
    streak: { current: 0, best: 0, lastActiveDay: null },
    last: { view: 'home', ayah: 1, rangeFrom: 1, rangeTo: 5 },
  };
  const STATUS = ['unseen', 'learning', 'solid', 'mastered'];

  // ── Leitner spaced-repetition ladder ──────────────────────────────────────
  // box 0 = never reviewed · 1..5 = scheduled. Days until next review per box:
  const BOX_DAYS = [0, 1, 3, 7, 16, 40];
  const STATUS_BOX = { unseen: 0, learning: 1, solid: 3, mastered: 5 };
  function boxToStatus(box) { return box >= 4 ? 'mastered' : box >= 2 ? 'solid' : box >= 1 ? 'learning' : 'unseen'; }
  function dueTime(days) {
    if (days <= 0) return Date.now();                 // due now (graded "again")
    const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() + days);
    return d.getTime();                                // start of the target day
  }
  function dayStr(ms) { const d = new Date(ms); return `${d.getFullYear()}-${BA.util.pad2(d.getMonth() + 1)}-${BA.util.pad2(d.getDate())}`; }

  let state = load();

  // give a legacy entry (status only) the SRS fields it predates
  function migrateEntry(e) {
    if (!e) return e;
    if (e.box == null) e.box = STATUS_BOX[e.status] != null ? STATUS_BOX[e.status] : 1;
    if (e.due == null) e.due = Date.now();             // surface for review on first run
    if (e.firstSeen == null) e.firstSeen = e.lastSeen || Date.now();
    return e;
  }
  function migrate(s) {
    s.settings = Object.assign({}, DEFAULT.settings, s.settings);
    s.streak = Object.assign({}, DEFAULT.streak, s.streak);
    s.last = Object.assign({}, DEFAULT.last, s.last);
    s.progress = s.progress || {};
    for (const k in s.progress) migrateEntry(s.progress[k]);
    return s;
  }

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return structuredClone(DEFAULT);
      return migrate(JSON.parse(raw));
    } catch (e) { return structuredClone(DEFAULT); }
  }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) {} }

  function entryFor(key) {
    let e = state.progress[key];
    if (!e) e = state.progress[key] = { status: 'unseen', reviews: 0, lastSeen: 0, box: 0, due: 0, lastReview: 0, firstSeen: Date.now() };
    if (!e.firstSeen) e.firstSeen = Date.now();
    return e;
  }

  const Store = {
    get settings() { return state.settings; },
    get last() { return state.last; },
    get streak() { return state.streak; },
    STATUS, BOX_DAYS,

    setSetting(k, v) { state.settings[k] = v; save(); },
    setLast(patch) { Object.assign(state.last, patch); save(); },

    status(key) { return (state.progress[key] && state.progress[key].status) || 'unseen'; },
    progressEntry(key) { return state.progress[key] || null; },

    markAyah(key, status) {
      if (!STATUS.includes(status)) return;
      const e = entryFor(key);
      e.status = status; e.reviews = (e.reviews || 0) + 1; e.lastSeen = Date.now();
      if (e.box == null || e.box === 0) e.box = STATUS_BOX[status] || 1;   // keep SRS in step
      this.touchStreak(); save();
    },
    // bump status one notch toward mastered, or knock back to learning
    bump(key, dir) {
      const cur = this.status(key);
      let i = STATUS.indexOf(cur);
      i = BA.util.clamp(dir > 0 ? i + 1 : 1, 1, STATUS.length - 1);
      this.markAyah(key, STATUS[i]);
      return STATUS[i];
    },

    // ── spaced repetition ────────────────────────────────────────────────────
    // grade ∈ 'again' | 'good' | 'easy' — schedules the next review and syncs status.
    review(key, grade) {
      const e = entryFor(key);
      let box = e.box || 0;
      if (grade === 'again') box = 1;
      else if (grade === 'good') box = BA.util.clamp(box + 1, 1, 5);
      else if (grade === 'easy') box = BA.util.clamp(box + 2, 2, 5);
      else return null;
      e.box = box;
      e.due = dueTime(grade === 'again' ? 0 : BOX_DAYS[box]);
      e.status = boxToStatus(box);
      e.reviews = (e.reviews || 0) + 1;
      e.lastReview = e.lastSeen = Date.now();
      this.touchStreak(); save();
      return e;
    },
    // ayah numbers whose review is due now, soonest-first
    dueReviews() {
      const now = Date.now(), out = [];
      for (let n = 1; n <= 286; n++) { const e = state.progress['2:' + n]; if (e && e.box >= 1 && (e.due || 0) <= now) out.push({ n, due: e.due }); }
      out.sort((a, b) => a.due - b.due);
      return out.map(x => x.n);
    },
    // never-seen ayāt, in order, up to `limit`
    newAyat(limit) {
      const out = [];
      for (let n = 1; n <= 286 && out.length < limit; n++) if (!state.progress['2:' + n]) out.push(n);
      return out;
    },
    // how many fresh ayāt were introduced today (caps the daily intake)
    newToday() {
      const today = BA.util.todayStr(); let c = 0;
      for (const k in state.progress) { const e = state.progress[k]; if (e.firstSeen && dayStr(e.firstSeen) === today) c++; }
      return c;
    },
    newRemaining() { return Math.max(0, (state.settings.dailyNew || 0) - this.newToday()); },
    dueCount() { return this.dueReviews().length; },
    // a session: everything due, then up to the day's remaining new ayāt
    reviewQueue() {
      const due = this.dueReviews().map(n => ({ n, isNew: false }));
      const news = this.newAyat(this.newRemaining()).map(n => ({ n, isNew: true }));
      return due.concat(news);
    },
    // soonest upcoming (not-yet-due) review time, or null
    nextDueTime() {
      const now = Date.now(); let best = null;
      for (let n = 1; n <= 286; n++) { const e = state.progress['2:' + n]; if (e && e.box >= 1 && (e.due || 0) > now) best = best == null ? e.due : Math.min(best, e.due); }
      return best;
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
      state = migrate(s); save();
    },
    resetProgress() { state.progress = {}; state.streak = structuredClone(DEFAULT.streak); save(); },
  };
  BA.store = Store;
})(window.BA = window.BA || {});
