import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { collection, query, orderBy, onSnapshot, doc, updateDoc, writeBatch, deleteDoc, getDocs } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { db, auth } from '../firebase/config';
import { requestNotificationPermission, onMessageListener } from '../firebase/messaging';

const NotifCtx = createContext(null);

export function useNotifications() {
  return useContext(NotifCtx);
}

export function NotificationProvider({ children }) {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [permission, setPermission] = useState('default');
  const [showPanel, setShowPanel] = useState(false);
  const [foregroundPayload, setForegroundPayload] = useState(null);

  useEffect(() => {
    setPermission(Notification?.permission || 'default');
  }, []);

  // Listen to notifications from Firestore — use onAuthStateChanged to avoid race condition
  useEffect(() => {
    let unsub = () => {};

    const unsubAuth = onAuthStateChanged(auth, (user) => {
      unsub();
      if (!user) {
        setNotifications([]);
        setUnreadCount(0);
        return;
      }

      const q = query(
        collection(db, 'users', user.uid, 'notifications'),
        orderBy('createdAt', 'desc')
      );

      unsub = onSnapshot(q, (snap) => {
        const notifs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        setNotifications(notifs);
        setUnreadCount(notifs.filter(n => !n.read).length);
      }, (err) => {
        console.error('Notifications listener error:', err);
      });
    });

    return () => {
      unsub();
      unsubAuth();
    };
  }, []);

  // Listen for foreground messages
  useEffect(() => {
    const unsubscribe = onMessageListener((payload) => {
      setForegroundPayload(payload);
      if (Notification?.permission === 'granted') {
        const { title, body, url } = payload.data || {};
        new Notification(title || 'NabPrize Esports', {
          body: body || 'New notification',
          icon: '/icon-192.png',
          tag: url || 'nabprize-foreground',
        });
      }
    });
    return unsubscribe;
  }, []);

  const requestPermission = useCallback(async () => {
    const token = await requestNotificationPermission();
    if (token) {
      setPermission('granted');
      const user = auth.currentUser;
      if (user) {
        await updateDoc(doc(db, 'users', user.uid), {
          fcmTokens: [token],
        }).catch(() => {});
      }
    }
    return token;
  }, []);

  const markAsRead = useCallback(async (notifId) => {
    const user = auth.currentUser;
    if (!user) return;
    await updateDoc(doc(db, 'users', user.uid, 'notifications', notifId), {
      read: true,
    });
  }, []);

  const markAllRead = useCallback(async () => {
    const user = auth.currentUser;
    if (!user) return;
    const batch = writeBatch(db);
    notifications.forEach(n => {
      if (!n.read) {
        batch.update(doc(db, 'users', user.uid, 'notifications', n.id), { read: true });
      }
    });
    await batch.commit();
  }, [notifications]);

  const clearOne = useCallback(async (notifId) => {
    const user = auth.currentUser;
    if (!user) return;
    await deleteDoc(doc(db, 'users', user.uid, 'notifications', notifId));
  }, []);

  const clearAll = useCallback(async () => {
    const user = auth.currentUser;
    if (!user) return;
    const snap = await getDocs(collection(db, 'users', user.uid, 'notifications'));
    const batch = writeBatch(db);
    snap.docs.forEach(d => batch.delete(d.ref));
    await batch.commit();
  }, []);

  const value = {
    notifications, unreadCount, permission, showPanel, foregroundPayload,
    setShowPanel, requestPermission, markAsRead, markAllRead, clearOne, clearAll,
  };

  return (
    <NotifCtx.Provider value={value}>
      {children}
    </NotifCtx.Provider>
  );
}
