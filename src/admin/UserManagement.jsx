import { useState, useEffect } from 'react';
import { collection, query, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import {
  Users,
  Search,
  Ban,
  CheckCircle,
  Trophy,
  Target,
  DollarSign,
  ShieldAlert,
  ShieldCheck,
  Gamepad2
} from 'lucide-react';
import AdminLayout from './AdminLayout';

const cardStyle = {
  background: '#FFFFFF',
  borderRadius: '14px',
  padding: '24px',
  border: '1px solid #EBE4DA',
  boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
};

const inputStyle = {
  width: '100%',
  padding: '10px 14px',
  borderRadius: '8px',
  border: '1px solid #D9D3CC',
  fontSize: '13px',
  boxSizing: 'border-box',
  background: '#FFFFFF',
  outline: 'none',
};

export default function UserManagement() {
  const [users, setUsers] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    const unsub = onSnapshot(
      query(collection(db, 'users')),
      (snap) => setUsers(snap.docs.map(d => ({ id: d.id, ...d.data() }))),
      () => {}
    );
    return unsub;
  }, []);

  const handleBanUser = async (userId, currentBanned) => {
    const actionText = currentBanned ? 'unban' : 'ban';
    if (window.confirm(`Are you sure you want to ${actionText} this user?`)) {
      try {
        await updateDoc(doc(db, 'users', userId), { isBanned: !currentBanned });
      } catch (e) {
        console.error('Error updating ban status:', e);
        alert('Failed to update ban status');
      }
    }
  };

  const totalUsers = users.length;
  const bannedUsers = users.filter(u => u.isBanned).length;
  const activeUsers = totalUsers - bannedUsers;
  const totalCirculatingBalance = users.reduce((sum, u) => sum + (Number(u.walletBalance) || 0), 0);

  const filteredUsers = users.filter(user => {
    const matchesSearch = !searchQuery ||
      user.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.fullName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.phone?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.id?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'banned' && user.isBanned) ||
      (statusFilter === 'active' && !user.isBanned);

    return matchesSearch && matchesStatus;
  });

  return (
    <AdminLayout
      title="User & Player Management"
      subtitle="Search, monitor player balances, match performance stats, and access control"
    >
      {/* Top Metrics Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '16px',
        marginBottom: '28px',
      }}>
        {[
          { label: 'Total Players', value: totalUsers, color: '#FF6B4A', bg: '#FFF0EC', icon: Users, note: 'Registered accounts' },
          { label: 'Active Players', value: activeUsers, color: '#3FA65C', bg: '#E8F5E9', icon: ShieldCheck, note: 'Good standing' },
          { label: 'Banned Accounts', value: bannedUsers, color: '#D9503F', bg: '#FFEBEE', icon: ShieldAlert, note: 'Restricted access' },
          { label: 'Total Player Balances', value: `Rs ${totalCirculatingBalance.toLocaleString()}`, color: '#7B4FE0', bg: '#F3EEFF', icon: DollarSign, note: 'In user wallets' },
        ].map(s => {
          const Icon = s.icon;
          return (
            <div
              key={s.label}
              style={{
                background: '#FFFFFF',
                borderRadius: '14px',
                padding: '18px 20px',
                border: '1px solid #EBE4DA',
                boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                display: 'flex',
                alignItems: 'flex-start',
                justifyContent: 'space-between',
              }}
            >
              <div>
                <div style={{ fontSize: '12px', color: '#8A8078', fontWeight: 600, marginBottom: '4px' }}>
                  {s.label}
                </div>
                <div style={{ fontWeight: 800, fontSize: '22px', color: s.color, lineHeight: 1.1 }}>
                  {s.value}
                </div>
                <div style={{ fontSize: '11px', color: '#A69E94', marginTop: '4px' }}>{s.note}</div>
              </div>
              <div style={{
                width: '38px',
                height: '38px',
                borderRadius: '10px',
                background: s.bg,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: s.color,
                flexShrink: 0,
              }}>
                <Icon size={18} />
              </div>
            </div>
          );
        })}
      </div>

      {/* Main Table Card */}
      <div style={cardStyle}>
        
        {/* Controls: Search & Filters */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '14px',
          marginBottom: '20px',
        }}>
          <div style={{ position: 'relative', width: '100%', maxWidth: '400px' }}>
            <Search size={16} color="#A69E94" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
            <input
              type="text"
              placeholder="Search by username, real name, phone, email, UID..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              style={{ ...inputStyle, paddingLeft: '36px' }}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {[
              { key: 'all', label: 'All Players', count: totalUsers },
              { key: 'active', label: 'Active', count: activeUsers },
              { key: 'banned', label: 'Banned', count: bannedUsers },
            ].map(f => (
              <button
                key={f.key}
                onClick={() => setStatusFilter(f.key)}
                style={{
                  padding: '6px 14px',
                  borderRadius: '20px',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  border: statusFilter === f.key ? '1px solid #FF6B4A' : '1px solid #E8E2DA',
                  background: statusFilter === f.key ? '#FF6B4A' : '#FFFFFF',
                  color: statusFilter === f.key ? '#FFFFFF' : '#8A8078',
                  transition: 'all 0.15s ease',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <span>{f.label}</span>
                <span style={{
                  fontSize: '10px',
                  background: statusFilter === f.key ? 'rgba(255,255,255,0.3)' : '#F0ECE4',
                  color: statusFilter === f.key ? '#FFFFFF' : '#8A8078',
                  padding: '1px 6px',
                  borderRadius: '10px',
                }}>
                  {f.count}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Responsive Table */}
        <div style={{ overflowX: 'auto', width: '100%' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', minWidth: '850px' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #F0ECE4', background: '#FCFAF7' }}>
                <th style={{ textAlign: 'left', padding: '12px 14px', color: '#8A8078', fontWeight: 600, fontSize: '11px', textTransform: 'uppercase' }}>Player Info</th>
                <th style={{ textAlign: 'left', padding: '12px 14px', color: '#8A8078', fontWeight: 600, fontSize: '11px', textTransform: 'uppercase' }}>Contact Details</th>
                <th style={{ textAlign: 'center', padding: '12px 14px', color: '#8A8078', fontWeight: 600, fontSize: '11px', textTransform: 'uppercase' }}>Wallet Balance</th>
                <th style={{ textAlign: 'center', padding: '12px 14px', color: '#8A8078', fontWeight: 600, fontSize: '11px', textTransform: 'uppercase' }}>Wins</th>
                <th style={{ textAlign: 'center', padding: '12px 14px', color: '#8A8078', fontWeight: 600, fontSize: '11px', textTransform: 'uppercase' }}>Kills</th>
                <th style={{ textAlign: 'center', padding: '12px 14px', color: '#8A8078', fontWeight: 600, fontSize: '11px', textTransform: 'uppercase' }}>Matches</th>
                <th style={{ textAlign: 'center', padding: '12px 14px', color: '#8A8078', fontWeight: 600, fontSize: '11px', textTransform: 'uppercase' }}>Status</th>
                <th style={{ textAlign: 'center', padding: '12px 14px', color: '#8A8078', fontWeight: 600, fontSize: '11px', textTransform: 'uppercase' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan="8" style={{ textAlign: 'center', padding: '40px', color: '#8A8078' }}>
                    No players found matching the query.
                  </td>
                </tr>
              ) : (
                filteredUsers.map(user => (
                  <tr
                    key={user.id}
                    style={{
                      borderBottom: '1px solid #F0ECE4',
                      background: user.isBanned ? '#FFF5F5' : 'transparent',
                      transition: 'background 0.15s ease',
                    }}
                  >
                    {/* User Avatar + Name */}
                    <td style={{ padding: '14px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{
                          width: '38px',
                          height: '38px',
                          borderRadius: '50%',
                          background: user.isBanned ? '#FFEBEE' : '#FFF0EC',
                          color: user.isBanned ? '#D9503F' : '#FF6B4A',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 700,
                          fontSize: '14px',
                          flexShrink: 0,
                        }}>
                          {(user.username || 'U')[0].toUpperCase()}
                        </div>
                        <div>
                          <div style={{ fontWeight: 700, color: '#2E2A26', fontSize: '14px' }}>
                            @{user.username || 'unknown'}
                          </div>
                          <div style={{ fontSize: '11px', color: '#8A8078' }}>
                            {user.fullName || 'No full name'}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Contact info */}
                    <td style={{ padding: '14px' }}>
                      <div style={{ color: '#2E2A26', fontSize: '12px', fontWeight: 500 }}>
                        {user.phone || 'No phone'}
                      </div>
                      <div style={{ fontSize: '11px', color: '#8A8078' }}>
                        {user.email || 'No email'}
                      </div>
                    </td>

                    {/* Balance */}
                    <td style={{ padding: '14px', textAlign: 'center', fontWeight: 800, color: '#FF6B4A', fontSize: '14px' }}>
                      Rs {user.walletBalance || 0}
                    </td>

                    {/* Wins */}
                    <td style={{ padding: '14px', textAlign: 'center', fontWeight: 600, color: '#2E2A26' }}>
                      {user.totalWins || 0}
                    </td>

                    {/* Kills */}
                    <td style={{ padding: '14px', textAlign: 'center', fontWeight: 600, color: '#7B4FE0' }}>
                      {user.totalKills || 0}
                    </td>

                    {/* Played */}
                    <td style={{ padding: '14px', textAlign: 'center', fontWeight: 600, color: '#5E5851' }}>
                      {user.tournamentsPlayed || 0}
                    </td>

                    {/* Status Badge */}
                    <td style={{ padding: '14px', textAlign: 'center' }}>
                      <span style={{
                        fontSize: '11px',
                        fontWeight: 700,
                        padding: '4px 10px',
                        borderRadius: '8px',
                        background: user.isBanned ? '#FFEBEE' : '#E8F5E9',
                        color: user.isBanned ? '#D9503F' : '#3FA65C',
                      }}>
                        {user.isBanned ? 'BANNED' : 'ACTIVE'}
                      </span>
                    </td>

                    {/* Actions */}
                    <td style={{ padding: '14px', textAlign: 'center' }}>
                      <button
                        onClick={() => handleBanUser(user.id, user.isBanned)}
                        style={{
                          padding: '6px 12px',
                          borderRadius: '6px',
                          border: 'none',
                          cursor: 'pointer',
                          fontWeight: 600,
                          fontSize: '12px',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          background: user.isBanned ? '#E8F5E9' : '#FFEBEE',
                          color: user.isBanned ? '#3FA65C' : '#D9503F',
                        }}
                      >
                        {user.isBanned ? (
                          <>
                            <CheckCircle size={13} /> Unban
                          </>
                        ) : (
                          <>
                            <Ban size={13} /> Ban User
                          </>
                        )}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </AdminLayout>
  );
}
