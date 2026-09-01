import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import TopBar from '../components/TopBar';
import { Wallet } from 'lucide-react';

export default function AddFunds() {
  const navigate = useNavigate();
  const { userProfile } = useAuth();

  return (
    <>
      <TopBar title="Add Funds" showBack />
      <div style={{ padding: '16px' }}>
        <p style={{ fontSize: '14px', color: '#8A8078', marginBottom: '20px' }}>
          Current Balance: Rs {userProfile?.walletBalance || 0}
        </p>

        <div style={{
          background: '#FFFFFF', borderRadius: '16px', padding: '40px 20px',
          textAlign: 'center', border: '1px solid #F0E6D8',
        }}>
          <div style={{
            width: '80px', height: '80px', borderRadius: '50%',
            background: '#FFF4EC', display: 'flex', alignItems: 'center',
            justifyContent: 'center', margin: '0 auto 20px',
          }}>
            <Wallet size={36} color="#FF6B4A" />
          </div>

          <h2 style={{
            fontFamily: "'Poppins', sans-serif", fontWeight: 700,
            fontSize: '20px', color: '#2E2A26', marginBottom: '8px',
          }}>
            Coming Soon
          </h2>

          <p style={{
            fontSize: '14px', color: '#8A8078', lineHeight: '1.6',
            marginBottom: '24px', maxWidth: '280px', margin: '0 auto 24px',
          }}>
            Online payment integration with JazzCash & EasyPaisa is under development.
          </p>

          <div style={{
            background: '#FFF8F0', borderRadius: '12px', padding: '16px',
            marginBottom: '24px',
          }}>
            <p style={{ fontSize: '13px', color: '#8A8078', margin: 0 }}>
              You can still join free tournaments without adding funds!
            </p>
          </div>

          <button
            onClick={() => navigate(-1)}
            style={{
              padding: '14px 32px', background: '#FF6B4A', color: '#FFFFFF',
              border: 'none', borderRadius: '12px', fontWeight: 600,
              fontSize: '14px', cursor: 'pointer',
            }}
          >
            Go Back
          </button>
        </div>
      </div>
    </>
  );
}
