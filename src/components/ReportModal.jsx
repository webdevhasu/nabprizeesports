import { useState } from 'react';
import { collection, addDoc, serverTimestamp, query, where, getDocs } from 'firebase/firestore';
import { db, auth } from '../firebase/config';
import { X, AlertTriangle, Search, Shield, Send } from 'lucide-react';

const reasons = [
  'Suspicious aim / aimbot',
  'Wallhack / seeing through walls',
  'Speed hack / moving too fast',
  'Team killing / griefing',
  'Using modified game files',
  'Boosting / account sharing',
  'Other',
];

export default function ReportModal({ isOpen, onClose }) {
  const [suspectName, setSuspectName] = useState('');
  const [suspectUid, setSuspectUid] = useState('');
  const [reason, setReason] = useState('');
  const [details, setDetails] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!suspectName.trim() || !suspectUid.trim() || !reason) {
      setError('Please fill in all required fields.');
      return;
    }

    if (suspectUid.trim().length < 4) {
      setError('Game UID must be at least 4 characters.');
      return;
    }

    const user = auth.currentUser;
    if (!user) {
      setError('You must be logged in to submit a report.');
      return;
    }

    // Check for duplicate report (same reporter + same UID in last 24h)
    const oneDayAgo = new Date(Date.now() - 86400000);
    const dupCheck = query(
      collection(db, 'reports'),
      where('reporterUid', '==', user.uid),
      where('suspectUid', '==', suspectUid.trim())
    );
    const dupSnap = await getDocs(dupCheck);
    const recentDuplicate = dupSnap.docs.find(d => {
      const created = d.data().createdAt?.toDate?.();
      return created && created > oneDayAgo;
    });
    if (recentDuplicate) {
      setError('You already reported this player in the last 24 hours.');
      return;
    }

    setSubmitting(true);
    try {
      await addDoc(collection(db, 'reports'), {
        reporterUid: user.uid,
        reporterName: user.displayName || 'Anonymous',
        suspectName: suspectName.trim(),
        suspectUid: suspectUid.trim(),
        reason,
        details: details.trim(),
        status: 'pending',
        createdAt: serverTimestamp(),
      });
      setSubmitted(true);
    } catch (err) {
      console.error('Report error:', err);
      setError('Failed to submit report. Please try again.');
    }
    setSubmitting(false);
  };

  const handleClose = () => {
    setSuspectName('');
    setSuspectUid('');
    setReason('');
    setDetails('');
    setSubmitted(false);
    setError('');
    onClose();
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.5)', zIndex: 1000,
      display: 'flex', justifyContent: 'center', alignItems: 'center',
      padding: '16px',
    }} onClick={handleClose}>
      <div style={{
        background: '#FFFFFF', borderRadius: '16px', width: '100%', maxWidth: '420px',
        maxHeight: '90vh', overflow: 'auto', animation: 'scaleIn 0.2s ease-out',
      }} onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div style={{
          padding: '18px 20px', borderBottom: '1px solid #F0E6D8',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '36px', height: '36px', borderRadius: '10px',
              background: '#FFEBEE', display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <AlertTriangle size={18} color="#D9503F" />
            </div>
            <h3 style={{ fontWeight: 700, fontSize: '16px', color: '#2E2A26', margin: 0 }}>
              Report Suspicious Player
            </h3>
          </div>
          <button onClick={handleClose} style={{
            background: 'none', border: 'none', cursor: 'pointer', color: '#8A8078', padding: '4px',
          }}>
            <X size={20} />
          </button>
        </div>

        <div style={{ padding: '20px' }}>
          {submitted ? (
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              <div style={{
                width: '56px', height: '56px', borderRadius: '50%', background: '#E8F5E9',
                display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px',
              }}>
                <Shield size={28} color="#3FA65C" />
              </div>
              <h4 style={{ fontWeight: 700, fontSize: '16px', color: '#2E2A26', margin: '0 0 6px' }}>
                Report Submitted
              </h4>
              <p style={{ fontSize: '13px', color: '#8A8078', margin: '0 0 18px' }}>
                Our team will review this report. Thank you for keeping NabPrize fair.
              </p>
              <button onClick={handleClose} style={{
                background: '#FF6B4A', color: '#FFF', border: 'none', borderRadius: '8px',
                padding: '10px 24px', fontWeight: 600, fontSize: '13px', cursor: 'pointer',
              }}>
                Done
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              {/* Suspect In-Game Name */}
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#5E5851', marginBottom: '6px' }}>
                  Suspect In-Game Name *
                </label>
                <input
                  type="text"
                  value={suspectName}
                  onChange={e => setSuspectName(e.target.value)}
                  placeholder="e.g. ProKiller99"
                  maxLength={30}
                  style={{
                    width: '100%', padding: '10px 14px', borderRadius: '8px',
                    border: '1px solid #D9D3CC', fontSize: '13px', boxSizing: 'border-box', outline: 'none',
                  }}
                />
              </div>

              {/* Suspect Game UID */}
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#5E5851', marginBottom: '6px' }}>
                  Suspect Game UID *
                </label>
                <input
                  type="text"
                  value={suspectUid}
                  onChange={e => setSuspectUid(e.target.value)}
                  placeholder="e.g. 5123456789"
                  maxLength={20}
                  style={{
                    width: '100%', padding: '10px 14px', borderRadius: '8px',
                    border: '1px solid #D9D3CC', fontSize: '13px', boxSizing: 'border-box', outline: 'none',
                  }}
                />
              </div>

              {/* Reason */}
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#5E5851', marginBottom: '6px' }}>
                  Reason for Report *
                </label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {reasons.map(r => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setReason(r)}
                      style={{
                        padding: '6px 10px', borderRadius: '8px', border: '1px solid',
                        borderColor: reason === r ? '#D9503F' : '#EBE4DA',
                        background: reason === r ? '#FFEBEE' : '#FAF8F5',
                        color: reason === r ? '#D9503F' : '#5E5851',
                        fontSize: '11px', fontWeight: 600, cursor: 'pointer',
                        transition: 'all 0.15s',
                      }}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>

              {/* Additional Details */}
              <div style={{ marginBottom: '18px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#5E5851', marginBottom: '6px' }}>
                  Additional Details (optional)
                </label>
                <textarea
                  value={details}
                  onChange={e => setDetails(e.target.value)}
                  placeholder="Describe what happened..."
                  maxLength={300}
                  rows={3}
                  style={{
                    width: '100%', padding: '10px 14px', borderRadius: '8px',
                    border: '1px solid #D9D3CC', fontSize: '13px', boxSizing: 'border-box',
                    outline: 'none', resize: 'vertical',
                  }}
                />
              </div>

              {error && (
                <div style={{
                  background: '#FFEBEE', borderRadius: '8px', padding: '10px 12px',
                  marginBottom: '14px', fontSize: '12px', color: '#D9503F',
                  display: 'flex', alignItems: 'center', gap: '6px',
                }}>
                  <AlertTriangle size={14} /> {error}
                </div>
              )}

              <button
                type="submit"
                disabled={submitting || !suspectName.trim() || !suspectUid.trim() || !reason}
                style={{
                  width: '100%', padding: '12px', borderRadius: '10px', border: 'none',
                  fontWeight: 700, fontSize: '13px',
                  background: submitting || !suspectName.trim() || !suspectUid.trim() || !reason ? '#C4BCB2' : '#D9503F',
                  color: '#FFF',
                  cursor: submitting || !suspectName.trim() || !suspectUid.trim() || !reason ? 'not-allowed' : 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                }}
              >
                <Send size={14} />
                {submitting ? 'Submitting...' : 'Submit Report'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
