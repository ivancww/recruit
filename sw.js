const CACHE_NAME = 'aia-elite-v1.1.0'; // 記得與你的 APP_VERSION 同步
const ASSETS_TO_CACHE = [
    '/',
    '/index.html',
    // 如果你有其他 CSS 或 JS 檔案，請在此加入路徑
];

// 1. 安裝 Service Worker 並快取資源
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(ASSETS_TO_CACHE);
        })
    );
});

// 2. 激活並清理舊快取
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cache) => {
                    if (cache !== CACHE_NAME) {
                        return caches.delete(cache);
                    }
                })
            );
        })
    );
});

// 3. 攔截請求，優先從快取讀取
self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches.match(event.request).then((response) => {
            return response || fetch(event.request);
        })
    );
});

// 4. 監聽強制更新指令 (從 index.html 發送)
self.addEventListener('message', (event) => {
    if (event.data.action === 'skipWaiting') {
        self.skipWaiting();
    }
});
