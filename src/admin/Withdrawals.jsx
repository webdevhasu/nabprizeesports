import { useState, useEffect } from 'react';
import { collection, onSnapshot, doc, updateDoc, increment, addDoc, serverTimestamp, getDoc, runTransaction } from 'firebase/firestore';
import { db } from '../firebase/config';
import {
  CheckCircle,
  XCircle,
  Clock,
  Search,
  DollarSign,
  AlertCircle,
  Filter,
  ArrowDownRight,
  ShieldCheck
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

export default function Withdrawals() {
  const [withdrawals, setWithdrawals] = useState([]);
  const [filter, setFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [actionLoading, setActionLoading] = useState(null);

  useEffect(() => {
    // Listen to withdrawals collection directly without orderBy constraint so docs with requestedAt / createdAt are never dropped
    const unsub = onSnapshot(
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
      (error) => {
        console.error('Error listening to withdrawals:', error);
      }
    );
    return unsub;
  }, []);

  const handleAction = async (w, status) => {
    setActionLoading(w.id);
    try {
      await runTransaction(db, async (transaction) => {
        // Fresh Firestore read to prevent double processing
        const withdrawRef = doc(db, 'withdrawals', w.id);
        const freshDoc = await transaction.get(withdrawRef);
        if (!freshDoc.exists()) {
          throw new Error('Withdrawal not found');
        }
        
        const freshData = freshDoc.data();
        if (freshData.status !== 'pending') {
          throw new Error('This withdrawal has already been processed.');
        }

        transaction.update(withdrawRef, {
          status,
          processedAt: serverTimestamp(),
        });

        // If rejected, refund money back to user wallet and log transaction
        if (status === 'rejected' && w.userId && w.amount) {
          const userRef = doc(db, 'users', w.userId);
          transaction.update(userRef, {
            walletBalance: increment(Number(w.amount)),
          });
          
          const txnRef = doc(collection(db, 'transactions', w.userId, 'history'));
          transaction.set(txnRef, {
            type: 'credit',
            amount: Number(w.amount),
            description: `Refund: Rejected Withdrawal (${w.method?.toUpperCase() || 'PAYOUT'})`,
            timestamp: serverTimestamp(),
            status: 'completed',
          });
        }
      });
    } catch (e) {
      console.error('Error updating status:', e);
      alert('Error updating withdrawal status');
    }
    setActionLoading(null);
  };

  const pendingCount = withdrawals.filter(w => w.status === 'pending').length;
  const approvedCount = withdrawals.filter(w => w.status === 'approved').length;
  const rejectedCount = withdrawals.filter(w => w.status === 'rejected').length;
  const totalAmount = withdrawals
    .filter(w => w.status === 'approved')
    .reduce((sum, w) => sum + (Number(w.amount) || 0), 0);

  const filteredWithdrawals = withdrawals.filter(w => {
    const matchesFilter = filter === 'all' || w.status === filter;
    const matchesSearch = !searchQuery ||
      w.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      w.accountNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      w.method?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      w.amount?.toString().includes(searchQuery);
    return matchesFilter && matchesSearch;
  });

  const formatDate = (w) => {
    const timestamp = w.createdAt || w.requestedAt;
    if (!timestamp) return 'Recent';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    if (isNaN(date.getTime())) return 'Recent';
    return date.toLocaleDateString('en-PK', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <AdminLayout
      title="Withdrawals & Payouts"
      subtitle="Review, approve, or reject user balance cashouts via JazzCash & EasyPaisa"
    >
      {/* Top Stats Banner */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '16px',
        marginBottom: '28px',
      }}>
        {[
          { label: 'Pending Requests', value: pendingCount, color: '#E88B00', bg: '#FFF8E1', icon: Clock, note: 'Requires action' },
          { label: 'Approved Payouts', value: approvedCount, color: '#3FA65C', bg: '#E8F5E9', icon: CheckCircle, note: 'Successfully cleared' },
          { label: 'Rejected Requests', value: rejectedCount, color: '#D9503F', bg: '#FFEBEE', icon: XCircle, note: 'Refunded to wallet' },
          { label: 'Total Approved', value: `Rs ${totalAmount.toLocaleString()}`, color: '#7B4FE0', bg: '#F3EEFF', icon: DollarSign, note: 'Sum of approved' },
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
        
        {/* Search & Filter Controls */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '14px',
          marginBottom: '20px',
        }}>
          <div style={{ position: 'relative', width: '100%', maxWidth: '380px' }}>
            <Search size={16} color="#A69E94" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
            <input
              type="text"
              placeholder="Search by username, account number, method..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              style={{ ...inputStyle, paddingLeft: '36px' }}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            {[
              { key: 'all', label: 'All Requests', count: withdrawals.length },
              { key: 'pending', label: 'Pending', count: pendingCount },
              { key: 'approved', label: 'Approved', count: approvedCount },
              { key: 'rejected', label: 'Rejected', count: rejectedCount },
            ].map(f => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                style={{
                  padding: '6px 14px',
                  borderRadius: '20px',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  border: filter === f.key ? '1px solid #FF6B4A' : '1px solid #E8E2DA',
                  background: filter === f.key ? '#FF6B4A' : '#FFFFFF',
                  color: filter === f.key ? '#FFFFFF' : '#8A8078',
                  transition: 'all 0.15s ease',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <span>{f.label}</span>
                <span style={{
                  fontSize: '10px',
                  background: filter === f.key ? 'rgba(255,255,255,0.3)' : '#F0ECE4',
                  color: filter === f.key ? '#FFFFFF' : '#8A8078',
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
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', minWidth: '780px' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #F0ECE4', background: '#FCFAF7' }}>
                <th style={{ textAlign: 'left', padding: '12px 14px', color: '#8A8078', fontWeight: 600, fontSize: '11px', textTransform: 'uppercase' }}>User / Account</th>
                <th style={{ textAlign: 'left', padding: '12px 14px', color: '#8A8078', fontWeight: 600, fontSize: '11px', textTransform: 'uppercase' }}>Payout Method</th>
                <th style={{ textAlign: 'left', padding: '12px 14px', color: '#8A8078', fontWeight: 600, fontSize: '11px', textTransform: 'uppercase' }}>Account / Phone Number</th>
                <th style={{ textAlign: 'center', padding: '12px 14px', color: '#8A8078', fontWeight: 600, fontSize: '11px', textTransform: 'uppercase' }}>Amount</th>
                <th style={{ textAlign: 'left', padding: '12px 14px', color: '#8A8078', fontWeight: 600, fontSize: '11px', textTransform: 'uppercase' }}>Requested Date</th>
                <th style={{ textAlign: 'center', padding: '12px 14px', color: '#8A8078', fontWeight: 600, fontSize: '11px', textTransform: 'uppercase' }}>Status</th>
                <th style={{ textAlign: 'center', padding: '12px 14px', color: '#8A8078', fontWeight: 600, fontSize: '11px', textTransform: 'uppercase' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredWithdrawals.length === 0 ? (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', padding: '40px', color: '#8A8078' }}>
                    No withdrawal requests found matching your filter.
                  </td>
                </tr>
              ) : (
                filteredWithdrawals.map(w => (
                  <tr
                    key={w.id}
                    style={{
                      borderBottom: '1px solid #F0ECE4',
                      transition: 'background 0.15s ease',
                      background: w.status === 'pending' ? '#FFFCF9' : 'transparent',
                    }}
                  >
                    <td style={{ padding: '14px' }}>
                      <div style={{ fontWeight: 700, color: '#2E2A26' }}>
                        @{w.username || 'User'}
                      </div>
                      <div style={{ fontSize: '10px', color: '#A69E94', fontFamily: 'monospace' }}>
                        UID: {w.userId?.slice(0, 10)}...
                      </div>
                    </td>

                    <td style={{ padding: '14px' }}>
                      <span style={{
                        padding: '4px 10px',
                        borderRadius: '6px',
                        fontSize: '11px',
                        fontWeight: 700,
                        background: w.method?.toLowerCase().includes('jazz') ? '#FFF0EC' : '#E8F5E9',
                        color: w.method?.toLowerCase().includes('jazz') ? '#FF6B4A' : '#3FA65C',
                      }}>
                        {w.method}
                      </span>
                    </td>

                    <td style={{ padding: '14px', fontFamily: 'monospace', fontWeight: 600, color: '#2E2A26' }}>
                      {w.accountNumber}
                    </td>

                    <td style={{ padding: '14px', textAlign: 'center', fontWeight: 800, color: '#FF6B4A', fontSize: '15px' }}>
                      Rs {w.amount}
                    </td>

                    <td style={{ padding: '14px', color: '#8A8078', fontSize: '12px' }}>
                      {formatDate(w)}
                    </td>

                    <td style={{ padding: '14px', textAlign: 'center' }}>
                      <span style={{
                        fontSize: '11px',
                        fontWeight: 700,
                        padding: '4px 10px',
                        borderRadius: '8px',
                        background: w.status === 'pending' ? '#FFF8E1' : w.status === 'approved' ? '#E8F5E9' : '#FFEBEE',
                        color: w.status === 'pending' ? '#E88B00' : w.status === 'approved' ? '#3FA65C' : '#D9503F',
                      }}>
                        {w.status?.toUpperCase()}
                      </span>
                    </td>

                    <td style={{ padding: '14px', textAlign: 'center' }}>
                      {w.status === 'pending' ? (
                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                          <button
                            onClick={() => handleAction(w, 'approved')}
                            disabled={actionLoading === w.id}
                            style={{
                              padding: '6px 12px',
                              background: '#3FA65C',
                              color: '#FFFFFF',
                              border: 'none',
                              borderRadius: '6px',
                              fontSize: '12px',
                              fontWeight: 600,
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                            }}
                          >
                            <CheckCircle size={13} /> Approve
                          </button>

                          <button
                            onClick={() => handleAction(w, 'rejected')}
                            disabled={actionLoading === w.id}
                            style={{
                              padding: '6px 12px',
                              background: '#F0ECE4',
                              color: '#D9503F',
                              border: 'none',
                              borderRadius: '6px',
                              fontSize: '12px',
                              fontWeight: 600,
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                            }}
                          >
                            <XCircle size={13} /> Reject
                          </button>
                        </div>
                      ) : (
                        <span style={{ fontSize: '11px', color: '#A69E94' }}>
                          Processed
                        </span>
                      )}
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
