import { useState, useEffect } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase/config';
import { Key, Copy, Check, Lock, Clock, AlertCircle } from 'lucide-react';

export default function RoomIdCard({ tournamentId, startTime, matchStartTime }) {
  const [roomData, setRoomData] = useState(null);
  const [copied, setCopied] = useState(null);
  const [showRoom, setShowRoom] = useState(false);

  useEffect(() => {
    if (!tournamentId) return;
    const unsub = onSnapshot(doc(db, 'tournaments', tournamentId), (snap) => {
      if (snap.exists()) {
        setRoomData(snap.data());
      }
    });
    return unsub;
  }, [tournamentId]);

  useEffect(() => {
    if (!matchStartTime) return;

    const checkTime = () => {
      const now = Date.now();
      const matchStart = matchStartTime?.toDate ? matchStartTime.toDate().getTime() : new Date(matchStartTime).getTime();
      const regClose = startTime?.toDate ? startTime.toDate().getTime() : new Date(startTime).getTime();
      const diffToMatch = matchStart - now;
      const diffToRegClose = regClose - now;

      // Show room ID 10 min before match start (or after reg closes)
      if (diffToRegClose <= 0 && diffToMatch > -3600000) {
        setShowRoom(true);
      } else {
        setShowRoom(false);
      }
    };

    checkTime();
    const interval = setInterval(checkTime, 1000);
    return () => clearInterval(interval);
  }, [startTime, matchStartTime]);

  const handleCopy = (text, field) => {
    navigator.clipboard.writeText(text);
    setCopied(field);
    setTimeout(() => setCopied(null), 2000);
  };

  if (!showRoom) {
    // Show countdown to room reveal
    if (!startTime || !matchStartTime) return null;
    const now = Date.now();
    const regClose = startTime?.toDate ? startTime.toDate().getTime() : new Date(startTime).getTime();
    const diffToRegClose = regClose - now;

    if (diffToRegClose > 0) {
      const mins = Math.floor(diffToRegClose / 60000);
      const secs = Math.floor((diffToRegClose % 60000) / 1000);
      return (
        <div style={{
          background: '#F8F6F1', borderRadius: '12px', padding: '14px 16px',
          border: '1px solid #EBE4DA', marginBottom: '12px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
            <Clock size={16} color="#8A8078" />
            <span style={{ fontSize: '12px', fontWeight: 600, color: '#8A8078' }}>
              Room ID will be revealed after registration closes
            </span>
          </div>
          <div style={{ fontSize: '14px', fontWeight: 700, color: '#2E2A26', fontFamily: 'monospace' }}>
            {mins}m {secs.toString().padStart(2, '0')}s remaining
          </div>
        </div>
      );
    }
    return null;
  }

  const roomId = roomData?.roomId;
  const roomPassword = roomData?.roomPassword;

  if (!roomId && !roomPassword) {
    return (
      <div style={{
        background: '#FFF8E1', borderRadius: '12px', padding: '14px 16px',
        border: '1px solid #FFE082', marginBottom: '12px',
        display: 'flex', alignItems: 'center', gap: '10px',
      }}>
        <AlertCircle size={16} color="#E88B00" />
        <span style={{ fontSize: '12px', color: '#E88B00', fontWeight: 500 }}>
          Room ID will be announced shortly by admin. Stay ready!
        </span>
      </div>
    );
  }

  return (
    <div style={{
      background: 'linear-gradient(135deg, #E8F5E9, #C8E6C9)', borderRadius: '12px',
      padding: '16px', border: '1px solid #A5D6A7', marginBottom: '12px',
      animation: 'slideUp 0.4s ease-out',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
        <Key size={18} color="#2E7D32" />
        <span style={{ fontSize: '14px', fontWeight: 700, color: '#2E7D32' }}>
          Room Details Available!
        </span>
      </div>

      {roomId && (
        <div style={{
          background: '#FFFFFF', borderRadius: '8px', padding: '10px 14px',
          marginBottom: '8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div>
            <div style={{ fontSize: '11px', color: '#8A8078', fontWeight: 500 }}>ROOM ID</div>
            <div style={{ fontSize: '16px', fontWeight: 800, color: '#2E2A26', fontFamily: 'monospace', letterSpacing: '1px' }}>
              {roomId}
            </div>
          </div>
          <button
            onClick={() => handleCopy(roomId, 'id')}
            style={{
              background: copied === 'id' ? '#3FA65C' : '#F0E6D8',
              border: 'none', borderRadius: '6px', padding: '6px 10px',
              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px',
              fontSize: '11px', fontWeight: 600,
              color: copied === 'id' ? '#FFF' : '#5E5851',
              transition: 'all 0.2s',
            }}
          >
            {copied === 'id' ? <Check size={14} /> : <Copy size={14} />}
            {copied === 'id' ? 'Copied!' : 'Copy'}
          </button>
        </div>
      )}

      {roomPassword && (
        <div style={{
          background: '#FFFFFF', borderRadius: '8px', padding: '10px 14px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div>
            <div style={{ fontSize: '11px', color: '#8A8078', fontWeight: 500 }}>PASSWORD</div>
            <div style={{ fontSize: '16px', fontWeight: 800, color: '#2E2A26', fontFamily: 'monospace', letterSpacing: '1px' }}>
              {roomPassword}
            </div>
          </div>
          <button
            onClick={() => handleCopy(roomPassword, 'pass')}
            style={{
              background: copied === 'pass' ? '#3FA65C' : '#F0E6D8',
              border: 'none', borderRadius: '6px', padding: '6px 10px',
              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px',
              fontSize: '11px', fontWeight: 600,
              color: copied === 'pass' ? '#FFF' : '#5E5851',
              transition: 'all 0.2s',
            }}
          >
            {copied === 'pass' ? <Check size={14} /> : <Copy size={14} />}
            {copied === 'pass' ? 'Copied!' : 'Copy'}
          </button>
        </div>
      )}
    </div>
  );
}
