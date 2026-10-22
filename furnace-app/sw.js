/* Service worker: เก็บตัวแอปไว้ในเครื่อง ให้เปิดได้แม้อินเทอร์เน็ตหลุด
   ข้อมูลจาก Google Sheets ไม่ผ่าน service worker นี้ (ดึงสดทุกครั้ง) */
var CACHE = 'furnace-hmi-v1';
var SHELL = ['./', './index.html', './manifest.webmanifest', './icons/icon-192.png', './icons/icon-512.png', './icons/apple-touch-icon.png'];

self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(SHELL); }).then(function () { return self.skipWaiting(); }));
});
self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});
self.addEventListener('fetch', function (e) {
  var url = new URL(e.request.url);
  if (e.request.method !== 'GET') return;
  // ฟอนต์จาก Google Fonts: ใช้ของในเครื่องก่อน
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    e.respondWith(caches.open(CACHE).then(function (c) {
      return c.match(e.request).then(function (hit) {
        return hit || fetch(e.request).then(function (res) { c.put(e.request, res.clone()); return res; });
      });
    }));
    return;
  }
  if (url.origin !== self.location.origin) return;           // Google Sheets และอื่น ๆ ดึงสดเสมอ
  // ตัวแอป: ดึงใหม่ก่อน ถ้าออฟไลน์ใช้ของที่เก็บไว้
  e.respondWith(fetch(e.request).then(function (res) {
    var copy = res.clone(); caches.open(CACHE).then(function (c) { c.put(e.request, copy); });
    return res;
  }).catch(function () {
    return caches.match(e.request).then(function (hit) { return hit || caches.match('./index.html'); });
  }));
});
