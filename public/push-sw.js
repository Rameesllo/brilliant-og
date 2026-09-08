/* global self, clients */

self.addEventListener("push", (event) => {
  if (!event.data) return;

  let payload;
  try {
    payload = event.data.json();
  } catch {
    payload = { title: "Brilliant Event", body: event.data.text() };
  }

  const title = payload.title || "Brilliant Event";
  const options = {
    body: payload.body || "You have a new update.",
    icon: "/brilliant-event-logo.svg",
    badge: "/brilliant-event-logo.svg",
    tag: payload.tag || "brilliant-event-update",
    renotify: false,
    requireInteraction: false,
    data: {
      ...(payload.data || {}),
      url: payload.data?.url || payload.url || "/employee/dashboard",
    },
  };

  event.waitUntil(self.registration.showNotification(title, options));
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