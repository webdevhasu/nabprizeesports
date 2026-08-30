import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../firebase/config';
import { ShieldCheck, Lock, Mail, ArrowLeft, AlertCircle } from 'lucide-react';

export default function AdminLogin() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await signInWithEmailAndPassword(auth, email, password);
      navigate('/admin', { replace: true });
    } catch (err) {
      console.error('Admin login error:', err);
      setError('Invalid admin credentials. Please check your email and password.');
    }
    setLoading(false);
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #F8F6F1 0%, #EFEAE2 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px',
      boxSizing: 'border-box',
    }}>
      <div style={{
        background: '#FFFFFF',
        borderRadius: '20px',
        padding: '40px 32px',
        width: '100%',
        maxWidth: '440px',
        border: '1px solid #EAE4DA',
        boxShadow: '0 10px 30px rgba(0,0,0,0.06)',
      }}>
        {/* Branding Header */}
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div style={{
            width: '52px',
            height: '52px',
            borderRadius: '14px',
            background: 'linear-gradient(135deg, #FF6B4A 0%, #E8552F 100%)',
            color: '#FFFFFF',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 14px',
            boxShadow: '0 4px 12px rgba(255, 107, 74, 0.35)',
          }}>
            <ShieldCheck size={28} />
          </div>

          <h1 style={{
            fontWeight: 800,
            fontSize: '24px',
            color: '#2E2A26',
            margin: 0,
            letterSpacing: '-0.5px',
          }}>
            NabPrize <span style={{ color: '#FF6B4A' }}>Admin</span>
          </h1>
          <p style={{ fontSize: '13px', color: '#8A8078', margin: '6px 0 0' }}>
            Enter your credentials to access the master control panel
          </p>
        </div>

        {error && (
          <div style={{
            background: '#FFEBEE',
            borderRadius: '10px',
            padding: '12px 14px',
            marginBottom: '20px',
            fontSize: '13px',
            color: '#D9503F',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            border: '1px solid #FFCDD2',
          }}>
            <AlertCircle size={16} flexShrink={0} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleLogin}>
          <div style={{ marginBottom: '18px' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#5E5851', marginBottom: '6px' }}>
              Admin Email Address
            </label>
            <div style={{ position: 'relative' }}>
              <Mail size={16} color="#A69E94" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
              <input
                type="email"
                placeholder="admin@nabprizeesports.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                style={{
                  width: '100%',
                  padding: '12px 14px 12px 38px',
                  borderRadius: '10px',
                  border: '1px solid #D9D3CC',
                  fontSize: '14px',
                  boxSizing: 'border-box',
                  outline: 'none',
                }}
              />
            </div>
          </div>

          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#5E5851', marginBottom: '6px' }}>
              Secret Password
            </label>
            <div style={{ position: 'relative' }}>
              <Lock size={16} color="#A69E94" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
              <input
                type="password"
                placeholder="••••••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                style={{
                  width: '100%',
                  padding: '12px 14px 12px 38px',
                  borderRadius: '10px',
                  border: '1px solid #D9D3CC',
                  fontSize: '14px',
                  boxSizing: 'border-box',
                  outline: 'none',
                }}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '14px',
              background: '#FF6B4A',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: '10px',
              fontWeight: 700,
              fontSize: '14px',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.7 : 1,
              boxShadow: '0 4px 12px rgba(255, 107, 74, 0.3)',
              transition: 'transform 0.1s ease',
            }}
          >
            {loading ? 'Authenticating...' : 'Sign In to Admin Panel'}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: '24px', paddingTop: '18px', borderTop: '1px solid #F0ECE4' }}>
          <Link
            to="/"
            style={{
              fontSize: '13px',
              color: '#8A8078',
              textDecoration: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              fontWeight: 500,
            }}
          >
            <ArrowLeft size={14} /> Back to Player WebApp
          </Link>
        </div>
      </div>
    </div>
  );
}
