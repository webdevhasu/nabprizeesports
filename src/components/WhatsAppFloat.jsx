import { useState } from 'react';
import { FaWhatsapp } from 'react-icons/fa';
import { X } from 'lucide-react';

const CHANNEL_URL = 'https://whatsapp.com/channel/0029VbDu0E99RZAXBm3W1V3h';
const CONTACT_URL = 'https://wa.me/923474054450';

export default function WhatsAppFloat() {
  const [open, setOpen] = useState(false);

  return (
    <>
      {open && (
        <div
          style={{
            position: 'fixed',
            bottom: 'calc(140px + env(safe-area-inset-bottom))',
            right: '16px',
            zIndex: 102,
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
            alignItems: 'flex-end',
          }}
        >
          <a
            href={CHANNEL_URL}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              background: '#FFFFFF',
              color: '#1A1310',
              padding: '10px 16px',
              borderRadius: '12px',
              boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
              textDecoration: 'none',
              fontSize: '14px',
              fontWeight: 600,
              whiteSpace: 'nowrap',
            }}
            onClick={() => setOpen(false)}
          >
            <FaWhatsapp size={18} color="#25D366" />
            Join Channel
          </a>
          <a
            href={CONTACT_URL}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              background: '#FFFFFF',
              color: '#1A1310',
              padding: '10px 16px',
              borderRadius: '12px',
              boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
              textDecoration: 'none',
              fontSize: '14px',
              fontWeight: 600,
              whiteSpace: 'nowrap',
            }}
            onClick={() => setOpen(false)}
          >
            <FaWhatsapp size={18} color="#25D366" />
            Contact Us
          </a>
        </div>
      )}

      <button
        onClick={() => setOpen((prev) => !prev)}
        aria-label="WhatsApp"
        style={{
          position: 'fixed',
          bottom: 'calc(80px + env(safe-area-inset-bottom))',
          right: '16px',
          width: '52px',
          height: '52px',
          borderRadius: '50%',
          background: open ? '#E8552F' : '#25D366',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: open
            ? '0 4px 12px rgba(232, 85, 47, 0.4)'
            : '0 4px 12px rgba(37, 211, 102, 0.4)',
          zIndex: 103,
          border: 'none',
          cursor: 'pointer',
          transition: 'background 0.2s ease, box-shadow 0.2s ease',
        }}
      >
        {open ? (
          <X size={24} color="#FFFFFF" />
        ) : (
          <FaWhatsapp size={26} color="#FFFFFF" />
        )}
      </button>
    </>
  );
}
