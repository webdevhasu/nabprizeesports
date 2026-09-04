import { useNotifications } from '../hooks/useNotifications';
import { Bell, BellOff, CheckCheck, X, Trash2, Trophy, Target, CreditCard, AlertCircle, Info } from 'lucide-react';

function timeAgo(date) {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return 'Just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

const iconMap = {
  winner: <Trophy size={16} color="#F4B740" />,
  tournament: <Target size={16} color="#FF6B4A" />,
  wallet: <CreditCard size={16} color="#3FA65C" />,
  alert: <AlertCircle size={16} color="#D9503F" />,
  info: <Info size={16} color="#7B4FE0" />,
};

export default function NotificationPanel({ isOpen, onClose }) {
  const { notifications, unreadCount, markAsRead, markAllRead, clearOne, clearAll, permission, requestPermission } = useNotifications();

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0,0,0,0.4)',
        backdropFilter: 'blur(2px)',
        zIndex: 1000,
        display: 'flex',
      }}
      className="notification-panel-backdrop"
      onClick={onClose}
    >
      <div
        className="notification-panel-container"
        style={{
          background: '#FFF8F0',
          maxHeight: '100vh',
          height: '100%',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '-4px 0 24px rgba(0,0,0,0.15)',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{
          padding: '16px 20px',
          borderBottom: '1px solid #F0E6D8',
          background: '#FFFFFF',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Bell size={20} color="#FF6B4A" />
            <h3 style={{ fontWeight: 700, fontSize: '16px', color: '#2E2A26', margin: 0 }}>Notifications</h3>
            {unreadCount > 0 && (
              <span style={{
                background: '#FF6B4A', color: '#FFF', fontSize: '11px', fontWeight: 700,
                padding: '2px 8px', borderRadius: '10px', minWidth: '20px', textAlign: 'center',
              }}>{unreadCount}</span>
            )}
          </div>
          <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
            {notifications.length > 0 && (
              <>
                {unreadCount > 0 && (
                  <button onClick={markAllRead} style={{
                    background: 'none', border: 'none', cursor: 'pointer', color: '#FF6B4A',
                    fontSize: '11px', fontWeight: 600, padding: '4px 8px', whiteSpace: 'nowrap',
                  }}>
                    <CheckCheck size={14} /> Read all
                  </button>
                )}
                <button onClick={() => { if (confirm('Clear all notifications?')) clearAll(); }} style={{
                  background: 'none', border: 'none', cursor: 'pointer', color: '#D9503F',
                  fontSize: '11px', fontWeight: 600, padding: '4px 8px', whiteSpace: 'nowrap',
                }}>
                  <Trash2 size={14} /> Clear
                </button>
              </>
            )}
            <button onClick={onClose} style={{
              background: 'none', border: 'none', cursor: 'pointer', color: '#8A8078',
              padding: '4px',
            }}>
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Permission prompt */}
        {permission !== 'granted' && (
          <div style={{
            padding: '14px 20px', background: '#FFF3E0', borderBottom: '1px solid #FFE082',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <div style={{ fontSize: '13px', color: '#E88B00' }}>
              Enable notifications to stay updated
            </div>
            <button onClick={requestPermission} style={{
              background: '#FF6B4A', color: '#FFF', border: 'none', borderRadius: '6px',
              padding: '6px 12px', fontSize: '12px', fontWeight: 600, cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}>Enable</button>
          </div>
        )}

        {/* Notification list */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {notifications.length === 0 ? (
            <div style={{
              padding: '60px 20px', textAlign: 'center', color: '#8A8078',
            }}>
              <BellOff size={32} color="#C4BCB2" style={{ margin: '0 auto 12px' }} />
              <p style={{ fontSize: '14px', fontWeight: 600 }}>No notifications yet</p>
              <p style={{ fontSize: '12px' }}>You'll see updates about tournaments and rewards here</p>
            </div>
          ) : (
            notifications.map(n => (
              <div
                key={n.id}
                onClick={() => !n.read && markAsRead(n.id)}
                style={{
                  padding: '14px 20px', borderBottom: '1px solid #F0E6D8',
                  background: n.read ? '#FFFFFF' : '#FFF9F5',
                  cursor: n.read ? 'default' : 'pointer',
                  display: 'flex', gap: '12px', alignItems: 'flex-start',
                  transition: 'background 0.15s',
                }}
              >
                <div style={{
                  width: '36px', height: '36px', borderRadius: '10px',
                  background: '#F8F6F1', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0, marginTop: '2px',
                }}>
                  {iconMap[n.type] || iconMap.info}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontWeight: n.read ? 500 : 700, fontSize: '13px', color: '#2E2A26',
                    marginBottom: '2px',
                  }}>{n.title}</div>
                  <div style={{
                    fontSize: '12px', color: '#8A8078', lineHeight: '1.4',
                  }}>{n.body}</div>
                  <div style={{
                    fontSize: '11px', color: '#C4BCB2', marginTop: '4px',
                  }}>
                    {n.createdAt?.toDate
                      ? timeAgo(n.createdAt.toDate())
                      : 'Just now'}
                  </div>
                </div>
                {!n.read && (
                  <div style={{
                    width: '8px', height: '8px', borderRadius: '50%',
                    background: '#FF6B4A', flexShrink: 0, marginTop: '6px',
                  }} />
                )}
                <button
                  onClick={(e) => { e.stopPropagation(); clearOne(n.id); }}
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: '#C4BCB2', padding: '2px', flexShrink: 0, marginTop: '2px',
                    transition: 'color 0.15s',
                  }}
                  onMouseEnter={e => e.currentTarget.style.color = '#D9503F'}
                  onMouseLeave={e => e.currentTarget.style.color = '#C4BCB2'}
                >
                  <X size={14} />
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      <style>{`
        @media (min-width: 900px) {
          .notification-panel-backdrop {
            justify-content: flex-end !important;
          }
          .notification-panel-container {
            width: 420px !important;
            animation: slideLeft 0.25s ease-out !important;
          }
        }
        @media (max-width: 899px) {
          .notification-panel-backdrop {
            justify-content: center !important;
            align-items: flex-start !important;
          }
          .notification-panel-container {
            width: 100% !important;
            max-width: 100% !important;
            animation: slideUp 0.3s ease-out !important;
          }
        }
        @keyframes slideLeft {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
      `}</style>
    </div>
  );
}
