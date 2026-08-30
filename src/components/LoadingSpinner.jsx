export default function LoadingSpinner({ text = 'Loading...' }) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      padding: '60px 20px',
    }}>
      <div style={{
        width: '40px', height: '40px', border: '3px solid #F0E6D8',
        borderTop: '3px solid #FF6B4A', borderRadius: '50%',
        animation: 'spin 0.8s linear infinite',
      }} />
      <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
      <p style={{ marginTop: '16px', fontSize: '13px', color: '#8A8078', fontWeight: 500 }}>{text}</p>
    </div>
  );
}
