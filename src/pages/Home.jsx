import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { collection, doc, getDoc, onSnapshot, query, limit } from 'firebase/firestore';
import { db, auth } from '../firebase/config';
import { useAuth } from '../hooks/useAuth';
import { useServerTime } from '../hooks/useServerTime';
import { useNotifications } from '../hooks/useNotifications';
import TopBar from '../components/TopBar';
import TournamentCard from '../components/TournamentCard';
import LoadingSpinner from '../components/LoadingSpinner';
import NotificationPanel from '../components/NotificationPanel';
import InstallAppBanner from '../components/InstallAppBanner';
import { Trophy, Target, Gamepad2, Eye, EyeOff, Plus, ArrowUpRight, Play } from 'lucide-react';

// Shimmer for dark backgrounds (wallet card)
function Shimmer({ width = '100%', height = '20px', radius = '8px', style = {} }) {
  return (
    <div style={{
      width, height, borderRadius: radius,
      background: 'linear-gradient(90deg, rgba(255,255,255,0.07) 25%, rgba(255,255,255,0.16) 50%, rgba(255,255,255,0.07) 75%)',
      backgroundSize: '200% 100%',
      animation: 'shimmer 1.4s infinite',
      ...style,
    }} />
  );
}

// Shimmer for light backgrounds (stats cards)
function ShimmerLight({ width = '100%', height = '20px', radius = '8px', style = {} }) {
  return (
    <div style={{
      width, height, borderRadius: radius,
      background: 'linear-gradient(90deg, #F0ECE4 25%, #E4DDD3 50%, #F0ECE4 75%)',
      backgroundSize: '200% 100%',
      animation: 'shimmer 1.4s infinite',
      ...style,
    }} />
  );
}

export default function Home() {
  const { userProfile, loading: authLoading } = useAuth();
  const { getNow } = useServerTime();
  const [whatsappDismissed, setWhatsappDismissed] = useState(() => localStorage.getItem('wa_banner_dismissed') === '1');
  const [nowMs, setNowMs] = useState(() => getNow());
  const { unreadCount, showPanel, setShowPanel } = useNotifications();
  const [balanceVisible, setBalanceVisible] = useState(true);
  const [tournaments, setTournaments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterGame, setFilterGame] = useState('all');
  const [registeredIds, setRegisteredIds] = useState(new Set());
  const [registeredLoading, setRegisteredLoading] = useState(true);

  // Tick every 30s for match alerts
  useEffect(() => {
    const t = setInterval(() => setNowMs(getNow()), 30000);
    return () => clearInterval(t);
  }, [getNow]);

  useEffect(() => {
    const unsubscribe = onSnapshot(query(collection(db, 'tournaments'), limit(100)), (snapshot) => {
      const data = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter(t => t.status === 'upcoming' || t.status === 'live');
      
      data.sort((a, b) => {
        // Live matches first
        if (a.status === 'live' && b.status !== 'live') return -1;
        if (b.status === 'live' && a.status !== 'live') return 1;

        if (!a.startTime && !b.startTime) return 0;
        if (!a.startTime) return 1;
        if (!b.startTime) return -1;
        const dateA = a.startTime.toDate ? a.startTime.toDate() : new Date(a.startTime);
        const dateB = b.startTime.toDate ? b.startTime.toDate() : new Date(b.startTime);
        return dateA - dateB;
      });
      setTournaments(data);
      setLoading(false);
    }, (err) => {
      console.error('Error fetching tournaments:', err);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  // Check per-tournament registration — waits until auth + tournaments are both ready
  useEffect(() => {
    // Still waiting for auth state
    if (authLoading) return;

    const user = auth.currentUser;
    if (!user) {
      setRegisteredIds(new Set());
      setRegisteredLoading(false);
      return;
    }

    // Tournaments not yet loaded
    if (loading) return;

    // Tournaments loaded but empty
    if (tournaments.length === 0) {
      setRegisteredLoading(false);
      return;
    }

    setRegisteredLoading(true);
    const checkRegistrations = async () => {
      const ids = new Set();
      await Promise.all(
        tournaments.map(async (t) => {
          try {
            const playerSnap = await getDoc(doc(db, 'tournaments', t.id, 'players', user.uid));
            if (playerSnap.exists()) ids.add(t.id);
          } catch (_) {}
        })
      );
      setRegisteredIds(ids);
      setRegisteredLoading(false);
    };
    checkRegistrations();
  }, [tournaments, loading, authLoading]);

  // null = still loading (show shimmer); number = loaded
  const profileReady = !authLoading;
  const stats = [
    { icon: <Trophy size={18} color="#FF6B4A" />, value: profileReady ? (userProfile?.totalWins || 0) : null, label: 'Wins', bg: '#FFF0EC' },
    { icon: <Target size={18} color="#7B4FE0" />, value: profileReady ? (userProfile?.totalKills || 0) : null, label: 'Kills', bg: '#F3EEFF' },
    { icon: <Gamepad2 size={18} color="#2E2A26" />, value: profileReady ? (userProfile?.tournamentsPlayed || 0) : null, label: 'Played', bg: '#F0ECE4' },
  ];

  // Find soonest registered tournament that starts within 2 hours or is room open / live
  const matchAlert = (() => {
    if (registeredIds.size === 0) return null;
    const twoHours = 2 * 60 * 60 * 1000;
    const candidates = tournaments
      .filter(t => registeredIds.has(t.id) && t.startTime)
      .map(t => {
        const regCloseMs = t.startTime?.toDate ? t.startTime.toDate().getTime() : new Date(t.startTime).getTime();
        const matchStartMs = regCloseMs + 10 * 60 * 1000;
        const isLive = t.status === 'live';
        const isRoomOpen = nowMs >= regCloseMs && nowMs <= matchStartMs;
        const diff = regCloseMs - nowMs; // ms until room opens
        const matchStartDiff = matchStartMs - nowMs;
        const regCloseDate = new Date(regCloseMs);
        const timeStr = regCloseDate.toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit', hour12: true }) + ' PKT';
        return {
          ...t,
          regCloseMs,
          matchStartMs,
          isLive,
          isRoomOpen,
          diff,
          matchStartDiff,
          timeStr,
        };
      })
      .filter(t => {
        if (t.isLive) return true;
        if (t.isRoomOpen) return true;
        return t.diff > 0 && t.diff < twoHours;
      })
      .sort((a, b) => {
        if (a.isLive && !b.isLive) return -1;
        if (b.isLive && !a.isLive) return 1;
        if (a.isRoomOpen && !b.isRoomOpen) return -1;
        if (b.isRoomOpen && !a.isRoomOpen) return 1;
        return a.diff - b.diff;
      });
    return candidates[0] || null;
  })();

  const filteredTournaments = tournaments.filter(t => {
    if (filterGame === 'all') return true;
    return t.game === filterGame;
  });

  return (
    <>
      <style>{`@keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} } @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.88} }`}</style>
      <TopBar
        title="NabPrize Esports"
        showNotification
        unreadCount={unreadCount}
        onNotificationClick={() => setShowPanel(true)}
      />
      <NotificationPanel isOpen={showPanel} onClose={() => setShowPanel(false)} />

      <div style={{ padding: '16px 16px 40px' }}>
        
        {/* PWA Install App Prompt Banner */}
        <InstallAppBanner />

        {/* WhatsApp Channel Banner */}
        {!whatsappDismissed && (
          <div style={{
            background: 'linear-gradient(135deg, #25D366 0%, #128C7E 100%)',
            borderRadius: '14px', padding: '14px 16px', marginBottom: '12px',
            display: 'flex', alignItems: 'center', gap: '12px',
            boxShadow: '0 4px 12px rgba(37,211,102,0.25)',
          }}>
            <div style={{ fontSize: '28px', flexShrink: 0 }}>📣</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '13px', fontWeight: 700, color: '#FFFFFF', marginBottom: '2px' }}>Join our WhatsApp Channel!</div>
              <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.85)' }}>Live updates, Room IDs & tournament alerts</div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flexShrink: 0 }}>
              <a href="https://whatsapp.com/channel/0029VbDu0E99RZAXBm3W1V3h" target="_blank" rel="noreferrer"
                style={{ padding: '7px 14px', background: '#FFFFFF', color: '#128C7E', borderRadius: '8px', fontSize: '12px', fontWeight: 700, textDecoration: 'none', textAlign: 'center' }}>
                Join Now
              </a>
              <button onClick={() => { localStorage.setItem('wa_banner_dismissed','1'); setWhatsappDismissed(true); }}
                style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: '#FFFFFF', borderRadius: '8px', fontSize: '11px', padding: '4px 8px', cursor: 'pointer' }}>
                Maybe later
              </button>
            </div>
          </div>
        )}

        {/* Match Day Alert */}
        {matchAlert && (
          <Link to={'/tournament/' + matchAlert.id} style={{ textDecoration: 'none' }}>
            <div style={{
              background: (matchAlert.isLive || matchAlert.isRoomOpen)
                ? 'linear-gradient(135deg, #D9503F 0%, #B71C1C 100%)'
                : 'linear-gradient(135deg, #FF6B4A 0%, #E8552F 100%)',
              borderRadius: '14px', padding: '14px 16px', marginBottom: '12px',
              display: 'flex', alignItems: 'center', gap: '12px',
              boxShadow: (matchAlert.isLive || matchAlert.isRoomOpen)
                ? '0 4px 16px rgba(217,80,63,0.45)'
                : '0 4px 12px rgba(255,107,74,0.35)',
              cursor: 'pointer',
              animation: 'pulse 2s infinite',
            }}>
              <div style={{ fontSize: '28px', flexShrink: 0 }}>
                {matchAlert.isLive ? '🔴' : matchAlert.isRoomOpen ? '🎮' : '⚡'}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '13px', fontWeight: 800, color: '#FFFFFF', marginBottom: '2px' }}>
                  {matchAlert.isLive 
                    ? 'Match is LIVE Now!' 
                    : matchAlert.isRoomOpen 
                    ? 'Room ID & Password are LIVE!' 
                    : `Match Today at ${matchAlert.timeStr}`}
                </div>
                <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.95)' }}>
                  {matchAlert.isLive
                    ? `${matchAlert.name} — Tap to view details`
                    : matchAlert.isRoomOpen
                    ? `${matchAlert.name} — Tap to copy Room ID & join PUBG!`
                    : `${matchAlert.name} — Room opens in ${Math.max(1, Math.round(matchAlert.diff / 60000))} mins`}
                </div>
              </div>
              <div style={{ fontSize: '20px', flexShrink: 0, color: '#FFFFFF' }}>→</div>
            </div>
          </Link>
        )}

        {/* Hero Area: Wallet Card + Stats (Side-by-Side on Desktop) */}
        <div className="dashboard-hero-grid">
          {/* Modern Wallet Card */}
          <div style={{
            background: 'linear-gradient(135deg, #1E1B18 0%, #362E27 100%)',
            borderRadius: '20px',
            padding: '24px',
            color: '#FFFFFF',
            position: 'relative',
            overflow: 'hidden',
            boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
          }}>
            {/* Subtle background glow */}
            <div style={{
              position: 'absolute',
              top: '-20px',
              right: '-20px',
              width: '140px',
              height: '140px',
              background: 'radial-gradient(circle, rgba(255,107,74,0.3) 0%, rgba(255,107,74,0) 70%)',
              borderRadius: '50%',
            }} />

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '12px', color: '#C4BCB2', fontWeight: 600, letterSpacing: '0.5px' }}>
                  TOTAL WALLET BALANCE
                </span>
                <button
                  onClick={() => setBalanceVisible(!balanceVisible)}
                  style={{
                    background: 'rgba(255,255,255,0.12)',
                    border: 'none',
                    cursor: 'pointer',
                    color: '#FFFFFF',
                    borderRadius: '8px',
                    padding: '4px 10px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px',
                    fontSize: '11px',
                    fontWeight: 600,
                  }}
                >
                  {balanceVisible ? <EyeOff size={14} /> : <Eye size={14} />}
                  <span>{balanceVisible ? 'Hide' : 'Show'}</span>
                </button>
              </div>

              <div style={{
                fontFamily: "'Poppins', sans-serif",
                fontWeight: 800,
                fontSize: 'clamp(26px, 4vw, 36px)',
                color: '#F4B740',
                marginBottom: '18px',
                letterSpacing: '-0.5px',
                wordBreak: 'break-word',
                minHeight: '44px',
                display: 'flex',
                alignItems: 'center',
              }}>
                {!profileReady
                  ? <Shimmer width="160px" height="38px" radius="10px" />
                  : balanceVisible
                    ? `Rs ${(userProfile?.walletBalance || 0).toLocaleString()}`
                    : 'Rs ••••••'
                }
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <Link
                to="/add-funds"
                style={{
                  flex: 1,
                  padding: '12px',
                  background: 'linear-gradient(135deg, #FF6B4A 0%, #E8552F 100%)',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: '12px',
                  fontWeight: 700,
                  fontSize: '13px',
                  textAlign: 'center',
                  textDecoration: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  boxShadow: '0 4px 12px rgba(255,107,74,0.35)',
                }}
              >
                <Plus size={16} /> Add Funds
              </Link>

              <Link
                to="/withdraw"
                style={{
                  flex: 1,
                  padding: '12px',
                  background: 'rgba(255,255,255,0.1)',
                  color: '#FFFFFF',
                  border: '1px solid rgba(255,255,255,0.2)',
                  borderRadius: '12px',
                  fontWeight: 700,
                  fontSize: '13px',
                  textAlign: 'center',
                  textDecoration: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                }}
              >
                Withdraw <ArrowUpRight size={15} />
              </Link>
            </div>
          </div>

          {/* Player Quick Stats Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
            {stats.map(s => (
              <div
                key={s.label}
                style={{
                  background: '#FFFFFF',
                  borderRadius: '16px',
                  padding: '16px 12px',
                  textAlign: 'center',
                  border: '1px solid #EBE4DA',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.02)',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                  alignItems: 'center',
                }}
              >
                <div style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '10px',
                  background: s.bg,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '8px',
                }}>
                  {s.icon}
                </div>
                {s.value === null
                  ? <ShimmerLight width="50px" height="22px" radius="6px" style={{ margin: '0 auto 2px' }} />
                  : <div style={{ fontWeight: 800, fontSize: '20px', color: '#2E2A26', lineHeight: 1.1 }}>{s.value}</div>
                }
                <div style={{ fontSize: '11px', color: '#8A8078', marginTop: '4px', fontWeight: 600 }}>
                  {s.label}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* YouTube Video Tutorial Guide Banner */}
        <a
          href="https://www.youtube.com/shorts/L5KtdDgm34Q"
          target="_blank"
          rel="noreferrer"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'linear-gradient(135deg, #FFF5F2 0%, #FFEBE5 100%)',
            borderRadius: '14px',
            padding: '12px 16px',
            marginTop: '16px',
            marginBottom: '20px',
            border: '1.5px solid #FFD4C7',
            textDecoration: 'none',
            boxShadow: '0 2px 8px rgba(255,107,74,0.08)',
            cursor: 'pointer',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              background: '#FF0000',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#FFFFFF',
              boxShadow: '0 3px 8px rgba(255,0,0,0.3)',
              flexShrink: 0,
            }}>
              <Play size={16} fill="#FFFFFF" />
            </div>
            <div>
              <div style={{ fontSize: '13px', fontWeight: 800, color: '#2E2A26' }}>
                How to Join & Play?
              </div>
              <div style={{ fontSize: '11px', color: '#8A8078', marginTop: '1px' }}>
                Watch 1-minute video guide on YouTube
              </div>
            </div>
          </div>
          <span style={{
            background: '#FF6B4A',
            color: '#FFFFFF',
            fontSize: '11px',
            fontWeight: 700,
            padding: '6px 12px',
            borderRadius: '8px',
            flexShrink: 0,
            whiteSpace: 'nowrap',
          }}>
            Watch Video ▶
          </span>
        </a>

        {/* Tournaments Section Header & Filter */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '16px',
          flexWrap: 'wrap',
          gap: '10px',
        }}>
          <div>
            <h2 style={{
              fontFamily: "'Poppins', sans-serif",
              fontWeight: 800,
              fontSize: '18px',
              color: '#2E2A26',
              margin: 0,
            }}>
              Active Tournaments
            </h2>
            <p style={{ fontSize: '12px', color: '#8A8078', margin: '2px 0 0' }}>
              Daily matches, weekly championships & prize tournaments
            </p>
          </div>

          {/* Game Filter Chips */}
          <div style={{ display: 'flex', gap: '8px' }}>
            {[
              { key: 'all', label: 'All Matches' },
              { key: 'pubg', label: 'PUBG Mobile' },
            ].map(f => (
              <button
                key={f.key}
                onClick={() => setFilterGame(f.key)}
                style={{
                  padding: '6px 14px',
                  borderRadius: '14px',
                  border: filterGame === f.key ? '1px solid #FF6B4A' : '1px solid #EBE4DA',
                  background: filterGame === f.key ? '#FF6B4A' : '#FFFFFF',
                  color: filterGame === f.key ? '#FFFFFF' : '#8A8078',
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  boxShadow: filterGame === f.key ? '0 2px 8px rgba(255,107,74,0.25)' : 'none',
                }}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tournament List - Grid on Desktop, Stack on Mobile */}
        {loading ? (
          <LoadingSpinner text="Loading tournaments..." />
        ) : filteredTournaments.length === 0 ? (
          <div style={{
            background: '#FFFFFF',
            borderRadius: '16px',
            textAlign: 'center',
            padding: '60px 20px',
            border: '1px solid #EBE4DA',
          }}>
            <Trophy size={48} color="#C4BCB2" style={{ margin: '0 auto 12px' }} />
            <h4 style={{ fontWeight: 700, fontSize: '16px', color: '#2E2A26', margin: '0 0 6px' }}>
              No matches available
            </h4>
            <p style={{ fontSize: '13px', color: '#8A8078', margin: 0 }}>
              New matches drop daily. Check back soon!
            </p>
          </div>
        ) : (
          <div className="tournaments-grid">
            {filteredTournaments.map(tournament => (
              <TournamentCard
                key={tournament.id}
                tournament={tournament}
                isRegistered={registeredLoading ? null : registeredIds.has(tournament.id)}
              />
            ))}
          </div>
        )}

      </div>
    </>
  );
}
