import { useState, useEffect } from 'react';
import { FaClipboardList } from 'react-icons/fa';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { db, auth } from '../firebase/config';
import TopBar from '../components/TopBar';
import LoadingSpinner from '../components/LoadingSpinner';
import { ArrowUpRight, ArrowDownLeft } from 'lucide-react';

export default function TransactionHistory() {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!auth.currentUser) {
      setLoading(false);
      return;
    }
    const q = query(
      collection(db, 'transactions', auth.currentUser.uid, 'history'),
      orderBy('timestamp', 'desc')
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setTransactions(data);
      setLoading(false);
    }, () => setLoading(false));
    return unsubscribe;
  }, []);

  const formatDate = (timestamp) => {
    if (!timestamp) return '';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const getStatusColor = (status) => {
    if (status === 'completed') return '#3FA65C';
    if (status === 'pending') return '#F4B740';
    return '#D9503F';
  };

  return (
    <>
      <TopBar title="Transaction History" showBack />
      <div className="responsive-page-container" style={{ padding: '16px', maxWidth: '780px', margin: '0 auto' }}>
        {loading ? (
          <LoadingSpinner text="Loading transactions..." />
        ) : transactions.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px' }}>
            <div style={{ marginBottom: '16px' }}><FaClipboardList size={48} color="#C4BCB2" /></div>
            <p style={{ fontWeight: 600, fontSize: '16px', color: '#2E2A26', marginBottom: '8px' }}>
              No transactions yet
            </p>
            <p style={{ fontSize: '13px', color: '#8A8078' }}>
              Your wallet transactions will appear here
            </p>
          </div>
        ) : (
          <div style={{ background: '#FFFFFF', borderRadius: '16px', overflow: 'hidden' }}>
            {transactions.map((txn, i) => (
              <div key={txn.id} style={{
                display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 16px',
                borderBottom: i < transactions.length - 1 ? '1px solid #F0E6D8' : 'none',
              }}>
                <div style={{
                  width: '40px', height: '40px', borderRadius: '50%',
                  background: txn.type === 'credit' ? 'rgba(63,166,92,0.1)' : 'rgba(217,80,63,0.1)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {txn.type === 'credit' ? (
                    <ArrowDownLeft size={18} color="#3FA65C" />
                  ) : (
                    <ArrowUpRight size={18} color="#D9503F" />
                  )}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 500, fontSize: '14px', color: '#2E2A26' }}>
                    {txn.description}
                  </div>
                  <div style={{ fontSize: '12px', color: '#8A8078' }}>
                    {formatDate(txn.timestamp)}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{
                    fontFamily: "'Poppins', sans-serif", fontWeight: 700, fontSize: '14px',
                    color: txn.type === 'credit' ? '#3FA65C' : '#D9503F',
                  }}>
                    {txn.type === 'credit' ? '+' : '-'} Rs {txn.amount}
                  </div>
                  <div style={{
                    fontSize: '10px', fontWeight: 500, color: getStatusColor(txn.status),
                    textTransform: 'capitalize',
                  }}>
                    {txn.status}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
