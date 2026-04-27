const SEGMENTS_CACHE = "hls-segments-v1"; // .ts — immutable, Cache First
const MEDIA_CACHE = "hls-media-v1";       // .m3u8, .jpg, .vtt — Network First or Cache First
const SEGMENTS_MAX_BYTES = 150 * 1024 * 1024; // 150 MB hard cap on segment cache

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
    event.respondWith(cacheFirstWithQuota(request, SEGMENTS_CACHE));
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

// Evict oldest entries from SEGMENTS_CACHE until we're under the byte cap.
// Uses StorageManager.estimate() if available; falls back to a fixed entry count.
async function evictSegmentsIfNeeded() {
  if (navigator.storage && navigator.storage.estimate) {
    const { usage } = await navigator.storage.estimate();
    if (usage < SEGMENTS_MAX_BYTES) return;
  }

  const cache = await caches.open(SEGMENTS_CACHE);
  const keys  = await cache.keys();
  // Delete oldest quarter of entries (FIFO approximation — keys are insertion-ordered)
  const toDelete = keys.slice(0, Math.max(1, Math.floor(keys.length / 4)));
  await Promise.all(toDelete.map((k) => cache.delete(k)));
}

async function cacheFirstWithQuota(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    if (response.ok) {
      cache.put(request, response.clone());
      // Evict asynchronously — do not block the response
      evictSegmentsIfNeeded().catch(() => {});
    }
    return response;
  } catch {
    return new Response("Offline — segment not cached", { status: 503 });
  }
}

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
