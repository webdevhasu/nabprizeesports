import { useNavigate } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';

export default function TopBar({ title, rightAction, showBack = false }) {
  const navigate = useNavigate();

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: '50%',
      transform: 'translateX(-50%)',
      width: '100%',
      maxWidth: '480px',
      height: '56px',
      background: '#FFFFFF',
      borderBottom: '1px solid #F0E6D8',
      boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 16px',
      zIndex: 100,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        {showBack && (
          <button
            onClick={() => navigate(-1)}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '4px',
              display: 'flex',
              color: '#2E2A26',
            }}
          >
            <ChevronLeft size={24} />
          </button>
        )}
        <h1 style={{
          fontFamily: "'Poppins', sans-serif",
          fontWeight: 700,
          fontSize: '18px',
          color: '#2E2A26',
          margin: 0,
        }}>
          {title}
        </h1>
      </div>
      {rightAction && <div>{rightAction}</div>}
    </div>
  );
}
