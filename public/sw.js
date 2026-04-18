const SEGMENTS_CACHE = "hls-segments-v1"; // .ts — immutable, Cache First
const MEDIA_CACHE = "hls-media-v1";       // .m3u8, .jpg, .vtt — Network First or Cache First

self.addEventListener("install", () => self.skipWaiting());

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((k) => k !== SEGMENTS_CACHE && k !== MEDIA_CACHE)
            .map((k) => caches.delete(k))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Never intercept API calls — always need live data
  if (url.pathname.startsWith("/api/")) return;

  // HLS segments are immutable (Cache-Control: immutable on server)
  // → Cache First: serve from cache instantly, fetch & store if missing
  if (url.pathname.endsWith(".ts")) {
    event.respondWith(cacheFirst(request, SEGMENTS_CACHE));
    return;
  }

  // HLS playlists can change (new renditions, VOD end markers)
  // → Network First: try network, fall back to cache when offline
  if (url.pathname.endsWith(".m3u8")) {
    event.respondWith(networkFirst(request, MEDIA_CACHE));
    return;
  }

  // Thumbnails and storyboard VTT files — Cache First
  if (url.pathname.endsWith(".jpg") || url.pathname.endsWith(".vtt")) {
    event.respondWith(cacheFirst(request, MEDIA_CACHE));
    return;
  }
});

async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    if (response.ok) cache.put(request, response.clone());
    return response;
  } catch {
    return new Response("Offline — segment not cached", { status: 503 });
  }
}

async function networkFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  try {
    const response = await fetch(request);
    if (response.ok) cache.put(request, response.clone());
    return response;
  } catch {
    const cached = await cache.match(request);
    return cached || new Response("Offline — not in cache", { status: 503 });
  }
}
