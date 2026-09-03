import { getMessaging, getToken, onMessage } from 'firebase/messaging';
import app from './config';

let messaging = null;

try {
  messaging = getMessaging(app);
} catch (e) {

}

export const requestNotificationPermission = async () => {
  if (!messaging) return null;
  try {
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      const token = await getToken(messaging, {
        vapidKey: 'BGMG8pFL5N4gSfsNnufQlK8v_ZRkaHOcOrG87Ti5ClbuBnqsxcOO3Q_37wT_JlZGlrSTOLhPiaotJEOVnkfQceA',
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
  if (!messaging) return () => { };
  return onMessage(messaging, (payload) => {
    callback(payload);
  });
};

export { messaging };
