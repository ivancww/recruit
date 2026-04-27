// 每次修改 index.html 後，請一定要來這裡更改版本號！(例如改成 v1.0.1)
const CACHE_NAME = 'aia-pwa-cache-v1.0.0'; 
const urlsToCache = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

// 安裝並快取
self.addEventListener('install', event => {
  // 強制讓新的 Service Worker 進入 waiting 狀態
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(urlsToCache);
    })
  );
});

// 攔截請求，優先使用快取
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(response => {
      return response || fetch(event.request);
    })
  );
});

// 啟動新版本時，清除舊版快取
self.addEventListener('activate', event => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  // 確保新版本立刻接管所有頁面
  return self.clients.claim();
});

// 接收來自網頁的「強制更新」指令
self.addEventListener('message', function(event) {
  if (event.data.action === 'skipWaiting') {
    self.skipWaiting();
  }
});
