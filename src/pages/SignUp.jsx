import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { auth } from '../firebase/config';
import { sounds } from '../utils/sounds';
import { Gamepad2, Trophy, Zap, ShieldCheck } from 'lucide-react';

export default function SignUp() {
  const navigate = useNavigate();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const getPasswordStrength = () => {
    if (password.length < 8) return { text: 'Too short', color: '#D9503F' };
    let strength = 0;
    if (/[A-Z]/.test(password)) strength++;
    if (/[0-9]/.test(password)) strength++;
    if (/[^A-Za-z0-9]/.test(password)) strength++;
    if (password.length >= 12) strength++;
    if (strength <= 1) return { text: 'Weak', color: '#D9503F' };
    if (strength <= 2) return { text: 'Fair', color: '#F4B740' };
    return { text: 'Strong', color: '#3FA65C' };
  };

  const handleSignUp = async (e) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }

    setLoading(true);
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(cred.user, { displayName: fullName });
      sounds.success();
      navigate('/account-setup', { replace: true });
    } catch (err) {
      if (err.code === 'auth/email-already-in-use') setError('An account with this email already exists.');
      else if (err.code === 'auth/invalid-email') setError('Invalid email address.');
      else setError('Sign up failed. Please try again.');
    }
    setLoading(false);
  };

  const strength = getPasswordStrength();

  return (
    <div className="auth-page-wrapper">
      <div className="auth-desktop-card auth-desktop-split">
        
        {/* Left Side: Esports Showcase for Desktop */}
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
              Join Pakistan's #1 Esports Battleground
            </h2>
            <p style={{ fontSize: '13px', color: '#C4BCB2', lineHeight: 1.6, marginBottom: '28px' }}>
              Show your skills in daily verified PUBG Mobile & Free Fire custom rooms and withdraw cash rewards directly to JazzCash or EasyPaisa.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '13px', color: '#FAF8F5' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Trophy size={16} color="#F4B740" />
                </div>
                <span>Guaranteed Prize Pools & Fair Rankings</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '13px', color: '#FAF8F5' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Zap size={16} color="#FF6B4A" />
                </div>
                <span>Fast JazzCash & EasyPaisa Withdrawals</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '13px', color: '#FAF8F5' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <ShieldCheck size={16} color="#3FA65C" />
                </div>
                <span>Verified Anti-Cheat & Fair Play Protection</span>
              </div>
            </div>
          </div>

          <div style={{ position: 'relative', zIndex: 2, borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '16px', fontSize: '11px', color: '#A69E94' }}>
            Instant Registration • Safe & Secure • Real Cash
          </div>
        </div>

        {/* Right Side: Sign Up Form */}
        <div className="auth-form-side">
          <div style={{ textAlign: 'center', marginBottom: '28px' }}>
            <h1 style={{ fontFamily: "'Poppins', sans-serif", fontWeight: 800, fontSize: '26px', color: '#E8552F', margin: 0 }}>
              Create Account
            </h1>
            <p style={{ color: '#8A8078', fontSize: '13px', marginTop: '4px' }}>Sign up to start competing</p>
          </div>

      {error && (
        <div style={{
          background: 'rgba(217,80,63,0.1)', color: '#D9503F', padding: '12px',
          borderRadius: '10px', fontSize: '13px', marginBottom: '16px', textAlign: 'center',
        }}>
          {error}
        </div>
      )}

      <form onSubmit={handleSignUp}>
        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', fontSize: '13px', color: '#8A8078', marginBottom: '6px' }}>Full Name</label>
          <input
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Enter your full name"
            required
            style={{
              width: '100%', padding: '14px', background: '#FFFFFF', border: '1px solid #F0E6D8',
              borderRadius: '12px', fontSize: '14px', outline: 'none',
            }}
          />
        </div>

        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', fontSize: '13px', color: '#8A8078', marginBottom: '6px' }}>Email</label>
          <input
            type="email"
            maxLength={60}
            value={email}
            onChange={(e) => setEmail(e.target.value.slice(0, 60))}
            placeholder="Enter your email"
            required
            style={{
              width: '100%', padding: '14px', background: '#FFFFFF', border: '1px solid #F0E6D8',
              borderRadius: '12px', fontSize: '14px', outline: 'none',
            }}
          />
        </div>

        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', fontSize: '13px', color: '#8A8078', marginBottom: '6px' }}>Password</label>
          <div style={{ position: 'relative' }}>
            <input
              type={showPassword ? 'text' : 'password'}
              maxLength={60}
              value={password}
              onChange={(e) => setPassword(e.target.value.slice(0, 60))}
              placeholder="Min 8 characters"
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
          {password.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '6px' }}>
              <div style={{ flex: 1, height: '3px', background: '#F0E6D8', borderRadius: '2px', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: password.length >= 8 ? '100%' : `${(password.length / 8) * 100}%`, background: strength.color, transition: 'all 0.3s' }} />
              </div>
              <span style={{ fontSize: '11px', color: strength.color, fontWeight: 500 }}>{strength.text}</span>
            </div>
          )}
        </div>

        <div style={{ marginBottom: '24px' }}>
          <label style={{ display: 'block', fontSize: '13px', color: '#8A8078', marginBottom: '6px' }}>Confirm Password</label>
          <input
            type="password"
            maxLength={60}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value.slice(0, 60))}
            placeholder="Confirm your password"
            required
            style={{
              width: '100%', padding: '14px', background: '#FFFFFF', border: '1px solid #F0E6D8',
              borderRadius: '12px', fontSize: '14px', outline: 'none',
            }}
          />
        </div>

        <button type="submit" disabled={loading} style={{
          width: '100%', padding: '14px', background: '#FF6B4A', color: '#FFFFFF',
          border: 'none', borderRadius: '12px', fontSize: '15px', fontWeight: 600,
          cursor: 'pointer', boxShadow: '0 4px 16px rgba(255,107,74,0.3)',
          opacity: loading ? 0.7 : 1,
        }}>
          {loading ? 'Creating account...' : 'Create Account'}
        </button>
      </form>

      <p style={{ textAlign: 'center', marginTop: '20px', fontSize: '13px', color: '#8A8078' }}>
        Already have an account?{' '}
        <Link to="/login" style={{ color: '#FF6B4A', textDecoration: 'none', fontWeight: 600 }}>Log In</Link>
      </p>
        </div>
      </div>
    </div>
  );
}
