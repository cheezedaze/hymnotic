const CACHE_NAME = "hymnotic-v3";

self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== "GET") return;

  // Skip Next.js internal routes, HMR, and API calls
  if (
    url.pathname.startsWith("/_next/") ||
    url.pathname.startsWith("/api/") ||
    url.pathname.includes("__nextjs") ||
    url.pathname.includes("webpack")
  ) {
    return;
  }

  // Cache same-origin images with cache-first strategy.
  // IMPORTANT: Do NOT cache cross-origin audio requests. The audio analyser
  // requires crossOrigin="anonymous" on a shadow element, which needs CORS
  // headers in the response. Service worker cached responses don't preserve
  // CORS headers, so serving them to a crossOrigin element fails silently.
  const isSameOrigin = url.origin === self.location.origin;

  if (request.destination === "image" && isSameOrigin) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ||
          fetch(request)
            .then((response) => {
              if (!response || response.status !== 200) {
                return response;
              }
              const clone = response.clone();
              caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
              return response;
            })
            .catch(() => {
              return new Response("", { status: 408, statusText: "Offline" });
            })
      )
    );
  }
});
