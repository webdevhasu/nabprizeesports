import { createContext, useContext, useState, useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, onSnapshot } from 'firebase/firestore';
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
    let profileUnsub = null;

    const authUnsub = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);

      // Clean up previous profile listener if any
      if (profileUnsub) {
        profileUnsub();
        profileUnsub = null;
      }

      if (user) {
        const docRef = doc(db, 'users', user.uid);
        profileUnsub = onSnapshot(
          docRef,
          (docSnap) => {
            if (docSnap.exists()) {
              setUserProfile(docSnap.data());
              setProfileError(false);
            } else {
              setUserProfile(null);
              setProfileError(false);
            }
            setLoading(false);
          },
          (error) => {
            console.error('Error listening to user profile:', error);
            setProfileError(true);
            setLoading(false);
          }
        );
      } else {
        setUserProfile(null);
        setProfileError(false);
        setLoading(false);
      }
    });

    return () => {
      authUnsub();
      if (profileUnsub) profileUnsub();
    };
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
