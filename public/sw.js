// The CACHE_VERSION string is injected during the CI/CD build step 
// (e.g., replacing 'development' with VERCEL_GIT_COMMIT_SHA)
const CACHE_VERSION = '2026-06-21T10-24-42-011Z';
const CACHE_NAME = `mealiez-mobile-${CACHE_VERSION}`;
const OFFLINE_URL = '/m/offline';

const STATIC_ASSETS = [
  '/manifest.json',
  OFFLINE_URL,
  '/m/home',
  '/m/my-qr',
  '/m/profile',
  '/m/meals',
  '/m/attendance/history',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png'
];

// -- LIFECYCLE EVENTS --

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      // Fault-tolerant caching: if a single file 404s, don't crash the entire installation
      return Promise.allSettled(
        STATIC_ASSETS.map((url) =>
          fetch(url).then((response) => {
            if (!response.ok) throw new Error(`Failed to fetch ${url}`);
            return cache.put(url, response);
          }).catch((err) => console.warn('[SW] Cache installation skipped for:', url, err))
        )
      );
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          // Delete all old caches that do not match the current deployment version
          if (cacheName !== CACHE_NAME && cacheName.startsWith('mealiez-mobile-')) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// -- FETCH STRATEGIES --

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // 1. STRICT SECURITY: NEVER CACHE API OR TRANSACTIONS
  if (url.pathname.startsWith('/api/') || event.request.method !== 'GET') {
    return;
  }

  // 2. Next.js Static Assets (Cache First)
  // Evaluated BEFORE the /m/ filter so JS/CSS chunks are properly cached
  if (url.pathname.startsWith('/_next/static/')) {
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        if (cachedResponse) return cachedResponse;
        
        return fetch(event.request).then((networkResponse) => {
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseClone));
          return networkResponse;
        });
      })
    );
    return;
  }

  // 3. Icons & Manifest (Stale While Revalidate)
  if (url.pathname.startsWith('/icons/') || url.pathname === '/manifest.json') {
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        const fetchPromise = fetch(event.request).then((networkResponse) => {
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, networkResponse.clone()));
          return networkResponse;
        });
        return cachedResponse || fetchPromise;
      })
    );
    return;
  }

  // 4. Navigation requests (e.g., page loads) - Network first -> Fallback to Cache or Offline UI
  if (event.request.mode === 'navigate') {
    const onlineOnlyPaths = [
      '/m/attendance/scan',
      '/m/attendance/active',
      '/m/attendance/sessions',
      '/m/meal-requests',
      '/m/inventory/purchase',
      '/m/reports'
    ];

    const isOnlineOnly = onlineOnlyPaths.some(p => url.pathname.startsWith(p));

    if (isOnlineOnly) {
      event.respondWith(
        fetch(event.request).catch(() => caches.match(OFFLINE_URL))
      );
    } else {
      event.respondWith(
        fetch(event.request)
          .then((response) => {
            if (response.ok && !response.bodyUsed) {
              try {
                const responseClone = response.clone();
                caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseClone));
              } catch (err) {
                console.warn('[SW] Failed to clone navigation response:', err);
              }
            }
            return response;
          })
          .catch(() => {
            return caches.match(event.request).then((cachedResponse) => {
              return cachedResponse || caches.match(OFFLINE_URL);
            });
          })
      );
    }
    return;
  }
});
