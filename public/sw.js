/**
 * Service Worker for electis Space PWA
 * Provides app installability and basic offline caching of app shell.
 */

const CACHE_NAME = 'electis-space-v1';

// Cache app shell on install
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      cache.addAll(['./', './index.html'])
    )
  );
});

// Clean up old caches on activate
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

// Network-first strategy: try network, fall back to cache
self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Skip non-GET, API calls, and SSE connections
  if (
    request.method !== 'GET' ||
    request.url.includes('/api/') ||
    request.url.includes('/events')
  ) {
    return;
  }

  // Skip cross-origin requests (fonts, analytics, etc.)
  if (new URL(request.url).origin !== self.location.origin) {
    return;
  }

  event.respondWith(
    fetch(request)
      .then((response) => {
        // Cache successful responses for navigation requests
        if (response.ok && request.mode === 'navigate') {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
        }
        return response;
      })
      .catch(() => caches.match(request))
  );
});
