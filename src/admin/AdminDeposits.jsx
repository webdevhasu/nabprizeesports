import { useState, useEffect } from 'react';
import {
  collection,
  onSnapshot,
  doc,
  updateDoc,
  increment,
  addDoc,
  serverTimestamp,
  getDoc,
  deleteDoc
} from 'firebase/firestore';
import { ref, deleteObject } from 'firebase/storage';
import { db, storage } from '../firebase/config';
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
  Hash,
  Copy,
  Check,
  Gamepad2,
  Trophy,
  Flame,
  Mail,
  ShieldAlert,
  Trash2
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
  const [usersMap, setUsersMap] = useState({});
  const [filter, setFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [actionLoading, setActionLoading] = useState(null);

  // Copied state tracking
  const [copiedId, setCopiedId] = useState(null);

  // Screenshot & Details viewer modal
  const [previewDeposit, setPreviewDeposit] = useState(null);

  // Reject modal
  const [rejectDeposit, setRejectDeposit] = useState(null);
  const [rejectReason, setRejectReason] = useState('');

  const handleCopy = (text, id) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Real-time deposits listener
  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, 'deposits'),
      (snap) => {
        const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        list.sort((a, b) => {
          const timeA = a.createdAt?.toMillis?.() || (a.createdAt ? new Date(a.createdAt).getTime() : Date.now());
          const timeB = b.createdAt?.toMillis?.() || (b.createdAt ? new Date(b.createdAt).getTime() : Date.now());
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

  // Real-time users map listener (to fetch live game IDs, balances, stats)
  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, 'users'),
      (snap) => {
        const map = {};
        snap.forEach((d) => {
          map[d.id] = { id: d.id, ...d.data() };
        });
        setUsersMap(map);
      },
      (err) => console.error('Error listening to users in AdminDeposits:', err)
    );
    return unsub;
  }, []);

  // Helper to extract full user info
  const getUserDetails = (dep) => {
    const u = usersMap[dep.userId] || {};
    const games = u.games || dep.games || [];
    const pubg = games.find((g) => g.game === 'pubg') || (u.pubgId ? { ign: u.pubgIgn, uid: u.pubgId } : null);
    const ff = games.find((g) => g.game === 'freefire') || (u.ffId ? { ign: u.ffIgn, uid: u.ffId } : null);

    return {
      fullName: u.fullName || dep.fullName || '',
      username: u.username || dep.username || 'Player',
      email: u.email || dep.userEmail || '',
      walletBalance: u.walletBalance ?? 0,
      totalWins: u.totalWins ?? 0,
      totalKills: u.totalKills ?? 0,
      tournamentsPlayed: u.tournamentsPlayed ?? 0,
      pubg,
      ff,
      isBanned: !!u.isBanned,
    };
  };

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

  // Delete Single Deposit & Remove Screenshot from Storage
  const handleDelete = async (dep) => {
    if (!window.confirm(`Delete deposit record of Rs ${dep.amount} (@${dep.username}) and permanently delete its screenshot from Firebase Storage?`)) {
      return;
    }

    setActionLoading(dep.id);
    try {
      // 1. Delete image from Firebase Storage if storagePath exists
      if (dep.storagePath) {
        try {
          const imageRef = ref(storage, dep.storagePath);
          await deleteObject(imageRef);
        } catch (storageErr) {
          console.warn('Storage delete warning:', storageErr);
        }
      }

      // 2. Delete Firestore document
      await deleteDoc(doc(db, 'deposits', dep.id));

      if (previewDeposit?.id === dep.id) {
        setPreviewDeposit(null);
      }
    } catch (e) {
      console.error('Error deleting deposit:', e);
      alert('Failed to delete deposit: ' + (e.message || 'Unknown error'));
    } finally {
      setActionLoading(null);
    }
  };

  // Batch delete all approved deposits and screenshots to clean up storage
  const handleDeleteAllApproved = async () => {
    if (approvedList.length === 0) {
      alert('No approved deposit records to delete.');
      return;
    }

    if (!window.confirm(`Are you sure you want to delete ALL ${approvedList.length} approved deposit records and permanently delete their screenshots from Firebase Storage? This will free up your storage space.`)) {
      return;
    }

    setActionLoading('batch');
    let deletedCount = 0;
    try {
      for (const dep of approvedList) {
        if (dep.storagePath) {
          try {
            await deleteObject(ref(storage, dep.storagePath));
          } catch (_) {}
        }
        await deleteDoc(doc(db, 'deposits', dep.id));
        deletedCount++;
      }
      alert(`Cleaned up ${deletedCount} approved deposit records and their screenshots from Storage!`);
    } catch (err) {
      console.error('Batch delete error:', err);
      alert('Error during batch delete: ' + err.message);
    } finally {
      setActionLoading(null);
    }
  };

  // Filter & Search (supports user name, email, game UID, IGN, TID, phone)
  const filteredDeposits = deposits.filter((d) => {
    if (filter !== 'all' && d.status !== filter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const u = getUserDetails(d);

      const uMatch = (d.username || '').toLowerCase().includes(q) || u.username.toLowerCase().includes(q);
      const nameMatch = u.fullName.toLowerCase().includes(q);
      const eMatch = (d.userEmail || '').toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
      const sMatch = (d.senderNumber || '').toLowerCase().includes(q);
      const sNameMatch = (d.senderName || '').toLowerCase().includes(q);
      const tMatch = (d.transactionId || '').toLowerCase().includes(q);
      const aMatch = String(d.amount || '').includes(q);
      const idMatch = (d.userId || '').toLowerCase().includes(q);
      const pubgMatch = (u.pubg?.ign || '').toLowerCase().includes(q) || (u.pubg?.uid || '').toLowerCase().includes(q);
      const ffMatch = (u.ff?.ign || '').toLowerCase().includes(q) || (u.ff?.uid || '').toLowerCase().includes(q);

      return uMatch || nameMatch || eMatch || sMatch || sNameMatch || tMatch || aMatch || idMatch || pubgMatch || ffMatch;
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
      subtitle="Review player deposit screenshots, inspect game IDs, and credit balances"
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
          <div style={{ position: 'relative', width: '100%', maxWidth: '420px' }}>
            <Search
              size={16}
              color="#A69E94"
              style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }}
            />
            <input
              type="text"
              placeholder="Search by user, game UID, IGN, phone, TID..."
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

            {approvedList.length > 0 && (
              <button
                type="button"
                onClick={handleDeleteAllApproved}
                disabled={actionLoading === 'batch'}
                style={{
                  padding: '8px 14px',
                  borderRadius: '8px',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: actionLoading === 'batch' ? 'not-allowed' : 'pointer',
                  border: '1px solid #FFD1D1',
                  background: '#FFF5F5',
                  color: '#D9503F',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  transition: 'all 0.15s',
                }}
                title="Delete all approved deposit records and permanently delete their screenshots to free up Firebase Storage"
              >
                <Trash2 size={13} />
                <span>Clean Up Approved ({approvedList.length})</span>
              </button>
            )}
          </div>
        </div>

        {/* Table */}
        <div style={{ overflowX: 'auto', width: '100%' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', minWidth: '950px' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #F0ECE4', background: '#FCFAF7' }}>
                <th style={{ textAlign: 'left', padding: '12px 14px', color: '#8A8078', fontWeight: 600, fontSize: '11px', textTransform: 'uppercase' }}>
                  Player & Identity
                </th>
                <th style={{ textAlign: 'left', padding: '12px 14px', color: '#8A8078', fontWeight: 600, fontSize: '11px', textTransform: 'uppercase' }}>
                  Game IDs & Names
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
                  <td colSpan="9" style={{ textAlign: 'center', padding: '40px', color: '#8A8078' }}>
                    No deposit requests found.
                  </td>
                </tr>
              ) : (
                filteredDeposits.map((dep) => {
                  const isPending = dep.status === 'pending';
                  const isApproved = dep.status === 'approved';
                  const isRejected = dep.status === 'rejected';

                  const u = getUserDetails(dep);
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
                      {/* Player & Identity */}
                      <td style={{ padding: '14px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ fontWeight: 800, color: '#2E2A26', fontSize: '14px' }}>
                            @{u.username}
                          </span>
                          {u.isBanned && (
                            <span style={{ background: '#FFEBEE', color: '#D9503F', fontSize: '10px', fontWeight: 700, padding: '1px 5px', borderRadius: '4px' }}>
                              BANNED
                            </span>
                          )}
                        </div>

                        {u.fullName && (
                          <div style={{ fontSize: '12px', color: '#5E5851', fontWeight: 600, marginTop: '2px' }}>
                            {u.fullName}
                          </div>
                        )}

                        {u.email && (
                          <div style={{ fontSize: '11px', color: '#8A8078' }}>
                            {u.email}
                          </div>
                        )}

                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                          <span style={{ fontSize: '11px', color: '#10B981', fontWeight: 700, background: '#ECFDF5', padding: '1px 6px', borderRadius: '4px' }}>
                            Wallet: Rs {u.walletBalance}
                          </span>
                          <span style={{ fontSize: '10px', color: '#A69E94', fontFamily: 'monospace' }}>
                            UID: {dep.userId?.slice(0, 8)}...
                          </span>
                        </div>
                      </td>

                      {/* Game IDs & Names */}
                      <td style={{ padding: '14px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          {/* PUBG */}
                          {u.pubg ? (
                            <div
                              style={{
                                background: '#FFF9F5',
                                border: '1px solid #FFE4D3',
                                borderRadius: '6px',
                                padding: '4px 8px',
                                fontSize: '11px',
                              }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px' }}>
                                <span style={{ fontWeight: 700, color: '#FF6B4A', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                  <Gamepad2 size={12} /> PUBG: {u.pubg.ign || 'No IGN'}
                                </span>
                                {u.pubg.uid && (
                                  <button
                                    type="button"
                                    onClick={() => handleCopy(u.pubg.uid, `pubg-${dep.id}`)}
                                    style={{
                                      background: 'none',
                                      border: 'none',
                                      cursor: 'pointer',
                                      color: '#8A8078',
                                      padding: '2px',
                                      display: 'flex',
                                      alignItems: 'center',
                                    }}
                                    title="Copy PUBG UID"
                                  >
                                    {copiedId === `pubg-${dep.id}` ? <Check size={11} color="#10B981" /> : <Copy size={11} />}
                                  </button>
                                )}
                              </div>
                              <div style={{ color: '#5E5851', fontFamily: 'monospace', fontSize: '10px' }}>
                                UID: {u.pubg.uid || '—'}
                              </div>
                            </div>
                          ) : (
                            <span style={{ fontSize: '11px', color: '#A69E94' }}>PUBG: Not set</span>
                          )}

                          {/* Free Fire */}
                          {u.ff ? (
                            <div
                              style={{
                                background: '#F0FFF4',
                                border: '1px solid #C6F6D5',
                                borderRadius: '6px',
                                padding: '4px 8px',
                                fontSize: '11px',
                              }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px' }}>
                                <span style={{ fontWeight: 700, color: '#00A651', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                  <Flame size={12} /> FF: {u.ff.ign || 'No IGN'}
                                </span>
                                {u.ff.uid && (
                                  <button
                                    type="button"
                                    onClick={() => handleCopy(u.ff.uid, `ff-${dep.id}`)}
                                    style={{
                                      background: 'none',
                                      border: 'none',
                                      cursor: 'pointer',
                                      color: '#8A8078',
                                      padding: '2px',
                                      display: 'flex',
                                      alignItems: 'center',
                                    }}
                                    title="Copy Free Fire UID"
                                  >
                                    {copiedId === `ff-${dep.id}` ? <Check size={11} color="#10B981" /> : <Copy size={11} />}
                                  </button>
                                )}
                              </div>
                              <div style={{ color: '#5E5851', fontFamily: 'monospace', fontSize: '10px' }}>
                                UID: {u.ff.uid || '—'}
                              </div>
                            </div>
                          ) : (
                            <span style={{ fontSize: '11px', color: '#A69E94' }}>FF: Not set</span>
                          )}
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
                            title="Click to view player details & screenshot"
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
                          <div style={{ display: 'flex', gap: '6px', justifyContent: 'center', alignItems: 'center' }}>
                            <button
                              type="button"
                              onClick={() => setPreviewDeposit(dep)}
                              style={{
                                background: '#F0ECE4',
                                color: '#5E5851',
                                border: 'none',
                                borderRadius: '6px',
                                padding: '5px 10px',
                                fontSize: '11px',
                                fontWeight: 600,
                                cursor: 'pointer',
                              }}
                            >
                              View Details
                            </button>

                            <button
                              type="button"
                              onClick={() => handleDelete(dep)}
                              disabled={actionLoading === dep.id}
                              title="Delete deposit record and remove screenshot from Storage"
                              style={{
                                background: '#FFF5F5',
                                color: '#D9503F',
                                border: '1px solid #FFD1D1',
                                borderRadius: '6px',
                                padding: '5px 8px',
                                fontSize: '11px',
                                fontWeight: 600,
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '3px',
                              }}
                            >
                              <Trash2 size={12} />
                              Delete
                            </button>
                          </div>
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

      {/* Comprehensive Details & Screenshot Modal */}
      {previewDeposit && (() => {
        const u = getUserDetails(previewDeposit);
        return (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0,0,0,0.7)',
              zIndex: 9999,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '16px',
            }}
            onClick={() => setPreviewDeposit(null)}
          >
            <div
              style={{
                background: '#FFFFFF',
                borderRadius: '18px',
                maxWidth: '820px',
                width: '100%',
                maxHeight: '92vh',
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
                  padding: '16px 22px',
                  borderBottom: '1px solid #EBE4DA',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  background: '#FCFAF7',
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 800, color: '#2E2A26' }}>
                      Deposit Request — Rs {previewDeposit.amount}
                    </h3>
                    <span
                      style={{
                        fontSize: '11px',
                        fontWeight: 700,
                        padding: '2px 8px',
                        borderRadius: '6px',
                        background: previewDeposit.status === 'approved' ? '#E8F5E9' : previewDeposit.status === 'pending' ? '#FFF8E1' : '#FFEBEE',
                        color: previewDeposit.status === 'approved' ? '#3FA65C' : previewDeposit.status === 'pending' ? '#E88B00' : '#D9503F',
                      }}
                    >
                      {previewDeposit.status?.toUpperCase()}
                    </span>
                  </div>
                  <div style={{ fontSize: '12px', color: '#8A8078', marginTop: '2px' }}>
                    Submitted {formatDate(previewDeposit)} via {previewDeposit.paymentMethod?.toUpperCase()}
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

              {/* Modal Body: Split view (Left: Screenshot, Right: Complete Player Details) */}
              <div
                style={{
                  padding: '20px',
                  overflowY: 'auto',
                  display: 'grid',
                  gridTemplateColumns: '1fr 1.15fr',
                  gap: '20px',
                  background: '#FFFFFF',
                }}
              >
                {/* Left: Payment Screenshot */}
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: '#2E2A26', marginBottom: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>Payment Proof Screenshot</span>
                    <a
                      href={previewDeposit.screenshotUrl}
                      target="_blank"
                      rel="noreferrer"
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        color: '#FF6B4A',
                        textDecoration: 'none',
                        fontSize: '11px',
                        fontWeight: 600,
                      }}
                    >
                      <ExternalLink size={12} /> Open Full
                    </a>
                  </div>

                  <div
                    style={{
                      background: '#F8F6F1',
                      borderRadius: '12px',
                      padding: '12px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      minHeight: '260px',
                      border: '1px solid #EBE4DA',
                    }}
                  >
                    <img
                      src={previewDeposit.screenshotUrl}
                      alt="Payment Screenshot"
                      style={{
                        maxWidth: '100%',
                        maxHeight: '380px',
                        objectFit: 'contain',
                        borderRadius: '8px',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                      }}
                    />
                  </div>

                  {/* Transfer Details under image */}
                  <div
                    style={{
                      background: '#FAF8F5',
                      borderRadius: '10px',
                      padding: '12px',
                      marginTop: '12px',
                      fontSize: '12px',
                      border: '1px solid #EBE4DA',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                      <span style={{ color: '#8A8078' }}>Sender Mobile:</span>
                      <strong style={{ fontFamily: 'monospace' }}>{previewDeposit.senderNumber}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                      <span style={{ color: '#8A8078' }}>Sender Title:</span>
                      <strong>{previewDeposit.senderName || '—'}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: '#8A8078' }}>Transaction ID (TID):</span>
                      <strong style={{ fontFamily: 'monospace' }}>{previewDeposit.transactionId || '—'}</strong>
                    </div>
                  </div>
                </div>

                {/* Right: Full User Profile & Game IDs */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  {/* Player Basic Info Box */}
                  <div
                    style={{
                      background: '#FAF8F5',
                      borderRadius: '12px',
                      padding: '16px',
                      border: '1px solid #EBE4DA',
                    }}
                  >
                    <div style={{ fontSize: '11px', fontWeight: 700, color: '#FF6B4A', textTransform: 'uppercase', marginBottom: '8px', letterSpacing: '0.5px' }}>
                      Player Account Details
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', fontSize: '12px' }}>
                      <div>
                        <div style={{ color: '#8A8078', fontSize: '11px' }}>Full Name</div>
                        <div style={{ fontWeight: 700, color: '#2E2A26' }}>{u.fullName || '—'}</div>
                      </div>

                      <div>
                        <div style={{ color: '#8A8078', fontSize: '11px' }}>Username</div>
                        <div style={{ fontWeight: 700, color: '#2E2A26' }}>@{u.username}</div>
                      </div>

                      <div style={{ gridColumn: 'span 2' }}>
                        <div style={{ color: '#8A8078', fontSize: '11px' }}>Email Address</div>
                        <div style={{ fontWeight: 600, color: '#2E2A26', wordBreak: 'break-all' }}>{u.email || '—'}</div>
                      </div>

                      <div>
                        <div style={{ color: '#8A8078', fontSize: '11px' }}>Current Wallet</div>
                        <div style={{ fontWeight: 800, color: '#10B981', fontSize: '14px' }}>Rs {u.walletBalance}</div>
                      </div>

                      <div>
                        <div style={{ color: '#8A8078', fontSize: '11px' }}>Account Status</div>
                        <div style={{ fontWeight: 700, color: u.isBanned ? '#EF4444' : '#10B981' }}>
                          {u.isBanned ? 'Banned' : 'Active'}
                        </div>
                      </div>
                    </div>

                    {/* Stats pill */}
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        background: '#FFFFFF',
                        borderRadius: '8px',
                        padding: '8px 12px',
                        marginTop: '12px',
                        border: '1px solid #EBE4DA',
                        fontSize: '11px',
                        color: '#5E5851',
                      }}
                    >
                      <span>🏆 <strong>{u.totalWins}</strong> Wins</span>
                      <span>🎯 <strong>{u.totalKills}</strong> Kills</span>
                      <span>🎮 <strong>{u.tournamentsPlayed}</strong> Matches</span>
                    </div>
                  </div>

                  {/* Registered Game IDs Box */}
                  <div
                    style={{
                      background: '#FFFFFF',
                      borderRadius: '12px',
                      padding: '16px',
                      border: '1px solid #EBE4DA',
                    }}
                  >
                    <div style={{ fontSize: '11px', fontWeight: 700, color: '#7B4FE0', textTransform: 'uppercase', marginBottom: '10px', letterSpacing: '0.5px' }}>
                      Registered Game IDs & In-Game Names
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {/* PUBG Mobile */}
                      <div
                        style={{
                          background: '#FFF9F5',
                          border: '1px solid #FFE4D3',
                          borderRadius: '10px',
                          padding: '10px 12px',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                          <span style={{ fontWeight: 800, color: '#FF6B4A', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <Gamepad2 size={14} /> PUBG Mobile
                          </span>
                          {u.pubg?.uid && (
                            <button
                              type="button"
                              onClick={() => handleCopy(u.pubg.uid, 'modal-pubg-uid')}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '3px',
                                background: '#FFFFFF',
                                border: '1px solid #FFDACF',
                                borderRadius: '4px',
                                padding: '2px 6px',
                                fontSize: '10px',
                                fontWeight: 600,
                                cursor: 'pointer',
                                color: '#FF6B4A',
                              }}
                            >
                              {copiedId === 'modal-pubg-uid' ? <Check size={10} color="#10B981" /> : <Copy size={10} />}
                              {copiedId === 'modal-pubg-uid' ? 'Copied' : 'Copy UID'}
                            </button>
                          )}
                        </div>
                        <div style={{ fontSize: '12px', color: '#2E2A26' }}>
                          <strong>IGN:</strong> {u.pubg?.ign || 'Not registered'}
                        </div>
                        <div style={{ fontSize: '12px', color: '#5E5851', fontFamily: 'monospace' }}>
                          <strong>UID:</strong> {u.pubg?.uid || 'Not registered'}
                        </div>
                      </div>

                      {/* Free Fire */}
                      <div
                        style={{
                          background: '#F0FFF4',
                          border: '1px solid #C6F6D5',
                          borderRadius: '10px',
                          padding: '10px 12px',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                          <span style={{ fontWeight: 800, color: '#00A651', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <Flame size={14} /> Free Fire
                          </span>
                          {u.ff?.uid && (
                            <button
                              type="button"
                              onClick={() => handleCopy(u.ff.uid, 'modal-ff-uid')}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '3px',
                                background: '#FFFFFF',
                                border: '1px solid #C6F6D5',
                                borderRadius: '4px',
                                padding: '2px 6px',
                                fontSize: '10px',
                                fontWeight: 600,
                                cursor: 'pointer',
                                color: '#00A651',
                              }}
                            >
                              {copiedId === 'modal-ff-uid' ? <Check size={10} color="#10B981" /> : <Copy size={10} />}
                              {copiedId === 'modal-ff-uid' ? 'Copied' : 'Copy UID'}
                            </button>
                          )}
                        </div>
                        <div style={{ fontSize: '12px', color: '#2E2A26' }}>
                          <strong>IGN:</strong> {u.ff?.ign || 'Not registered'}
                        </div>
                        <div style={{ fontSize: '12px', color: '#5E5851', fontFamily: 'monospace' }}>
                          <strong>UID:</strong> {u.ff?.uid || 'Not registered'}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Rejection reason if rejected */}
                  {previewDeposit.status === 'rejected' && previewDeposit.rejectionReason && (
                    <div
                      style={{
                        background: '#FFF5F5',
                        border: '1px solid #FED7D7',
                        borderRadius: '10px',
                        padding: '12px',
                        fontSize: '12px',
                        color: '#9B2C2C',
                      }}
                    >
                      <strong>Rejection Reason:</strong> {previewDeposit.rejectionReason}
                    </div>
                  )}
                </div>
              </div>

              {/* Modal Footer with Actions */}
              <div
                style={{
                  padding: '16px 22px',
                  borderTop: '1px solid #EBE4DA',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  background: '#FCFAF7',
                }}
              >
                <div style={{ fontSize: '12px', color: '#8A8078' }}>
                  User Firebase UID: <code style={{ color: '#2E2A26' }}>{previewDeposit.userId}</code>
                </div>

                <div style={{ display: 'flex', gap: '10px' }}>
                  {previewDeposit.status === 'pending' ? (
                    <>
                      <button
                        type="button"
                        onClick={() => handleApprove(previewDeposit)}
                        disabled={actionLoading === previewDeposit.id}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          background: '#3FA65C',
                          color: '#FFFFFF',
                          border: 'none',
                          borderRadius: '8px',
                          padding: '10px 18px',
                          fontSize: '13px',
                          fontWeight: 700,
                          cursor: 'pointer',
                          boxShadow: '0 2px 6px rgba(63, 166, 92, 0.25)',
                        }}
                      >
                        <CheckCircle size={16} /> Approve Rs {previewDeposit.amount}
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setRejectDeposit(previewDeposit);
                          setRejectReason('');
                        }}
                        disabled={actionLoading === previewDeposit.id}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          background: '#FFFFFF',
                          color: '#D9503F',
                          border: '1px solid #D9503F',
                          borderRadius: '8px',
                          padding: '10px 18px',
                          fontSize: '13px',
                          fontWeight: 700,
                          cursor: 'pointer',
                        }}
                      >
                        <XCircle size={16} /> Reject Request
                      </button>
                    </>
                  ) : (
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        type="button"
                        onClick={() => handleDelete(previewDeposit)}
                        disabled={actionLoading === previewDeposit.id}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          background: '#FFF5F5',
                          color: '#D9503F',
                          border: '1px solid #FFD1D1',
                          borderRadius: '8px',
                          padding: '8px 16px',
                          fontSize: '12px',
                          fontWeight: 700,
                          cursor: 'pointer',
                        }}
                      >
                        <Trash2 size={14} /> Delete & Free Storage
                      </button>

                      <button
                        type="button"
                        onClick={() => setPreviewDeposit(null)}
                        style={{
                          background: '#F0ECE4',
                          color: '#2E2A26',
                          border: 'none',
                          borderRadius: '8px',
                          padding: '8px 18px',
                          fontSize: '12px',
                          fontWeight: 600,
                          cursor: 'pointer',
                        }}
                      >
                        Close
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      })()}

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
