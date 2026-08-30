import { Trophy, CheckCircle } from 'lucide-react';

export default function RewardCard({ reward }) {
  return (
    <div style={{
      background: '#FFFFFF',
      borderRadius: '16px',
      padding: '16px',
      marginBottom: '12px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
        <Trophy size={18} color="#FF6B4A" />
        <span style={{
          fontSize: '11px',
          fontWeight: 600,
          color: '#FF6B4A',
          background: 'rgba(255,107,74,0.15)',
          padding: '2px 8px',
          borderRadius: '12px',
        }}>
          WINNER
        </span>
      </div>
      <div style={{
        fontFamily: "'Poppins', sans-serif",
        fontWeight: 600,
        fontSize: '16px',
        color: '#2E2A26',
        marginBottom: '4px',
      }}>
        {reward.tournamentName}
      </div>
      <div style={{ fontSize: '12px', color: '#8A8078', marginBottom: '12px' }}>
        {reward.game} • {reward.date}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: '#3FA65C' }}>
          <CheckCircle size={12} />
          Credited to wallet
        </div>
        <div style={{
          fontFamily: "'Poppins', sans-serif",
          fontWeight: 700,
          fontSize: '24px',
          color: '#F4B740',
        }}>
          Rs {reward.amount}
        </div>
      </div>
    </div>
  );
}
