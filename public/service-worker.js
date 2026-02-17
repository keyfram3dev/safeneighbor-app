const CACHE_NAME = 'safeneighbor-v17';
const TILES_CACHE = 'safeneighbor-tiles-v1';
const MAX_TILES = 300;

// Essential app shell files
const SHELL_URLS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/logo192.png',
  '/logo512.png',
  '/apple-touch-icon.png',
  '/favicon.ico',
  '/favicon.svg',
  '/favicon-16x16.png',
  '/favicon-32x32.png',
  '/logo-text-512.png',
  '/icon.svg',
  '/logo.svg',
  '/sounds/1shortwhistle.mov',
  '/sounds/2shortwhistles.mov',
  '/sounds/3shortwhistles.m4a',
  '/sounds/longwhistle.mov'
];

// CDN dependencies required for offline (versioned = immutable)
const CDN_URLS = [
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js',
  'https://unpkg.com/leaflet.heat@0.2.0/dist/leaflet-heat.js',
  'https://unpkg.com/leaflet.markercluster@1.5.3/dist/MarkerCluster.css',
  'https://unpkg.com/leaflet.markercluster@1.5.3/dist/leaflet.markercluster.js'
];

// Install event - cache app shell, CDN deps, and build assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      console.log('SafeNeighbor: Caching app shell');
      await cache.addAll(SHELL_URLS).catch((err) => {
        console.log('SafeNeighbor: Shell cache error:', err);
      });

      // Cache CDN dependencies (Leaflet)
      console.log('SafeNeighbor: Caching CDN dependencies');
      await cache.addAll(CDN_URLS).catch((err) => {
        console.log('SafeNeighbor: CDN cache error:', err);
      });

      // Fetch the asset manifest and cache all JS/CSS bundles
      try {
        const response = await fetch('/asset-manifest.json');
        const manifest = await response.json();
        const filesToCache = Object.values(manifest.files)
          .filter((url) => url.endsWith('.js') || url.endsWith('.css'));
        console.log('SafeNeighbor: Caching build assets:', filesToCache.length, 'files');
        await cache.addAll(filesToCache);
      } catch (err) {
        console.log('SafeNeighbor: Asset manifest cache error:', err);
      }
    })
  );
  // Force immediate activation so code updates take effect right away
  self.skipWaiting();
});

// Fetch event - strategy depends on request type
self.addEventListener('fetch', (event) => {
  // Pass through non-GET requests (POST, etc.) directly to network
  if (event.request.method !== 'GET') {
    event.respondWith(fetch(event.request));
    return;
  }

  // Skip Chrome extension requests
  if (event.request.url.startsWith('chrome-extension://')) {
    return;
  }

  const url = new URL(event.request.url);

  // Skip API calls and Firebase backend requests (not hosting assets)
  if (url.hostname === 'firestore.googleapis.com' ||
      url.hostname.endsWith('.firebaseio.com') ||
      url.hostname.endsWith('.cloudfunctions.net') ||
      url.pathname.startsWith('/api/')) {
    return;
  }

  // Skip analytics and auth
  if (url.hostname === 'cloud.umami.is' ||
      url.hostname === 'api-gateway.umami.dev' ||
      url.hostname === 'accounts.google.com') {
    return;
  }

  // CDN requests (unpkg.com for Leaflet) - CACHE FIRST since versioned/immutable
  if (url.hostname === 'unpkg.com') {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        if (cached) return cached;
        return fetch(event.request).then((response) => {
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return response;
        });
      })
    );
    return;
  }

  // Map tiles - stale-while-revalidate with separate cache and size limit
  if (url.hostname.endsWith('.tile.openstreetmap.org')) {
    event.respondWith(
      caches.open(TILES_CACHE).then((cache) => {
        return cache.match(event.request).then((cached) => {
          const fetchPromise = fetch(event.request).then((response) => {
            // Cache both CORS (status 200) and no-cors opaque responses (status 0)
            if (response && (response.status === 200 || response.type === 'opaque')) {
              cache.put(event.request, response.clone());
              // Prune old tiles if cache is too large
              cache.keys().then((keys) => {
                if (keys.length > MAX_TILES) {
                  cache.delete(keys[0]);
                }
              });
            }
            return response;
          }).catch(() => cached);
          return cached || fetchPromise;
        });
      })
    );
    return;
  }

  // Pass through other external requests to the network directly
  if (url.origin !== self.location.origin) {
    event.respondWith(fetch(event.request));
    return;
  }

  // Same-origin requests: NETWORK FIRST with cache fallback
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Clone and cache successful responses
        if (response && response.status === 200) {
          const responseToCache = response.clone();
          caches.open(CACHE_NAME)
            .then((cache) => {
              cache.put(event.request, responseToCache);
            });
        }
        return response;
      })
      .catch(() => {
        // Network failed, try cache
        return caches.match(event.request)
          .then((cachedResponse) => {
            if (cachedResponse) {
              return cachedResponse;
            }
            // For navigation requests, return cached index.html (SPA routing)
            if (event.request.mode === 'navigate') {
              return caches.match('/index.html');
            }
            // Return a proper offline response instead of null
            return new Response('', { status: 503, statusText: 'Offline' });
          });
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME && cacheName !== TILES_CACHE) {
            console.log('SafeNeighbor: Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  // Take control of all pages immediately
  self.clients.claim();
});

// Listen for skip-waiting message from client (update toast)
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Background Sync: Process pending reports when connectivity returns
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-pending-reports') {
    event.waitUntil(
      self.clients.matchAll({ type: 'window' }).then((clients) => {
        if (clients.length > 0) {
          clients[0].postMessage({ type: 'SYNC_PENDING_REPORTS' });
        }
      })
    );
  }
});
