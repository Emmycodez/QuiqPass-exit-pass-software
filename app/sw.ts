/// <reference lib="WebWorker" />
import { cleanupOutdatedCaches, precacheAndRoute } from "workbox-precaching";
import { registerRoute } from "workbox-routing";
import { NetworkOnly } from "workbox-strategies";

declare const self: ServiceWorkerGlobalScope;

// Take over immediately when a new SW version is deployed, instead of
// waiting for all tabs to close. Combined with the controllerchange reload
// in root.tsx this prevents blank-screen on stale cache.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

// Clean up old caches from previous SW versions
cleanupOutdatedCaches();

// React Router's internal manifest endpoint must never be served from cache —
// returning a stale/HTML response breaks client-side navigation entirely.
registerRoute(
  ({ url }) => url.pathname.startsWith("/__manifest"),
  new NetworkOnly()
);

// Precache static assets injected by vite-plugin-pwa at build time.
// Navigation requests are NOT intercepted — the SSR server handles those.
precacheAndRoute(self.__WB_MANIFEST);

// ---------------------------------------------------------------------------
// Push notification handler (Phase 4 — ready to activate)
// ---------------------------------------------------------------------------
self.addEventListener("push", (event) => {
  if (!event.data) return;

  const data = event.data.json() as {
    title: string;
    body: string;
    url?: string;
  };

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: "/icon-192.png",
      badge: "/icon-192.png",
      data: { url: data.url ?? "/" },
    })
  );
});

// ---------------------------------------------------------------------------
// Notification click — open the relevant dashboard URL
// ---------------------------------------------------------------------------
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url: string = (event.notification.data as { url: string })?.url ?? "/";
  event.waitUntil(self.clients.openWindow(url));
});
