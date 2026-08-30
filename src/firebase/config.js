import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyCNNSvpbVCRzxTU0vCPMvyUrBKwAqyQ2WU",
  authDomain: "nabprize-esports.firebaseapp.com",
  projectId: "nabprize-esports",
  storageBucket: "nabprize-esports.firebasestorage.app",
  messagingSenderId: "646287362277",
  appId: "1:646287362277:web:36f3d1128eb9b187692c0c",
  measurementId: "G-S21QR4DEGS"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const db = getFirestore(app);
export default app;
