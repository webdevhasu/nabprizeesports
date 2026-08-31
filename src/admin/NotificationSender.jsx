import { useState, useEffect } from 'react';
import { collection, addDoc, serverTimestamp, getDocs } from 'firebase/firestore';
import { db } from '../firebase/config';
import { Send, Bell, Trophy, AlertCircle, Info, Target, CheckCircle2 } from 'lucide-react';
import LoadingSpinner from '../components/LoadingSpinner';

const notificationTypes = [
  { value: 'info', label: 'General Info', icon: <Info size={16} color="#7B4FE0" /> },
  { value: 'tournament', label: 'Tournament Update', icon: <Target size={16} color="#FF6B4A" /> },
  { value: 'winner', label: 'Winner Announcement', icon: <Trophy size={16} color="#F4B740" /> },
  { value: 'wallet', label: 'Wallet Update', icon: <CheckCircle2 size={16} color="#3FA65C" /> },
  { value: 'alert', label: 'Urgent Alert', icon: <AlertCircle size={16} color="#D9503F" /> },
];

export default function NotificationSender() {
  const [type, setType] = useState('info');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [url, setUrl] = useState('/');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [userCount, setUserCount] = useState(0);

  useEffect(() => {
    const fetchUserCount = async () => {
      const snap = await getDocs(collection(db, 'users'));
      setUserCount(snap.size);
    };
    fetchUserCount();
  }, []);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!title.trim() || !body.trim() || sending) return;

    setSending(true);
    try {
      // Get all users
      const usersSnap = await getDocs(collection(db, 'users'));
      const batch = [];

      for (const userDoc of usersSnap.docs) {
        batch.push(addDoc(collection(db, 'users', userDoc.id, 'notifications'), {
          type,
          title: title.trim(),
          body: body.trim(),
          url,
          read: false,
          createdAt: serverTimestamp(),
        }));
      }

      await Promise.all(batch);
      setSent(true);
      setTitle('');
      setBody('');
      setUrl('/');
      setTimeout(() => setSent(false), 3000);
    } catch (error) {
      console.error('Error sending notifications:', error);
      alert('Failed to send notifications');
    }
    setSending(false);
  };

  return (
    <div style={{
      background: '#FFFFFF', borderRadius: '14px', padding: '22px',
      border: '1px solid #EBE4DA', boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
      maxWidth: '600px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
        <div style={{
          width: '40px', height: '40px', borderRadius: '10px',
          background: '#FFF3E0', display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Bell size={20} color="#FF6B4A" />
        </div>
        <div>
          <h3 style={{ fontWeight: 700, fontSize: '16px', color: '#2E2A26', margin: 0 }}>
            Send Notification
          </h3>
          <p style={{ fontSize: '12px', color: '#8A8078', margin: 0 }}>
            Send to all {userCount} users
          </p>
        </div>
      </div>

      {sent && (
        <div style={{
          background: '#E8F5E9', borderRadius: '10px', padding: '12px',
          marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px',
          animation: 'slideUp 0.3s ease-out',
        }}>
          <CheckCircle2 size={16} color="#3FA65C" />
          <span style={{ fontSize: '13px', fontWeight: 600, color: '#2E7D32' }}>
            Notification sent to all {userCount} users!
          </span>
        </div>
      )}

      <form onSubmit={handleSend}>
        {/* Type */}
        <div style={{ marginBottom: '14px' }}>
          <label style={{ display: 'block', fontSize: '12px', color: '#8A8078', marginBottom: '6px', fontWeight: 600 }}>
            Notification Type
          </label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {notificationTypes.map(t => (
              <button
                key={t.value}
                type="button"
                onClick={() => setType(t.value)}
                style={{
                  padding: '6px 12px', borderRadius: '8px', border: '1px solid',
                  borderColor: type === t.value ? '#FF6B4A' : '#EBE4DA',
                  background: type === t.value ? '#FFF3EC' : '#FFFFFF',
                  color: type === t.value ? '#FF6B4A' : '#5E5851',
                  fontSize: '12px', fontWeight: 600, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: '6px',
                  transition: 'all 0.15s',
                }}
              >
                {t.icon}
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Title */}
        <div style={{ marginBottom: '14px' }}>
          <label style={{ display: 'block', fontSize: '12px', color: '#8A8078', marginBottom: '6px', fontWeight: 600 }}>
            Title
          </label>
          <input
            type="text"
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="e.g. Tournament starting soon!"
            maxLength={100}
            style={{
              width: '100%', padding: '10px 14px', borderRadius: '8px',
              border: '1px solid #D9D3CC', fontSize: '13px', boxSizing: 'border-box',
              outline: 'none',
            }}
          />
        </div>

        {/* Body */}
        <div style={{ marginBottom: '14px' }}>
          <label style={{ display: 'block', fontSize: '12px', color: '#8A8078', marginBottom: '6px', fontWeight: 600 }}>
            Message
          </label>
          <textarea
            value={body}
            onChange={e => setBody(e.target.value)}
            placeholder="Notification message..."
            maxLength={500}
            rows={3}
            style={{
              width: '100%', padding: '10px 14px', borderRadius: '8px',
              border: '1px solid #D9D3CC', fontSize: '13px', boxSizing: 'border-box',
              outline: 'none', resize: 'vertical',
            }}
          />
        </div>

        {/* URL */}
        <div style={{ marginBottom: '18px' }}>
          <label style={{ display: 'block', fontSize: '12px', color: '#8A8078', marginBottom: '6px', fontWeight: 600 }}>
            Link (optional)
          </label>
          <input
            type="text"
            value={url}
            onChange={e => setUrl(e.target.value)}
            placeholder="/"
            style={{
              width: '100%', padding: '10px 14px', borderRadius: '8px',
              border: '1px solid #D9D3CC', fontSize: '13px', boxSizing: 'border-box',
              outline: 'none',
            }}
          />
        </div>

        <button
          type="submit"
          disabled={sending || !title.trim() || !body.trim()}
          style={{
            width: '100%', padding: '12px', borderRadius: '10px',
            border: 'none', fontWeight: 700, fontSize: '14px',
            background: sending || !title.trim() || !body.trim() ? '#C4BCB2' : '#FF6B4A',
            color: '#FFFFFF', cursor: sending || !title.trim() || !body.trim() ? 'not-allowed' : 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
            boxShadow: !sending && title.trim() && body.trim() ? '0 4px 16px rgba(255,107,74,0.3)' : 'none',
          }}
        >
          <Send size={16} />
          {sending ? 'Sending...' : `Send to ${userCount} Users`}
        </button>
      </form>
    </div>
  );
}
