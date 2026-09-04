import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Bell } from 'lucide-react';

export default function TopBar({ title, rightAction, showBack = false, showNotification = false, unreadCount = 0, onNotificationClick }) {
  const navigate = useNavigate();

  return (
    <div
      className="user-mobile-topbar"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '56px',
        background: '#FFFFFF',
        borderBottom: '1px solid #F0E6D8',
        boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 16px',
        zIndex: 100,
        boxSizing: 'border-box',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0, flex: 1 }}>
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
              flexShrink: 0,
            }}
          >
            <ChevronLeft size={24} />
          </button>
        )}
        <h1 style={{
          fontFamily: "'Poppins', sans-serif",
          fontWeight: 700,
          fontSize: 'clamp(15px, 4.5vw, 18px)',
          color: '#2E2A26',
          margin: 0,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}>
          {title}
        </h1>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        {showNotification && (
          <button
            onClick={onNotificationClick}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              padding: '4px', position: 'relative', display: 'flex',
            }}
          >
            <Bell size={22} color="#2E2A26" />
            {unreadCount > 0 && (
              <span style={{
                position: 'absolute', top: '-2px', right: '-2px',
                background: '#FF6B4A', color: '#FFF', fontSize: '10px', fontWeight: 700,
                minWidth: '18px', height: '18px', borderRadius: '50%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                border: '2px solid #FFF', padding: '0 4px',
              }}>
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>
        )}
        {rightAction && <div>{rightAction}</div>}
      </div>
    </div>
  );
}
