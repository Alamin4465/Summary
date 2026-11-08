// ============================================
// sw.js — Service Worker (Offline + CDN Cache)
// ============================================

const CACHE_NAME = 'expense-tracker-v5';

const LOCAL_ASSETS = [
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
  './manifest.json',
  './Image.png'
];

const CDN_ASSETS = [
  'https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js',
  'https://cdn.jsdelivr.net/npm/apexcharts@3.44.0/dist/apexcharts.min.js',
  'https://cdn.jsdelivr.net/npm/chartjs-plugin-annotation@3.0.1/dist/chartjs-plugin-annotation.min.js',
  'https://cdn.jsdelivr.net/npm/chartjs-plugin-datalabels@2.2.0/dist/chartjs-plugin-datalabels.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css',
  'https://www.gstatic.com/firebasejs/9.22.2/firebase-app-compat.js',
  'https://www.gstatic.com/firebasejs/9.22.2/firebase-auth-compat.js',
  'https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore-compat.js'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return Promise.all([
        cache.addAll(LOCAL_ASSETS).catch(err => console.warn('Local cache fail:', err)),
        cache.addAll(CDN_ASSETS).catch(err => console.warn('CDN cache fail:', err))
      ]);
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('fetch', (e) => {
  // Firestore/Auth API — bypass (always network)
  if (e.request.url.includes('firestore.googleapis.com') ||
      e.request.url.includes('identitytoolkit.googleapis.com') ||
      e.request.url.includes('securetoken.googleapis.com')) {
    return;
  }

  // firebase-config.js — network-first (config update ধরা পড়বে)
  if (e.request.url.includes('firebase-config.js')) {
    e.respondWith(
      fetch(e.request)
        .then(res => {
          const clone = res.clone();
          caches.open(CACHE_NAME).then(c => c.put(e.request, clone));
          return res;
        })
        .catch(() => caches.match(e.request))
    );
    return;
  }

  // বাকি সব — cache-first
  e.respondWith(
    caches.match(e.request).then((cached) => {
      return cached || fetch(e.request).then(res => {
        // Runtime cache (only GET, same/cdn origin)
        if (e.request.method === 'GET') {
          const clone = res.clone();
          caches.open(CACHE_NAME).then(c => c.put(e.request, clone)).catch(() => {});
        }
        return res;
      }).catch(() => {
        // Offline fallback
        if (e.request.mode === 'navigate') {
          return caches.match('./index.html');
        }
      });
    })
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) return caches.delete(cache);
        })
      );
    }).then(() => self.clients.claim())
  );
});