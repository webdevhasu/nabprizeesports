import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { doc, setDoc, collection, query, where, getDocs, serverTimestamp, getDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAuth } from '../hooks/useAuth';
import { sounds } from '../utils/sounds';

export default function AccountSetup() {
  const navigate = useNavigate();
  const { refreshProfile, currentUser: user } = useAuth();

  const [fullName, setFullName] = useState(user?.displayName || '');
  const [username, setUsername] = useState('');
  const [usernameStatus, setUsernameStatus] = useState('');
  const [pubgUid, setPubgUid] = useState('');
  const [pubgIgn, setPubgIgn] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user) { navigate('/login', { replace: true }); return; }
    const checkProfile = async () => {
      try {
        const docSnap = await getDoc(doc(db, 'users', user.uid));
        if (docSnap.exists()) { await refreshProfile(); navigate('/', { replace: true }); }
      } catch (e) { console.error('Profile check error:', e); }
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
      } catch { if (!cancelled) setUsernameStatus('available'); }
    }, 500);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [username]);

  const isFormValid = () => {
    if (!fullName.trim() || !username.trim() || usernameStatus !== 'available') return false;
    if (pubgUid && pubgUid.length < 7) return false;
    if (pubgIgn.trim() && pubgIgn.trim().length < 2) return false;
    return true;
  };

  const handleSubmit = async () => {
    if (!isFormValid() || !user) return;
    setLoading(true); setError('');
    try {
      const games = [];
      if (pubgIgn.trim() || pubgUid) {
        games.push({ game: 'pubg', uid: pubgUid || '', ign: pubgIgn.trim() || '' });
      }
      await setDoc(doc(db, 'users', user.uid), {
        fullName: fullName.trim(), username: username.toLowerCase(),
        email: user.email, photoURL: user.photoURL || '',
        games, walletBalance: 0, totalWins: 0, totalKills: 0,
        tournamentsPlayed: 0, createdAt: serverTimestamp(),
      });
      await refreshProfile(); sounds.success(); navigate('/', { replace: true });
    } catch { setError('Failed to save profile. Please try again.'); }
    setLoading(false);
  };

  return (
    <div style={{ padding: '40px 20px 60px', maxWidth: '400px', margin: '0 auto' }}>
      <h1 style={{ fontFamily: "'Poppins', sans-serif", fontWeight: 800, fontSize: '26px', color: '#2E2A26', marginBottom: '4px' }}>
        Create Your Account
      </h1>
      <p style={{ fontSize: '13px', color: '#8A8078', marginBottom: '28px' }}>
        Quick setup — takes 30 seconds ⚡
      </p>

      {error && (
        <div style={{ background: 'rgba(217,80,63,0.1)', color: '#D9503F', padding: '12px', borderRadius: '10px', fontSize: '13px', marginBottom: '16px', textAlign: 'center' }}>
          {error}
        </div>
      )}

      <div style={{ marginBottom: '16px' }}>
        <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#5E5851', marginBottom: '6px' }}>Full Name *</label>
        <input type="text" maxLength={40} value={fullName} onChange={(e) => setFullName(e.target.value.slice(0, 40))} placeholder="Your full name"
          style={{ width: '100%', padding: '14px', background: '#FFFFFF', border: '1px solid #E8E0D4', borderRadius: '12px', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }} />
      </div>

      <div style={{ marginBottom: '28px' }}>
        <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#5E5851', marginBottom: '6px' }}>Username *</label>
        <input type="text" maxLength={20} value={username}
          onChange={(e) => setUsername(e.target.value.replace(/[^a-zA-Z0-9_]/g, '').slice(0, 20).toLowerCase())}
          placeholder="e.g. nabgamer99"
          style={{ width: '100%', padding: '14px', background: '#FFFFFF', border: '1px solid #E8E0D4', borderRadius: '12px', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }} />
        {username.length >= 3 && (
          <div style={{ fontSize: '11px', marginTop: '6px', color: usernameStatus === 'available' ? '#3FA65C' : usernameStatus === 'taken' ? '#D9503F' : '#8A8078' }}>
            {usernameStatus === 'available' && '✓ Username available'}
            {usernameStatus === 'taken' && '✕ Username already taken'}
          </div>
        )}
      </div>

      {/* PUBG Optional Section */}
      <div style={{ marginBottom: '12px', padding: '16px', background: '#FFFBF8', borderRadius: '14px', border: '1px solid #F0E6D8' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
          <label style={{ fontSize: '14px', fontWeight: 700, color: '#2E2A26' }}>🎮 PUBG Mobile Details</label>
          <span style={{ fontSize: '11px', color: '#8A8078', background: '#F0ECE4', padding: '2px 8px', borderRadius: '8px' }}>Optional</span>
        </div>
        <p style={{ fontSize: '12px', color: '#8A8078', marginBottom: '12px', marginTop: '4px', lineHeight: 1.5 }}>
          Skip this now — we'll ask when you join a tournament.
        </p>

        <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#5E5851', marginBottom: '5px' }}>PUBG UID (7–14 digits)</label>
        <input type="text" inputMode="numeric" maxLength={14} value={pubgUid}
          onChange={(e) => setPubgUid(e.target.value.replace(/\D/g, '').slice(0, 14))} placeholder="e.g. 5123456789"
          style={{ width: '100%', padding: '11px', background: '#FFFFFF', border: pubgUid.length > 0 ? (pubgUid.length >= 7 ? '1px solid #3FA65C' : '1px solid #D9503F') : '1px solid #E8E0D4', borderRadius: '10px', fontSize: '14px', outline: 'none', marginBottom: '10px', boxSizing: 'border-box' }} />

        <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#5E5851', marginBottom: '5px' }}>In-Game Name (IGN)</label>
        <input type="text" maxLength={20} value={pubgIgn} onChange={(e) => setPubgIgn(e.target.value.slice(0, 20))} placeholder="Your in-game name"
          style={{ width: '100%', padding: '11px', background: '#FFFFFF', border: pubgIgn.trim().length > 0 ? (pubgIgn.trim().length >= 2 ? '1px solid #3FA65C' : '1px solid #D9503F') : '1px solid #E8E0D4', borderRadius: '10px', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }} />
      </div>

      {/* YouTube hint */}
      <a href="https://www.youtube.com/shorts/L5KtdDgm34Q" target="_blank" rel="noreferrer"
        style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 14px', background: '#FFF0EC', borderRadius: '10px', fontSize: '12px', fontWeight: 600, color: '#FF6B4A', textDecoration: 'none', marginBottom: '24px', border: '1px solid #FFD8CC' }}>
        ▶ Watch: How to find your PUBG UID &amp; IGN
      </a>

      <button onClick={handleSubmit} disabled={!isFormValid() || loading}
        style={{ width: '100%', padding: '15px', background: isFormValid() && !loading ? '#FF6B4A' : '#C4BCB2', color: '#FFFFFF', border: 'none', borderRadius: '12px', fontSize: '15px', fontWeight: 700, cursor: isFormValid() && !loading ? 'pointer' : 'not-allowed', boxShadow: isFormValid() ? '0 4px 16px rgba(255,107,74,0.3)' : 'none' }}>
        {loading ? 'Creating account...' : 'Get Started →'}
      </button>
    </div>
  );
}
