const CACHE_NAME = 'safeneighbor-v24';
const TILES_CACHE = 'safeneighbor-tiles-v2';
const MAX_TILES = 1000;

// Essential app shell files
const SHELL_URLS = [
  '/',
  '/index.html',
  '/?page=scenarios&scenario=rights-card',
  '/?page=legal',
  '/?modal=offline-library',
  '/?page=scenarios&scenario=de-escalation',
  '/?page=scenarios&scenario=follow-ice',
  '/manifest.json',
  '/logo192.png',
  '/logo512.png',
  '/apple-touch-icon.png',
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

  // Skip Chrome extension and blob/data URL requests
  if (event.request.url.startsWith('chrome-extension://') ||
      event.request.url.startsWith('blob:') ||
      event.request.url.startsWith('data:')) {
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

  // Map tiles - network first with cache fallback.
  // Mobile PWAs can be finicky when opaque tile responses are fully proxied through the SW,
  // so prefer the live network path whenever available.
  if (url.hostname.endsWith('.tile.openstreetmap.org')) {
    event.respondWith(
      caches.open(TILES_CACHE).then((cache) => {
        return fetch(event.request).then((response) => {
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
          }).catch(() => {
            return cache.match(event.request).then((cached) => {
              if (cached) return cached;
              return new Response('', { status: 504, statusText: 'Tile unavailable' });
            });
          });
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

// ─── Tile Download State ────────────────────────────────────
let tileDownloadAborted = false;

async function notifyAllClients(data) {
  const clients = await self.clients.matchAll({ type: 'window' });
  clients.forEach(client => client.postMessage(data));
}

async function downloadTilesInSW(urls) {
  const cache = await caches.open(TILES_CACHE);
  const MAX_CONCURRENT = 2; // OSM usage policy
  const DELAY_MS = 150;
  let completed = 0;
  let failed = 0;
  const total = urls.length;

  for (let i = 0; i < urls.length; i += MAX_CONCURRENT) {
    if (tileDownloadAborted) {
      await notifyAllClients({ type: 'TILE_DOWNLOAD_COMPLETE', completed, failed, total, cancelled: true });
      return;
    }

    const batch = urls.slice(i, i + MAX_CONCURRENT);
    await Promise.all(
      batch.map(async (url) => {
        try {
          // Skip already-cached tiles
          const existing = await cache.match(url);
          if (existing) { completed++; return; }

          const response = await fetch(url);
          if (response && (response.status === 200 || response.type === 'opaque')) {
            await cache.put(url, response);
            completed++;
          } else {
            failed++;
          }
        } catch {
          failed++;
        }
      })
    );

    await notifyAllClients({ type: 'TILE_PROGRESS', completed, failed, total });
    await new Promise(r => setTimeout(r, DELAY_MS));
  }

  // Prune if over limit
  const keys = await cache.keys();
  if (keys.length > MAX_TILES) {
    const excess = keys.length - MAX_TILES;
    for (let i = 0; i < excess; i++) {
      await cache.delete(keys[i]);
    }
  }

  await notifyAllClients({ type: 'TILE_DOWNLOAD_COMPLETE', completed, failed, total, cancelled: false });
}

// Listen for messages from client
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }

  if (event.data && event.data.type === 'DOWNLOAD_TILES') {
    tileDownloadAborted = false;
    event.waitUntil(downloadTilesInSW(event.data.urls || []));
  }

  if (event.data && event.data.type === 'CANCEL_TILE_DOWNLOAD') {
    tileDownloadAborted = true;
  }

  if (event.data && event.data.type === 'GET_TILE_CACHE_SIZE') {
    event.waitUntil(
      caches.open(TILES_CACHE).then(async (cache) => {
        const keys = await cache.keys();
        await notifyAllClients({ type: 'TILE_CACHE_SIZE', count: keys.length });
      })
    );
  }

  if (event.data && event.data.type === 'CLEAR_TILE_CACHE') {
    event.waitUntil(
      caches.delete(TILES_CACHE).then(async () => {
        await caches.open(TILES_CACHE); // re-create empty
        await notifyAllClients({ type: 'TILE_CACHE_CLEARED' });
      })
    );
  }
});

// ─── IndexedDB helpers (SW context) ──────────────────────────
const DB_NAME = 'SafeNeighborDB';
const DB_VERSION = 2;
const PENDING_STORE = 'pendingReports';
const SUBMIT_URL = 'https://us-central1-safeneighbor-33bb0.cloudfunctions.net/submitReport';
const MAX_ATTEMPTS = 5;

function openSyncDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onerror = () => reject(req.error);
    req.onsuccess = () => resolve(req.result);
    req.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains('recordings')) {
        const store = db.createObjectStore('recordings', { keyPath: 'id' });
        store.createIndex('createdAt', 'createdAt', { unique: false });
      }
      if (!db.objectStoreNames.contains(PENDING_STORE)) {
        const store = db.createObjectStore(PENDING_STORE, { keyPath: 'id' });
        store.createIndex('createdAt', 'createdAt', { unique: false });
      }
    };
  });
}

function getAllPending(db) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction([PENDING_STORE], 'readonly');
    const req = tx.objectStore(PENDING_STORE).getAll();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function deletePending(db, id) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction([PENDING_STORE], 'readwrite');
    const req = tx.objectStore(PENDING_STORE).delete(id);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

function updateAttempts(db, record) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction([PENDING_STORE], 'readwrite');
    const req = tx.objectStore(PENDING_STORE).put({ ...record, attempts: (record.attempts || 0) + 1 });
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

async function syncAllPendingReports() {
  const db = await openSyncDB();
  const records = await getAllPending(db);
  if (!records.length) return;

  console.log('SafeNeighbor SW: Syncing', records.length, 'pending reports');
  let synced = 0;

  for (const record of records) {
    // Skip records that have exceeded max attempts
    if ((record.attempts || 0) >= MAX_ATTEMPTS) {
      console.log('SafeNeighbor SW: Skipping report', record.id, '(max attempts reached)');
      continue;
    }

    try {
      const response = await fetch(SUBMIT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(record.serverPayload)
      });

      if (response.status === 429) {
        // Rate limited — throw so the browser retries with backoff
        await updateAttempts(db, record);
        throw new Error('Rate limited (429)');
      }

      if (response.ok) {
        await deletePending(db, record.id);
        synced++;
        console.log('SafeNeighbor SW: Synced report', record.id);
      } else {
        await updateAttempts(db, record);
        console.log('SafeNeighbor SW: Report', record.id, 'failed:', response.status);
      }
    } catch (err) {
      console.error('SafeNeighbor SW: Sync error for', record.id, err);
      throw err; // Let the browser schedule a retry
    }
  }

  // Notify any open tabs so they can refresh their UI
  const clients = await self.clients.matchAll({ type: 'window' });
  clients.forEach(client => client.postMessage({ type: 'SYNC_COMPLETED', synced }));
}

// Background Sync: Process pending reports when connectivity returns
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-pending-reports') {
    event.waitUntil(syncAllPendingReports());
  }
});

// ─── Web Push Notifications ──────────────────────────────────

// Push event — display notification from server payload
self.addEventListener('push', (event) => {
  let data = { title: 'SafeNeighbor', body: 'New activity near you' };
  try {
    if (event.data) data = event.data.json();
  } catch (e) {
    console.error('SafeNeighbor SW: Failed to parse push payload', e);
  }

  const options = {
    body: data.body || '',
    icon: data.icon || '/logo192.png',
    badge: data.badge || '/favicon-32x32.png',
    data: data.data || { url: '/' },
    actions: [
      { action: 'view', title: 'View Reports' },
      { action: 'dismiss', title: 'Dismiss' },
    ],
    vibrate: [100, 50, 100],
    tag: 'safeneighbor-alert',
    renotify: true,
  };

  event.waitUntil(self.registration.showNotification(data.title || 'SafeNeighbor', options));
});

// Notification click — focus existing tab or open new one
// SECURITY: Validate same-origin to prevent phishing via crafted push payloads
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'dismiss') return;

  const rawUrl = event.notification.data?.url || '/?tab=report';

  // Validate URL is same-origin; reject cross-origin URLs
  let targetUrl;
  try {
    const parsed = new URL(rawUrl, self.location.origin);
    targetUrl = parsed.origin === self.location.origin ? parsed.href : '/?tab=report';
  } catch {
    targetUrl = new URL('/?tab=report', self.location.origin).href;
  }

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Focus an existing tab if possible
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.navigate(targetUrl);
          return client.focus();
        }
      }
      // Otherwise open a new window
      return self.clients.openWindow(targetUrl);
    })
  );
});
