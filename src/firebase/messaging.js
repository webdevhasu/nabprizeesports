import { getMessaging, getToken, onMessage } from 'firebase/messaging';
import app from './config';

let messaging = null;

try {
  messaging = getMessaging(app);
} catch (e) {
  console.log('FCM not supported in this browser');
}

export const requestNotificationPermission = async () => {
  if (!messaging) return null;
  try {
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      const token = await getToken(messaging, {
        vapidKey: 'BBLkByrl7Q_L3WLPZd1BdjA1H1_MGnZFnsTJaBVvkY3zP9Wh8UQEEqE_IEkDlqAEujE0p1sK0X7GAA2FO_GvdpI',
      });
      return token;
    }
    return null;
  } catch (e) {
    console.error('Notification permission error:', e);
    return null;
  }
};

export const onMessageListener = (callback) => {
  if (!messaging) return () => {};
  return onMessage(messaging, (payload) => {
    callback(payload);
  });
};

export { messaging };
