import { useState, useEffect } from 'react';
import {
  collection,
  onSnapshot,
  doc,
  updateDoc,
  increment,
  addDoc,
  serverTimestamp,
  getDoc
} from 'firebase/firestore';
import { db } from '../firebase/config';
import {
  CheckCircle,
  XCircle,
  Clock,
  Search,
  DollarSign,
  AlertCircle,
  Eye,
  ExternalLink,
  X,
  Wallet,
  ShieldCheck,
  RefreshCw,
  Phone,
  User,
  Hash
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

export default function AdminDeposits() {
  const [deposits, setDeposits] = useState([]);
  const [filter, setFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [actionLoading, setActionLoading] = useState(null);

  // Screenshot viewer modal
  const [previewDeposit, setPreviewDeposit] = useState(null);

  // Reject modal
  const [rejectDeposit, setRejectDeposit] = useState(null);
  const [rejectReason, setRejectReason] = useState('');

  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, 'deposits'),
      (snap) => {
        const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        list.sort((a, b) => {
          const timeA = a.createdAt?.toMillis?.() || (a.createdAt ? new Date(a.createdAt).getTime() : 0);
          const timeB = b.createdAt?.toMillis?.() || (b.createdAt ? new Date(b.createdAt).getTime() : 0);
          return timeB - timeA;
        });
        setDeposits(list);
      },
      (error) => {
        console.error('Error listening to deposits:', error);
      }
    );
    return unsub;
  }, []);

  // Handle Approve
  const handleApprove = async (dep) => {
    if (!window.confirm(`Approve deposit of Rs ${dep.amount} for @${dep.username || 'User'}?`)) return;

    setActionLoading(dep.id);
    try {
      // 1. Fresh read to verify still pending
      const freshDoc = await getDoc(doc(db, 'deposits', dep.id));
      if (!freshDoc.exists()) {
        alert('Deposit request not found.');
        setActionLoading(null);
        return;
      }

      if (freshDoc.data().status !== 'pending') {
        alert('This deposit request has already been processed.');
        setActionLoading(null);
        return;
      }

      // 2. Update deposit status
      await updateDoc(doc(db, 'deposits', dep.id), {
        status: 'approved',
        processedAt: serverTimestamp(),
        processedBy: 'admin',
      });

      // 3. Credit user's wallet balance
      if (dep.userId && dep.amount) {
        await updateDoc(doc(db, 'users', dep.userId), {
          walletBalance: increment(Number(dep.amount)),
        });

        // 4. Log transaction in user's history
        await addDoc(collection(db, 'transactions', dep.userId, 'history'), {
          type: 'credit',
          amount: Number(dep.amount),
          description: `Deposit Approved (${dep.paymentMethod?.toUpperCase() || 'MANUAL'})`,
          timestamp: serverTimestamp(),
          status: 'completed',
          depositId: dep.id,
        });

        // 5. Send notification to user
        await addDoc(collection(db, 'users', dep.userId, 'notifications'), {
          type: 'deposit',
          title: 'Deposit Approved! 🎉',
          body: `Your deposit of Rs ${dep.amount} via ${dep.paymentMethod?.toUpperCase()} has been approved and added to your wallet.`,
          url: '/wallet',
          read: false,
          createdAt: serverTimestamp(),
        });
      }

      if (previewDeposit?.id === dep.id) {
        setPreviewDeposit(null);
      }
    } catch (e) {
      console.error('Error approving deposit:', e);
      alert('Failed to approve deposit: ' + (e.message || 'Unknown error'));
    } finally {
      setActionLoading(null);
    }
  };

  // Handle Reject Submit
  const handleRejectSubmit = async (e) => {
    e.preventDefault();
    if (!rejectDeposit) return;

    setActionLoading(rejectDeposit.id);
    const reason = rejectReason.trim() || 'Payment could not be verified.';

    try {
      const freshDoc = await getDoc(doc(db, 'deposits', rejectDeposit.id));
      if (!freshDoc.exists() || freshDoc.data().status !== 'pending') {
        alert('This deposit request has already been processed or deleted.');
        setRejectDeposit(null);
        setActionLoading(null);
        return;
      }

      // 1. Update deposit status
      await updateDoc(doc(db, 'deposits', rejectDeposit.id), {
        status: 'rejected',
        rejectionReason: reason,
        processedAt: serverTimestamp(),
        processedBy: 'admin',
      });

      // 2. Notify user about rejection
      if (rejectDeposit.userId) {
        await addDoc(collection(db, 'users', rejectDeposit.userId, 'notifications'), {
          type: 'deposit',
          title: 'Deposit Rejected ⚠️',
          body: `Your deposit request of Rs ${rejectDeposit.amount} was rejected. Reason: ${reason}`,
          url: '/add-funds',
          read: false,
          createdAt: serverTimestamp(),
        });
      }

      setRejectDeposit(null);
      setRejectReason('');
      if (previewDeposit?.id === rejectDeposit.id) {
        setPreviewDeposit(null);
      }
    } catch (e) {
      console.error('Error rejecting deposit:', e);
      alert('Failed to reject deposit: ' + e.message);
    } finally {
      setActionLoading(null);
    }
  };

  // Filter & Search
  const filteredDeposits = deposits.filter((d) => {
    if (filter !== 'all' && d.status !== filter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const uMatch = (d.username || '').toLowerCase().includes(q);
      const eMatch = (d.userEmail || '').toLowerCase().includes(q);
      const sMatch = (d.senderNumber || '').toLowerCase().includes(q);
      const tMatch = (d.transactionId || '').toLowerCase().includes(q);
      const aMatch = String(d.amount || '').includes(q);
      const idMatch = (d.userId || '').toLowerCase().includes(q);
      return uMatch || eMatch || sMatch || tMatch || aMatch || idMatch;
    }
    return true;
  });

  const pendingList = deposits.filter((d) => d.status === 'pending');
  const approvedList = deposits.filter((d) => d.status === 'approved');
  const rejectedList = deposits.filter((d) => d.status === 'rejected');

  const pendingAmount = pendingList.reduce((acc, d) => acc + (Number(d.amount) || 0), 0);
  const totalApprovedAmount = approvedList.reduce((acc, d) => acc + (Number(d.amount) || 0), 0);

  const formatDate = (d) => {
    const ts = d.createdAt;
    if (!ts) return 'Recent';
    const date = ts.toDate ? ts.toDate() : new Date(ts);
    if (isNaN(date.getTime())) return 'Recent';
    return date.toLocaleDateString('en-PK', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <AdminLayout
      title="Deposit Requests"
      subtitle="Verify user payment screenshots and credit wallet balances"
    >
      {/* Top Stats Banner */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '16px',
          marginBottom: '28px',
        }}
      >
        {[
          {
            label: 'Pending Deposits',
            value: pendingList.length,
            color: '#E88B00',
            bg: '#FFF8E1',
            icon: Clock,
            note: `Rs ${pendingAmount.toLocaleString()} pending`,
          },
          {
            label: 'Approved Deposits',
            value: approvedList.length,
            color: '#3FA65C',
            bg: '#E8F5E9',
            icon: CheckCircle,
            note: 'Successfully credited',
          },
          {
            label: 'Rejected Requests',
            value: rejectedList.length,
            color: '#D9503F',
            bg: '#FFEBEE',
            icon: XCircle,
            note: 'Declined verification',
          },
          {
            label: 'Total Credited',
            value: `Rs ${totalApprovedAmount.toLocaleString()}`,
            color: '#7B4FE0',
            bg: '#F3EEFF',
            icon: DollarSign,
            note: 'All time deposit revenue',
          },
        ].map((s) => {
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
              <div
                style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '10px',
                  background: s.bg,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: s.color,
                  flexShrink: 0,
                }}
              >
                <Icon size={18} />
              </div>
            </div>
          );
        })}
      </div>

      {/* Main Table Card */}
      <div style={cardStyle}>
        {/* Search & Filter Controls */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '14px',
            marginBottom: '20px',
          }}
        >
          <div style={{ position: 'relative', width: '100%', maxWidth: '380px' }}>
            <Search
              size={16}
              color="#A69E94"
              style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }}
            />
            <input
              type="text"
              placeholder="Search by user, sender phone, TID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ ...inputStyle, paddingLeft: '36px' }}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            {[
              { key: 'all', label: 'All Deposits', count: deposits.length },
              { key: 'pending', label: 'Pending', count: pendingList.length },
              { key: 'approved', label: 'Approved', count: approvedList.length },
              { key: 'rejected', label: 'Rejected', count: rejectedList.length },
            ].map((f) => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                style={{
                  padding: '8px 14px',
                  borderRadius: '8px',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  border: filter === f.key ? '1px solid #FF6B4A' : '1px solid #EBE4DA',
                  background: filter === f.key ? '#FF6B4A' : '#FFFFFF',
                  color: filter === f.key ? '#FFFFFF' : '#5E5851',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  transition: 'all 0.15s',
                }}
              >
                <span>{f.label}</span>
                <span
                  style={{
                    fontSize: '10px',
                    background: filter === f.key ? 'rgba(255,255,255,0.3)' : '#F0ECE4',
                    color: filter === f.key ? '#FFFFFF' : '#8A8078',
                    padding: '1px 6px',
                    borderRadius: '10px',
                  }}
                >
                  {f.count}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div style={{ overflowX: 'auto', width: '100%' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', minWidth: '820px' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #F0ECE4', background: '#FCFAF7' }}>
                <th style={{ textAlign: 'left', padding: '12px 14px', color: '#8A8078', fontWeight: 600, fontSize: '11px', textTransform: 'uppercase' }}>
                  User
                </th>
                <th style={{ textAlign: 'left', padding: '12px 14px', color: '#8A8078', fontWeight: 600, fontSize: '11px', textTransform: 'uppercase' }}>
                  Method
                </th>
                <th style={{ textAlign: 'left', padding: '12px 14px', color: '#8A8078', fontWeight: 600, fontSize: '11px', textTransform: 'uppercase' }}>
                  Sender Details
                </th>
                <th style={{ textAlign: 'center', padding: '12px 14px', color: '#8A8078', fontWeight: 600, fontSize: '11px', textTransform: 'uppercase' }}>
                  Amount
                </th>
                <th style={{ textAlign: 'center', padding: '12px 14px', color: '#8A8078', fontWeight: 600, fontSize: '11px', textTransform: 'uppercase' }}>
                  Proof
                </th>
                <th style={{ textAlign: 'left', padding: '12px 14px', color: '#8A8078', fontWeight: 600, fontSize: '11px', textTransform: 'uppercase' }}>
                  Date
                </th>
                <th style={{ textAlign: 'center', padding: '12px 14px', color: '#8A8078', fontWeight: 600, fontSize: '11px', textTransform: 'uppercase' }}>
                  Status
                </th>
                <th style={{ textAlign: 'center', padding: '12px 14px', color: '#8A8078', fontWeight: 600, fontSize: '11px', textTransform: 'uppercase' }}>
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredDeposits.length === 0 ? (
                <tr>
                  <td colSpan="8" style={{ textAlign: 'center', padding: '40px', color: '#8A8078' }}>
                    No deposit requests found.
                  </td>
                </tr>
              ) : (
                filteredDeposits.map((dep) => {
                  const isPending = dep.status === 'pending';
                  const isApproved = dep.status === 'approved';
                  const isRejected = dep.status === 'rejected';

                  const methodColor = dep.paymentMethod === 'jazzcash' ? '#ED1C24' : '#00A651';
                  const methodBg = dep.paymentMethod === 'jazzcash' ? '#FFF0F0' : '#F0FFF4';

                  return (
                    <tr
                      key={dep.id}
                      style={{
                        borderBottom: '1px solid #F0ECE4',
                        background: isPending ? '#FFFCF9' : 'transparent',
                        transition: 'background 0.15s',
                      }}
                    >
                      {/* User */}
                      <td style={{ padding: '14px' }}>
                        <div style={{ fontWeight: 700, color: '#2E2A26' }}>
                          @{dep.username || 'Player'}
                        </div>
                        {dep.userEmail && (
                          <div style={{ fontSize: '11px', color: '#8A8078' }}>
                            {dep.userEmail}
                          </div>
                        )}
                        <div style={{ fontSize: '10px', color: '#A69E94', fontFamily: 'monospace' }}>
                          UID: {dep.userId?.slice(0, 8)}...
                        </div>
                      </td>

                      {/* Method */}
                      <td style={{ padding: '14px' }}>
                        <span
                          style={{
                            padding: '4px 10px',
                            borderRadius: '6px',
                            fontSize: '11px',
                            fontWeight: 700,
                            background: methodBg,
                            color: methodColor,
                            textTransform: 'capitalize',
                          }}
                        >
                          {dep.paymentMethod || 'Manual'}
                        </span>
                      </td>

                      {/* Sender Details */}
                      <td style={{ padding: '14px' }}>
                        <div style={{ fontFamily: 'monospace', fontWeight: 700, color: '#2E2A26' }}>
                          {dep.senderNumber}
                        </div>
                        {dep.senderName && (
                          <div style={{ fontSize: '11px', color: '#5E5851' }}>
                            Name: {dep.senderName}
                          </div>
                        )}
                        {dep.transactionId && (
                          <div style={{ fontSize: '10px', color: '#8A8078', fontFamily: 'monospace' }}>
                            TID: {dep.transactionId}
                          </div>
                        )}
                      </td>

                      {/* Amount */}
                      <td style={{ padding: '14px', textAlign: 'center', fontWeight: 800, color: '#FF6B4A', fontSize: '15px' }}>
                        Rs {dep.amount}
                      </td>

                      {/* Proof Thumbnail */}
                      <td style={{ padding: '14px', textAlign: 'center' }}>
                        {dep.screenshotUrl ? (
                          <button
                            type="button"
                            onClick={() => setPreviewDeposit(dep)}
                            style={{
                              background: 'none',
                              border: '1px solid #EBE4DA',
                              padding: '2px',
                              borderRadius: '8px',
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              position: 'relative',
                            }}
                            title="Click to view full screenshot"
                          >
                            <img
                              src={dep.screenshotUrl}
                              alt="Proof"
                              style={{
                                width: '48px',
                                height: '48px',
                                objectFit: 'cover',
                                borderRadius: '6px',
                                display: 'block',
                              }}
                            />
                            <div
                              style={{
                                position: 'absolute',
                                inset: 0,
                                background: 'rgba(0,0,0,0.3)',
                                borderRadius: '6px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                opacity: 0.8,
                              }}
                            >
                              <Eye size={16} color="#FFFFFF" />
                            </div>
                          </button>
                        ) : (
                          <span style={{ fontSize: '11px', color: '#A69E94' }}>No image</span>
                        )}
                      </td>

                      {/* Date */}
                      <td style={{ padding: '14px', color: '#8A8078', fontSize: '12px' }}>
                        {formatDate(dep)}
                      </td>

                      {/* Status */}
                      <td style={{ padding: '14px', textAlign: 'center' }}>
                        <span
                          style={{
                            fontSize: '11px',
                            fontWeight: 700,
                            padding: '4px 10px',
                            borderRadius: '8px',
                            background: isPending ? '#FFF8E1' : isApproved ? '#E8F5E9' : '#FFEBEE',
                            color: isPending ? '#E88B00' : isApproved ? '#3FA65C' : '#D9503F',
                          }}
                        >
                          {dep.status?.toUpperCase()}
                        </span>
                        {isRejected && dep.rejectionReason && (
                          <div style={{ fontSize: '10px', color: '#D9503F', marginTop: '4px', maxWidth: '140px', margin: '4px auto 0' }}>
                            {dep.rejectionReason}
                          </div>
                        )}
                      </td>

                      {/* Actions */}
                      <td style={{ padding: '14px', textAlign: 'center' }}>
                        {isPending ? (
                          <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                            <button
                              type="button"
                              onClick={() => handleApprove(dep)}
                              disabled={actionLoading === dep.id}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                background: '#3FA65C',
                                color: '#FFFFFF',
                                border: 'none',
                                borderRadius: '6px',
                                padding: '6px 12px',
                                fontSize: '12px',
                                fontWeight: 600,
                                cursor: 'pointer',
                              }}
                            >
                              <CheckCircle size={14} />
                              Approve
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                setRejectDeposit(dep);
                                setRejectReason('');
                              }}
                              disabled={actionLoading === dep.id}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                background: '#FFFFFF',
                                color: '#D9503F',
                                border: '1px solid #D9503F',
                                borderRadius: '6px',
                                padding: '6px 12px',
                                fontSize: '12px',
                                fontWeight: 600,
                                cursor: 'pointer',
                              }}
                            >
                              <XCircle size={14} />
                              Reject
                            </button>
                          </div>
                        ) : (
                          <span style={{ fontSize: '11px', color: '#A69E94' }}>
                            Completed
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Screenshot Preview Modal */}
      {previewDeposit && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.7)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
          }}
          onClick={() => setPreviewDeposit(null)}
        >
          <div
            style={{
              background: '#FFFFFF',
              borderRadius: '16px',
              maxWidth: '650px',
              width: '100%',
              maxHeight: '90vh',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div
              style={{
                padding: '16px 20px',
                borderBottom: '1px solid #EBE4DA',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div>
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#2E2A26' }}>
                  Payment Proof — Rs {previewDeposit.amount}
                </h3>
                <div style={{ fontSize: '12px', color: '#8A8078' }}>
                  Sent by @{previewDeposit.username} via {previewDeposit.paymentMethod?.toUpperCase()}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPreviewDeposit(null)}
                style={{
                  background: '#F0ECE4',
                  border: 'none',
                  borderRadius: '50%',
                  width: '32px',
                  height: '32px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <X size={18} color="#2E2A26" />
              </button>
            </div>

            {/* Modal Image Area */}
            <div
              style={{
                padding: '20px',
                overflowY: 'auto',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                background: '#F8F6F1',
              }}
            >
              <img
                src={previewDeposit.screenshotUrl}
                alt="Payment Screenshot"
                style={{
                  maxWidth: '100%',
                  maxHeight: '55vh',
                  objectFit: 'contain',
                  borderRadius: '8px',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                }}
              />
            </div>

            {/* Modal Footer with details & action */}
            <div
              style={{
                padding: '16px 20px',
                borderTop: '1px solid #EBE4DA',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '12px',
                background: '#FFFFFF',
              }}
            >
              <div style={{ fontSize: '12px', color: '#5E5851' }}>
                <div><strong>Sender Phone:</strong> {previewDeposit.senderNumber}</div>
                {previewDeposit.transactionId && <div><strong>TID:</strong> {previewDeposit.transactionId}</div>}
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <a
                  href={previewDeposit.screenshotUrl}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    background: '#F0ECE4',
                    color: '#2E2A26',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    textDecoration: 'none',
                    fontSize: '12px',
                    fontWeight: 600,
                  }}
                >
                  <ExternalLink size={14} /> Full Resolution
                </a>

                {previewDeposit.status === 'pending' && (
                  <>
                    <button
                      type="button"
                      onClick={() => handleApprove(previewDeposit)}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        background: '#3FA65C',
                        color: '#FFFFFF',
                        border: 'none',
                        borderRadius: '8px',
                        padding: '8px 16px',
                        fontSize: '12px',
                        fontWeight: 700,
                        cursor: 'pointer',
                      }}
                    >
                      <CheckCircle size={14} /> Approve Rs {previewDeposit.amount}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setRejectDeposit(previewDeposit);
                        setRejectReason('');
                      }}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        background: '#D9503F',
                        color: '#FFFFFF',
                        border: 'none',
                        borderRadius: '8px',
                        padding: '8px 16px',
                        fontSize: '12px',
                        fontWeight: 700,
                        cursor: 'pointer',
                      }}
                    >
                      <XCircle size={14} /> Reject
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {rejectDeposit && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.6)',
            zIndex: 10000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
          }}
          onClick={() => setRejectDeposit(null)}
        >
          <div
            style={{
              background: '#FFFFFF',
              borderRadius: '16px',
              maxWidth: '440px',
              width: '100%',
              padding: '24px',
              boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ margin: '0 0 8px 0', fontSize: '18px', fontWeight: 700, color: '#D9503F' }}>
              Reject Deposit Request
            </h3>
            <p style={{ fontSize: '13px', color: '#8A8078', margin: '0 0 16px 0' }}>
              Please provide a reason so the user knows why their deposit of Rs {rejectDeposit.amount} was rejected.
            </p>

            <form onSubmit={handleRejectSubmit}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '14px' }}>
                {[
                  'Payment screenshot is blurry / illegible',
                  'Amount not received in account',
                  'Invalid TID or fake receipt',
                  'Incorrect account transferred to',
                ].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setRejectReason(preset)}
                    style={{
                      textAlign: 'left',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      border: rejectReason === preset ? '1px solid #D9503F' : '1px solid #EBE4DA',
                      background: rejectReason === preset ? '#FFEBEE' : '#FAFAF8',
                      color: '#2E2A26',
                      fontSize: '12px',
                      cursor: 'pointer',
                    }}
                  >
                    {preset}
                  </button>
                ))}
              </div>

              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Or type custom reason..."
                rows={3}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '8px',
                  border: '1px solid #D9D3CC',
                  fontSize: '13px',
                  boxSizing: 'border-box',
                  outline: 'none',
                  marginBottom: '18px',
                }}
                required
              />

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setRejectDeposit(null)}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '8px',
                    border: '1px solid #EBE4DA',
                    background: '#FFFFFF',
                    color: '#5E5851',
                    fontSize: '13px',
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading === rejectDeposit.id}
                  style={{
                    padding: '8px 18px',
                    borderRadius: '8px',
                    border: 'none',
                    background: '#D9503F',
                    color: '#FFFFFF',
                    fontSize: '13px',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  Confirm Reject
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
