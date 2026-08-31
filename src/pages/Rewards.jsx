import { useState, useEffect } from 'react';
import { FaMedal, FaCrosshairs, FaStar } from 'react-icons/fa';
import { Link } from 'react-router-dom';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import { db, auth } from '../firebase/config';
import { useAuth } from '../hooks/useAuth';
import TopBar from '../components/TopBar';
import LoadingSpinner from '../components/LoadingSpinner';
import { Trophy, CheckCircle, Gift } from 'lucide-react';

export default function Rewards() {
  const { userProfile } = useAuth();
  const [rewards, setRewards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [gameFilter, setGameFilter] = useState('all');

  useEffect(() => {
    if (!auth.currentUser) return;

    // Listen to all matchResults where current user is a winner
    const unsubscribe = onSnapshot(
      query(collection(db, 'matchResults')),
      (snapshot) => {
        const userRewards = [];
        snapshot.forEach(doc => {
          const data = doc.data();
          if (data.players) {
            data.players.forEach(player => {
              if (player.userId === auth.currentUser.uid && player.isWinner) {
                userRewards.push({
                  id: `${doc.id}-${player.userId}`,
                  tournamentId: doc.id,
                  tournamentName: data.tournamentName || 'Tournament',
                  game: data.game || 'unknown',
                  reward: player.reward || 0,
                  kills: player.kills || 0,
                  placement: player.placement || 0,
                  timestamp: data.submittedAt || data.timestamp,
                });
              }
            });
          }
        });
        userRewards.sort((a, b) => {
          if (!a.timestamp || !b.timestamp) return 0;
          const dateA = a.timestamp.toDate ? a.timestamp.toDate() : new Date(a.timestamp);
          const dateB = b.timestamp.toDate ? b.timestamp.toDate() : new Date(b.timestamp);
          return dateB - dateA;
        });
        setRewards(userRewards);
        setLoading(false);
      },
      () => setLoading(false)
    );

    return unsubscribe;
  }, []);

  const filteredRewards = gameFilter === 'all'
    ? rewards
    : rewards.filter(r => r.game === gameFilter);

  const totalRewards = rewards.reduce((sum, r) => sum + (r.reward || 0), 0);
  const totalWins = rewards.length;

  const formatDate = (timestamp) => {
    if (!timestamp) return '';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  return (
    <>
      <TopBar title="Rewards" />
      <div style={{ padding: '16px' }}>
        {/* Summary Card */}
        <div style={{
          background: '#FFFFFF', borderRadius: '16px', padding: '20px', marginBottom: '20px',
          position: 'relative', overflow: 'hidden',
        }}>
          <div style={{
            position: 'absolute', top: 0, right: 0, width: '100px', height: '100px',
            background: 'rgba(255,107,74,0.08)', borderRadius: '0 0 0 100%',
          }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <Gift size={18} color="#FF6B4A" />
            <span style={{ fontSize: '13px', color: '#8A8078' }}>Total Rewards Earned</span>
          </div>
          <div style={{
            fontFamily: "'Poppins', sans-serif", fontWeight: 800, fontSize: '28px', color: '#F4B740', marginBottom: '4px',
          }}>
            Rs {totalRewards}
          </div>
          <p style={{ fontSize: '12px', color: '#8A8078' }}>{totalWins} tournament win{totalWins !== 1 ? 's' : ''}</p>
        </div>

        <h3 style={{
          fontFamily: "'Poppins', sans-serif", fontWeight: 600, fontSize: '16px', color: '#2E2A26', marginBottom: '12px',
        }}>
          Your Reward History
        </h3>

        {/* Game Filters */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
          {[
            { key: 'all', label: 'All' },
            { key: 'pubg', label: 'PUBG Mobile' },
            { key: 'freefire', label: 'Free Fire' },
          ].map(f => (
            <button key={f.key} onClick={() => setGameFilter(f.key)} style={{
              padding: '6px 12px', borderRadius: '16px', fontSize: '11px', fontWeight: 500,
              background: gameFilter === f.key ? '#7B4FE0' : '#FFFFFF',
              color: gameFilter === f.key ? '#FFFFFF' : '#8A8078',
              border: gameFilter === f.key ? 'none' : '1px solid #F0E6D8',
              cursor: 'pointer',
            }}>
              {f.label}
            </button>
          ))}
        </div>

        {loading ? (
          <LoadingSpinner text="Loading rewards..." />
        ) : filteredRewards.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px' }}>
            <Trophy size={48} color="#C4BCB2" />
            <p style={{ fontWeight: 600, fontSize: '16px', color: '#2E2A26', marginTop: '16px', marginBottom: '8px' }}>
              No rewards yet
            </p>
            <p style={{ fontSize: '13px', color: '#8A8078', marginBottom: '20px' }}>
              Join a tournament and climb the leaderboard to earn your first reward
            </p>
            <Link to="/" style={{
              display: 'inline-block', padding: '12px 24px', background: '#FF6B4A', color: '#FFFFFF',
              border: 'none', borderRadius: '10px', fontWeight: 600, fontSize: '14px', textDecoration: 'none',
            }}>
              Browse Tournaments →
            </Link>
          </div>
        ) : (
          filteredRewards.map(reward => (
            <div key={reward.id} style={{
              background: '#FFFFFF', borderRadius: '16px', padding: '16px', marginBottom: '12px',
            }}>
              {/* Top Row */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <Trophy size={16} color="#FF6B4A" />
                <span style={{
                  fontSize: '11px', fontWeight: 600, color: '#FF6B4A',
                  background: 'rgba(255,107,74,0.15)', padding: '2px 8px', borderRadius: '12px',
                }}>
                  WINNER
                </span>
                {reward.placement === 1 && (
                  <span style={{ fontSize: '14px' }}><FaMedal size={14} style={{display:'inline'}} /></span>
                )}
                {reward.placement === 2 && (
                  <span style={{ fontSize: '14px' }}><FaMedal size={14} style={{display:'inline'}} /></span>
                )}
                {reward.placement === 3 && (
                  <span style={{ fontSize: '14px' }}><FaMedal size={14} style={{display:'inline'}} /></span>
                )}
              </div>

              {/* Tournament Name */}
              <div style={{
                fontFamily: "'Poppins', sans-serif", fontWeight: 600, fontSize: '16px', color: '#2E2A26', marginBottom: '4px',
              }}>
                {reward.tournamentName}
              </div>

              {/* Game + Date */}
              <div style={{ fontSize: '12px', color: '#8A8078', marginBottom: '12px' }}>
                {reward.game === 'pubg' ? 'PUBG Mobile' : 'Free Fire'} • {formatDate(reward.timestamp)}
              </div>

              {/* Bottom Row */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: '#3FA65C' }}>
                  <CheckCircle size={12} />
                  Credited to wallet
                </div>
                <div style={{
                  fontFamily: "'Poppins', sans-serif", fontWeight: 700, fontSize: '22px', color: '#F4B740',
                }}>
                  Rs {reward.reward}
                </div>
              </div>

              {/* Stats */}
              <div style={{
                display: 'flex', gap: '16px', marginTop: '10px', paddingTop: '10px',
                borderTop: '1px solid #F0E6D8', fontSize: '12px', color: '#8A8078',
              }}>
                <span><FaCrosshairs size={14} style={{display:'inline'}} /> {reward.kills} kills</span>
                <span><FaStar size={14} style={{display:'inline'}} /> #{reward.placement} placement</span>
              </div>
            </div>
          ))
        )}
      </div>
    </>
  );
}
