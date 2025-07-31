// 캐시 버전을 올려서 서비스 워커가 재설치되도록 합니다.
const CACHE_NAME = 'neulsori-v2'; 
const urlsToCache = [
    './',
    './index.html',
    './manifest.json',
    './css/style.css',
    './js/app.js',
    './js/Datastorage.js',
    './assets/logo.png',
    './assets/icon-192.png',
    './assets/icon-512.png'
];

// 설치 이벤트
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('캐시가 열렸습니다.');
                return cache.addAll(urlsToCache);
            })
    );
});

// 요청 가로채기
self.addEventListener('fetch', event => {
    event.respondWith(
        caches.match(event.request)
            .then(response => {
                // 캐시에 있으면 캐시에서 제공하고, 없으면 네트워크에서 가져옵니다.
                return response || fetch(event.request);
            })
    );
});

// 활성화 이벤트: 이전 버전의 캐시를 삭제합니다.
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheName !== CACHE_NAME) {
                        console.log('이전 캐시를 삭제합니다:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
});
