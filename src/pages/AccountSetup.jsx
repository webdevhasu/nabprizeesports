import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { doc, setDoc, collection, query, where, getDocs, serverTimestamp, getDoc } from 'firebase/firestore';
import { db, auth } from '../firebase/config';
import { useAuth } from '../hooks/useAuth';
import { sounds } from '../utils/sounds';

export default function AccountSetup() {
  const navigate = useNavigate();
  const { refreshProfile, currentUser: user } = useAuth();

  const [fullName, setFullName] = useState(user?.displayName || '');
  const [username, setUsername] = useState('');
  const [usernameStatus, setUsernameStatus] = useState('');
  const [selectedGames, setSelectedGames] = useState([]);
  const [pubgUid, setPubgUid] = useState('');
  const [pubgIgn, setPubgIgn] = useState('');
  const [ffUid, setFfUid] = useState('');
  const [ffIgn, setFfIgn] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user) {
      navigate('/login', { replace: true });
      return;
    }
    // If profile already exists, redirect to home
    const checkProfile = async () => {
      try {
        const docSnap = await getDoc(doc(db, 'users', user.uid));
        if (docSnap.exists()) {
          await refreshProfile();
          navigate('/', { replace: true });
        }
      } catch (e) {
        console.error('Profile check error:', e);
      }
    };
    checkProfile();
  }, [user, navigate, refreshProfile]);

  useEffect(() => {
    if (username.length < 3) { setUsernameStatus(''); return; }
    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        const q = query(collection(db, 'users'), where('username', '==', username.toLowerCase()));
        const snapshot = await getDocs(q);
        if (!cancelled) setUsernameStatus(snapshot.empty ? 'available' : 'taken');
      } catch {
        // Rules issue — allow by default
        if (!cancelled) setUsernameStatus('available');
      }
    }, 500);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [username]);

  const toggleGame = (game) => {
    setSelectedGames(prev =>
      prev.includes(game) ? prev.filter(g => g !== game) : [...prev, game]
    );
  };

  const isFormValid = () => {
    if (!fullName.trim() || !username.trim() || usernameStatus !== 'available') return false;
    if (selectedGames.length === 0) return false;
    if (selectedGames.includes('pubg')) {
      if (!pubgUid || !pubgIgn.trim()) return false;
      if (pubgUid.length < 7) return false;
      if (pubgIgn.trim().length < 2) return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!isFormValid() || !user) return;
    setLoading(true);
    setError('');

    try {
      const games = [];
      if (selectedGames.includes('pubg')) {
        games.push({ game: 'pubg', uid: pubgUid, ign: pubgIgn.trim() });
      }

      await setDoc(doc(db, 'users', user.uid), {
        fullName: fullName.trim(),
        username: username.toLowerCase(),
        email: user.email,
        photoURL: user.photoURL || '',
        games,
        walletBalance: 0,
        totalWins: 0,
        totalKills: 0,
        tournamentsPlayed: 0,
        createdAt: serverTimestamp(),
      });

      await refreshProfile();
      sounds.success();
      navigate('/', { replace: true });
    } catch {
      setError('Failed to save profile. Please try again.');
    }
    setLoading(false);
  };

  return (
    <div style={{ padding: '40px 20px', maxWidth: '400px', margin: '0 auto' }}>
      <h1 style={{ fontFamily: "'Poppins', sans-serif", fontWeight: 700, fontSize: '24px', color: '#2E2A26', marginBottom: '24px' }}>
        Your Profile
      </h1>

      {error && (
        <div style={{
          background: 'rgba(217,80,63,0.1)', color: '#D9503F', padding: '12px',
          borderRadius: '10px', fontSize: '13px', marginBottom: '16px', textAlign: 'center',
        }}>
          {error}
        </div>
      )}


      <div style={{ marginBottom: '16px' }}>
        <label style={{ display: 'block', fontSize: '13px', color: '#8A8078', marginBottom: '6px' }}>Full Name</label>
        <input
          type="text"
          maxLength={40}
          value={fullName}
          onChange={(e) => setFullName(e.target.value.slice(0, 40))}
          placeholder="Your full name"
          style={{
            width: '100%', padding: '14px', background: '#FFFFFF', border: '1px solid #F0E6D8',
            borderRadius: '12px', fontSize: '14px', outline: 'none',
          }}
        />
      </div>

      <div style={{ marginBottom: '24px' }}>
        <label style={{ display: 'block', fontSize: '13px', color: '#8A8078', marginBottom: '6px' }}>Username</label>
        <input
          type="text"
          maxLength={20}
          value={username}
          onChange={(e) => setUsername(e.target.value.replace(/[^a-zA-Z0-9_]/g, '').slice(0, 20).toLowerCase())}
          placeholder="3-20 chars, alphanumeric + underscore"
          style={{
            width: '100%', padding: '14px', background: '#FFFFFF', border: '1px solid #F0E6D8',
            borderRadius: '12px', fontSize: '14px', outline: 'none',
          }}
        />
        {username.length >= 3 && (
          <div style={{ fontSize: '11px', marginTop: '6px', color: usernameStatus === 'available' ? '#3FA65C' : usernameStatus === 'taken' ? '#D9503F' : '#8A8078' }}>
            {usernameStatus === 'checking' && 'Checking availability...'}
            {usernameStatus === 'available' && '✓ Username available'}
            {usernameStatus === 'taken' && '✕ Username already taken'}
          </div>
        )}
      </div>

      <h2 style={{ fontFamily: "'Poppins', sans-serif", fontWeight: 700, fontSize: '18px', color: '#2E2A26', marginBottom: '16px' }}>
        Game Details
      </h2>

      <div style={{ display: 'flex', gap: '12px', marginBottom: '20px' }}>
        {[
          { key: 'pubg', label: 'PUBG Mobile' },
        ].map(({ key, label }) => (
          <button key={key} type="button" onClick={() => toggleGame(key)} style={{
            flex: 1, padding: '16px', background: selectedGames.includes(key) ? '#FFF4EC' : '#FFFFFF',
            border: selectedGames.includes(key) ? '2px solid #FF6B4A' : '1px solid #F0E6D8',
            borderRadius: '12px', fontSize: '14px', fontWeight: 600, cursor: 'pointer', color: '#2E2A26',
          }}>
            {label}
          </button>
        ))}
      </div>

      {selectedGames.includes('pubg') && (
        <div style={{ marginBottom: '16px', padding: '16px', background: '#FFFFFF', borderRadius: '12px', border: '1px solid #F0E6D8' }}>
          <label style={{ display: 'block', fontSize: '13px', color: '#8A8078', marginBottom: '6px' }}>PUBG Mobile UID (7-14 digits)</label>
          <input
            type="text"
            inputMode="numeric"
            maxLength={14}
            value={pubgUid}
            onChange={(e) => setPubgUid(e.target.value.replace(/\D/g, '').slice(0, 14))}
            placeholder="e.g. 5123456789"
            style={{
              width: '100%', padding: '12px', background: '#FFF8F0',
              border: pubgUid.length > 0
                ? (pubgUid.length >= 7 ? '1px solid #3FA65C' : '1px solid #D9503F')
                : '1px solid #F0E6D8',
              borderRadius: '10px', fontSize: '14px', outline: 'none', marginBottom: '4px',
            }}
          />
          {pubgUid.length > 0 && pubgUid.length < 7 && (
            <div style={{ fontSize: '11px', color: '#D9503F', marginBottom: '8px' }}>
              UID must be at least 7 digits ({7 - pubgUid.length} more needed)
            </div>
          )}
          {pubgUid.length >= 7 && (
            <div style={{ fontSize: '11px', color: '#3FA65C', marginBottom: '8px' }}>
              ✓ Valid UID length
            </div>
          )}
          <label style={{ display: 'block', fontSize: '13px', color: '#8A8078', marginBottom: '6px' }}>In-Game Name (IGN)</label>
          <input
            type="text"
            maxLength={20}
            value={pubgIgn}
            onChange={(e) => setPubgIgn(e.target.value.slice(0, 20))}
            placeholder="Your PUBG IGN (min 2 chars)"
            style={{
              width: '100%', padding: '12px', background: '#FFF8F0',
              border: pubgIgn.trim().length > 0
                ? (pubgIgn.trim().length >= 2 ? '1px solid #3FA65C' : '1px solid #D9503F')
                : '1px solid #F0E6D8',
              borderRadius: '10px', fontSize: '14px', outline: 'none',
            }}
          />
          {pubgIgn.trim().length > 0 && pubgIgn.trim().length < 2 && (
            <div style={{ fontSize: '11px', color: '#D9503F', marginTop: '4px' }}>
              IGN must be at least 2 characters
            </div>
          )}
        </div>
      )}

      <p style={{ fontSize: '12px', color: '#8A8078', marginBottom: '24px' }}>
        Make sure your UID and IGN are correct — this is how we verify your match results.
      </p>

      <button
        onClick={handleSubmit}
        disabled={!isFormValid() || loading}
        style={{
          width: '100%', padding: '14px',
          background: isFormValid() && !loading ? '#FF6B4A' : '#C4BCB2',
          color: '#FFFFFF', border: 'none', borderRadius: '12px', fontSize: '15px',
          fontWeight: 600, cursor: isFormValid() && !loading ? 'pointer' : 'not-allowed',
          boxShadow: isFormValid() ? '0 4px 16px rgba(255,107,74,0.3)' : 'none',
        }}
      >
        {loading ? 'Creating account...' : 'Create Account →'}
      </button>
    </div>
  );
}
