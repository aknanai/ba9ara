/* sw.js — offline app shell + serve any audio the user downloaded for offline. */
const SHELL = 'ba9ara-shell-v6';
const AUDIO = 'ba9ara-audio-v1';
const SHELL_FILES = [
  './', './index.html', './manifest.webmanifest',
  './assets/icon.svg', './assets/icon-192.png', './assets/icon-512.png',
  './assets/icon-maskable-512.png', './assets/apple-touch-icon.png',
  './assets/style.css', './assets/nav.js',
  './assets/fonts/scheherazade-400.woff2', './assets/fonts/scheherazade-700.woff2', './assets/fonts/amiri-quran.woff2',
  './js/util.js', './js/store.js', './js/data.js', './js/reciters.js', './js/audio-engine.js', './js/reveal.js', './js/app.js',
  './js/views/home.js', './js/views/listen.js', './js/views/memorize.js', './js/views/test.js', './js/views/progress.js', './js/views/settings.js',
  './data/baqarah.json', './data/reciters.json', './data/credits.json', './data/translations.json',
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(SHELL).then(c => c.addAll(SHELL_FILES)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys =>
    Promise.all(keys.filter(k => k !== SHELL && k !== AUDIO).map(k => caches.delete(k)))
  ).then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // audio: serve cached copy first (so downloaded reciters play offline), else network
  const isAudio = url.hostname.endsWith('everyayah.com') || url.hostname.endsWith('mp3quran.net');
  if (isAudio) {
    e.respondWith(caches.open(AUDIO).then(c => c.match(req).then(hit => hit || fetch(req))));
    return;
  }

  // same-origin app shell: cache-first, fall back to network (and refresh cache)
  if (url.origin === location.origin) {
    e.respondWith(
      caches.match(req).then(hit => hit || fetch(req).then(resp => {
        if (resp && resp.ok && resp.type === 'basic') { const cp = resp.clone(); caches.open(SHELL).then(c => c.put(req, cp)); }
        return resp;
      }).catch(() => hit))
    );
  }
});
