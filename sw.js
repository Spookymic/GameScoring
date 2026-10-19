// Service worker : met l'application en cache pour un usage hors ligne.
// Incrémenter CACHE à chaque modification des fichiers listés.
const CACHE = 'gamescoring-v4';
const ASSETS = [
  './',
  'index.html',
  'manifest.webmanifest',
  'css/app.css',
  'js/app.js',
  'js/dom.js',
  'js/store.js',
  'js/components.js',
  'js/games/index.js',
  'js/games/harmonies.js',
  'js/games/oeufs.js',
  'js/games/akropolis.js',
  'js/games/qwixx.js',
  'js/games/mtg.js',
  'js/games/lorcana.js',
  'js/games/pixies.js',
  'js/games/seasalt.js',
  'js/games/courtisans.js',
  'js/games/faraway.js',
  'js/games/pikomino.js',
  'js/games/encore.js',
  'js/games/skyjo.js',
  'js/games/dix.js',
  'icons/icon.svg',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'icons/icon-maskable-512.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

// Stale-while-revalidate : réponse immédiate depuis le cache, mise à jour en arrière-plan.
self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) return;
  event.respondWith(
    caches.open(CACHE).then(async (cache) => {
      const cached = await cache.match(request, { ignoreSearch: true });
      const network = fetch(request)
        .then((response) => {
          if (response.ok) cache.put(request, response.clone());
          return response;
        })
        .catch(() => cached);
      return cached ?? network;
    }),
  );
});
