// Renewal System service worker. It makes the app installable and shows an offline page when there's no
// connection. It deliberately caches no renewal or client data: every page and API call goes to the network.
const CACHE = "rs-shell-v1";
const OFFLINE_URL = "/offline.html";
const SHELL = [OFFLINE_URL, "/icon-192.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  // Only page navigations get the offline fallback; everything else is left to the browser as normal.
  if (event.request.mode !== "navigate") return;
  event.respondWith(fetch(event.request).catch(() => caches.match(OFFLINE_URL)));
});
