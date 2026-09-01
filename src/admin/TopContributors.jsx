import { useState, useEffect } from 'react';
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase/config';
import AdminLayout from './AdminLayout';
import { Trophy, Users, TrendingUp, Crown, Medal } from 'lucide-react';

export default function TopContributors() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(
      collection(db, 'users'),
      orderBy('tournamentsPlayed', 'desc'),
      limit(50)
    );
    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setUsers(data);
      setLoading(false);
    }, () => setLoading(false));
    return unsub;
  }, []);

  const getRankBadge = (index) => {
    if (index === 0) return { icon: <Crown size={18} color="#F4B740" />, bg: '#FFF8E1', border: '#F4B740' };
    if (index === 1) return { icon: <Medal size={18} color="#B0BEC5" />, bg: '#F5F5F5', border: '#B0BEC5' };
    if (index === 2) return { icon: <Medal size={18} color="#A1887F" />, bg: '#EFEBE9', border: '#A1887F' };
    return { icon: <span style={{ fontSize: '13px', fontWeight: 700, color: '#8A8078' }}>#{index + 1}</span>, bg: '#FFFFFF', border: '#F0E6D8' };
  };

  return (
    <AdminLayout title="Top Contributors" subtitle="Most active players by tournaments joined">
      {loading ? (
        <div style={{ padding: '40px', textAlign: 'center' }}>
          <div style={{
            width: '40px', height: '40px', border: '3px solid #F0E6D8',
            borderTop: '3px solid #FF6B4A', borderRadius: '50%',
            animation: 'spin 0.8s linear infinite', margin: '0 auto',
          }} />
          <p style={{ marginTop: '16px', color: '#8A8078', fontSize: '14px' }}>Loading contributors...</p>
        </div>
      ) : users.length === 0 ? (
        <div style={{ padding: '40px', textAlign: 'center', color: '#8A8078' }}>
          <Users size={48} color="#C4BCB2" />
          <p style={{ marginTop: '16px', fontSize: '14px' }}>No users yet</p>
        </div>
      ) : (
        <div style={{ padding: '0 0 20px' }}>
          {/* Summary Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
            <div style={{
              background: '#FFFFFF', borderRadius: '12px', padding: '20px',
              border: '1px solid #F0E6D8',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                <Users size={18} color="#FF6B4A" />
                <span style={{ fontSize: '13px', color: '#8A8078', fontWeight: 500 }}>Total Players</span>
              </div>
              <div style={{ fontSize: '28px', fontWeight: 800, color: '#2E2A26' }}>{users.length}</div>
            </div>
            <div style={{
              background: '#FFFFFF', borderRadius: '12px', padding: '20px',
              border: '1px solid #F0E6D8',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                <TrendingUp size={18} color="#7B4FE0" />
                <span style={{ fontSize: '13px', color: '#8A8078', fontWeight: 500 }}>Total Tournaments Joined</span>
              </div>
              <div style={{ fontSize: '28px', fontWeight: 800, color: '#2E2A26' }}>
                {users.reduce((sum, u) => sum + (u.tournamentsPlayed || 0), 0)}
              </div>
            </div>
            <div style={{
              background: '#FFFFFF', borderRadius: '12px', padding: '20px',
              border: '1px solid #F0E6D8',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                <Trophy size={18} color="#F4B740" />
                <span style={{ fontSize: '13px', color: '#8A8078', fontWeight: 500 }}>Top Contributor</span>
              </div>
              <div style={{ fontSize: '18px', fontWeight: 700, color: '#2E2A26' }}>
                {users[0]?.username || 'N/A'}
              </div>
              <div style={{ fontSize: '13px', color: '#8A8078' }}>
                {users[0]?.tournamentsPlayed || 0} tournaments
              </div>
            </div>
          </div>

          {/* Contributors List */}
          <div style={{
            background: '#FFFFFF', borderRadius: '16px',
            border: '1px solid #F0E6D8', overflow: 'hidden',
          }}>
            <div style={{
              padding: '16px 20px', borderBottom: '1px solid #F0E6D8',
              display: 'grid', gridTemplateColumns: '60px 1fr 120px 120px 100px',
              gap: '12px', fontSize: '12px', fontWeight: 600, color: '#8A8078',
              textTransform: 'uppercase', letterSpacing: '0.5px',
            }} className="contributor-header">
              <div>Rank</div>
              <div>Player</div>
              <div>Tournaments</div>
              <div>Wins</div>
              <div>Win Rate</div>
            </div>

            {users.map((user, index) => {
              const rank = getRankBadge(index);
              const winRate = user.tournamentsPlayed > 0
                ? Math.round(((user.totalWins || 0) / user.tournamentsPlayed) * 100)
                : 0;

              return (
                <div
                  key={user.id}
                  style={{
                    padding: '14px 20px',
                    borderBottom: index < users.length - 1 ? '1px solid #F8F6F1' : 'none',
                    display: 'grid', gridTemplateColumns: '60px 1fr 120px 120px 100px',
                    gap: '12px', alignItems: 'center',
                    background: index < 3 ? rank.bg : '#FFFFFF',
                    transition: 'background 0.15s',
                  }}
                  className="contributor-row"
                >
                  {/* Rank */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {rank.icon}
                  </div>

                  {/* Player Info */}
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '14px', color: '#2E2A26' }}>
                      {user.username || 'Unnamed'}
                    </div>
                    <div style={{ fontSize: '12px', color: '#8A8078', marginTop: '2px' }}>
                      {user.email || user.id}
                    </div>
                  </div>

                  {/* Tournaments Played */}
                  <div style={{ fontWeight: 700, fontSize: '15px', color: '#2E2A26' }}>
                    {user.tournamentsPlayed || 0}
                  </div>

                  {/* Wins */}
                  <div style={{ fontWeight: 600, fontSize: '14px', color: '#FF6B4A' }}>
                    {user.totalWins || 0}
                  </div>

                  {/* Win Rate */}
                  <div style={{
                    fontSize: '13px', fontWeight: 600,
                    color: winRate >= 50 ? '#2E7D32' : winRate >= 25 ? '#F4B740' : '#8A8078',
                  }}>
                    {winRate}%
                  </div>
                </div>
              );
            })}
          </div>

          <style>{`
            @media (max-width: 768px) {
              .contributor-header, .contributor-row {
                grid-template-columns: 50px 1fr 80px 80px !important;
              }
              .contributor-header > div:nth-child(5),
              .contributor-row > div:nth-child(5) {
                display: none;
              }
            }
          `}</style>
        </div>
      )}
    </AdminLayout>
  );
}
