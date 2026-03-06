// Clean Feed Service Worker — network-first for HTML, cache-first for hashed assets

self.addEventListener("install", () => self.skipWaiting());

self.addEventListener("activate", (event) => {
  // Nuke all old caches on activate
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== location.origin) return;

  // Hashed assets — cache-first (filenames change on each build)
  if (url.pathname.startsWith("/assets/")) {
    event.respondWith(
      caches.match(request).then((cached) =>
        cached || fetch(request).then((res) => {
          const clone = res.clone();
          caches.open("assets-v1").then((c) => c.put(request, clone));
          return res;
        })
      )
    );
    return;
  }

  // HTML + everything else — ALWAYS network-first
  event.respondWith(
    fetch(request).catch(() => caches.match(request))
  );
});
