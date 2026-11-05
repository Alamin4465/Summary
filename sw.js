// ============================================
// sw.js — Service Worker (Offline Support)
// ============================================

const CACHE_NAME = 'expense-tracker-v3'; // 🆕 ভার্সন আপডেট করা হলো

const ASSETS = [
  './',
  './index.html',
  './login.html',
  './style.css',
  './login.css',
  './main.js',
  './dashboard.js',
  './monthday.js',
  './from.js',
  './transactionfrom.js',
  './proflie.js',
  './auth.js',
  './firebase-config.js',
  './manifest.json',
  './Image.png'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS);
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('fetch', (e) => {
  if (e.request.url.includes('firestore.googleapis.com') || e.request.url.includes('identitytoolkit.googleapis.com')) {
    return;
  }

  e.respondWith(
    caches.match(e.request).then((response) => {
      return response || fetch(e.request);
    })
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            return caches.delete(cache);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});