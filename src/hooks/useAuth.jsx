import { createContext, useContext, useState, useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../firebase/config';

const AuthCtx = createContext(null);

export function useAuth() {
  return useContext(AuthCtx);
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [profileError, setProfileError] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        try {
          const docRef = doc(db, 'users', user.uid);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            setUserProfile(docSnap.data());
            setProfileError(false);
          } else {
            setUserProfile(null);
            setProfileError(false);
          }
        } catch (error) {
          console.error('Error fetching profile:', error);
          setProfileError(true);
          // Don't clear userProfile on network error — keep previous data if any
        }
      } else {
        setUserProfile(null);
        setProfileError(false);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const refreshProfile = async () => {
    if (currentUser) {
      try {
        const docRef = doc(db, 'users', currentUser.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setUserProfile(docSnap.data());
          setProfileError(false);
        } else {
          setUserProfile(null);
          setProfileError(false);
        }
      } catch (error) {
        console.error('Error refreshing profile:', error);
        setProfileError(true);
      }
    }
  };

  const value = { currentUser, userProfile, loading, profileError, refreshProfile };

  return (
    <AuthCtx.Provider value={value}>
      {children}
    </AuthCtx.Provider>
  );
}
