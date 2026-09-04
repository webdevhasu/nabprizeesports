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
    if (selectedGames.includes('pubg') && (!pubgUid || !pubgIgn.trim())) return false;
    if (selectedGames.includes('freefire') && (!ffUid || !ffIgn.trim())) return false;
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
      if (selectedGames.includes('freefire')) {
        games.push({ game: 'freefire', uid: ffUid, ign: ffIgn.trim() });
      }

      await setDoc(doc(db, 'users', user.uid), {
        fullName: fullName.trim(),
        username: username.toLowerCase(),
        email: user.email,
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
          { key: 'freefire', label: 'Free Fire' },
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
          <label style={{ display: 'block', fontSize: '13px', color: '#8A8078', marginBottom: '6px' }}>PUBG Mobile UID (Numbers only)</label>
          <input
            type="text"
            inputMode="numeric"
            maxLength={14}
            value={pubgUid}
            onChange={(e) => setPubgUid(e.target.value.replace(/\D/g, '').slice(0, 14))}
            placeholder="Numeric UID (e.g. 5123456789)"
            style={{
              width: '100%', padding: '12px', background: '#FFF8F0', border: '1px solid #F0E6D8',
              borderRadius: '10px', fontSize: '14px', outline: 'none', marginBottom: '12px',
            }}
          />
          <label style={{ display: 'block', fontSize: '13px', color: '#8A8078', marginBottom: '6px' }}>In-Game Name (IGN)</label>
          <input
            type="text"
            maxLength={20}
            value={pubgIgn}
            onChange={(e) => setPubgIgn(e.target.value.slice(0, 20))}
            placeholder="Your PUBG IGN (max 20 chars)"
            style={{
              width: '100%', padding: '12px', background: '#FFF8F0', border: '1px solid #F0E6D8',
              borderRadius: '10px', fontSize: '14px', outline: 'none',
            }}
          />
        </div>
      )}

      {selectedGames.includes('freefire') && (
        <div style={{ marginBottom: '16px', padding: '16px', background: '#FFFFFF', borderRadius: '12px', border: '1px solid #F0E6D8' }}>
          <label style={{ display: 'block', fontSize: '13px', color: '#8A8078', marginBottom: '6px' }}>Free Fire UID (Numbers only)</label>
          <input
            type="text"
            inputMode="numeric"
            maxLength={14}
            value={ffUid}
            onChange={(e) => setFfUid(e.target.value.replace(/\D/g, '').slice(0, 14))}
            placeholder="Numeric UID"
            style={{
              width: '100%', padding: '12px', background: '#FFF8F0', border: '1px solid #F0E6D8',
              borderRadius: '10px', fontSize: '14px', outline: 'none', marginBottom: '12px',
            }}
          />
          <label style={{ display: 'block', fontSize: '13px', color: '#8A8078', marginBottom: '6px' }}>In-Game Name (IGN)</label>
          <input
            type="text"
            maxLength={20}
            value={ffIgn}
            onChange={(e) => setFfIgn(e.target.value.slice(0, 20))}
            placeholder="Your Free Fire IGN (max 20 chars)"
            style={{
              width: '100%', padding: '12px', background: '#FFF8F0', border: '1px solid #F0E6D8',
              borderRadius: '10px', fontSize: '14px', outline: 'none',
            }}
          />
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
