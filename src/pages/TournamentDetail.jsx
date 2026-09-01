import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { doc, getDoc, collection, query, onSnapshot, runTransaction, serverTimestamp, increment } from 'firebase/firestore';
import { db, auth } from '../firebase/config';
import { useAuth } from '../hooks/useAuth';
import { useServerTime } from '../hooks/useServerTime';
import TopBar from '../components/TopBar';
import LoadingSpinner from '../components/LoadingSpinner';
import { sounds } from '../utils/sounds';
import { Clock, Users, Shield, X, Key, Copy, Check, Lock, Sparkles, Play, AlertCircle, Info } from 'lucide-react';

export default function TournamentDetail() {
  const { id } = useParams();
  const { userProfile, refreshProfile } = useAuth();
  const { getNow } = useServerTime();

  const [tournament, setTournament] = useState(null);
  const [registeredPlayers, setRegisteredPlayers] = useState([]);
  const [isRegistered, setIsRegistered] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showJoinSheet, setShowJoinSheet] = useState(false);
  const [joinStep, setJoinStep] = useState(1);
  const [agreed, setAgreed] = useState(false);
  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState('');
  const [copiedField, setCopiedField] = useState(null);
  const [currentTime, setCurrentTime] = useState(() => getNow());

  // Tick every second using server-corrected time (anti-cheat)
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(getNow()), 1000);
    return () => clearInterval(timer);
  }, [getNow]);

  useEffect(() => {
    const docRef = doc(db, 'tournaments', id);
    const unsub = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        setTournament({ id: docSnap.id, ...docSnap.data() });
      } else {
        setTournament(null);
      }
      setLoading(false);
    }, (err) => {
      console.error('Tournament snapshot error:', err);
      setLoading(false);
    });
    return unsub;
  }, [id]);

  useEffect(() => {
    const q = query(collection(db, 'tournaments', id, 'players'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const players = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      setRegisteredPlayers(players);
      setIsRegistered(players.some(p => p.userId === auth.currentUser?.uid));
    });
    return unsubscribe;
  }, [id]);

  const handleCopy = (text, fieldName) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2000);
  };

  // PKT Match Schedule & Timing Calculations
  const getTimelineInfo = () => {
    if (!tournament?.startTime) return null;
    const regCloseDate = tournament.startTime.toDate ? tournament.startTime.toDate() : new Date(tournament.startTime);
    if (isNaN(regCloseDate.getTime())) return null;

    // 10 minutes room joining window
    const matchStartDate = new Date(regCloseDate.getTime() + 10 * 60 * 1000);

    const now = currentTime; // already a ms number from getNow()
    const diffToRegClose = regCloseDate.getTime() - now;
    const diffToMatchStart = matchStartDate.getTime() - now;

    const regCloseStr = regCloseDate.toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit', hour12: true }) + ' PKT';
    const matchStartStr = matchStartDate.toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit', hour12: true }) + ' PKT';

    // Smart day label: Today / Tomorrow / Sep 3
    const serverNowDate = new Date(now);
    const todayStr = serverNowDate.toDateString();
    const tomorrowDate = new Date(serverNowDate); tomorrowDate.setDate(tomorrowDate.getDate() + 1);
    const tomorrowStr = tomorrowDate.toDateString();
    const matchDateStr = regCloseDate.toDateString();
    let dayLabel;
    if (matchDateStr === todayStr) dayLabel = 'Today';
    else if (matchDateStr === tomorrowStr) dayLabel = 'Tomorrow';
    else dayLabel = regCloseDate.toLocaleDateString('en-PK', { month: 'short', day: 'numeric' });

    const isRegOpen = diffToRegClose > 0 && (tournament.slotsFilled || 0) < tournament.maxSlots;
    const isRoomWindow = diffToRegClose <= 0 && diffToMatchStart > 0;
    const isMatchLive = tournament.status === 'live';

    const formatCountdown = (diffMs) => {
      if (diffMs <= 0) return '00:00';
      const m = Math.floor(diffMs / 60000);
      const s = Math.floor((diffMs % 60000) / 1000);
      const h = Math.floor(m / 60);
      if (h > 0) return `${h}h ${m % 60}m ${s}s`;
      return `${m}m ${s < 10 ? '0' : ''}${s}s`;
    };

    return {
      regCloseDate,
      matchStartDate,
      regCloseStr,
      matchStartStr,
      dayLabel,
      isRegOpen,
      isRoomWindow,
      isMatchLive,
      diffToRegClose,
      diffToMatchStart,
      regCountdown: formatCountdown(diffToRegClose),
      matchCountdown: formatCountdown(diffToMatchStart),
    };
  };

  const timeline = getTimelineInfo();

  const handleJoin = async () => {
    if (!userProfile || !tournament) return;
    const isFree = !tournament.registrationCharge || tournament.registrationCharge === 0;
    if (!isFree && userProfile.walletBalance < tournament.registrationCharge) {
      setJoinError('insufficient');
      return;
    }
    if ((tournament.slotsFilled || 0) >= tournament.maxSlots) {
      setJoinError('full');
      return;
    }

    setJoining(true);
    setJoinError('');
    try {
      await runTransaction(db, async (transaction) => {
        const tournamentRef = doc(db, 'tournaments', id);
        const userRef = doc(db, 'users', auth.currentUser.uid);
        const playerRef = doc(db, 'tournaments', id, 'players', auth.currentUser.uid);

        const tournamentSnap = await transaction.get(tournamentRef);
        const userSnap = await transaction.get(userRef);
        const playerSnap = await transaction.get(playerRef);

        if (!tournamentSnap.exists()) throw new Error('Tournament not found');
        if (!userSnap.exists()) throw new Error('User not found');
        if (playerSnap.exists()) throw new Error('already_registered');

        const tData = tournamentSnap.data();
        const uData = userSnap.data();

        if (!tData.maxSlots) throw new Error('Tournament misconfigured');
        if ((tData.slotsFilled || 0) >= tData.maxSlots) throw new Error('full');
        const tIsFree = !tData.registrationCharge || tData.registrationCharge === 0;
        if (!tIsFree && uData.walletBalance < tData.registrationCharge) throw new Error('insufficient');
        if (tData.status !== 'upcoming') throw new Error('registration_closed');

        // Deduct wallet only for paid tournaments
        if (!tIsFree) {
          transaction.update(userRef, {
            walletBalance: uData.walletBalance - tData.registrationCharge,
            tournamentsPlayed: increment(1),
          });
        } else {
          transaction.update(userRef, {
            tournamentsPlayed: increment(1),
          });
        }

        // Increment slots
        transaction.update(tournamentRef, {
          slotsFilled: increment(1)
        });

        // Create registration
        const games = uData.games || [];
        const primaryGame = games.find(g => g.game === tData.game) || games[0];

        transaction.set(playerRef, {
          userId: auth.currentUser.uid,
          username: uData.username,
          ign: primaryGame?.ign || 'Unknown',
          uid: primaryGame?.uid || '',
          registeredAt: serverTimestamp(),
          status: 'registered',
        });

        // Log transaction only for paid tournaments
        if (!tIsFree) {
          const txnRef = doc(collection(db, 'transactions', auth.currentUser.uid, 'history'));
          transaction.set(txnRef, {
            type: 'debit',
            amount: tData.registrationCharge,
            description: `Tournament: ${tData.name}`,
            timestamp: serverTimestamp(),
            status: 'completed',
          });
        }
      });

      setJoinStep(3);
      await refreshProfile();
      sounds.join();
    } catch (err) {
      if (err.message === 'full') setJoinError('full');
      else if (err.message === 'insufficient') setJoinError('insufficient');
      else if (err.message === 'already_registered') setJoinError('already_registered');
      else if (err.message === 'registration_closed') setJoinError('closed');
      else setJoinError('failed');
    }
    setJoining(false);
  };

  if (loading) {
    return (
      <>
        <TopBar title="Tournament Details" showBack />
        <LoadingSpinner text="Loading match details..." />
      </>
    );
  }

  if (!tournament) {
    return (
      <>
        <TopBar title="Tournament Not Found" showBack />
        <div style={{ padding: '40px', textAlign: 'center', color: '#D9503F' }}>
          Tournament not found or deleted.
        </div>
      </>
    );
  }

  return (
    <>
      <TopBar title={tournament.name} showBack />
      <div style={{ padding: '16px 16px 120px' }}>
        
        {/* Esports Hero Card */}
        <div style={{
          background: tournament.game === 'pubg'
            ? 'linear-gradient(135deg, #1A1715 0%, #3B3026 100%)'
            : 'linear-gradient(135deg, #13111E 0%, #2A1F44 100%)',
          borderRadius: '20px',
          padding: '22px',
          marginBottom: '16px',
          color: '#FFFFFF',
          boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
          position: 'relative',
          overflow: 'hidden',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{
              fontSize: '11px',
              fontWeight: 800,
              padding: '3px 8px',
              borderRadius: '6px',
              background: tournament.game === 'pubg' ? '#FF6B4A' : '#7B4FE0',
              color: '#FFFFFF',
              letterSpacing: '0.5px',
            }}>
              {tournament.game === 'pubg' ? 'PUBG MOBILE' : 'FREE FIRE'}
            </span>

            {timeline?.isMatchLive || tournament.status === 'live' ? (
              <span style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                fontSize: '11px',
                fontWeight: 800,
                color: '#FFFFFF',
                background: '#3FA65C',
                padding: '3px 10px',
                borderRadius: '12px',
              }}>
                ● LIVE NOW
              </span>
            ) : timeline?.isRoomWindow ? (
              <span style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                fontSize: '11px',
                fontWeight: 800,
                color: '#FFFFFF',
                background: '#E88B00',
                padding: '3px 10px',
                borderRadius: '12px',
              }}>
                🔥 ROOM OPEN (10m)
              </span>
            ) : (
              <span style={{
                fontSize: '11px',
                fontWeight: 600,
                background: 'rgba(255,255,255,0.15)',
                padding: '3px 8px',
                borderRadius: '8px',
              }}>
                Reg Ends: {timeline?.regCountdown}
              </span>
            )}
          </div>

          <h1 style={{
            fontFamily: "'Poppins', sans-serif",
            fontWeight: 800,
            fontSize: 'clamp(16px, 5vw, 20px)',
            margin: '0 0 10px',
            lineHeight: 1.35,
            wordBreak: 'break-word',
          }}>
            {tournament.name}
          </h1>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '12px', opacity: 0.85 }}>
            <span>{tournament.matchType || 'Solo'}</span>
            <span>•</span>
            <span>Map: {tournament.mapName || 'Erangel'}</span>
            <span>•</span>
            <span>{tournament.tournamentType || 'Daily'}</span>
          </div>
        </div>

        {/* PKT OFFICIAL MATCH TIMELINE SCHEDULE CARD */}
        <div style={{
          background: '#FFFFFF',
          borderRadius: '16px',
          padding: '16px',
          marginBottom: '16px',
          border: '1px solid #EBE4DA',
          boxShadow: '0 2px 6px rgba(0,0,0,0.02)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '12px' }}>
            <Clock size={16} color="#FF6B4A" />
            <h3 style={{ fontWeight: 700, fontSize: '14px', color: '#2E2A26', margin: 0 }}>
              Official Match Timeline (PKT)
            </h3>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            
            {/* Step 1: Registration End */}
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
              <div style={{
                width: '24px',
                height: '24px',
                borderRadius: '50%',
                background: timeline?.isRegOpen ? '#FFF0EC' : '#F0ECE4',
                color: timeline?.isRegOpen ? '#FF6B4A' : '#8A8078',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 700,
                fontSize: '11px',
                flexShrink: 0,
              }}>
                1
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '13px', fontWeight: 600, color: '#2E2A26' }}>
                    Registration Closes
                  </span>
                  <span style={{ fontSize: '12px', fontWeight: 700, color: '#E8552F' }}>
                    {timeline ? `${timeline.dayLabel} • ${timeline.regCloseStr}` : 'TBD'}
                  </span>
                </div>
                <div style={{ fontSize: '11px', color: '#8A8078' }}>
                  {timeline?.isRegOpen ? `Closes in ${timeline.regCountdown}` : 'Registration has closed'}
                </div>
              </div>
            </div>

            {/* Step 2: 10 mins Room Joining Window */}
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
              <div style={{
                width: '24px',
                height: '24px',
                borderRadius: '50%',
                background: timeline?.isRoomWindow ? '#FFF8E1' : '#F0ECE4',
                color: timeline?.isRoomWindow ? '#E88B00' : '#8A8078',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 700,
                fontSize: '11px',
                flexShrink: 0,
              }}>
                2
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '13px', fontWeight: 600, color: '#2E2A26' }}>
                    Room Joining Window (10 Mins)
                  </span>
                  <span style={{ fontSize: '12px', fontWeight: 700, color: '#E88B00' }}>
                    10 Mins Window
                  </span>
                </div>
                <div style={{ fontSize: '11px', color: '#8A8078' }}>
                  Room ID & Password active for registered players to join in-game
                </div>
              </div>
            </div>

            {/* Step 3: Match Starts */}
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
              <div style={{
                width: '24px',
                height: '24px',
                borderRadius: '50%',
                background: timeline?.isMatchLive ? '#E8F5E9' : '#F0ECE4',
                color: timeline?.isMatchLive ? '#3FA65C' : '#8A8078',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 700,
                fontSize: '11px',
                flexShrink: 0,
              }}>
                3
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '13px', fontWeight: 600, color: '#2E2A26' }}>
                    Match Starts / Goes Live
                  </span>
                  <span style={{ fontSize: '12px', fontWeight: 700, color: '#3FA65C' }}>
                    {timeline ? `${timeline.dayLabel} • ${timeline.matchStartStr}` : 'TBD'}
                  </span>
                </div>
                <div style={{ fontSize: '11px', color: '#8A8078' }}>
                  {timeline?.isMatchLive ? 'Match in progress' : `Starts in ${timeline?.matchCountdown || '10m'}`}
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* CUSTOM ROOM CREDENTIALS (ROOM ID & PASSWORD) CARD */}
        {isRegistered ? (
          <div style={{
            background: '#FFFFFF',
            borderRadius: '16px',
            padding: '18px',
            marginBottom: '16px',
            border: tournament.roomId ? '2px solid #F4B740' : '1px solid #FFE4D3',
            boxShadow: tournament.roomId ? '0 4px 14px rgba(244, 183, 64, 0.15)' : 'none',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Key size={18} color="#FF6B4A" />
                <h3 style={{ fontWeight: 800, fontSize: '15px', color: '#2E2A26', margin: 0 }}>
                  Custom Room Credentials
                </h3>
              </div>
              <span style={{
                fontSize: '11px',
                fontWeight: 700,
                padding: '2px 8px',
                borderRadius: '6px',
                background: tournament.roomId ? '#E8F5E9' : '#FFF8E1',
                color: tournament.roomId ? '#3FA65C' : '#E88B00',
              }}>
                {tournament.roomId ? 'Room Ready' : 'Pending Release'}
              </span>
            </div>

            {tournament.roomId ? (
              <div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '12px' }}>
                  
                  {/* Room ID Box */}
                  <div style={{
                    background: '#FAF8F5',
                    borderRadius: '10px',
                    padding: '10px 12px',
                    border: '1px solid #EBE4DA',
                  }}>
                    <div style={{ fontSize: '10px', color: '#8A8078', fontWeight: 700, textTransform: 'uppercase' }}>Room ID</div>
                    <div style={{
                      fontFamily: 'monospace',
                      fontWeight: 800,
                      fontSize: '16px',
                      color: '#2E2A26',
                      margin: '4px 0 8px',
                    }}>
                      {tournament.roomId}
                    </div>
                    <button
                      onClick={() => handleCopy(tournament.roomId, 'roomId')}
                      style={{
                        width: '100%',
                        padding: '6px',
                        borderRadius: '6px',
                        border: 'none',
                        background: '#FF6B4A',
                        color: '#FFFFFF',
                        fontWeight: 700,
                        fontSize: '11px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '4px',
                      }}
                    >
                      {copiedField === 'roomId' ? <Check size={12} /> : <Copy size={12} />}
                      {copiedField === 'roomId' ? 'Copied ID!' : 'Copy ID'}
                    </button>
                  </div>

                  {/* Password Box */}
                  <div style={{
                    background: '#FAF8F5',
                    borderRadius: '10px',
                    padding: '10px 12px',
                    border: '1px solid #EBE4DA',
                  }}>
                    <div style={{ fontSize: '10px', color: '#8A8078', fontWeight: 700, textTransform: 'uppercase' }}>Password</div>
                    <div style={{
                      fontFamily: 'monospace',
                      fontWeight: 800,
                      fontSize: '16px',
                      color: '#2E2A26',
                      margin: '4px 0 8px',
                    }}>
                      {tournament.roomPassword || 'No Pass'}
                    </div>
                    <button
                      onClick={() => handleCopy(tournament.roomPassword, 'roomPass')}
                      disabled={!tournament.roomPassword}
                      style={{
                        width: '100%',
                        padding: '6px',
                        borderRadius: '6px',
                        border: 'none',
                        background: tournament.roomPassword ? '#2E2A26' : '#C4BCB2',
                        color: '#FFFFFF',
                        fontWeight: 700,
                        fontSize: '11px',
                        cursor: tournament.roomPassword ? 'pointer' : 'not-allowed',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '4px',
                      }}
                    >
                      {copiedField === 'roomPass' ? <Check size={12} /> : <Copy size={12} />}
                      {copiedField === 'roomPass' ? 'Copied Pass!' : 'Copy Pass'}
                    </button>
                  </div>

                </div>

                <div style={{
                  fontSize: '11px',
                  color: '#5E5851',
                  background: '#FFF9F5',
                  padding: '8px 12px',
                  borderRadius: '8px',
                  border: '1px solid #FFE4D3',
                  lineHeight: 1.4,
                }}>
                  👉 Open <strong>{tournament.game === 'pubg' ? 'PUBG Mobile' : 'Free Fire'}</strong>, go to Custom Room, enter Room ID & Password to join before match starts at <strong>{timeline?.matchStartStr}</strong>!
                </div>
              </div>
            ) : (
              <div style={{
                background: '#FFF9F5',
                borderRadius: '10px',
                padding: '14px',
                border: '1px solid #FFE4D3',
                textAlign: 'center',
              }}>
                <Lock size={24} color="#E88B00" style={{ margin: '0 auto 6px', display: 'block' }} />
                <div style={{ fontWeight: 700, fontSize: '13px', color: '#2E2A26', marginBottom: '2px' }}>
                  Room ID & Password will appear here
                </div>
                <div style={{ fontSize: '11px', color: '#8A8078' }}>
                  Admin will release credentials at <strong>{timeline?.regCloseStr || '8:00 PM PKT'}</strong> (10 mins room joining window).
                </div>
              </div>
            )}
          </div>
        ) : null}

        {/* Info Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '10px',
          marginBottom: '16px',
        }}>
          {[
            { label: 'Registration Fee', value: `Rs ${tournament.registrationCharge}`, color: '#2E2A26' },
            { label: 'Winner Cash Reward', value: `Rs ${tournament.fixedReward}`, color: '#FF6B4A' },
            { label: 'Player Slots', value: `${tournament.slotsFilled || 0}/${tournament.maxSlots}`, color: '#2E2A26' },
            { label: 'Match Format', value: tournament.matchType || 'Solo', color: '#2E2A26' },
          ].map(item => (
            <div key={item.label} style={{
              background: '#FFFFFF',
              borderRadius: '14px',
              padding: '14px',
              border: '1px solid #EBE4DA',
            }}>
              <div style={{ fontSize: '11px', color: '#8A8078', marginBottom: '4px' }}>{item.label}</div>
              <div style={{ fontFamily: "'Poppins', sans-serif", fontWeight: 800, fontSize: '16px', color: item.color }}>
                {item.value}
              </div>
            </div>
          ))}
        </div>

        {/* Custom Rules */}
        {tournament.rules && (
          <div style={{ background: '#FFFFFF', borderRadius: '14px', padding: '16px', marginBottom: '16px', border: '1px solid #EBE4DA' }}>
            <h3 style={{ fontFamily: "'Poppins', sans-serif", fontWeight: 700, fontSize: '14px', color: '#2E2A26', marginBottom: '8px' }}>
              Match Rules & Regulations
            </h3>
            <p style={{ fontSize: '12px', color: '#5E5851', lineHeight: '1.6', margin: 0 }}>{tournament.rules}</p>
          </div>
        )}

        {/* Registered Players List */}
        <div style={{ background: '#FFFFFF', borderRadius: '14px', padding: '16px', marginBottom: '16px', border: '1px solid #EBE4DA' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Users size={16} color="#FF6B4A" />
              <h3 style={{ fontFamily: "'Poppins', sans-serif", fontWeight: 700, fontSize: '14px', color: '#2E2A26', margin: 0 }}>
                Joined Players ({registeredPlayers.length}/{tournament.maxSlots})
              </h3>
            </div>
            <span style={{ fontSize: '11px', color: '#8A8078', fontWeight: 600 }}>
              {tournament.maxSlots - (tournament.slotsFilled || 0)} slots left
            </span>
          </div>

          {registeredPlayers.length === 0 ? (
            <p style={{ fontSize: '12px', color: '#8A8078', textAlign: 'center', padding: '16px' }}>
              No players yet. Be the first to join and secure your slot!
            </p>
          ) : (
            <div style={{ maxHeight: '220px', overflowY: 'auto' }}>
              {registeredPlayers.map((player, i) => (
                <div key={player.id} style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '8px 0',
                  borderBottom: i < registeredPlayers.length - 1 ? '1px solid #F0ECE4' : 'none',
                }}>
                  <div style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    background: '#FFF0EC',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 700,
                    fontSize: '12px',
                    color: '#FF6B4A',
                    flexShrink: 0,
                  }}>
                    {(player.username || 'U')[0].toUpperCase()}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: '13px', color: '#2E2A26' }}>
                      @{player.username}
                    </div>
                    <div style={{ display: 'flex', gap: '8px', fontSize: '11px', color: '#8A8078', marginTop: '2px' }}>
                      <span>IGN: <strong>{player.ign || 'Player'}</strong></span>
                      {player.uid && <span>• UID: <code style={{ background: '#F0ECE4', padding: '1px 5px', borderRadius: '4px', fontSize: '10px' }}>{player.uid}</code></span>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Fair Play Guarantee */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '12px 16px',
          background: '#FFFFFF',
          borderRadius: '12px',
          border: '1px solid #EBE4DA',
        }}>
          <Shield size={16} color="#3FA65C" />
          <span style={{ fontSize: '12px', color: '#3FA65C', fontWeight: 600 }}>100% Fair Play Verified</span>
          <span style={{ fontSize: '11px', color: '#8A8078' }}>— Manual score validation by admins</span>
        </div>

      </div>

      {/* Sticky Bottom Action Bar */}
      <div style={{
        position: 'fixed',
        bottom: '64px',
        left: '50%',
        transform: 'translateX(-50%)',
        width: '100%',
        maxWidth: '480px',
        padding: '12px 16px',
        background: '#FFFFFF',
        borderTop: '1px solid #EBE4DA',
        zIndex: 90,
      }}>
        {isRegistered ? (
          <div style={{
            width: '100%',
            padding: '13px',
            background: '#E8F5E9',
            color: '#2E7D32',
            borderRadius: '12px',
            fontWeight: 700,
            fontSize: '14px',
            textAlign: 'center',
            border: '1px solid #C8E6C9',
          }}>
            ✓ You are Registered for this Match
          </div>
        ) : !timeline?.isRegOpen ? (
          <div style={{
            width: '100%',
            padding: '13px',
            background: '#F0ECE4',
            color: '#8A8078',
            borderRadius: '12px',
            fontWeight: 700,
            fontSize: '14px',
            textAlign: 'center',
          }}>
            Registration Closed ({timeline?.regCloseStr})
          </div>
        ) : (
          <button
            onClick={() => { setShowJoinSheet(true); setJoinStep(1); setAgreed(false); setJoinError(''); }}
            style={{
              width: '100%',
              padding: '14px',
              background: '#FF6B4A',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: '12px',
              fontWeight: 700,
              fontSize: '14px',
              cursor: 'pointer',
              boxShadow: '0 4px 16px rgba(255,107,74,0.35)',
            }}
          >
            Join Tournament • Rs {tournament.registrationCharge}
          </button>
        )}
      </div>

      {/* Join Confirmation & Payment Bottom Sheet */}
      {showJoinSheet && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.5)', zIndex: 200,
          display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
        }} onClick={() => setShowJoinSheet(false)}>
          <div onClick={e => e.stopPropagation()} style={{
            width: '100%', maxWidth: '480px', background: '#FFFFFF', borderRadius: '20px 20px 0 0',
            padding: '24px 20px', maxHeight: '80vh', overflowY: 'auto',
          }}>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '8px' }}>
              <button onClick={() => setShowJoinSheet(false)} style={{
                background: '#F0ECE4', border: 'none', borderRadius: '50%', width: '32px', height: '32px',
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <X size={16} color="#2E2A26" />
              </button>
            </div>

            {/* Step 1: Confirmation */}
            {joinStep === 1 && (
              <>
                <h2 style={{ fontFamily: "'Poppins', sans-serif", fontWeight: 700, fontSize: '18px', color: '#2E2A26', marginBottom: '8px' }}>
                  Confirm Registration
                </h2>
                <div style={{
                  background: tournament?.registrationCharge > 0 ? '#FFF9F5' : '#E8F5E9',
                  borderRadius: '10px',
                  padding: '12px 14px',
                  marginBottom: '16px',
                  border: tournament?.registrationCharge > 0 ? '1px solid #FFE4D3' : '1px solid #C8E6C9',
                  fontSize: '12px',
                  color: '#5E5851',
                  lineHeight: 1.5,
                }}>
                  {tournament?.registrationCharge > 0 ? (
                    <>Registration Fee: <strong>Rs {tournament.registrationCharge}</strong>. </>
                  ) : (
                    <>Registration is <strong style={{ color: '#2E7D32' }}>FREE</strong>. </>
                  )}
                  Room ID will be released at <strong>{timeline?.regCloseStr}</strong> with a 10-minute joining window before match starts at <strong>{timeline?.matchStartStr}</strong>.
                </div>

                <label style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', marginBottom: '20px', cursor: 'pointer' }}>
                  <input type="checkbox" checked={agreed} onChange={e => setAgreed(e.target.checked)} style={{ marginTop: '2px' }} />
                  <span style={{ fontSize: '13px', color: '#2E2A26', fontWeight: 500 }}>
                    I agree to follow the match rules and join within the 10-minute room window.
                  </span>
                </label>

                <button
                  onClick={() => {
                    if (tournament?.registrationCharge > 0) {
                      setJoinStep(2);
                    } else {
                      handleJoin();
                    }
                  }}
                  disabled={!agreed}
                  style={{
                    width: '100%', padding: '14px',
                    background: agreed ? '#FF6B4A' : '#C4BCB2',
                    color: '#FFFFFF', border: 'none', borderRadius: '12px', fontWeight: 700,
                    fontSize: '14px', cursor: agreed ? 'pointer' : 'not-allowed',
                  }}
                >
                  {tournament?.registrationCharge > 0 ? 'Continue to Payment' : 'Register for Free'}
                </button>
              </>
            )}

            {/* Step 2: Payment */}
            {joinStep === 2 && (
              <>
                <h2 style={{ fontFamily: "'Poppins', sans-serif", fontWeight: 700, fontSize: '18px', color: '#2E2A26', marginBottom: '12px' }}>
                  Pay from Wallet
                </h2>

                {joinError === 'insufficient' && (
                  <div style={{ background: '#FFEBEE', color: '#D9503F', padding: '12px', borderRadius: '10px', fontSize: '13px', marginBottom: '16px', textAlign: 'center' }}>
                    Insufficient balance. Available: Rs {userProfile?.walletBalance || 0}.
                  </div>
                )}
                {joinError === 'full' && (
                  <div style={{ background: '#FFEBEE', color: '#D9503F', padding: '12px', borderRadius: '10px', fontSize: '13px', marginBottom: '16px', textAlign: 'center' }}>
                    Sorry, this tournament has just filled up.
                  </div>
                )}
                {joinError === 'closed' && (
                  <div style={{ background: '#FFEBEE', color: '#D9503F', padding: '12px', borderRadius: '10px', fontSize: '13px', marginBottom: '16px', textAlign: 'center' }}>
                    Registration is closed for this tournament.
                  </div>
                )}
                {joinError === 'already_registered' && (
                  <div style={{ background: '#FFF3E0', color: '#E8552F', padding: '12px', borderRadius: '10px', fontSize: '13px', marginBottom: '16px', textAlign: 'center' }}>
                    You are already registered for this tournament.
                  </div>
                )}
                {joinError === 'failed' && (
                  <div style={{ background: '#FFEBEE', color: '#D9503F', padding: '12px', borderRadius: '10px', fontSize: '13px', marginBottom: '16px', textAlign: 'center' }}>
                    Registration failed. Please try again.
                  </div>
                )}

                {userProfile?.walletBalance >= tournament.registrationCharge ? (
                  <button
                    onClick={handleJoin}
                    disabled={joining}
                    style={{
                      width: '100%', padding: '14px', background: '#FF6B4A', color: '#FFFFFF',
                      border: 'none', borderRadius: '12px', fontWeight: 700, fontSize: '14px',
                      cursor: 'pointer', boxShadow: '0 4px 16px rgba(255,107,74,0.3)',
                      opacity: joining ? 0.7 : 1,
                    }}
                  >
                    {joining ? 'Processing Registration...' : `Pay Rs ${tournament.registrationCharge} & Confirm Slot`}
                  </button>
                ) : (
                  <div style={{ textAlign: 'center' }}>
                    <p style={{ fontSize: '13px', color: '#8A8078', marginBottom: '12px' }}>
                      Your Wallet Balance: Rs {userProfile?.walletBalance || 0}
                    </p>
                    <Link
                      to="/add-funds"
                      style={{
                        display: 'block', padding: '14px', background: '#FF6B4A', color: '#FFFFFF',
                        border: 'none', borderRadius: '12px', fontWeight: 700, fontSize: '14px',
                        textDecoration: 'none', textAlign: 'center',
                      }}
                    >
                      + Add Funds to Wallet
                    </Link>
                  </div>
                )}

                <button
                  onClick={() => setJoinStep(1)}
                  style={{
                    width: '100%', padding: '12px', background: 'transparent', color: '#8A8078',
                    border: 'none', fontSize: '13px', cursor: 'pointer', marginTop: '8px',
                  }}
                >
                  ← Back
                </button>
              </>
            )}

            {/* Step 3: Success */}
            {joinStep === 3 && (
              <div style={{ textAlign: 'center', padding: '20px 0' }}>
                <div style={{ fontSize: '48px', marginBottom: '12px' }}>🎉</div>
                <h2 style={{ fontFamily: "'Poppins', sans-serif", fontWeight: 800, fontSize: '20px', color: '#2E2A26', marginBottom: '8px' }}>
                  {tournament?.registrationCharge > 0 ? 'Slot Reserved Successfully!' : 'Registered Successfully!'}
                </h2>
                <p style={{ fontSize: '13px', color: '#5E5851', marginBottom: '20px', lineHeight: 1.5 }}>
                  {tournament?.registrationCharge > 0
                    ? <>You are registered! Check back here at <strong>{timeline?.regCloseStr}</strong> to copy your Room ID & Password during the 10-minute joining window.</>
                    : <>You're in for free! Check back here at <strong>{timeline?.regCloseStr}</strong> to copy your Room ID & Password during the 10-minute joining window.</>
                  }
                </p>
                <button
                  onClick={() => setShowJoinSheet(false)}
                  style={{
                    width: '100%', padding: '14px', background: '#3FA65C', color: '#FFFFFF',
                    border: 'none', borderRadius: '12px', fontWeight: 700, fontSize: '14px', cursor: 'pointer',
                  }}
                >
                  View Room Screen
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
