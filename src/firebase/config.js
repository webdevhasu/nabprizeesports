import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getDatabase } from 'firebase/database';
import { getStorage } from 'firebase/storage';

export const firebaseConfig = {
  apiKey: "AIzaSyCNNSvpbVCRzxTU0vCPMvyUrBKwAqyQ2WU",
  authDomain: "nabprize-esports.firebaseapp.com",
  projectId: "nabprize-esports",
  storageBucket: "nabprize-esports.firebasestorage.app",
  messagingSenderId: "646287362277",
  appId: "1:646287362277:web:36f3d1128eb9b187692c0c",
  measurementId: "G-S21QR4DEGS",
  databaseURL: "https://nabprize-esports-default-rtdb.asia-southeast1.firebasedatabase.app",
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
// Force account selection so redirect works in PWA/standalone mode
googleProvider.setCustomParameters({ prompt: 'select_account' });
export const db = getFirestore(app);
export const rtdb = getDatabase(app, firebaseConfig.databaseURL);
export const storage = getStorage(app);
export default app;

