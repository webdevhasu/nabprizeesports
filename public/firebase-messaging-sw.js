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

messaging.onBackgroundMessage((payload) => {
  const { title, body, icon, url } = payload.data || {};
  self.registration.showNotification(title || 'NabPrize Esports', {
    body: body || 'You have a new notification',
    icon: icon || '/icon-192.png',
    badge: '/icon-192.png',
    tag: url || 'nabprize-notification',
    data: { url: url || '/' },
  });
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || '/';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      return clients.openWindow(url);
    })
  );
});
