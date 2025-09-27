const CACHE_NAME = 'fuji-kitchen-cache-v2'; // **Tăng phiên bản** để cập nhật
const APP_PREFIX = '/FinalOOPPJ/';

// **ĐÃ SỬA**: Danh sách file khớp với thư mục của bạn
const URLS_TO_CACHE = [
    APP_PREFIX,
    APP_PREFIX + 'welcome.html',
    APP_PREFIX + 'welcome.css',
    APP_PREFIX + 'menu.html',
    APP_PREFIX + 'style.css', // Giữ lại nếu index.html đang dùng
    APP_PREFIX + 'app.js',
    APP_PREFIX + 'login-guest.html',
    APP_PREFIX + 'lg.css',
    APP_PREFIX + 'login-staff.html',
    APP_PREFIX + 'ls.css',
    APP_PREFIX + 'manifest.json',
    APP_PREFIX + 'favicon.png',
    APP_PREFIX + 'icons/Logo.jpg',
    APP_PREFIX + 'icons/welcome-bg.jpg'
];

// Install: Cache các file cần thiết
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => {
            console.log('[SW] Caching all files for offline use');
            return cache.addAll(URLS_TO_CACHE);
        }).catch(err => {
            console.error('[SW] Caching failed:', err);
        })
    );
    self.skipWaiting();
});

// Activate: Xóa các cache cũ
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheName !== CACHE_NAME) {
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => self.clients.claim())
    );
});

// Fetch: Chiến lược Cache First
self.addEventListener('fetch', event => {
    if (event.request.method !== 'GET') return;
    event.respondWith(
        caches.match(event.request).then(cachedResponse => {
            if (cachedResponse) {
                return cachedResponse;
            }
            return fetch(event.request).then(networkResponse => {
                const responseToCache = networkResponse.clone();
                caches.open(CACHE_NAME).then(cache => {
                    cache.put(event.request, responseToCache);
                });
                return networkResponse;
            });
        })
    );
});