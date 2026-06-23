/* nav.js — VIEWS array is the single source of truth for the sidebar + hash router. */
(function (BA) {
  const VIEWS = [
    { id: 'home',     ic: '🏠', title: 'Home',          group: 'Start' },
    { id: 'review',   ic: '🎯', title: 'Review',        group: 'Memorize' },
    { id: 'listen',   ic: '🔁', title: 'Listen & Loop', group: 'Memorize' },
    { id: 'memorize', ic: '🙈', title: 'Memorize',      group: 'Memorize' },
    { id: 'test',     ic: '✅', title: 'Test',          group: 'Memorize' },
    { id: 'progress', ic: '📊', title: 'Progress',      group: 'You' },
    { id: 'settings', ic: '⚙️', title: 'Settings',      group: 'You' },
  ];

  function buildSidebar() {
    const side = document.getElementById('sidebar');
    side.innerHTML = '';
    const groups = [];
    VIEWS.forEach(v => {
      let g = groups.find(x => x.name === v.group);
      if (!g) { g = { name: v.group, items: [] }; groups.push(g); }
      g.items.push(v);
    });
    groups.forEach(g => {
      const wrap = document.createElement('div');
      wrap.className = 'nav-group';
      wrap.innerHTML = `<div class="nav-group-title">${g.name}</div>`;
      g.items.forEach(v => {
        const a = document.createElement('a');
        a.className = 'nav-link';
        a.href = `#/${v.id}`;
        a.dataset.view = v.id;
        a.innerHTML = `<span class="ic">${v.ic}</span><span>${v.title}</span>`;
        wrap.appendChild(a);
      });
      side.appendChild(wrap);
    });
  }

  function currentId() {
    const m = (location.hash || '').match(/^#\/(\w+)/);
    const id = m && m[1];
    return VIEWS.some(v => v.id === id) ? id : 'home';
  }

  function route() {
    const id = currentId();
    document.querySelectorAll('#main .view').forEach(sec => {
      const on = sec.dataset.view === id;
      sec.classList.toggle('active', on);
    });
    document.querySelectorAll('.nav-link').forEach(a => {
      a.classList.toggle('active', a.dataset.view === id);
    });
    if (BA.app && BA.app.clearAyah) BA.app.clearAyah();   // drop previous view's highlight hook
    const view = BA.views && BA.views[id];
    const sec = document.querySelector(`#main .view[data-view="${id}"]`);
    if (view && sec) {
      try { view.mount(sec); }
      catch (e) { console.error('view mount failed:', id, e); sec.innerHTML = '<div class="card">Something went wrong loading this view.</div>'; }
    }
    closeMobile();
    window.scrollTo(0, 0);
  }

  function go(id) { location.hash = `#/${id}`; }

  function openMobile() { document.getElementById('sidebar').classList.add('open'); document.getElementById('scrim').classList.add('show'); }
  function closeMobile() { document.getElementById('sidebar').classList.remove('open'); document.getElementById('scrim').classList.remove('show'); }

  BA.nav = { VIEWS, buildSidebar, route, go, currentId, openMobile, closeMobile };
})(window.BA = window.BA || {});
