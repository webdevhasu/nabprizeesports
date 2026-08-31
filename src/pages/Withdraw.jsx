import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { doc, updateDoc, increment, collection, addDoc, serverTimestamp, onSnapshot, query, where } from 'firebase/firestore';
import { db, auth } from '../firebase/config';
import { useAuth } from '../hooks/useAuth';
import TopBar from '../components/TopBar';
import { sounds } from '../utils/sounds';
import LoadingSpinner from '../components/LoadingSpinner';
import { Clock, CheckCircle2, XCircle, ArrowUpRight, ShieldCheck, Wallet, RefreshCw } from 'lucide-react';

export default function Withdraw() {
  const navigate = useNavigate();
  const { userProfile, refreshProfile } = useAuth();
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('jazzcash');
  const [accountNumber, setAccountNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [userWithdrawals, setUserWithdrawals] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  const balance = userProfile?.walletBalance || 0;
  const numAmount = parseInt(amount) || 0;
  const isValid = numAmount >= 200 && numAmount <= balance && accountNumber.length >= 11;

  // Listen to user's real-time withdrawal requests
  useEffect(() => {
    if (!auth.currentUser) return;
    const q = query(
      collection(db, 'withdrawals'),
      where('userId', '==', auth.currentUser.uid)
    );

    const unsub = onSnapshot(
      q,
      (snap) => {
        const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        list.sort((a, b) => {
          const timeA = a.createdAt?.toMillis?.() || a.requestedAt?.toMillis?.() || (a.createdAt ? new Date(a.createdAt).getTime() : 0) || (a.requestedAt ? new Date(a.requestedAt).getTime() : 0);
          const timeB = b.createdAt?.toMillis?.() || b.requestedAt?.toMillis?.() || (b.createdAt ? new Date(b.createdAt).getTime() : 0) || (b.requestedAt ? new Date(b.requestedAt).getTime() : 0);
          return timeB - timeA;
        });
        setUserWithdrawals(list);
        setLoadingHistory(false);
      },
      (err) => {
        console.error('Error loading withdrawals history:', err);
        setLoadingHistory(false);
      }
    );

    return unsub;
  }, []);

  const handleWithdraw = async () => {
    if (!isValid || !auth.currentUser) return;

    setLoading(true);
    try {
      // Deduct from wallet
      const userRef = doc(db, 'users', auth.currentUser.uid);
      await updateDoc(userRef, {
        walletBalance: increment(-numAmount),
      });

      // Create withdrawal request
      const withdrawRef = collection(db, 'withdrawals');
      await addDoc(withdrawRef, {
        userId: auth.currentUser.uid,
        username: userProfile.username,
        amount: numAmount,
        method: method,
        accountNumber: accountNumber,
        status: 'pending',
        requestedAt: serverTimestamp(),
        createdAt: serverTimestamp(),
      });

      // Log transaction
      const txnRef = collection(db, 'transactions', auth.currentUser.uid, 'history');
      await addDoc(txnRef, {
        type: 'debit',
        amount: numAmount,
        method: method,
        description: `Withdrawal to ${method === 'jazzcash' ? 'JazzCash' : 'EasyPaisa'}`,
        timestamp: serverTimestamp(),
        status: 'pending',
      });

      await refreshProfile();
      setSuccess(true);
      sounds.withdraw();
    } catch {
      alert('Withdrawal failed. Please try again.');
    }
    setLoading(false);
  };

  const formatDate = (w) => {
    const timestamp = w.createdAt || w.requestedAt;
    if (!timestamp) return 'Just now';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    if (isNaN(date.getTime())) return 'Recent';
    return date.toLocaleDateString('en-PK', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (success) {
    return (
      <>
        <TopBar title="Withdraw Funds" showBack />
        <div style={{ padding: '40px 20px', textAlign: 'center' }}>
          <div style={{
            width: '72px',
            height: '72px',
            borderRadius: '50%',
            background: '#E8F5E9',
            color: '#3FA65C',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 20px',
            boxShadow: '0 4px 16px rgba(63, 166, 92, 0.2)',
          }}>
            <CheckCircle2 size={40} />
          </div>

          <h2 style={{ fontFamily: "'Poppins', sans-serif", fontWeight: 700, fontSize: '22px', color: '#2E2A26', marginBottom: '8px' }}>
            Withdrawal Submitted!
          </h2>
          <p style={{ fontSize: '14px', color: '#5E5851', marginBottom: '6px' }}>
            Rs <strong>{numAmount}</strong> requested to your <strong>{method === 'jazzcash' ? 'JazzCash' : 'EasyPaisa'}</strong> ({accountNumber}).
          </p>
          <p style={{ fontSize: '12px', color: '#8A8078', marginBottom: '28px', lineHeight: 1.5 }}>
            Status is currently <strong>Pending Review</strong>. You can track this request below.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <button
              onClick={() => { setSuccess(false); setAmount(''); setAccountNumber(''); }}
              style={{
                width: '100%',
                padding: '14px',
                background: '#FF6B4A',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: '12px',
                fontWeight: 600,
                fontSize: '14px',
                cursor: 'pointer',
              }}
            >
              View My Requests
            </button>
            <button
              onClick={() => navigate('/')}
              style={{
                width: '100%',
                padding: '14px',
                background: '#F0ECE4',
                color: '#2E2A26',
                border: 'none',
                borderRadius: '12px',
                fontWeight: 600,
                fontSize: '14px',
                cursor: 'pointer',
              }}
            >
              Back to Home
            </button>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <TopBar title="Withdraw Funds" showBack />
      <div style={{ padding: '16px 16px 40px' }}>
        
        {/* Wallet Balance Header */}
        <div style={{
          background: 'linear-gradient(135deg, #FF6B4A 0%, #E8552F 100%)',
          borderRadius: '16px',
          padding: '20px',
          color: '#FFFFFF',
          marginBottom: '20px',
          boxShadow: '0 4px 16px rgba(255, 107, 74, 0.25)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '13px', opacity: 0.9 }}>Available Balance</span>
            <span style={{ fontSize: '11px', background: 'rgba(255,255,255,0.2)', padding: '2px 8px', borderRadius: '10px' }}>
              Min: Rs 200
            </span>
          </div>
          <div style={{ fontFamily: "'Poppins', sans-serif", fontWeight: 800, fontSize: '30px' }}>
            Rs {balance.toLocaleString()}
          </div>
        </div>

        {/* Amount Input */}
        <div style={{
          background: '#FFFFFF',
          borderRadius: '16px',
          padding: '20px',
          marginBottom: '16px',
          border: '1px solid #F0ECE4',
          textAlign: 'center',
        }}>
          <div style={{ fontSize: '13px', color: '#8A8078', marginBottom: '8px' }}>Enter Withdrawal Amount</div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
            <span style={{ fontFamily: "'Poppins', sans-serif", fontWeight: 800, fontSize: '28px', color: '#2E2A26' }}>Rs</span>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="200"
              min="200"
              max={balance}
              style={{
                background: 'transparent',
                border: 'none',
                outline: 'none',
                textAlign: 'center',
                fontFamily: "'Poppins', sans-serif",
                fontWeight: 800,
                fontSize: '28px',
                color: '#2E2A26',
                width: '160px',
              }}
            />
          </div>

          {/* Quick preset amount chips */}
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', marginTop: '14px' }}>
            {[200, 500, 1000, balance].filter((v, i, arr) => v <= balance && arr.indexOf(v) === i && v > 0).map(v => (
              <button
                key={v}
                type="button"
                onClick={() => setAmount(v.toString())}
                style={{
                  padding: '5px 12px',
                  borderRadius: '14px',
                  border: '1px solid #EBE4DA',
                  background: numAmount === v ? '#FFF0EC' : '#FAF8F5',
                  color: numAmount === v ? '#FF6B4A' : '#5E5851',
                  fontWeight: 600,
                  fontSize: '11px',
                  cursor: 'pointer',
                }}
              >
                {v === balance ? 'Max' : `Rs ${v}`}
              </button>
            ))}
          </div>

          {numAmount > 0 && numAmount < 200 && (
            <p style={{ fontSize: '12px', color: '#D9503F', marginTop: '10px', fontWeight: 500 }}>
              Minimum withdrawal amount is Rs 200
            </p>
          )}
          {numAmount > balance && (
            <p style={{ fontSize: '12px', color: '#D9503F', marginTop: '10px', fontWeight: 500 }}>
              Insufficient balance. You have Rs {balance}.
            </p>
          )}
        </div>

        {/* Payment Method */}
        <h3 style={{ fontFamily: "'Poppins', sans-serif", fontWeight: 700, fontSize: '14px', color: '#2E2A26', marginBottom: '10px' }}>
          Select Payout Method
        </h3>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '16px' }}>
          {[
            { key: 'jazzcash', label: 'JazzCash', color: '#D42027', badge: 'JC' },
            { key: 'easypaisa', label: 'EasyPaisa', color: '#32A852', badge: 'EP' },
          ].map(m => (
            <div
              key={m.key}
              onClick={() => setMethod(m.key)}
              style={{
                background: '#FFFFFF',
                borderRadius: '14px',
                padding: '14px',
                border: method === m.key ? '2px solid #FF6B4A' : '1px solid #F0ECE4',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                transition: 'all 0.15s ease',
              }}
            >
              <div style={{
                width: '34px',
                height: '34px',
                borderRadius: '8px',
                background: m.color,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#FFFFFF',
                fontWeight: 800,
                fontSize: '12px',
              }}>
                {m.badge}
              </div>
              <span style={{ fontWeight: 600, fontSize: '13px', color: '#2E2A26' }}>{m.label}</span>
            </div>
          ))}
        </div>

        {/* Account Number */}
        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#5E5851', marginBottom: '6px' }}>
            Your {method === 'jazzcash' ? 'JazzCash' : 'EasyPaisa'} Mobile Account Number
          </label>
          <input
            type="tel"
            value={accountNumber}
            onChange={(e) => setAccountNumber(e.target.value.replace(/\D/g, '').slice(0, 11))}
            placeholder="03XXXXXXXXX"
            style={{
              width: '100%',
              padding: '14px',
              background: '#FFFFFF',
              border: '1px solid #D9D3CC',
              borderRadius: '12px',
              fontSize: '14px',
              outline: 'none',
              boxSizing: 'border-box',
              fontWeight: 500,
            }}
          />
        </div>

        {/* Submit Button */}
        <button
          onClick={handleWithdraw}
          disabled={!isValid || loading}
          style={{
            width: '100%',
            padding: '14px',
            background: isValid && !loading ? '#FF6B4A' : '#C4BCB2',
            color: '#FFFFFF',
            border: 'none',
            borderRadius: '12px',
            fontSize: '15px',
            fontWeight: 700,
            cursor: isValid && !loading ? 'pointer' : 'not-allowed',
            boxShadow: isValid ? '0 4px 16px rgba(255,107,74,0.3)' : 'none',
            marginBottom: '32px',
          }}
        >
          {loading ? 'Processing...' : 'Submit Withdrawal Request'}
        </button>

        {/* MY WITHDRAWAL REQUESTS TRACKER SECTION */}
        <div style={{
          borderTop: '1px solid #EBE4DA',
          paddingTop: '20px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
            <h3 style={{ fontFamily: "'Poppins', sans-serif", fontWeight: 700, fontSize: '15px', color: '#2E2A26', margin: 0 }}>
              My Withdrawal Requests
            </h3>
            <span style={{ fontSize: '11px', color: '#8A8078', fontWeight: 600 }}>
              {userWithdrawals.length} Total
            </span>
          </div>

          {loadingHistory ? (
            <LoadingSpinner text="Loading withdrawal history..." />
          ) : userWithdrawals.length === 0 ? (
            <div style={{
              background: '#FFFFFF',
              borderRadius: '14px',
              padding: '24px 16px',
              textAlign: 'center',
              border: '1px solid #F0ECE4',
            }}>
              <Wallet size={32} color="#C4BCB2" style={{ margin: '0 auto 8px', display: 'block' }} />
              <p style={{ fontWeight: 600, fontSize: '13px', color: '#2E2A26', margin: '0 0 4px' }}>
                No withdrawal requests yet
              </p>
              <p style={{ fontSize: '11px', color: '#8A8078', margin: 0 }}>
                When you withdraw, track your approval & payout status in real-time here.
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {userWithdrawals.map(w => {
                const isPending = w.status === 'pending';
                const isApproved = w.status === 'approved';
                const isRejected = w.status === 'rejected';

                return (
                  <div
                    key={w.id}
                    style={{
                      background: '#FFFFFF',
                      borderRadius: '14px',
                      padding: '16px',
                      border: isPending ? '1px solid #FFE4D3' : isApproved ? '1px solid #C8E6C9' : '1px solid #FFCDD2',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '10px' }}>
                      <div>
                        <div style={{ fontWeight: 800, fontSize: '17px', color: '#2E2A26' }}>
                          Rs {w.amount}
                        </div>
                        <div style={{ fontSize: '11px', color: '#8A8078', marginTop: '2px' }}>
                          {w.method?.toUpperCase()} • {w.accountNumber}
                        </div>
                      </div>

                      {/* Status Badge */}
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        fontSize: '11px',
                        fontWeight: 700,
                        padding: '4px 10px',
                        borderRadius: '20px',
                        background: isPending ? '#FFF8E1' : isApproved ? '#E8F5E9' : '#FFEBEE',
                        color: isPending ? '#E88B00' : isApproved ? '#2E7D32' : '#D9503F',
                      }}>
                        {isPending && <Clock size={12} />}
                        {isApproved && <CheckCircle2 size={12} />}
                        {isRejected && <XCircle size={12} />}
                        {isPending ? 'PENDING' : isApproved ? 'APPROVED' : 'REJECTED'}
                      </span>
                    </div>

                    {/* Footer note based on status */}
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      paddingTop: '8px',
                      borderTop: '1px solid #F6F2EB',
                      fontSize: '11px',
                      color: isApproved ? '#388E3C' : isRejected ? '#D9503F' : '#8A8078',
                    }}>
                      <span>
                        {isPending && '⏳ Admin review in progress'}
                        {isApproved && '✓ Payout sent to your account'}
                        {isRejected && '✕ Rejected & refunded to wallet'}
                      </span>
                      <span style={{ color: '#A69E94' }}>
                        {formatDate(w)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>
    </>
  );
}
