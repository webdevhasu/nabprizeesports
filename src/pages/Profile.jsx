import { useState } from 'react';
import { FaCrosshairs, FaFire, FaPhone, FaClock } from 'react-icons/fa';
import { Link, useNavigate } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { doc, updateDoc } from 'firebase/firestore';
import { auth, db } from '../firebase/config';
import { useAuth } from '../hooks/useAuth';
import TopBar from '../components/TopBar';
import ReportModal from '../components/ReportModal';
import {
  Settings,
  ChevronRight,
  Wallet,
  Plus,
  ArrowUpRight,
  Clock,
  Edit2,
  Gamepad2,
  HelpCircle,
  ShieldAlert,
  FileText,
  X,
  Check,
  PhoneCall,
  MessageSquare
} from 'lucide-react';

export default function Profile() {
  const { userProfile, refreshProfile } = useAuth();
  const navigate = useNavigate();

  const [showSignOutConfirm, setShowSignOutConfirm] = useState(false);
  const [showEditUsername, setShowEditUsername] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [savingUsername, setSavingUsername] = useState(false);

  // Edit Game IDs Modal
  const [showEditGameIds, setShowEditGameIds] = useState(false);
  const [pubgIgn, setPubgIgn] = useState('');
  const [pubgUid, setPubgUid] = useState('');
  const [ffIgn, setFfIgn] = useState('');
  const [ffUid, setFfUid] = useState('');
  const [savingGameIds, setSavingGameIds] = useState(false);

  // Support & Policy Modals
  const [showSupportModal, setShowSupportModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      navigate('/login', { replace: true });
    } catch (e) {
      console.error('Sign out error:', e);
      alert('Failed to sign out. Please try again.');
    }
  };

  const handleSaveUsername = async (e) => {
    e.preventDefault();
    const trimmed = newUsername.trim();
    if (!trimmed || !auth.currentUser) return;

    if (trimmed.length < 3 || trimmed.length > 20) {
      alert('Username must be 3-20 characters long.');
      return;
    }
    if (!/^[a-zA-Z0-9_]+$/.test(trimmed)) {
      alert('Username can only contain letters, numbers, and underscores.');
      return;
    }

    setSavingUsername(true);
    try {
      await updateDoc(doc(db, 'users', auth.currentUser.uid), {
        username: trimmed,
      });
      await refreshProfile();
      setShowEditUsername(false);
      setNewUsername('');
    } catch (err) {
      console.error('Error updating username:', err);
      alert('Failed to update username');
    }
    setSavingUsername(false);
  };

  const openGameIdsModal = () => {
    const games = userProfile?.games || [];
    const pubg = games.find(g => g.game === 'pubg') || {};
    const ff = games.find(g => g.game === 'freefire') || {};

    setPubgIgn(pubg.ign || '');
    setPubgUid(pubg.uid || '');
    setFfIgn(ff.ign || '');
    setFfUid(ff.uid || '');
    setShowEditGameIds(true);
  };

  const handleSaveGameIds = async (e) => {
    e.preventDefault();
    if (!auth.currentUser) return;
    setSavingGameIds(true);
    try {
      const updatedGames = [
        { game: 'pubg', ign: pubgIgn.trim(), uid: pubgUid.trim() },
        { game: 'freefire', ign: ffIgn.trim(), uid: ffUid.trim() },
      ];

      await updateDoc(doc(db, 'users', auth.currentUser.uid), {
        games: updatedGames,
      });
      await refreshProfile();
      setShowEditGameIds(false);
    } catch (err) {
      console.error('Error updating game IDs:', err);
      alert('Failed to update game IDs');
    }
    setSavingGameIds(false);
  };

  const initials = userProfile?.fullName
    ? userProfile.fullName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : 'U';

  const menuItems = [
    { label: 'Edit Username', action: () => { setNewUsername(userProfile?.username || ''); setShowEditUsername(true); } },
    { label: 'Edit PUBG & Free Fire Game IDs', action: openGameIdsModal },
    { label: 'Transaction History', to: '/transactions' },
    { label: 'Terms & Conditions', to: '/terms' },
    { label: 'Reviews', to: '/reviews' },
    { label: 'Privacy Policy', action: () => setShowPrivacyModal(true) },
    { label: 'How It Works', to: '/how-it-works' },
    { label: 'Report Suspicious Player', action: () => setShowReportModal(true), color: '#D9503F' },
    { label: 'Support & Community Help', action: () => setShowSupportModal(true) },
  ];

  return (
    <>
      <TopBar title="My Profile" />
      <div className="responsive-page-container" style={{ padding: '16px 16px 40px' }}>
        
        {/* Profile Header Card */}
        <div style={{
          background: '#FFFFFF',
          borderRadius: '20px',
          padding: '24px 20px',
          textAlign: 'center',
          marginBottom: '16px',
          border: '1px solid #EBE4DA',
          boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
        }}>
          <div style={{
            width: '76px',
            height: '76px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #FF6B4A 0%, #E8552F 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 12px',
            fontSize: '26px',
            fontWeight: 800,
            color: '#FFFFFF',
            boxShadow: '0 4px 14px rgba(255,107,74,0.3)',
          }}>
            {initials}
          </div>
          <h2 style={{ fontFamily: "'Poppins', sans-serif", fontWeight: 800, fontSize: '20px', color: '#2E2A26', margin: '0 0 2px' }}>
            @{userProfile?.username || 'player'}
          </h2>
          <p style={{ fontSize: '13px', color: '#8A8078', margin: '0 0 4px', fontWeight: 500 }}>
            {userProfile?.fullName || 'Esports Player'}
          </p>
          <p style={{ fontSize: '11px', color: '#A69E94', margin: 0, fontFamily: 'monospace' }}>
            {auth.currentUser?.email || auth.currentUser?.phoneNumber || `UID: ${auth.currentUser?.uid?.slice(0, 10)}...`}
          </p>
        </div>

        {/* Enhanced Wallet Hub */}
        <div style={{
          background: 'linear-gradient(135deg, #1E1B18 0%, #362E27 100%)',
          borderRadius: '18px',
          padding: '20px',
          marginBottom: '16px',
          color: '#FFFFFF',
          boxShadow: '0 6px 20px rgba(0,0,0,0.1)',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
            <span style={{ fontSize: '11px', color: '#C4BCB2', fontWeight: 600, letterSpacing: '0.5px' }}>
              WALLET BALANCE
            </span>
            <Link to="/transactions" style={{ fontSize: '11px', color: '#F4B740', textDecoration: 'none', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Clock size={12} /> History
            </Link>
          </div>

          <div style={{
            fontFamily: "'Poppins', sans-serif",
            fontWeight: 800,
            fontSize: '28px',
            color: '#F4B740',
            marginBottom: '16px',
          }}>
            Rs {(userProfile?.walletBalance || 0).toLocaleString()}
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <Link
              to="/add-funds"
              style={{
                flex: 1,
                padding: '10px',
                background: '#FF6B4A',
                color: '#FFFFFF',
                borderRadius: '10px',
                fontWeight: 700,
                fontSize: '12px',
                textAlign: 'center',
                textDecoration: 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '4px',
              }}
            >
              <Plus size={14} /> Add Funds
            </Link>

            <Link
              to="/withdraw"
              style={{
                flex: 1,
                padding: '10px',
                background: 'rgba(255,255,255,0.12)',
                color: '#FFFFFF',
                borderRadius: '10px',
                fontWeight: 700,
                fontSize: '12px',
                textAlign: 'center',
                textDecoration: 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '4px',
                border: '1px solid rgba(255,255,255,0.2)',
              }}
            >
              Withdraw <ArrowUpRight size={14} />
            </Link>
          </div>
        </div>

        {/* Registered Game IDs Card */}
        <div style={{
          background: '#FFFFFF',
          borderRadius: '16px',
          padding: '18px',
          marginBottom: '16px',
          border: '1px solid #EBE4DA',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Gamepad2 size={16} color="#FF6B4A" />
              <h3 style={{ fontFamily: "'Poppins', sans-serif", fontWeight: 700, fontSize: '14px', color: '#2E2A26', margin: 0 }}>
                In-Game Accounts
              </h3>
            </div>
            <button
              onClick={openGameIdsModal}
              style={{
                background: '#FAF8F5',
                border: '1px solid #EBE4DA',
                padding: '4px 10px',
                borderRadius: '6px',
                fontSize: '11px',
                fontWeight: 700,
                color: '#FF6B4A',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              <Edit2 size={11} /> Edit IDs
            </button>
          </div>

          {userProfile?.games?.length > 0 ? (
            userProfile.games.map((g, i) => (
              <div key={i} style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '10px 0',
                borderBottom: i < userProfile.games.length - 1 ? '1px solid #F0ECE4' : 'none',
              }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '13px', color: '#2E2A26' }}>
                    {g.game === 'pubg' ? 'PUBG Mobile' : 'Free Fire'}
                  </div>
                  <div style={{ fontSize: '11px', color: '#8A8078', marginTop: '2px' }}>
                    IGN: <strong style={{ color: '#2E2A26' }}>{g.ign || 'Not set'}</strong>
                  </div>
                </div>
                <div style={{
                  background: '#F8F6F1',
                  padding: '3px 8px',
                  borderRadius: '6px',
                  fontFamily: 'monospace',
                  fontSize: '11px',
                  fontWeight: 700,
                  color: '#5E5851',
                }}>
                  UID: {g.uid || 'N/A'}
                </div>
              </div>
            ))
          ) : (
            <p style={{ fontSize: '12px', color: '#8A8078', margin: 0 }}>No game IDs registered yet.</p>
          )}
        </div>

        {/* Stats Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', marginBottom: '16px' }}>
          {[
            { label: 'Total Wins', value: userProfile?.totalWins || 0, color: '#FF6B4A', bg: '#FFF0EC' },
            { label: 'Tournaments Played', value: userProfile?.tournamentsPlayed || 0, color: '#2E2A26', bg: '#F8F6F1' },
            {
              label: 'Win Rate',
              value: userProfile?.tournamentsPlayed ? `${Math.round(((userProfile.totalWins || 0) / userProfile.tournamentsPlayed) * 100)}%` : '0%',
              color: '#3FA65C',
              bg: '#E8F5E9'
            },
          ].map(stat => (
            <div key={stat.label} style={{
              background: '#FFFFFF',
              borderRadius: '14px',
              padding: '14px',
              textAlign: 'center',
              border: '1px solid #EBE4DA',
            }}>
              <div style={{ fontFamily: "'Poppins', sans-serif", fontWeight: 800, fontSize: '20px', color: stat.color }}>
                {stat.value}
              </div>
              <div style={{ fontSize: '11px', color: '#8A8078', marginTop: '2px', fontWeight: 500 }}>{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Menu Navigation List */}
        <div style={{ background: '#FFFFFF', borderRadius: '16px', overflow: 'hidden', marginBottom: '20px', border: '1px solid #EBE4DA' }}>
          {menuItems.map((item, i) => (
            item.to ? (
              <Link key={item.label} to={item.to} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '14px 16px', textDecoration: 'none', color: '#2E2A26',
                borderBottom: i < menuItems.length - 1 ? '1px solid #F0ECE4' : 'none',
              }}>
                <span style={{ fontSize: '13px', fontWeight: 600 }}>{item.label}</span>
                <ChevronRight size={16} color="#A69E94" />
              </Link>
            ) : (
              <button key={item.label} onClick={item.action} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '14px 16px', textDecoration: 'none', color: item.color || '#2E2A26',
                borderBottom: i < menuItems.length - 1 ? '1px solid #F0ECE4' : 'none',
                background: 'none', border: 'none', width: '100%', cursor: 'pointer', textAlign: 'left',
              }}>
                <span style={{ fontSize: '13px', fontWeight: 600, color: item.color || '#2E2A26' }}>{item.label}</span>
                <ChevronRight size={16} color={item.color || '#A69E94'} />
              </button>
            )
          ))}
        </div>

        {/* Sign Out Button */}
        {showSignOutConfirm ? (
          <div style={{
            background: '#FFFFFF', borderRadius: '16px', padding: '18px', textAlign: 'center', border: '1px solid #FFCDD2',
          }}>
            <p style={{ fontSize: '13px', color: '#2E2A26', fontWeight: 600, margin: '0 0 14px' }}>Are you sure you want to sign out?</p>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => setShowSignOutConfirm(false)} style={{
                flex: 1, padding: '10px', background: '#F0ECE4', color: '#2E2A26',
                border: 'none', borderRadius: '8px', fontWeight: 600, fontSize: '13px', cursor: 'pointer',
              }}>
                Cancel
              </button>
              <button onClick={handleSignOut} style={{
                flex: 1, padding: '10px', background: '#D9503F', color: '#FFFFFF',
                border: 'none', borderRadius: '8px', fontWeight: 600, fontSize: '13px', cursor: 'pointer',
              }}>
                Yes, Sign Out
              </button>
            </div>
          </div>
        ) : (
          <button onClick={() => setShowSignOutConfirm(true)} style={{
            width: '100%', padding: '14px', background: '#FFF0EC', color: '#FF6B4A',
            border: '1px solid #FFDACF', borderRadius: '12px', fontWeight: 700, fontSize: '13px', cursor: 'pointer',
          }}>
            Sign Out
          </button>
        )}

      </div>

      {/* EDIT USERNAME MODAL */}
      {showEditUsername && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 200,
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px',
        }} onClick={() => setShowEditUsername(false)}>
          <div onClick={e => e.stopPropagation()} style={{
            background: '#FFFFFF', borderRadius: '18px', padding: '24px', width: '100%', maxWidth: '400px',
          }}>
            <h3 style={{ fontWeight: 800, fontSize: '16px', color: '#2E2A26', margin: '0 0 12px' }}>
              Update Username
            </h3>
            <form onSubmit={handleSaveUsername}>
              <input
                type="text"
                placeholder="Enter new username"
                value={newUsername}
                onChange={e => setNewUsername(e.target.value)}
                required
                style={{
                  width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #D9D3CC',
                  fontSize: '14px', marginBottom: '16px', boxSizing: 'border-box', outline: 'none',
                }}
              />
              <div style={{ display: 'flex', gap: '10px' }}>
                <button type="button" onClick={() => setShowEditUsername(false)} style={{
                  flex: 1, padding: '10px', background: '#F0ECE4', color: '#5E5851',
                  border: 'none', borderRadius: '8px', fontWeight: 600, fontSize: '13px', cursor: 'pointer',
                }}>
                  Cancel
                </button>
                <button type="submit" disabled={savingUsername} style={{
                  flex: 1, padding: '10px', background: '#FF6B4A', color: '#FFFFFF',
                  border: 'none', borderRadius: '8px', fontWeight: 700, fontSize: '13px', cursor: 'pointer',
                }}>
                  {savingUsername ? 'Saving...' : 'Save Username'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT GAME IDS MODAL */}
      {showEditGameIds && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 200,
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px',
        }} onClick={() => setShowEditGameIds(false)}>
          <div onClick={e => e.stopPropagation()} style={{
            background: '#FFFFFF', borderRadius: '18px', padding: '24px', width: '100%', maxWidth: '420px',
            maxHeight: '90vh', overflowY: 'auto',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <h3 style={{ fontWeight: 800, fontSize: '16px', color: '#2E2A26', margin: 0 }}>
                Update In-Game Accounts
              </h3>
              <button onClick={() => setShowEditGameIds(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                <X size={18} color="#8A8078" />
              </button>
            </div>

            <form onSubmit={handleSaveGameIds}>
              <div style={{ marginBottom: '16px' }}>
                <div style={{ fontSize: '12px', fontWeight: 700, color: '#FF6B4A', marginBottom: '6px' }}>
                  <><FaCrosshairs size={12} style={{display:'inline'}} /> PUBG Mobile</>
                </div>
                <input
                  type="text"
                  placeholder="PUBG In-Game Name (IGN)"
                  value={pubgIgn}
                  onChange={e => setPubgIgn(e.target.value)}
                  style={{
                    width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #D9D3CC',
                    fontSize: '13px', marginBottom: '8px', boxSizing: 'border-box', outline: 'none',
                  }}
                />
                <input
                  type="text"
                  placeholder="PUBG Character UID (e.g. 5123456789)"
                  value={pubgUid}
                  onChange={e => setPubgUid(e.target.value)}
                  style={{
                    width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #D9D3CC',
                    fontSize: '13px', boxSizing: 'border-box', outline: 'none',
                  }}
                />
              </div>

              <div style={{ marginBottom: '20px' }}>
                <div style={{ fontSize: '12px', fontWeight: 700, color: '#7B4FE0', marginBottom: '6px' }}>
                  <><FaFire size={12} style={{display:'inline'}} /> Free Fire</>
                </div>
                <input
                  type="text"
                  placeholder="Free Fire In-Game Name (IGN)"
                  value={ffIgn}
                  onChange={e => setFfIgn(e.target.value)}
                  style={{
                    width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #D9D3CC',
                    fontSize: '13px', marginBottom: '8px', boxSizing: 'border-box', outline: 'none',
                  }}
                />
                <input
                  type="text"
                  placeholder="Free Fire Character UID"
                  value={ffUid}
                  onChange={e => setFfUid(e.target.value)}
                  style={{
                    width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #D9D3CC',
                    fontSize: '13px', boxSizing: 'border-box', outline: 'none',
                  }}
                />
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button type="button" onClick={() => setShowEditGameIds(false)} style={{
                  flex: 1, padding: '10px', background: '#F0ECE4', color: '#5E5851',
                  border: 'none', borderRadius: '8px', fontWeight: 600, fontSize: '13px', cursor: 'pointer',
                }}>
                  Cancel
                </button>
                <button type="submit" disabled={savingGameIds} style={{
                  flex: 1, padding: '10px', background: '#FF6B4A', color: '#FFFFFF',
                  border: 'none', borderRadius: '8px', fontWeight: 700, fontSize: '13px', cursor: 'pointer',
                }}>
                  {savingGameIds ? 'Saving...' : 'Save Game IDs'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SUPPORT MODAL */}
      {showSupportModal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 200,
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px',
        }} onClick={() => setShowSupportModal(false)}>
          <div onClick={e => e.stopPropagation()} style={{
            background: '#FFFFFF', borderRadius: '18px', padding: '24px', width: '100%', maxWidth: '400px',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <h3 style={{ fontWeight: 800, fontSize: '16px', color: '#2E2A26', margin: 0 }}>
                Support & Helpdesk
              </h3>
              <button onClick={() => setShowSupportModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                <X size={18} color="#8A8078" />
              </button>
            </div>
            <p style={{ fontSize: '13px', color: '#5E5851', lineHeight: 1.5, margin: '0 0 16px' }}>
              Need help with custom room credentials, payment deposits, or withdrawal status? Contact our official support team.
            </p>
            <div style={{
              background: '#FFF9F5', padding: '14px', borderRadius: '10px', border: '1px solid #FFE4D3', marginBottom: '16px', fontSize: '12px', color: '#5E5851',
            }}>
              <div><><FaPhone size={14} style={{display:'inline'}} /> <strong>WhatsApp Support</strong></>: Available 24/7</div>
              <div style={{ marginTop: '4px' }}><><FaClock size={14} style={{display:'inline'}} /> <strong>Payout Processing</strong></>: Within 1-2 Hours</div>
            </div>
            <button onClick={() => setShowSupportModal(false)} style={{
              width: '100%', padding: '12px', background: '#FF6B4A', color: '#FFFFFF', border: 'none', borderRadius: '8px', fontWeight: 700, fontSize: '13px', cursor: 'pointer',
            }}>
              Close
            </button>
          </div>
        </div>
      )}

      {/* PRIVACY MODAL */}
      {showPrivacyModal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 200,
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px',
        }} onClick={() => setShowPrivacyModal(false)}>
          <div onClick={e => e.stopPropagation()} style={{
            background: '#FFFFFF', borderRadius: '18px', padding: '24px', width: '100%', maxWidth: '420px',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <h3 style={{ fontWeight: 800, fontSize: '16px', color: '#2E2A26', margin: 0 }}>
                Privacy Policy
              </h3>
              <button onClick={() => setShowPrivacyModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                <X size={18} color="#8A8078" />
              </button>
            </div>
            <p style={{ fontSize: '12px', color: '#5E5851', lineHeight: 1.6, margin: '0 0 16px' }}>
              NabPrize Esports respects your privacy. We collect your mobile number, email, and gaming IDs solely for tournament matchmaking and payout processing via JazzCash / EasyPaisa. We never sell your personal data to third parties.
            </p>
            <button onClick={() => setShowPrivacyModal(false)} style={{
              width: '100%', padding: '12px', background: '#2E2A26', color: '#FFFFFF', border: 'none', borderRadius: '8px', fontWeight: 700, fontSize: '13px', cursor: 'pointer',
            }}>
              Understood
            </button>
          </div>
        </div>
      )}

      <ReportModal isOpen={showReportModal} onClose={() => setShowReportModal(false)} />

    </>
  );
}
