import { useState, useEffect } from 'react';
import { FaCheck } from 'react-icons/fa';

export default function AnimatedSuccess({ size = 64, color = '#3FA65C', text = '' }) {
  const [show, setShow] = useState(false);
  useEffect(() => { setTimeout(() => setShow(true), 100); }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <div style={{
        width: size * 1.5, height: size * 1.5, borderRadius: '50%',
        background: `${color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center',
        animation: show ? 'scaleIn 0.4s ease-out' : 'none',
      }}>
        <div style={{
          width: size * 1.2, height: size * 1.2, borderRadius: '50%',
          background: `${color}25`, display: 'flex', alignItems: 'center', justifyContent: 'center',
          animation: show ? 'scaleIn 0.4s ease-out 0.1s both' : 'none',
        }}>
          <div style={{
            animation: show ? 'scaleIn 0.3s ease-out 0.2s both' : 'none',
          }}>
            <FaCheck size={size} color={color} />
          </div>
        </div>
      </div>
      {text && (
        <p style={{
          marginTop: '16px', fontSize: '14px', fontWeight: 600, color,
          animation: show ? 'slideUp 0.4s ease-out 0.3s both' : 'none',
        }}>{text}</p>
      )}
    </div>
  );
}
