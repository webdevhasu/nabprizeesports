import { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, where, getDocs, count } from 'firebase/firestore';
import { db, auth } from '../firebase/config';
import { useAuth } from '../hooks/useAuth';
import { Star, MessageSquare, Send, AlertTriangle, Shield } from 'lucide-react';
import TopBar from './TopBar';
import LoadingSpinner from './LoadingSpinner';

export default function Reviews() {
  const { currentUser } = useAuth();
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [userTournamentCount, setUserTournamentCount] = useState(0);
  const [monthlyReviewCount, setMonthlyReviewCount] = useState(0);
  const [canReview, setCanReview] = useState(false);

  // Form state
  const [targetName, setTargetName] = useState('');
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  // Load reviews
  useEffect(() => {
    const q = query(collection(db, 'reviews'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
      setReviews(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    }, () => setLoading(false));
    return unsub;
  }, []);

  // Check user eligibility
  useEffect(() => {
    if (!currentUser) return;
    const checkEligibility = async () => {
      try {
        // Count tournaments played
        const tournamentsSnap = await getDocs(
          collection(db, 'users', currentUser.uid, 'tournamentsPlayed')
        );
        setUserTournamentCount(tournamentsSnap.size);
        setCanReview(tournamentsSnap.size >= 1);

        // Count reviews this month
        const now = new Date();
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const myReviews = query(
          collection(db, 'reviews'),
          where('reviewerUid', '==', currentUser.uid)
        );
        const myReviewsSnap = await getDocs(myReviews);
        const thisMonthCount = myReviewsSnap.docs.filter(d => {
          const created = d.data().createdAt?.toDate?.();
          return created && created >= monthStart;
        }).length;
        setMonthlyReviewCount(thisMonthCount);
      } catch (e) {
        console.error('Eligibility check error:', e);
      }
    };
    checkEligibility();
  }, [currentUser, submitted]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!targetName.trim()) {
      setError('Please enter the player name.');
      return;
    }
    if (rating === 0) {
      setError('Please select a rating.');
      return;
    }
    if (!comment.trim()) {
      setError('Please write a review comment.');
      return;
    }
    if (monthlyReviewCount >= 5) {
      setError('You have reached the monthly review limit (5).');
      return;
    }

    setSubmitting(true);
    try {
      await addDoc(collection(db, 'reviews'), {
        reviewerUid: currentUser.uid,
        reviewerName: currentUser.displayName || 'Anonymous',
        targetName: targetName.trim(),
        rating,
        comment: comment.trim(),
        createdAt: serverTimestamp(),
      });
      setSubmitted(true);
      setTargetName('');
      setRating(0);
      setComment('');
    } catch (err) {
      console.error('Review error:', err);
      setError('Failed to submit review. Please try again.');
    }
    setSubmitting(false);
  };

  const getAvgRating = (reviewList) => {
    if (reviewList.length === 0) return 0;
    return reviewList.reduce((sum, r) => sum + (r.rating || 0), 0) / reviewList.length;
  };

  return (
    <>
      <TopBar title="Reviews" />
      <div style={{ padding: '16px 16px 40px' }}>

        {/* Write Review CTA */}
        {currentUser && canReview && monthlyReviewCount < 5 && (
          <button
            onClick={() => { setShowForm(!showForm); setSubmitted(false); setError(''); }}
            style={{
              width: '100%', padding: '14px', borderRadius: '12px', border: '1px solid #EBE4DA',
              background: showForm ? '#FFEBEE' : '#FFFFFF', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
              marginBottom: '16px', fontWeight: 600, fontSize: '13px',
              color: showForm ? '#D9503F' : '#FF6B4A',
              transition: 'all 0.15s',
            }}
          >
            <MessageSquare size={16} />
            {showForm ? 'Cancel' : 'Write a Review'}
          </button>
        )}

        {currentUser && !canReview && (
          <div style={{
            background: '#FFF8E1', borderRadius: '10px', padding: '12px 14px',
            marginBottom: '16px', fontSize: '12px', color: '#E88B00',
            display: 'flex', alignItems: 'center', gap: '8px',
          }}>
            <AlertTriangle size={14} />
            Play at least 1 tournament to write reviews.
          </div>
        )}

        {currentUser && canReview && (
          <div style={{
            background: '#F0F7FF', borderRadius: '10px', padding: '10px 14px',
            marginBottom: '16px', fontSize: '11px', color: '#5E8AB5',
            display: 'flex', alignItems: 'center', gap: '6px',
          }}>
            <Shield size={14} />
            {5 - monthlyReviewCount} reviews remaining this month ({monthlyReviewCount}/5 used)
          </div>
        )}

        {/* Review Form */}
        {showForm && (
          <div style={{
            background: '#FFFFFF', borderRadius: '14px', padding: '20px',
            border: '1px solid #EBE4DA', marginBottom: '16px',
            animation: 'slideUp 0.3s ease-out',
          }}>
            {submitted && (
              <div style={{
                background: '#E8F5E9', borderRadius: '8px', padding: '10px 12px',
                marginBottom: '14px', fontSize: '12px', color: '#2E7D32',
                display: 'flex', alignItems: 'center', gap: '6px',
              }}>
                <Shield size={14} /> Review submitted successfully!
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#5E5851', marginBottom: '6px' }}>
                  Player Name *
                </label>
                <input
                  type="text"
                  value={targetName}
                  onChange={e => setTargetName(e.target.value)}
                  placeholder="Enter player name"
                  maxLength={30}
                  style={{
                    width: '100%', padding: '10px 14px', borderRadius: '8px',
                    border: '1px solid #D9D3CC', fontSize: '13px', boxSizing: 'border-box', outline: 'none',
                  }}
                />
              </div>

              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#5E5851', marginBottom: '6px' }}>
                  Rating *
                </label>
                <div style={{ display: 'flex', gap: '4px' }}>
                  {[1, 2, 3, 4, 5].map(s => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setRating(s)}
                      onMouseEnter={() => setHoverRating(s)}
                      onMouseLeave={() => setHoverRating(0)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px' }}
                    >
                      <Star
                        size={28}
                        color={(hoverRating || rating) >= s ? '#F4B740' : '#D9D3CC'}
                        fill={(hoverRating || rating) >= s ? '#F4B740' : 'none'}
                      />
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#5E5851', marginBottom: '6px' }}>
                  Your Review *
                </label>
                <textarea
                  value={comment}
                  onChange={e => setComment(e.target.value)}
                  placeholder="Share your experience..."
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
                disabled={submitting || !targetName.trim() || rating === 0 || !comment.trim()}
                style={{
                  width: '100%', padding: '12px', borderRadius: '10px', border: 'none',
                  fontWeight: 700, fontSize: '13px',
                  background: submitting || !targetName.trim() || rating === 0 || !comment.trim() ? '#C4BCB2' : '#FF6B4A',
                  color: '#FFF',
                  cursor: submitting || !targetName.trim() || rating === 0 || !comment.trim() ? 'not-allowed' : 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                }}
              >
                <Send size={14} />
                {submitting ? 'Submitting...' : 'Submit Review'}
              </button>
            </form>
          </div>
        )}

        {/* Reviews List */}
        {loading ? (
          <LoadingSpinner />
        ) : reviews.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '50px 20px', color: '#8A8078' }}>
            <MessageSquare size={32} color="#C4BCB2" style={{ margin: '0 auto 12px' }} />
            <p style={{ fontSize: '14px', fontWeight: 600 }}>No reviews yet</p>
            <p style={{ fontSize: '12px' }}>Be the first to share your experience!</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {reviews.map(r => (
              <div key={r.id} style={{
                background: '#FFFFFF', borderRadius: '12px', padding: '14px 16px',
                border: '1px solid #F0E6D8',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{
                      width: '32px', height: '32px', borderRadius: '50%',
                      background: '#F0E6D8', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '13px', fontWeight: 700, color: '#5E5851',
                    }}>
                      {(r.reviewerName || 'A')[0].toUpperCase()}
                    </div>
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: 600, color: '#2E2A26' }}>
                        For: {r.targetName}
                      </div>
                      <div style={{ fontSize: '11px', color: '#C4BCB2' }}>
                        by {r.reviewerName} · {r.createdAt?.toDate ? timeAgo(r.createdAt.toDate()) : 'Just now'}
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '1px' }}>
                    {[1, 2, 3, 4, 5].map(s => (
                      <Star key={s} size={12} color={s <= r.rating ? '#F4B740' : '#D9D3CC'} fill={s <= r.rating ? '#F4B740' : 'none'} />
                    ))}
                  </div>
                </div>
                <p style={{ fontSize: '12px', color: '#5E5851', margin: 0, lineHeight: 1.5 }}>
                  {r.comment}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}

function timeAgo(date) {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return 'Just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}
