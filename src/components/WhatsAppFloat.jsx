import { FaWhatsapp } from 'react-icons/fa';

export default function WhatsAppFloat() {
  return (
    <a
      href="https://whatsapp.com/channel/0029VbDu0E99RZAXBm3W1V3h"
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Join WhatsApp Channel"
      style={{
        position: 'fixed',
        bottom: 'calc(80px + env(safe-area-inset-bottom))',
        right: '16px',
        width: '52px',
        height: '52px',
        borderRadius: '50%',
        background: '#25D366',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: '0 4px 12px rgba(37, 211, 102, 0.4)',
        zIndex: 101,
        textDecoration: 'none',
        transition: 'transform 0.2s ease',
      }}
      onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.1)')}
      onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
    >
      <FaWhatsapp size={26} color="#FFFFFF" />
    </a>
  );
}
