/* eslint-disable no-restricted-globals */
const CACHE_NAME = "folio-v1";

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.add("/index.html"))
  );
});

self.addEventListener("fetch", (event) => {
  // Skip API calls and ngrok — always go to network
  if (
    event.request.url.includes("127.0.0.1:8000") ||
    event.request.url.includes("192.168.0.223") ||
    event.request.url.includes("ngrok")
  ) return;

  event.respondWith(
    caches.match(event.request)
      .then((cached) => cached || fetch(event.request))
  );
});