import { getMessaging, getToken, onMessage, isSupported } from 'firebase/messaging';
import app from './config';

let messagingInstance = null;
let isMessagingChecked = false;

// Async function to safely initialize Firebase Messaging only on supported browsers
export const getFirebaseMessaging = async () => {
  if (typeof window === 'undefined') return null;
  if (isMessagingChecked) return messagingInstance;

  try {
    const supported = await isSupported();
    if (supported) {
      messagingInstance = getMessaging(app);
    }
  } catch (e) {
    console.warn('Firebase Messaging is not supported in this browser environment:', e);
    messagingInstance = null;
  } finally {
    isMessagingChecked = true;
  }

  return messagingInstance;
};

export const requestNotificationPermission = async () => {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return null;
  }

  try {
    const messaging = await getFirebaseMessaging();
    if (!messaging) return null;

    const permission = await window.Notification.requestPermission();
    if (permission === 'granted') {
      let swReg = null;
      if ('serviceWorker' in navigator) {
        swReg = await navigator.serviceWorker.register('/firebase-messaging-sw.js').catch(err => {
          console.warn('Service worker registration error:', err);
          return null;
        });
      }

      const token = await getToken(messaging, {
        vapidKey: 'BGMG8pFL5N4gSfsNnufQlK8v_ZRkaHOcOrG87Ti5ClbuBnqsxcOO3Q_37wT_JlZGlrSTOLhPiaotJEOVnkfQceA',
        serviceWorkerRegistration: swReg || undefined,
      });
      return token;
    }
    return null;
  } catch (e) {
    console.warn('Notification permission error:', e);
    return null;
  }
};

export const onMessageListener = (callback) => {
  let unsubscribe = () => {};
  
  getFirebaseMessaging().then((messaging) => {
    if (messaging) {
      try {
        unsubscribe = onMessage(messaging, (payload) => {
          callback(payload);
        });
      } catch (_) {}
    }
  }).catch(() => {});

  return () => {
    try {
      if (typeof unsubscribe === 'function') {
        unsubscribe();
      }
    } catch (_) {}
  };
};

export { messagingInstance as messaging };
