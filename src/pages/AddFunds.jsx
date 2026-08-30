import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { doc, updateDoc, increment, collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '../firebase/config';
import { useAuth } from '../hooks/useAuth';
import TopBar from '../components/TopBar';

export default function AddFunds() {
  const navigate = useNavigate();
  const { userProfile, refreshProfile } = useAuth();
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('jazzcash');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const quickAmounts = [100, 300, 500, 1000];

  const handleAddFunds = async () => {
    const numAmount = parseInt(amount);
    if (!numAmount || numAmount < 50 || !auth.currentUser) return;

    setLoading(true);

    try {
      // TODO: Replace with actual Safepay integration when production keys are ready
      // For now, simulating successful payment for testing
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Credit wallet
      const userRef = doc(db, 'users', auth.currentUser.uid);
      await updateDoc(userRef, {
        walletBalance: increment(numAmount),
      });

      // Log transaction
      const txnRef = collection(db, 'transactions', auth.currentUser.uid, 'history');
      await addDoc(txnRef, {
        type: 'credit',
        amount: numAmount,
        method: method,
        description: `Added via ${method === 'jazzcash' ? 'JazzCash' : 'EasyPaisa'}`,
        timestamp: serverTimestamp(),
        status: 'completed',
        // Safepay sandbox reference
        reference: `NP-SANDBOX-${Date.now()}`,
      });

      await refreshProfile();
      setSuccess(true);
    } catch {
      alert('Payment failed. Please try again.');
    }
    setLoading(false);
  };

  if (success) {
    return (
      <>
        <TopBar title="Add Funds" showBack />
        <div style={{ padding: '40px 20px', textAlign: 'center' }}>
          <div style={{ fontSize: '64px', marginBottom: '16px' }}>✅</div>
          <h2 style={{ fontFamily: "'Poppins', sans-serif", fontWeight: 700, fontSize: '22px', color: '#2E2A26', marginBottom: '8px' }}>
            Funds Added!
          </h2>
          <p style={{ fontSize: '14px', color: '#8A8078', marginBottom: '8px' }}>
            Rs {amount} has been credited to your wallet.
          </p>
          <p style={{ fontSize: '12px', color: '#C4BCB2', marginBottom: '24px' }}>
            (Sandbox mode — no real charge)
          </p>
          <button onClick={() => navigate('/')} style={{
            padding: '14px 32px', background: '#FF6B4A', color: '#FFFFFF',
            border: 'none', borderRadius: '12px', fontWeight: 600, fontSize: '14px', cursor: 'pointer',
          }}>
            Back to Home
          </button>
        </div>
      </>
    );
  }

  return (
    <>
      <TopBar title="Add Funds" showBack />
      <div style={{ padding: '16px' }}>
        <p style={{ fontSize: '14px', color: '#8A8078', marginBottom: '20px' }}>
          Current Balance: Rs {userProfile?.walletBalance || 0}
        </p>

        {/* Amount Input */}
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div style={{ fontSize: '14px', color: '#8A8078', marginBottom: '8px' }}>Enter Amount</div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
            <span style={{ fontFamily: "'Poppins', sans-serif", fontWeight: 700, fontSize: '28px', color: '#2E2A26' }}>Rs</span>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0"
              min="50"
              style={{
                background: 'transparent', border: 'none', outline: 'none', textAlign: 'center',
                fontFamily: "'Poppins', sans-serif", fontWeight: 700, fontSize: '28px', color: '#2E2A26',
                width: '150px',
              }}
            />
          </div>
          {amount && parseInt(amount) < 50 && (
            <p style={{ fontSize: '12px', color: '#D9503F', marginTop: '4px' }}>Minimum amount is Rs 50</p>
          )}
        </div>

        {/* Quick Amount Chips */}
        <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', marginBottom: '32px' }}>
          {quickAmounts.map(qa => (
            <button key={qa} onClick={() => setAmount(String(qa))} style={{
              padding: '8px 16px', borderRadius: '20px', fontSize: '13px', fontWeight: 500,
              background: amount === String(qa) ? '#FFF4EC' : '#FFFFFF',
              color: amount === String(qa) ? '#FF6B4A' : '#8A8078',
              border: amount === String(qa) ? '1px solid #FF6B4A' : '1px solid #F0E6D8',
              cursor: 'pointer',
            }}>
              Rs {qa}
            </button>
          ))}
        </div>

        {/* Payment Method */}
        <h3 style={{ fontFamily: "'Poppins', sans-serif", fontWeight: 600, fontSize: '14px', color: '#2E2A26', marginBottom: '12px' }}>
          Payment Method
        </h3>

        {[
          { key: 'jazzcash', label: 'JazzCash', color: '#D42027' },
          { key: 'easypaisa', label: 'EasyPaisa', color: '#5DC22A' },
        ].map(m => (
          <div key={m.key} onClick={() => setMethod(m.key)} style={{
            background: '#FFFFFF', borderRadius: '12px', padding: '16px', marginBottom: '8px',
            border: method === m.key ? '2px solid #FF6B4A' : '1px solid #F0E6D8', cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: '12px',
          }}>
            <div style={{
              width: '20px', height: '20px', borderRadius: '50%', border: `2px solid ${method === m.key ? '#FF6B4A' : '#C4BCB2'}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              {method === m.key && <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#FF6B4A' }} />}
            </div>
            <div style={{
              width: '32px', height: '32px', borderRadius: '8px', background: m.color,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#FFFFFF', fontWeight: 700, fontSize: '12px',
            }}>
              {m.key === 'jazzcash' ? 'JC' : 'EP'}
            </div>
            <span style={{ fontWeight: 500, fontSize: '14px', color: '#2E2A26' }}>{m.label}</span>
          </div>
        ))}

        {/* Submit Button */}
        <button
          onClick={handleAddFunds}
          disabled={!amount || parseInt(amount) < 50 || loading}
          style={{
            width: '100%', padding: '14px', marginTop: '24px',
            background: amount && parseInt(amount) >= 50 && !loading ? '#FF6B4A' : '#C4BCB2',
            color: '#FFFFFF', border: 'none', borderRadius: '12px', fontSize: '15px',
            fontWeight: 600, cursor: amount && parseInt(amount) >= 50 && !loading ? 'pointer' : 'not-allowed',
            boxShadow: amount && parseInt(amount) >= 50 ? '0 4px 16px rgba(255,107,74,0.3)' : 'none',
          }}
        >
          {loading ? 'Processing Payment...' : `Add Rs ${amount || 0} →`}
        </button>

        <p style={{ fontSize: '11px', color: '#C4BCB2', textAlign: 'center', marginTop: '12px' }}>
          🔒 Sandbox mode — no real charges. Safepay integration pending.
        </p>
      </div>
    </>
  );
}
