/// <reference lib="webworker" />
// Custom service worker (vite-plugin-pwa injectManifest). Handles Web Push.
declare const self: ServiceWorkerGlobalScope & { __WB_MANIFEST: unknown[] };

// Required so injectManifest can inject the precache list. Precaching itself is
// omitted; add workbox-precaching if offline caching is wanted.
void self.__WB_MANIFEST;

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("push", (event) => {
  let data: { title?: string; body?: string; url?: string } = {};
  try {
    data = event.data?.json() ?? {};
  } catch {
    data = { body: event.data?.text() };
  }
  event.waitUntil(
    self.registration.showNotification(data.title ?? "BestBefore", {
      badge: "/icon.svg",
      body: data.body ?? "",
      data: { url: data.url ?? "/" },
      icon: "/icon.svg",
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data as { url?: string })?.url ?? "/";
  event.waitUntil(
    (async () => {
      const clients = await self.clients.matchAll({
        includeUncontrolled: true,
        type: "window",
      });
      for (const client of clients) {
        if ("focus" in client) {
          await client.navigate(url);
          return client.focus();
        }
      }
      return self.clients.openWindow(url);
    })()
  );
});
