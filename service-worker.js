// service-worker.js

// قم بتغيير هذا الرقم مع كل تحديث للملفات لضمان تحديث الكاش لدى المستخدمين
const CACHE_NAME = 'calgym2-cache-v1'; 

const urlsToCache = [
  // الملفات الأساسية للتطبيق
  './',
  './index.html',
  './style.css',
  './main.js',
  './manifest.json',
  './icons/icon-192x192.png',
  './icons/icon-512x512.png',

  // المكتبات الخارجية الأساسية (هذا هو الجزء الأهم)
  'https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js',
  'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js',
  'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js',
  'https://cdn.tailwindcss.com',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css',
  'https://unpkg.com/jspdf@latest/dist/jspdf.umd.min.js',
  'https://unpkg.com/jspdf-autotable@latest/dist/jspdf.plugin.autotable.js',
  'https://cdnjs.cloudflare.com/ajax/libs/PapaParse/5.3.2/papaparse.min.js',
  'https://cdn.jsdelivr.net/npm/chart.js',
  'https://fonts.googleapis.com/css2?family=Cairo:wght@400;700;800&display=swap'
];

// Install: pre-cache app shell
self.addEventListener('fetch', event => {
  event.respondWith(
    // 1. محاولة البحث عن الطلب في الكاش أولاً
    caches.match(event.request)
      .then(cachedResponse => {
        // 2. إذا تم العثور على استجابة مخزنة، يتم إعادتها
        if (cachedResponse) {
          return cachedResponse;
        }
        // 3. إذا لم يكن في الكاش، يتم جلبه من الشبكة
        return fetch(event.request).then(networkResponse => {
          // 4. (اختياري ويوصى به) تخزين الاستجابة الجديدة للاستخدام المستقبلي
          return caches.open(CACHE_NAME).then(cache => {
            // تأكد من عدم تخزين الطلبات التي ليست من نوع GET أو استجابات من إضافات كروم
            if (event.request.method === 'GET' && !event.request.url.startsWith('chrome-extension://')) {
              cache.put(event.request, networkResponse.clone());
            }
            return networkResponse;
          });
        });
      })
      .catch(error => {
        // هذا الجزء يعالج الأخطاء مثل عدم وجود اتصال بالإنترنت
        console.error('Service Worker fetch error:', error);
        // يمكنك هنا عرض صفحة بديلة في حالة عدم الاتصال بالإنترنت
        // على سبيل المثال: return caches.match('/offline.html');
      })
  );
});