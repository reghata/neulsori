// 캐시 버전을 올려서 서비스 워커가 강제로 재설치되도록 합니다.
const CACHE_NAME = 'neulsori-v3'; 
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

// 설치 이벤트: 새로운 파일을 캐시에 저장하고 즉시 활성화 준비를 합니다.
self.addEventListener('install', event => {
    self.skipWaiting(); // 새로운 서비스 워커를 즉시 활성화합니다.
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('캐시가 열렸습니다. 새로운 파일을 저장합니다.');
                return cache.addAll(urlsToCache);
            })
    );
});

// 활성화 이벤트: 이전 버전의 캐시를 삭제하고 앱의 제어권을 가져옵니다.
self.addEventListener('activate', event => {
    event.waitUntil(clients.claim()); // 즉시 클라이언트 제어권을 가져옵니다.
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

// 요청 가로채기: 캐시된 파일이 있으면 바로 제공하고, 없으면 네트워크에서 가져옵니다.
self.addEventListener('fetch', event => {
    event.respondWith(
        caches.match(event.request)
            .then(response => {
                return response || fetch(event.request);
            })
    );
});
