import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { collection, query, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAuth } from '../hooks/useAuth';
import { useNotifications } from '../hooks/useNotifications';
import TopBar from '../components/TopBar';
import TournamentCard from '../components/TournamentCard';
import LoadingSpinner from '../components/LoadingSpinner';
import NotificationPanel from '../components/NotificationPanel';
import { Trophy, Target, Gamepad2, Eye, EyeOff, Plus, ArrowUpRight, Flame, Sparkles } from 'lucide-react';

export default function Home() {
  const { userProfile } = useAuth();
  const { unreadCount, showPanel, setShowPanel } = useNotifications();
  const [balanceVisible, setBalanceVisible] = useState(true);
  const [tournaments, setTournaments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterGame, setFilterGame] = useState('all');

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'tournaments'), (snapshot) => {
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

  const stats = [
    { icon: <Trophy size={18} color="#FF6B4A" />, value: userProfile?.totalWins || 0, label: 'Wins', bg: '#FFF0EC' },
    { icon: <Target size={18} color="#7B4FE0" />, value: userProfile?.totalKills || 0, label: 'Kills', bg: '#F3EEFF' },
    { icon: <Gamepad2 size={18} color="#2E2A26" />, value: userProfile?.tournamentsPlayed || 0, label: 'Played', bg: '#F0ECE4' },
  ];

  const filteredTournaments = tournaments.filter(t => {
    if (filterGame === 'all') return true;
    return t.game === filterGame;
  });

  return (
    <>
      <TopBar
        title="NabPrize Esports"
        showNotification
        unreadCount={unreadCount}
        onNotificationClick={() => setShowPanel(true)}
      />
      <NotificationPanel isOpen={showPanel} onClose={() => setShowPanel(false)} />

      <div style={{ padding: '16px 16px 40px' }}>
        
        {/* Modern Wallet Card */}
        <div style={{
          background: 'linear-gradient(135deg, #1E1B18 0%, #362E27 100%)',
          borderRadius: '20px',
          padding: '22px',
          marginBottom: '16px',
          color: '#FFFFFF',
          position: 'relative',
          overflow: 'hidden',
          boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
        }}>
          {/* Subtle background glow */}
          <div style={{
            position: 'absolute',
            top: '-20px',
            right: '-20px',
            width: '120px',
            height: '120px',
            background: 'radial-gradient(circle, rgba(255,107,74,0.3) 0%, rgba(255,107,74,0) 70%)',
            borderRadius: '50%',
          }} />

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '12px', color: '#C4BCB2', fontWeight: 500, letterSpacing: '0.5px' }}>
              TOTAL WALLET BALANCE
            </span>
            <button
              onClick={() => setBalanceVisible(!balanceVisible)}
              style={{
                background: 'rgba(255,255,255,0.1)',
                border: 'none',
                cursor: 'pointer',
                color: '#FFFFFF',
                borderRadius: '8px',
                padding: '4px 8px',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                fontSize: '11px',
              }}
            >
              {balanceVisible ? <EyeOff size={14} /> : <Eye size={14} />}
              <span>{balanceVisible ? 'Hide' : 'Show'}</span>
            </button>
          </div>

          <div style={{
            fontFamily: "'Poppins', sans-serif",
            fontWeight: 800,
            fontSize: '32px',
            color: '#F4B740',
            marginBottom: '18px',
            letterSpacing: '-0.5px',
          }}>
            {balanceVisible ? `Rs ${(userProfile?.walletBalance || 0).toLocaleString()}` : 'Rs ••••••'}
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <Link
              to="/add-funds"
              style={{
                flex: 1,
                padding: '12px',
                background: '#FF6B4A',
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

        {/* Player Quick Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', marginBottom: '22px' }}>
          {stats.map(s => (
            <div
              key={s.label}
              style={{
                background: '#FFFFFF',
                borderRadius: '14px',
                padding: '12px 8px',
                textAlign: 'center',
                border: '1px solid #EBE4DA',
                boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
              }}
            >
              <div style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                background: s.bg,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 6px',
              }}>
                {s.icon}
              </div>
              <div style={{ fontWeight: 800, fontSize: '17px', color: '#2E2A26', lineHeight: 1.1 }}>
                {s.value}
              </div>
              <div style={{ fontSize: '11px', color: '#8A8078', marginTop: '2px', fontWeight: 500 }}>
                {s.label}
              </div>
            </div>
          ))}
        </div>

        {/* Tournaments Section Header & Filter */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '14px',
          flexWrap: 'wrap',
          gap: '8px',
        }}>
          <div>
            <h2 style={{
              fontFamily: "'Poppins', sans-serif",
              fontWeight: 800,
              fontSize: '17px',
              color: '#2E2A26',
              margin: 0,
            }}>
              Active Tournaments
            </h2>
            <p style={{ fontSize: '11px', color: '#8A8078', margin: '2px 0 0' }}>
              Daily matches & prize tournaments
            </p>
          </div>

          {/* Game Filter Chips */}
          <div style={{ display: 'flex', gap: '6px' }}>
            {[
              { key: 'all', label: 'All' },
              { key: 'pubg', label: 'PUBG' },
              { key: 'freefire', label: 'FF' },
            ].map(f => (
              <button
                key={f.key}
                onClick={() => setFilterGame(f.key)}
                style={{
                  padding: '4px 10px',
                  borderRadius: '12px',
                  border: filterGame === f.key ? '1px solid #FF6B4A' : '1px solid #EBE4DA',
                  background: filterGame === f.key ? '#FF6B4A' : '#FFFFFF',
                  color: filterGame === f.key ? '#FFFFFF' : '#8A8078',
                  fontSize: '11px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tournament List */}
        {loading ? (
          <LoadingSpinner text="Loading tournaments..." />
        ) : filteredTournaments.length === 0 ? (
          <div style={{
            background: '#FFFFFF',
            borderRadius: '16px',
            textAlign: 'center',
            padding: '50px 20px',
            border: '1px solid #EBE4DA',
          }}>
            <Trophy size={44} color="#C4BCB2" style={{ margin: '0 auto 12px' }} />
            <h4 style={{ fontWeight: 700, fontSize: '15px', color: '#2E2A26', margin: '0 0 6px' }}>
              No matches available
            </h4>
            <p style={{ fontSize: '12px', color: '#8A8078', margin: 0 }}>
              New matches drop daily. Check back soon!
            </p>
          </div>
        ) : (
          <div>
            {filteredTournaments.map(tournament => (
              <TournamentCard
                key={tournament.id}
                tournament={tournament}
              />
            ))}
          </div>
        )}

      </div>
    </>
  );
}
