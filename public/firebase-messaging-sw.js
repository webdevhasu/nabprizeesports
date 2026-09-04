importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyCNNSvpbVCRzxTU0vCPMvyUrBKwAqyQ2WU",
  authDomain: "nabprize-esports.firebaseapp.com",
  projectId: "nabprize-esports",
  storageBucket: "nabprize-esports.firebasestorage.app",
  messagingSenderId: "646287362277",
  appId: "1:646287362277:web:36f3d1128eb9b187692c0c",
});

const messaging = firebase.messaging();

// Handle background messages when PWA or browser tab is closed/in background
messaging.onBackgroundMessage((payload) => {
  const title = payload.notification?.title || payload.data?.title || 'NabPrize Esports';
  const body = payload.notification?.body || payload.data?.body || 'You have a new tournament notification!';
  const icon = payload.notification?.icon || payload.data?.icon || '/icon-192.png';
  const url = payload.data?.url || payload.fcmOptions?.link || '/';

  return self.registration.showNotification(title, {
    body,
    icon,
    badge: '/icon-192.png',
    tag: url || 'nabprize-notification',
    vibrate: [200, 100, 200],
    data: { url },
  });
});

// Fallback native push listener for guaranteed wakeup even if app is completely closed
self.addEventListener('push', (event) => {
  if (!event.data) return;

  try {
    const data = event.data.json();
    const title = data.notification?.title || data.data?.title || 'NabPrize Esports';
    const body = data.notification?.body || data.data?.body || 'New tournament update!';
    const icon = data.notification?.icon || data.data?.icon || '/icon-192.png';
    const url = data.data?.url || data.fcmOptions?.link || '/';

    event.waitUntil(
      self.registration.showNotification(title, {
        body,
        icon,
        badge: '/icon-192.png',
        tag: url || 'nabprize-notification',
        vibrate: [200, 100, 200],
        data: { url },
      })
    );
  } catch (_) {
    // If not JSON, show text
    const text = event.data.text();
    if (text) {
      event.waitUntil(
        self.registration.showNotification('NabPrize Esports', {
          body: text,
          icon: '/icon-192.png',
          badge: '/icon-192.png',
          vibrate: [200, 100, 200],
          data: { url: '/' },
        })
      );
    }
  }
});

// Focus or open PWA when notification is tapped
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.navigate(targetUrl);
          return client.focus();
        }
      }
      return clients.openWindow(targetUrl);
    })
  );
});
