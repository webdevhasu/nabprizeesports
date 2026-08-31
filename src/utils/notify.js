import { collection, getDocs, addDoc, serverTimestamp, doc } from 'firebase/firestore';
import { db } from '../firebase/config';

export async function notifyAllUsers({ type, title, body, url = '/' }) {
  try {
    const usersSnap = await getDocs(collection(db, 'users'));
    const promises = usersSnap.docs.map(userDoc =>
      addDoc(collection(db, 'users', userDoc.id, 'notifications'), {
        type,
        title,
        body,
        url,
        read: false,
        createdAt: serverTimestamp(),
      })
    );
    await Promise.all(promises);
    return usersSnap.size;
  } catch (e) {
    console.error('notifyAllUsers error:', e);
    return 0;
  }
}

export async function notifyUser(uid, { type, title, body, url = '/' }) {
  try {
    await addDoc(collection(db, 'users', uid, 'notifications'), {
      type,
      title,
      body,
      url,
      read: false,
      createdAt: serverTimestamp(),
    });
  } catch (e) {
    console.error('notifyUser error:', e);
  }
}

export async function notifyMultipleUsers(uids, { type, title, body, url = '/' }) {
  try {
    const promises = uids.map(uid =>
      addDoc(collection(db, 'users', uid, 'notifications'), {
        type,
        title,
        body,
        url,
        read: false,
        createdAt: serverTimestamp(),
      })
    );
    await Promise.all(promises);
  } catch (e) {
    console.error('notifyMultipleUsers error:', e);
  }
}
