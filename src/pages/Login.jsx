import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { signInWithEmailAndPassword, signInWithPopup, sendPasswordResetEmail } from 'firebase/auth';
import { auth, googleProvider } from '../firebase/config';

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  const handleEmailLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      navigate('/', { replace: true });
    } catch (err) {
      if (err.code === 'auth/user-not-found') setError('No account found with this email.');
      else if (err.code === 'auth/wrong-password') setError('Incorrect password.');
      else if (err.code === 'auth/invalid-email') setError('Invalid email address.');
      else setError('Login failed. Please try again.');
    }
    setLoading(false);
  };

  const handleGoogleLogin = async () => {
    setError('');
    setLoading(true);
    try {
      await signInWithPopup(auth, googleProvider);
      navigate('/', { replace: true });
    } catch (err) {
      if (err.code !== 'auth/popup-closed-by-user') {
        setError('Google login failed. Please try again.');
      }
    }
    setLoading(false);
  };

  const handleForgotPassword = async () => {
    if (!email) { setError('Enter your email first.'); return; }
    try {
      await sendPasswordResetEmail(auth, email);
      setResetSent(true);
      setError('');
    } catch {
      setError('Could not send reset email. Check your email address.');
    }
  };

  return (
    <div style={{ padding: '40px 20px', maxWidth: '400px', margin: '0 auto' }}>
      <div style={{ textAlign: 'center', marginBottom: '40px' }}>
        <h1 style={{ fontFamily: "'Poppins', sans-serif", fontWeight: 800, fontSize: '28px', color: '#E8552F' }}>
          NabPrize Esports
        </h1>
        <p style={{ color: '#8A8078', fontSize: '14px', marginTop: '4px' }}>Prove Your Skill.</p>
      </div>

      {error && (
        <div style={{
          background: 'rgba(217,80,63,0.1)', color: '#D9503F', padding: '12px',
          borderRadius: '10px', fontSize: '13px', marginBottom: '16px', textAlign: 'center',
        }}>
          {error}
        </div>
      )}

      {resetSent && (
        <div style={{
          background: 'rgba(63,166,92,0.1)', color: '#3FA65C', padding: '12px',
          borderRadius: '10px', fontSize: '13px', marginBottom: '16px', textAlign: 'center',
        }}>
          Password reset email sent! Check your inbox.
        </div>
      )}

      <button onClick={handleGoogleLogin} disabled={loading} style={{
        width: '100%', padding: '14px', background: '#FFFFFF', border: '1px solid #F0E6D8',
        borderRadius: '12px', fontSize: '15px', fontWeight: 500, cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.04)', opacity: loading ? 0.7 : 1,
      }}>
        <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="" width="20" />
        Continue with Google
      </button>

      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', margin: '24px 0', color: '#8A8078', fontSize: '13px' }}>
        <div style={{ flex: 1, height: '1px', background: '#F0E6D8' }} />
        or
        <div style={{ flex: 1, height: '1px', background: '#F0E6D8' }} />
      </div>

      <form onSubmit={handleEmailLogin}>
        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', fontSize: '13px', color: '#8A8078', marginBottom: '6px' }}>Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Enter your email"
            required
            style={{
              width: '100%', padding: '14px', background: '#FFFFFF', border: '1px solid #F0E6D8',
              borderRadius: '12px', fontSize: '14px', outline: 'none',
            }}
          />
        </div>

        <div style={{ marginBottom: '12px' }}>
          <label style={{ display: 'block', fontSize: '13px', color: '#8A8078', marginBottom: '6px' }}>Password</label>
          <div style={{ position: 'relative' }}>
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              required
              style={{
                width: '100%', padding: '14px', background: '#FFFFFF', border: '1px solid #F0E6D8',
                borderRadius: '12px', fontSize: '14px', outline: 'none', paddingRight: '44px',
              }}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              style={{
                position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)',
                background: 'none', border: 'none', cursor: 'pointer', color: '#8A8078', fontSize: '18px',
              }}
            >
              {showPassword ? '🙈' : '👁'}
            </button>
          </div>
        </div>

        <div style={{ textAlign: 'right', marginBottom: '24px' }}>
          <button type="button" onClick={handleForgotPassword} style={{
            background: 'none', border: 'none', color: '#FF6B4A', fontSize: '13px',
            cursor: 'pointer', fontWeight: 500,
          }}>
            Forgot Password?
          </button>
        </div>

        <button type="submit" disabled={loading} style={{
          width: '100%', padding: '14px', background: '#FF6B4A', color: '#FFFFFF',
          border: 'none', borderRadius: '12px', fontSize: '15px', fontWeight: 600,
          cursor: 'pointer', boxShadow: '0 4px 16px rgba(255,107,74,0.3)',
          opacity: loading ? 0.7 : 1,
        }}>
          {loading ? 'Logging in...' : 'Log In'}
        </button>
      </form>

      <p style={{ textAlign: 'center', marginTop: '20px', fontSize: '13px', color: '#8A8078' }}>
        Don't have an account?{' '}
        <Link to="/signup" style={{ color: '#FF6B4A', textDecoration: 'none', fontWeight: 600 }}>Sign Up</Link>
      </p>
      <p style={{ textAlign: 'center', marginTop: '12px', fontSize: '11px', color: '#8A8078' }}>
        By continuing, you agree to our{' '}
        <Link to="/terms" style={{ color: '#8A8078', textDecoration: 'underline' }}>Terms & Conditions</Link>
      </p>
    </div>
  );
}
