/* ═══════════════════════════════════════════════════════════════
   ChipMind — Service Worker
   Cache offline-first pour toute l'application
   ⚠️  Incrémenter CACHE_NAME à chaque déploiement significatif
═══════════════════════════════════════════════════════════════ */

const CACHE_NAME = 'chipmind-v2';

const CACHE_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/css/variables.css',
  '/js/storage.js',
  '/js/achievements.js',
  '/js/sounds.js',
  '/js/app.js',
  '/modules/module1.html',
  '/modules/module2.html',
  '/modules/module3.html',
  /* Sons — tous en minuscules */
  '/assets/sounds/correct.mp3',
  '/assets/sounds/wrong.mp3',
  '/assets/sounds/flip.mp3',
  '/assets/sounds/star.mp3',
  '/assets/sounds/achieve.mp3',
  '/assets/sounds/tick.mp3',
  '/assets/sounds/keypress.mp3',
  '/assets/sounds/back.mp3',
  '/assets/sounds/ambient.mp3',
  '/assets/sounds/game.mp3',
];

/* ── Installation : pré-cache tous les assets ── */
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      /* addAll en bloc — si un asset manque, on log sans planter */
      return Promise.allSettled(
        CACHE_ASSETS.map(url =>
          cache.add(url).catch(err =>
            console.warn(`[SW] Non mis en cache : ${url}`, err)
          )
        )
      );
    })
  );
  self.skipWaiting();
});

/* ── Activation : purge les anciens caches ── */
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(k => k !== CACHE_NAME)
          .map(k => {
            console.log(`[SW] Purge ancien cache : ${k}`);
            return caches.delete(k);
          })
      )
    )
  );
  self.clients.claim();
});

/* ── Fetch : Cache-First, fallback réseau ── */
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;

  /* Google Fonts : network-first pour fraîcheur */
  if (event.request.url.includes('fonts.googleapis') ||
      event.request.url.includes('fonts.gstatic')) {
    event.respondWith(
      caches.open(CACHE_NAME).then(async cache => {
        const cached = await cache.match(event.request);
        if (cached) return cached;
        try {
          const response = await fetch(event.request);
          cache.put(event.request, response.clone());
          return response;
        } catch {
          return cached || new Response('', { status: 503 });
        }
      })
    );
    return;
  }

  /* Tout le reste : cache-first */
  event.respondWith(
    caches.match(event.request).then(async cached => {
      if (cached) return cached;
      try {
        const response = await fetch(event.request);
        /* Met automatiquement en cache les ressources chargées à la volée */
        if (response.ok) {
          const cache = await caches.open(CACHE_NAME);
          cache.put(event.request, response.clone());
        }
        return response;
      } catch {
        /* Offline fallback pour les pages HTML */
        if (event.request.headers.get('accept')?.includes('text/html')) {
          return caches.match('/index.html');
        }
        return new Response('Offline', { status: 503 });
      }
    })
  );
});

/* ── Message : forcer la mise à jour du cache ── */
self.addEventListener('message', event => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting();
});
