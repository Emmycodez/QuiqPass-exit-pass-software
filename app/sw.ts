/// <reference lib="WebWorker" />
import { cleanupOutdatedCaches, precacheAndRoute } from "workbox-precaching";

declare const self: ServiceWorkerGlobalScope;

// Clean up old caches from previous SW versions
cleanupOutdatedCaches();

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
