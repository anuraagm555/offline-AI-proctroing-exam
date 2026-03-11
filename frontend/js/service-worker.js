const CACHE_NAME = 'quick-quiz-v1';
const ASSETS_TO_CACHE = [
    '/',
    '/index.html',
    '/css/style.css',
    '/js/app.js',
    '/js/app-v3.js',
    '/js/idb-helper.js',
    '/js/service-worker-register.js',
    'https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap',
    'https://cdnjs.cloudflare.com/ajax/libs/crypto-js/4.1.1/crypto-js.min.js'
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                return cache.addAll(ASSETS_TO_CACHE);
            })
    );
});

self.addEventListener('fetch', (event) => {
    // Only handle GET requests for now
    if (event.request.method !== 'GET') return;

    // API strategy: Network First, Fallback to Cache (not implemented fully for API yet, mainly for assets)
    // Assets strategy: Cache First, Fallback to Network

    // Simple Cache First for static assets
    event.respondWith(
        caches.match(event.request)
            .then((response) => {
                return response || fetch(event.request);
            })
    );
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME) {
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
});
