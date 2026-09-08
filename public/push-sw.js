/* global self, clients */

self.addEventListener("install", () => {
  console.info("[push-sw] INSTALL");
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  console.info("[push-sw] ACTIVATE");
  event.waitUntil(self.clients.claim());
});

self.addEventListener("push", (event) => {
  console.log("[PUSH SW] Push event received");

  event.waitUntil((async () => {
    try {
      let payload = { title: "Brilliant Event", body: "You have a new update." };

      if (event.data) {
        try {
          const parsed = event.data.json();
          if (parsed && typeof parsed === "object") payload = parsed;
        } catch {
          payload.body = event.data.text() || payload.body;
        }
      }

      console.log("[PUSH SW] Payload:", payload);
      const title = payload.title || "Brilliant Event";
      const options = {
        body: payload.body || "You have a new update.",
        icon: "/icons/icon-192.png",
        badge: "/icons/icon-192.png",
        tag: payload.tag || "brilliant-event-update",
        renotify: false,
        requireInteraction: false,
        vibrate: [200, 100, 200],
        data: {
          ...(payload.data && typeof payload.data === "object" ? payload.data : {}),
          url: payload.data?.url || payload.url || "/employee/dashboard",
        },
      };

      console.log("[PUSH SW] Showing notification:", title);
      await self.registration.showNotification(title, options);
      console.log("[PUSH SW] showNotification SUCCESS");
    } catch (error) {
      console.error("[PUSH SW] showNotification FAILED", error);
    }
  })());
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = new URL(
    event.notification.data?.url || "/employee/dashboard",
    self.location.origin
  ).href;

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if ("focus" in client) {
          client.navigate(targetUrl);
          return client.focus();
        }
      }
      if (clients.openWindow) return clients.openWindow(targetUrl);
      return undefined;
    })
  );
});