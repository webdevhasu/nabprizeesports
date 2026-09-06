import { useRef, useState } from 'react';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { Mail, MessageCircle, Send, X, LifeBuoy } from 'lucide-react';
import { auth, db } from '../firebase/config';

export default function SupportModal({ isOpen, onClose }) {
  const [email, setEmail] = useState(auth.currentUser?.email || '');
  const [whatsapp, setWhatsapp] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [website, setWebsite] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const startedAt = useRef(Date.now());

  if (!isOpen) return null;

  const reset = () => {
    setEmail(auth.currentUser?.email || '');
    setWhatsapp(''); setSubject(''); setMessage(''); setWebsite('');
    setSubmitted(false); setError(''); setSaving(false);
    startedAt.current = Date.now();
  };

  const close = () => { reset(); onClose(); };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    if (!auth.currentUser) {
      setError('Please log in first so we can securely receive your report.');
      return;
    }
    if (website || Date.now() - startedAt.current < 1200) return;
    if (!email.trim() && !whatsapp.trim()) {
      setError('Please enter your email or WhatsApp number.');
      return;
    }
    if (!subject.trim() || !message.trim()) {
      setError('Please enter a subject and explain your problem.');
      return;
    }
    setSaving(true);
    try {
      await addDoc(collection(db, 'reports'), {
        type: 'support',
        subject: subject.trim(),
        details: message.trim(),
        description: message.trim(),
        contactEmail: email.trim(),
        contactWhatsapp: whatsapp.trim(),
        reporterUid: auth.currentUser?.uid || null,
        userId: auth.currentUser?.uid || null,
        reporterName: auth.currentUser?.displayName || email.trim() || whatsapp.trim() || 'Guest User',
        reporterEmail: email.trim(),
        status: 'pending',
        createdAt: serverTimestamp(),
      });
      setSubmitted(true);
    } catch (err) {
      console.error('Support request error:', err);
      setError('Could not submit your request. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }} onClick={close}>
      <div style={{ background: '#FFF', borderRadius: '16px', width: '100%', maxWidth: '440px', padding: '22px' }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '9px' }}>
            <LifeBuoy size={20} color="#FF6B4A" />
            <h3 style={{ margin: 0, fontSize: '17px', color: '#2E2A26' }}>Report a Problem</h3>
          </div>
          <button onClick={close} style={{ border: 0, background: 'none', cursor: 'pointer' }}><X size={19} color="#8A8078" /></button>
        </div>

        {submitted ? (
          <div style={{ textAlign: 'center', padding: '18px 4px' }}>
            <Send size={32} color="#3FA65C" style={{ marginBottom: '10px' }} />
            <h4 style={{ margin: '0 0 8px', color: '#2E2A26' }}>Problem Submitted</h4>
            <p style={{ margin: '0 0 16px', color: '#8A8078', fontSize: '13px', lineHeight: 1.5 }}>Our support team will contact you soon at the details you provided.</p>
            <button onClick={close} style={{ border: 0, borderRadius: '8px', padding: '10px 24px', background: '#FF6B4A', color: '#FFF', fontWeight: 700, cursor: 'pointer' }}>Done</button>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <input type="text" value={website} onChange={e => setWebsite(e.target.value)} tabIndex={-1} autoComplete="off" aria-hidden="true" style={{ position: 'absolute', left: '-10000px', opacity: 0, height: 0, width: 0 }} />
            <p style={{ margin: '0 0 16px', color: '#8A8078', fontSize: '12px', lineHeight: 1.5 }}>App mein koi problem, login issue, payment issue ya koi suggestion ho to yahan submit karein.</p>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#5E5851', marginBottom: '5px' }}>Email or WhatsApp number *</label>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
              <div style={{ flex: 1, position: 'relative' }}><Mail size={14} color="#A69E94" style={{ position: 'absolute', left: 10, top: 12 }} /><input type="email" value={email} onChange={e => setEmail(e.target.value.slice(0, 100))} placeholder="Email" style={{ width: '100%', boxSizing: 'border-box', padding: '10px 10px 10px 30px', border: '1px solid #D9D3CC', borderRadius: '8px' }} /></div>
              <div style={{ flex: 1, position: 'relative' }}><MessageCircle size={14} color="#A69E94" style={{ position: 'absolute', left: 10, top: 12 }} /><input type="tel" value={whatsapp} onChange={e => setWhatsapp(e.target.value.slice(0, 20))} placeholder="WhatsApp" style={{ width: '100%', boxSizing: 'border-box', padding: '10px 10px 10px 30px', border: '1px solid #D9D3CC', borderRadius: '8px' }} /></div>
            </div>
            <input value={subject} onChange={e => setSubject(e.target.value.slice(0, 100))} placeholder="Subject (e.g. Login problem)" maxLength={100} style={{ width: '100%', boxSizing: 'border-box', padding: '10px 12px', border: '1px solid #D9D3CC', borderRadius: '8px', marginBottom: '12px' }} />
            <textarea value={message} onChange={e => setMessage(e.target.value.slice(0, 2000))} placeholder="Explain your problem..." rows={5} maxLength={2000} style={{ width: '100%', boxSizing: 'border-box', padding: '10px 12px', border: '1px solid #D9D3CC', borderRadius: '8px', resize: 'vertical', marginBottom: '12px' }} />
            {error && <div style={{ color: '#D9503F', background: '#FFEBEE', borderRadius: '8px', padding: '9px 10px', fontSize: '12px', marginBottom: '12px' }}>{error}</div>}
            <button type="submit" disabled={saving} style={{ width: '100%', border: 0, borderRadius: '9px', padding: '12px', background: saving ? '#C4BCB2' : '#FF6B4A', color: '#FFF', fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer' }}>{saving ? 'Submitting...' : 'Submit Problem'}</button>
          </form>
        )}
      </div>
    </div>
  );
}
