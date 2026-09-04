import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { signInWithEmailAndPassword, signInWithPopup, sendPasswordResetEmail } from 'firebase/auth';
import { auth, googleProvider, db } from '../firebase/config';
import { useEffect } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { sounds } from '../utils/sounds';
import InstallAppBanner from '../components/InstallAppBanner';
import { Trophy, ShieldCheck, Zap, Gamepad2 } from 'lucide-react';

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  // Check if user has completed account setup, navigate accordingly
  const navigateAfterLogin = async (user) => {
    try {
      const docSnap = await getDoc(doc(db, 'users', user.uid));
      if (docSnap.exists()) {
        navigate('/', { replace: true });
      } else {
        navigate('/account-setup', { replace: true });
      }
    } catch {
      // On network error, fallback to home (ProtectedRoute will handle further)
      navigate('/', { replace: true });
    }
  };

  const handleEmailLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const result = await signInWithEmailAndPassword(auth, email, password);
      sounds.success();
      await navigateAfterLogin(result.user);
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
      const result = await signInWithPopup(auth, googleProvider);
      if (result?.user) {
        sounds.success();
        await navigateAfterLogin(result.user);
      }
    } catch (err) {
      if (err.code !== 'auth/popup-closed-by-user' && err.code !== 'auth/cancelled-popup-request') {
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
    <div className="auth-page-wrapper">
      <div className="auth-desktop-card auth-desktop-split">

        {/* Left Side: Esports Branding Showcase (Visible on Desktop >= 900px) */}
        <div
          className="auth-banner-side"
          style={{
            background: 'linear-gradient(135deg, #1E1B18 0%, #342A22 100%)',
            padding: '40px 32px',
            color: '#FFFFFF',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {/* Background decorative glow */}
          <div style={{
            position: 'absolute', top: '-40px', right: '-40px', width: '180px', height: '180px',
            background: 'radial-gradient(circle, rgba(255,107,74,0.35) 0%, rgba(255,107,74,0) 70%)',
            borderRadius: '50%',
          }} />

          <div style={{ position: 'relative', zIndex: 2 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '32px' }}>
              <div style={{
                background: 'linear-gradient(135deg, #FF6B4A 0%, #E8552F 100%)',
                color: '#FFFFFF', fontWeight: 800, fontSize: '15px', padding: '6px 12px',
                borderRadius: '8px', letterSpacing: '0.5px', boxShadow: '0 2px 8px rgba(255,107,74,0.35)',
              }}>
                NP
              </div>
              <div>
                <div style={{ fontWeight: 800, fontSize: '18px', color: '#FFFFFF', lineHeight: 1.1 }}>
                  NabPrize
                </div>
                <div style={{ fontSize: '11px', fontWeight: 600, color: '#FF6B4A', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Gamepad2 size={12} /> Esports Arena
                </div>
              </div>
            </div>

            <h2 style={{
              fontFamily: "'Poppins', sans-serif", fontWeight: 800, fontSize: '26px',
              color: '#FFFFFF', lineHeight: 1.3, marginBottom: '14px',
            }}>
              Pakistan's Premier Esports Battleground
            </h2>
            <p style={{ fontSize: '13px', color: '#C4BCB2', lineHeight: 1.6, marginBottom: '28px' }}>
              Earn fixed skill rewards, join daily small free to play tournaments & verified custom rooms, and withdraw cash rewards directly to JazzCash or EasyPaisa.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '13px', color: '#FAF8F5' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Trophy size={16} color="#F4B740" />
                </div>
                <span>Daily & Weekly Cash Tournaments</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '13px', color: '#FAF8F5' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Zap size={16} color="#FF6B4A" />
                </div>
                <span>Instant JazzCash & EasyPaisa Payouts</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '13px', color: '#FAF8F5' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <ShieldCheck size={16} color="#3FA65C" />
                </div>
                <span>100% Fair Play & Verified Anti-Cheat</span>
              </div>
            </div>
          </div>

          <div style={{ position: 'relative', zIndex: 2, borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '16px', fontSize: '11px', color: '#A69E94' }}>
            Trusted by 10,000+ Pakistani mobile gamers
          </div>
        </div>

        {/* Right Side: Form Content */}
        <div className="auth-form-side">
          <InstallAppBanner />

          <div style={{ textAlign: 'center', marginBottom: '28px' }}>
            <h1 style={{ fontFamily: "'Poppins', sans-serif", fontWeight: 800, fontSize: '26px', color: '#E8552F', margin: 0 }}>
              Welcome Back
            </h1>
            <p style={{ color: '#8A8078', fontSize: '13px', marginTop: '4px' }}>Sign in to continue to your arena</p>
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
            width: '100%', padding: '13px', background: '#FFFFFF', border: '1px solid #EBE4DA',
            borderRadius: '12px', fontSize: '14px', fontWeight: 600, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.04)', opacity: loading ? 0.7 : 1,
            color: '#2E2A26',
          }}>
            <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="" width="18" />
            Continue with Google
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', margin: '20px 0', color: '#8A8078', fontSize: '12px' }}>
            <div style={{ flex: 1, height: '1px', background: '#F0E6D8' }} />
            or email login
            <div style={{ flex: 1, height: '1px', background: '#F0E6D8' }} />
          </div>

          <form onSubmit={handleEmailLogin}>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#5E5851', marginBottom: '6px' }}>Email</label>
              <input
                type="email"
                maxLength={60}
                value={email}
                onChange={(e) => setEmail(e.target.value.slice(0, 60))}
                placeholder="Enter your email"
                required
                style={{
                  width: '100%', padding: '12px 14px', background: '#FAFAF8', border: '1px solid #D9D3CC',
                  borderRadius: '10px', fontSize: '14px', outline: 'none', boxSizing: 'border-box',
                }}
              />
            </div>

            <div style={{ marginBottom: '12px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#5E5851', marginBottom: '6px' }}>Password</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  maxLength={60}
                  value={password}
                  onChange={(e) => setPassword(e.target.value.slice(0, 60))}
                  placeholder="Enter your password"
                  required
                  style={{
                    width: '100%', padding: '12px 14px', background: '#FAFAF8', border: '1px solid #D9D3CC',
                    borderRadius: '10px', fontSize: '14px', outline: 'none', paddingRight: '44px',
                    boxSizing: 'border-box',
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', cursor: 'pointer', color: '#8A8078', fontSize: '16px',
                  }}
                >
                  {showPassword ? '🙈' : '👁'}
                </button>
              </div>
            </div>

            <div style={{ textAlign: 'right', marginBottom: '20px' }}>
              <button type="button" onClick={handleForgotPassword} style={{
                background: 'none', border: 'none', color: '#FF6B4A', fontSize: '12px',
                cursor: 'pointer', fontWeight: 600,
              }}>
                Forgot Password?
              </button>
            </div>

            <button type="submit" disabled={loading} style={{
              width: '100%', padding: '13px', background: '#FF6B4A', color: '#FFFFFF',
              border: 'none', borderRadius: '12px', fontSize: '14px', fontWeight: 700,
              cursor: 'pointer', boxShadow: '0 4px 16px rgba(255,107,74,0.3)',
              opacity: loading ? 0.7 : 1,
            }}>
              {loading ? 'Logging in...' : 'Log In'}
            </button>
          </form>

          <p style={{ textAlign: 'center', marginTop: '18px', fontSize: '13px', color: '#8A8078' }}>
            Don't have an account?{' '}
            <Link to="/signup" style={{ color: '#FF6B4A', textDecoration: 'none', fontWeight: 700 }}>Sign Up</Link>
          </p>
          <p style={{ textAlign: 'center', marginTop: '10px', fontSize: '11px', color: '#A69E94' }}>
            By continuing, you agree to our{' '}
            <Link to="/terms" style={{ color: '#8A8078', textDecoration: 'underline' }}>Terms & Conditions</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
