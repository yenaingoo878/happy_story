
const CACHE_NAME = 'little-moments-v4'; // Increment version to force update
const URLS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon.png',
  'https://cdn.tailwindcss.com',
  'https://fonts.googleapis.com/css2?family=Padauk:wght@400;700&display=swap'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Opened cache');
        return cache.addAll(URLS_TO_CACHE);
      })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('Clearing old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  // 1. Handle API calls (Network Only)
  // We don't want to cache API calls to Supabase or Gemini blindly
  if (event.request.url.includes('supabase.co') || event.request.url.includes('generativelanguage.googleapis.com')) {
      return; 
  }

  // 2. Handle Navigation/HTML (Network First, fall back to Cache)
  // Ensures user gets latest version if online
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .catch(() => {
          return caches.match('/index.html');
        })
    );
    return;
  }

  // 3. Handle Static Assets (Stale-While-Revalidate)
  event.respondWith(
    caches.match(event.request)
      .then((cachedResponse) => {
        const fetchPromise = fetch(event.request).then(
           (networkResponse) => {
               // Update cache with new version if valid
               if(networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
                   const responseToCache = networkResponse.clone();
                   caches.open(CACHE_NAME).then((cache) => {
                       cache.put(event.request, responseToCache);
                   });
               }
               return networkResponse;
           }
        ).catch(() => {
            // Network failed, do nothing (we will return cachedResponse)
        });

        // Return cached response immediately if available, otherwise wait for network
        return cachedResponse || fetchPromise;
      })
  );
});
