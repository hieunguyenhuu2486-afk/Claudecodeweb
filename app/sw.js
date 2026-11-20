// Service worker = "người giữ kho nhỏ" trong điện thoại.
// Việc duy nhất: cất sẵn vỏ app (giao diện, biểu tượng, thư viện) để mất mạng vẫn mở được app.
// KHÔNG cất đơn hàng – đơn luôn lấy trực tiếp từ kho Supabase.
const BAN = 'quan-bay-v0.4';   // v0.3 (20/11, Bài 8): trang mở nhanh thay app tập dượt · v0.4 (Bài 9): nút Màn phục vụ
const VO_APP = [
  './',
  'index.html',
  'phuc-vu.html',
  'manifest.webmanifest',
  'icon-192.png',
  'icon-512.png',
  'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.117.3/dist/umd/supabase.min.js'
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(BAN).then((c) => c.addAll(VO_APP)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((ds) => Promise.all(ds.filter((k) => k !== BAN).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  // Mọi thứ đi tới kho Supabase: để đi thẳng, không cất.
  if (url.hostname.endsWith('supabase.co')) return;

  // Thư viện CDN: lấy bản cất sẵn trước (không đổi).
  if (url.hostname === 'cdn.jsdelivr.net') {
    e.respondWith(caches.match(req.url).then((r) => r || fetch(req)));
    return;
  }

  // File của app: có mạng thì lấy bản mới nhất (và cất lại), mất mạng thì dùng bản đã cất.
  if (url.origin === self.location.origin) {
    e.respondWith(
      fetch(req)
        .then((r) => {
          if (r.ok) { const ban = r.clone(); caches.open(BAN).then((c) => c.put(req, ban)); }
          return r;
        })
        .catch(() => caches.match(req, { ignoreSearch: true })
          .then((r) => r || (req.mode === 'navigate' ? caches.match('index.html') : Response.error())))
    );
  }
});
