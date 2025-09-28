const CACHE_NAME = 'fuji-kitchen-cache-v2';
const APP_PREFIX = '/FinalOOPPJ/';

// **ĐÃ SỬA**: Danh sách file khớp với thư mục của bạn
const URLS_TO_CACHE = [
    APP_PREFIX,
    APP_PREFIX + 'welcome.html',
    APP_PREFIX + 'login.html',
    APP_PREFIX + 'menu.html',
    APP_PREFIX + 'lg.css',
    APP_PREFIX + 'style.css',
    APP_PREFIX + 'welcome.css',
    APP_PREFIX + 'app.js',
    APP_PREFIX + 'login.js',
    APP_PREFIX + 'sakura.js',
    APP_PREFIX + 'manifest.json',
    APP_PREFIX + 'icons/favicon.png',
    APP_PREFIX + 'icons/Logo.jpg',
    APP_PREFIX + 'icons/welcome-bg.jpg',
    APP_PREFIX + 'icons/icon-192.png',
    APP_PREFIX + 'icons/icon-512.png'
];

// Install: Cache nessessary files
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

// Activate: Delete old caches
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

// Fetch: Cache First
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

//Push Notification Event
self.addEventListener('push', function(event) { 
    console.log('[Service Worker] Push Received.'); 

    let notificationData = {};
    
    if (event.data) {
        try {
            notificationData = event.data.json();
        } catch (e) {
            notificationData = {
                title: 'Fuji Kitchen',
                body: event.data.text() || 'Bạn có thông báo mới!'
            };
        }
    }

    const options = {
        body: notificationData.body || 'Thông báo từ Fuji Kitchen',
        icon: notificationData.icon || '/icon-192x192.png',
        badge: '/icon-72x72.png',
        vibrate: notificationData.vibrate || [100, 50, 100],
        data: notificationData.data || {},
        actions: notificationData.actions || [],
        requireInteraction: notificationData.requireInteraction || false,
        tag: notificationData.tag || 'fuji-kitchen',
        renotify: true
    };

    event.waitUntil(
        self.registration.showNotification(notificationData.title || 'Fuji Kitchen', options)
    );
});

self.addEventListener('notificationclick', function(event) {
    console.log('[Service Worker] Notification click Received.');
    
    event.notification.close();

    const action = event.action;
    const data = event.notification.data;

    let urlToOpen = '/'; // Default URL

    // Xử lý các action khác nhau
    switch (action) {
        case 'view':
            urlToOpen = '/';
            break;
        case 'view-combo':
            urlToOpen = '/?tab=combo';
            break;
        default:
            if (data && data.orderStatus) {
                urlToOpen = '/?tab=orders';
            }
            break;
    }

    event.waitUntil(
        clients.matchAll({
            type: 'window',
            includeUncontrolled: true
        }).then(function(clientList) {
            // Tìm tab đã mở
            for (let i = 0; i < clientList.length; i++) {
                const client = clientList[i];
                if (client.url.includes(self.location.origin) && 'focus' in client) {
                    return client.focus();
                }
            }
            // Mở tab mới nếu không tìm thấy
            if (clients.openWindow) {
                return clients.openWindow(urlToOpen);
            }
        })
    );
});