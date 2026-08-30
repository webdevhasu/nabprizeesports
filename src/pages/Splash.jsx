import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../firebase/config';

export default function Splash() {
  const navigate = useNavigate();

  useEffect(() => {
    const timer = setTimeout(() => {
      const unsubscribe = onAuthStateChanged(auth, async (user) => {
        if (user) {
          const docRef = doc(db, 'users', user.uid);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            navigate('/', { replace: true });
          } else {
            navigate('/account-setup', { replace: true });
          }
        } else {
          navigate('/login', { replace: true });
        }
      });
      return () => unsubscribe();
    }, 1500);

    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <div style={{
      height: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#FFF8F0',
    }}>
      <h1 style={{
        fontFamily: "'Poppins', sans-serif",
        fontWeight: 800,
        fontSize: '36px',
        color: '#E8552F',
        marginBottom: '8px',
      }}>
        NabPrize Esports
      </h1>
      <p style={{
        fontFamily: "'Poppins', sans-serif",
        fontSize: '14px',
        color: '#8A8078',
      }}>
        Prove Your Skill.
      </p>
    </div>
  );
}
