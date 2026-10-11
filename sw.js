// Service Worker – הקובץ שרץ ברקע ומאפשר לאפליקציה לעבוד בלי אינטרנט.
// כשמשנים קבצים באפליקציה, מעלים את מספר הגרסה כדי שהמכשירים יקבלו עדכון.
const CACHE_NAME = 'pwa-test-v1.0.0';

// הקבצים שנשמרים במכשיר בהתקנה הראשונה
const APP_FILES = [
  './',
  './index.html',
  './styles.css',
  './app.js',
  './manifest.webmanifest',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png',
  './icons/apple-touch-icon.png',
];

// התקנה: שמירת כל הקבצים
self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_FILES)));
});

// הפעלה: מחיקת גרסאות ישנות של ה-Cache
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((names) => Promise.all(names.filter((n) => n !== CACHE_NAME).map((n) => caches.delete(n))))
      .then(() => self.clients.claim())
  );
});

// כשהמשתמשת לוחצת "רענון" בבאנר העדכון
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();
});

// כל בקשה לקובץ: קודם מה-Cache, ואם אין – מהאינטרנט
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  event.respondWith(
    caches.match(event.request, { ignoreSearch: true }).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).catch(() => {
        // אין אינטרנט ואין עותק שמור – לניווט בין דפים מחזירים את הדף הראשי
        if (event.request.mode === 'navigate') return caches.match('./index.html');
      });
    })
  );
});
