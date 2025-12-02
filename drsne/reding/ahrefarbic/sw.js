
// sw.js

const CACHE_NAME = 'arabic-game-cache-v1';
const urlsToCache = [
    '/',
    'index.html',
    'questions.json',
    'https://fonts.googleapis.com/css2?family=Amiri:wght@700&family=Cairo:wght@400;700;900&family=El+Messiri:wght@400;700&display=swap',
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.2.1/css/all.min.css',
    'https://cdnjs.cloudflare.com/ajax/libs/animate.css/4.1.1/animate.min.css',
    'https://cdnjs.cloudflare.com/ajax/libs/howler/2.2.3/howler.min.js',
    'https://assets.mixkit.co/sfx/preview/mixkit-select-click-1109.mp3',
    'https://assets.mixkit.co/sfx/preview/mixkit-correct-answer-tone-2870.mp3',
    'https://assets.mixkit.co/sfx/preview/mixkit-wrong-answer-fail-notification-946.mp3',
    'https://assets.mixkit.co/sfx/preview/mixkit-winning-chimes-2015.mp3',
    'https://assets.mixkit.co/sfx/preview/mixkit-sad-game-over-trombone-471.mp3',
    'https://assets.mixkit.co/sfx/preview/mixkit-achievement-bell-600.mp3',
    'https://cdn.pixabay.com/photo/2020/05/18/16/17/social-media-5187243_1280.png',
    'https://cdn.pixabay.com/photo/2016/03/31/19/58/avatar-1295429_1280.png',
    'https://cdn.pixabay.com/photo/2016/03/31/19/58/avatar-1295430_1280.png'
];

// عند تثبيت العامل الخدمي، قم بتخزين الموارد
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('Opened cache');
                return cache.addAll(urlsToCache);
            })
    );
});

// عند طلب أي مورد، قدمه من ذاكرة التخزين المؤقت أولاً
self.addEventListener('fetch', event => {
    event.respondWith(
        caches.match(event.request)
            .then(response => {
                // إذا وجد المورد في الكاش، قم بإرجاعه
                if (response) {
                    return response;
                }
                // وإلا، اطلبه من الشبكة
                return fetch(event.request);
            })
    );
});
