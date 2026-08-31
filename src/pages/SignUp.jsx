import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { auth } from '../firebase/config';
import { sounds } from '../utils/sounds';

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
    <div style={{ padding: '40px 20px', maxWidth: '400px', margin: '0 auto' }}>
      <div style={{ textAlign: 'center', marginBottom: '32px' }}>
        <h1 style={{ fontFamily: "'Poppins', sans-serif", fontWeight: 800, fontSize: '28px', color: '#E8552F' }}>
          NabPrize Esports
        </h1>
        <p style={{ color: '#8A8078', fontSize: '14px', marginTop: '4px' }}>Create your account</p>
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

        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', fontSize: '13px', color: '#8A8078', marginBottom: '6px' }}>Password</label>
          <div style={{ position: 'relative' }}>
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
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
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
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
  );
}
