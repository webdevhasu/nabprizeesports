importScripts('https://www.gstatic.com/firebasejs/12.18.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/12.18.0/firebase-messaging-compat.js');

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
  const icon = '/logo.png';
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
