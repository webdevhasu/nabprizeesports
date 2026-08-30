import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { db } from '../firebase/config';
import { collection, query, onSnapshot, orderBy, doc, updateDoc, increment, addDoc, serverTimestamp } from 'firebase/firestore';
import {
  Users,
  Trophy,
  DollarSign,
  Gamepad2,
  ChevronRight,
  TrendingUp,
  AlertCircle,
  Calendar,
  Plus,
  CheckCircle2,
  XCircle,
  Clock,
  ArrowUpRight
} from 'lucide-react';
import AdminLayout from './AdminLayout';

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [tournaments, setTournaments] = useState([]);
  const [users, setUsers] = useState([]);
  const [withdrawals, setWithdrawals] = useState([]);

  useEffect(() => {
    const unsubTournaments = onSnapshot(
      query(collection(db, 'tournaments'), orderBy('createdAt', 'desc')),
      (snap) => setTournaments(snap.docs.map(d => ({ id: d.id, ...d.data() }))),
      () => {}
    );
    const unsubUsers = onSnapshot(
      query(collection(db, 'users')),
      (snap) => setUsers(snap.docs.map(d => ({ id: d.id, ...d.data() }))),
      () => {}
    );
    const unsubWithdrawals = onSnapshot(
      collection(db, 'withdrawals'),
      (snap) => {
        const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        list.sort((a, b) => {
          const timeA = a.createdAt?.toMillis?.() || a.requestedAt?.toMillis?.() || (a.createdAt ? new Date(a.createdAt).getTime() : 0) || (a.requestedAt ? new Date(a.requestedAt).getTime() : 0);
          const timeB = b.createdAt?.toMillis?.() || b.requestedAt?.toMillis?.() || (b.createdAt ? new Date(b.createdAt).getTime() : 0) || (b.requestedAt ? new Date(b.requestedAt).getTime() : 0);
          return timeB - timeA;
        });
        setWithdrawals(list);
      },
      () => {}
    );
    return () => { unsubTournaments(); unsubUsers(); unsubWithdrawals(); };
  }, []);

  const handleWithdrawalAction = async (w, status) => {
    try {
      await updateDoc(doc(db, 'withdrawals', w.id), {
        status,
        processedAt: new Date(),
      });

      if (status === 'rejected' && w.userId && w.amount) {
        await updateDoc(doc(db, 'users', w.userId), {
          walletBalance: increment(Number(w.amount)),
        });
        await addDoc(collection(db, 'transactions', w.userId, 'history'), {
          type: 'credit',
          amount: Number(w.amount),
          description: `Refund: Rejected Withdrawal (${w.method?.toUpperCase() || 'PAYOUT'})`,
          timestamp: serverTimestamp(),
          status: 'completed',
        });
      }
    } catch (e) {
      console.error('Error updating withdrawal:', e);
    }
  };

  const totalPlayers = users.length;
  const totalTournaments = tournaments.length;
  const liveTournaments = tournaments.filter(t => t.status === 'live').length;
  const upcomingTournaments = tournaments.filter(t => t.status === 'upcoming').length;
  const pendingWithdrawals = withdrawals.filter(w => w.status === 'pending').length;
  const totalRevenue = tournaments.reduce((sum, t) => sum + ((t.registrationCharge || 0) * (t.slotsFilled || 0)), 0);

  const stats = [
    { label: 'Total Players', value: totalPlayers, sub: 'Registered users', color: '#FF6B4A', bg: '#FFF0EC', icon: Users },
    { label: 'Tournaments', value: totalTournaments, sub: 'All time', color: '#7B4FE0', bg: '#F3EEFF', icon: Trophy },
    { label: 'Live Matches', value: liveTournaments, sub: 'Currently active', color: '#3FA65C', bg: '#E8F5E9', icon: Gamepad2 },
    { label: 'Upcoming', value: upcomingTournaments, sub: 'Open for registration', color: '#E88B00', bg: '#FFF6E5', icon: Calendar },
    { label: 'Pending Payouts', value: pendingWithdrawals, sub: 'Needs approval', color: '#D9503F', bg: '#FFEBEE', icon: AlertCircle },
    { label: 'Gross Revenue', value: `Rs ${totalRevenue.toLocaleString()}`, sub: 'From registrations', color: '#2B8A3E', bg: '#EBFBEE', icon: TrendingUp },
  ];

  return (
    <AdminLayout
      title="Admin Dashboard"
      subtitle="Overview of tournaments, registrations, player activity, and finances"
      actions={
        <Link
          to="/admin/tournaments"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            background: '#FF6B4A',
            color: '#FFFFFF',
            padding: '8px 16px',
            borderRadius: '8px',
            textDecoration: 'none',
            fontSize: '13px',
            fontWeight: 600,
            boxShadow: '0 2px 6px rgba(255, 107, 74, 0.25)',
          }}
        >
          <Plus size={16} /> New Tournament
        </Link>
      }
    >
      {/* Top Stats Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
        gap: '16px',
        marginBottom: '28px',
      }}>
        {stats.map((s) => {
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
                transition: 'transform 0.15s ease, box-shadow 0.15s ease',
              }}
            >
              <div>
                <div style={{ fontSize: '12px', color: '#8A8078', fontWeight: 600, marginBottom: '6px' }}>
                  {s.label}
                </div>
                <div style={{ fontWeight: 800, fontSize: '24px', color: s.color, lineHeight: 1.1, marginBottom: '4px' }}>
                  {s.value}
                </div>
                <div style={{ fontSize: '11px', color: '#A69E94' }}>{s.sub}</div>
              </div>
              <div style={{
                width: '42px',
                height: '42px',
                borderRadius: '10px',
                background: s.bg,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: s.color,
                flexShrink: 0,
              }}>
                <Icon size={20} />
              </div>
            </div>
          );
        })}
      </div>

      {/* Main Grid: Left Quick Actions / Summary & Right Tournaments / Withdrawals */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
        gap: '24px',
        alignItems: 'start',
      }}>
        
        {/* Left Column: Quick Navigation Hub */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          <div style={{
            background: '#FFFFFF',
            borderRadius: '14px',
            padding: '22px',
            border: '1px solid #EBE4DA',
            boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <h3 style={{ fontWeight: 700, fontSize: '16px', color: '#2E2A26', margin: 0 }}>
                Control Center
              </h3>
              <span style={{ fontSize: '12px', color: '#8A8078' }}>Quick Access</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {[
                { label: 'Create & Manage Tournaments', desc: 'Schedule matches, edit details, set rewards', to: '/admin/tournaments', color: '#FF6B4A', bg: '#FFF0EC', icon: Trophy },
                { label: 'Declare Match Results', desc: 'Input kills, distribute prize pool, set winners', to: '/admin/match-results', color: '#7B4FE0', bg: '#F3EEFF', icon: Gamepad2 },
                { label: 'Process Withdrawals', desc: 'Approve or reject JazzCash/EasyPaisa payouts', to: '/admin/withdrawals', color: '#3FA65C', bg: '#E8F5E9', icon: DollarSign, badge: pendingWithdrawals },
                { label: 'User & Player Management', desc: 'Inspect players, balances, match stats, ban/unban', to: '/admin/users', color: '#E88B00', bg: '#FFF6E5', icon: Users },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '14px',
                      padding: '14px 16px',
                      borderRadius: '12px',
                      textDecoration: 'none',
                      color: '#2E2A26',
                      border: '1px solid #F0ECE4',
                      background: '#FAF8F5',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <div style={{
                      width: '42px',
                      height: '42px',
                      borderRadius: '10px',
                      background: item.bg,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: item.color,
                      flexShrink: 0,
                    }}>
                      <Icon size={20} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {item.label}
                        {item.badge > 0 && (
                          <span style={{
                            background: '#D9503F',
                            color: '#FFF',
                            fontSize: '10px',
                            fontWeight: 700,
                            padding: '1px 6px',
                            borderRadius: '10px',
                          }}>
                            {item.badge}
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: '11px', color: '#8A8078', marginTop: '2px' }}>{item.desc}</div>
                    </div>
                    <ArrowUpRight size={16} color="#A69E94" />
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Quick Platform Tips */}
          <div style={{
            background: 'linear-gradient(135deg, #FFF6E5 0%, #FFF0EC 100%)',
            borderRadius: '14px',
            padding: '20px',
            border: '1px solid #FFE4D3',
          }}>
            <div style={{ fontWeight: 700, fontSize: '14px', color: '#2E2A26', marginBottom: '6px' }}>
              ⚡ Admin Pro-Tip
            </div>
            <p style={{ fontSize: '12px', color: '#6A6258', margin: 0, lineHeight: 1.5 }}>
              When a tournament ends, switch its status to <strong>Live</strong> or <strong>Completed</strong> and navigate to <strong>Match Results</strong> to declare winners. Player wallet balances update automatically upon submission.
            </p>
          </div>
        </div>

        {/* Right Column: Tournaments & Pending Withdrawals */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* Active / Recent Tournaments */}
          <div style={{
            background: '#FFFFFF',
            borderRadius: '14px',
            padding: '22px',
            border: '1px solid #EBE4DA',
            boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div>
                <h3 style={{ fontWeight: 700, fontSize: '16px', color: '#2E2A26', margin: 0 }}>
                  Recent Tournaments
                </h3>
                <p style={{ fontSize: '11px', color: '#8A8078', margin: '2px 0 0' }}>Latest match listings</p>
              </div>
              <Link to="/admin/tournaments" style={{ fontSize: '12px', color: '#FF6B4A', textDecoration: 'none', fontWeight: 600 }}>
                View All ({tournaments.length}) →
              </Link>
            </div>

            {tournaments.length === 0 ? (
              <p style={{ color: '#8A8078', fontSize: '13px', textAlign: 'center', padding: '30px 0' }}>No tournaments created yet</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {tournaments.slice(0, 4).map((t) => (
                  <div
                    key={t.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      padding: '12px',
                      borderRadius: '10px',
                      background: '#FAF8F5',
                      border: '1px solid #F0ECE4',
                    }}
                  >
                    <div style={{
                      width: '38px',
                      height: '38px',
                      borderRadius: '8px',
                      background: t.status === 'live' ? '#E8F5E9' : t.status === 'upcoming' ? '#FFF8E1' : '#F0ECE4',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: t.status === 'live' ? '#3FA65C' : t.status === 'upcoming' ? '#E88B00' : '#8A8078',
                      flexShrink: 0,
                    }}>
                      <Trophy size={18} />
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: '13px', color: '#2E2A26', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {t.name}
                      </div>
                      <div style={{ fontSize: '11px', color: '#8A8078', marginTop: '2px' }}>
                        {t.game === 'pubg' ? 'PUBG' : 'Free Fire'} • {t.matchType} • Slots: {t.slotsFilled || 0}/{t.maxSlots}
                      </div>
                    </div>

                    <div style={{ textAlign: 'right' }}>
                      <span style={{
                        fontSize: '10px',
                        fontWeight: 700,
                        padding: '3px 8px',
                        borderRadius: '6px',
                        display: 'inline-block',
                        background: t.status === 'live' ? '#E8F5E9' : t.status === 'upcoming' ? '#FFF8E1' : '#F0ECE4',
                        color: t.status === 'live' ? '#3FA65C' : t.status === 'upcoming' ? '#E88B00' : '#8A8078',
                      }}>
                        {t.status?.toUpperCase()}
                      </span>
                      <div style={{ fontSize: '11px', fontWeight: 600, color: '#FF6B4A', marginTop: '4px' }}>
                        Rs {t.fixedReward}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Pending Withdrawals Card */}
          <div style={{
            background: '#FFFFFF',
            borderRadius: '14px',
            padding: '22px',
            border: '1px solid #EBE4DA',
            boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div>
                <h3 style={{ fontWeight: 700, fontSize: '16px', color: '#2E2A26', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  Pending Payouts
                  {pendingWithdrawals > 0 && (
                    <span style={{ fontSize: '11px', background: '#D9503F', color: '#FFF', padding: '2px 8px', borderRadius: '12px', fontWeight: 700 }}>
                      {pendingWithdrawals}
                    </span>
                  )}
                </h3>
                <p style={{ fontSize: '11px', color: '#8A8078', margin: '2px 0 0' }}>Requires instant review</p>
              </div>
              <Link to="/admin/withdrawals" style={{ fontSize: '12px', color: '#FF6B4A', textDecoration: 'none', fontWeight: 600 }}>
                Manage All →
              </Link>
            </div>

            {pendingWithdrawals === 0 ? (
              <div style={{ textAlign: 'center', padding: '30px 0', color: '#3FA65C' }}>
                <CheckCircle2 size={32} style={{ margin: '0 auto 8px', display: 'block', opacity: 0.8 }} />
                <div style={{ fontWeight: 600, fontSize: '13px' }}>All payouts clear!</div>
                <div style={{ fontSize: '11px', color: '#8A8078' }}>No pending withdrawal requests.</div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {withdrawals.filter(w => w.status === 'pending').slice(0, 3).map((w) => (
                  <div
                    key={w.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '12px',
                      borderRadius: '10px',
                      background: '#FFF9F5',
                      border: '1px solid #FFE4D3',
                      gap: '12px',
                    }}
                  >
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ fontWeight: 700, fontSize: '13px', color: '#2E2A26' }}>
                        @{w.username || 'Player'}
                      </div>
                      <div style={{ fontSize: '11px', color: '#8A8078', marginTop: '2px' }}>
                        {w.method} • {w.accountNumber}
                      </div>
                    </div>

                    <div style={{ fontWeight: 800, fontSize: '15px', color: '#FF6B4A', whiteSpace: 'nowrap' }}>
                      Rs {w.amount}
                    </div>

                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button
                        onClick={() => handleWithdrawalAction(w, 'approved')}
                        title="Approve"
                        style={{
                          background: '#3FA65C',
                          color: '#FFFFFF',
                          border: 'none',
                          borderRadius: '6px',
                          padding: '6px 10px',
                          fontSize: '11px',
                          fontWeight: 600,
                          cursor: 'pointer',
                        }}
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => handleWithdrawalAction(w, 'rejected')}
                        title="Reject"
                        style={{
                          background: '#F0ECE4',
                          color: '#D9503F',
                          border: 'none',
                          borderRadius: '6px',
                          padding: '6px 10px',
                          fontSize: '11px',
                          fontWeight: 600,
                          cursor: 'pointer',
                        }}
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
