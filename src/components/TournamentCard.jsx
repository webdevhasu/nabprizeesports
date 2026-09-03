import { Link } from 'react-router-dom';
import { Trophy, Users, Clock, ChevronRight } from 'lucide-react';
import { FaFire } from 'react-icons/fa';

// Banner image map based on game + tournament type
const BANNER_MAP = {
  pubg: {
    weekly: '/banner-pubg-weekly.jpg',
    special: '/banner-pubg-weekly.jpg',
    default: '/banner-pubg-daily.jpg',
  },
  freefire: {
    weekly: '/banner-ff-weekly.jpg',
    special: '/banner-ff-weekly.jpg',
    default: '/banner-ff-daily.jpg',
  },
};

function getBanner(game, tournamentType) {
  const gameKey = game === 'pubg' ? 'pubg' : 'freefire';
  const map = BANNER_MAP[gameKey];
  const typeKey = tournamentType?.toLowerCase() || '';
  if (typeKey.includes('weekly') || typeKey.includes('special')) return map.weekly;
  return map.default;
}

export default function TournamentCard({ tournament, isRegistered = false }) {
  const registrationLoading = isRegistered === null;
  const isLive = tournament.status === 'live';
  const slotsFilled = tournament.slotsFilled || 0;
  const maxSlots = tournament.maxSlots || 25;
  const fillPercentage = Math.min(100, Math.round((slotsFilled / maxSlots) * 100));
  const isNearlyFull = fillPercentage >= 85;
  const isFull = slotsFilled >= maxSlots;
  const isWeekly = tournament.tournamentType === 'Weekly Championship' || tournament.tournamentType === 'Special Cup';
  const isFree = !tournament.registrationCharge || tournament.registrationCharge === 0;

  const bannerSrc = getBanner(tournament.game, tournament.tournamentType);

  const getTimingDetails = (startTime) => {
    if (!startTime) return { label: 'Schedule TBD', isRoomWindow: false, isLiveMatch: false };
    const regClose = startTime.toDate ? startTime.toDate() : new Date(startTime);
    if (isNaN(regClose.getTime())) return { label: 'Schedule TBD', isRoomWindow: false, isLiveMatch: false };

    const matchStart = new Date(regClose.getTime() + 10 * 60 * 1000);
    const now = new Date().getTime();
    const diffToRegClose = regClose.getTime() - now;
    const diffToMatchStart = matchStart.getTime() - now;
    const regCloseStr = regClose.toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit', hour12: true }) + ' PKT';
    const matchStartStr = matchStart.toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit', hour12: true }) + ' PKT';

    if (diffToMatchStart <= 0 || isLive) {
      return { label: '● LIVE NOW', isRoomWindow: false, isLiveMatch: true, regCloseStr, matchStartStr };
    }
    if (diffToRegClose <= 0 && diffToMatchStart > 0) {
      const minsLeft = Math.ceil(diffToMatchStart / 60000);
      return { label: (<><FaFire size={12} style={{display:'inline'}} /> Room Open ({minsLeft}m to start)</>), isRoomWindow: true, isLiveMatch: false, regCloseStr, matchStartStr };
    }

    const hours = Math.floor(diffToRegClose / 3600000);
    const mins = Math.floor((diffToRegClose % 3600000) / 60000);
    let countdownStr = `${mins}m`;
    if (hours > 24) {
      const days = Math.floor(hours / 24);
      countdownStr = `${days}d ${hours % 24}h`;
    } else if (hours > 0) {
      countdownStr = `${hours}h ${mins}m`;
    }

    return { label: `Reg ends in ${countdownStr}`, isRoomWindow: false, isLiveMatch: false, regCloseStr, matchStartStr };
  };

  const timing = getTimingDetails(tournament.startTime);

  // Overlay gradient color based on state
  const overlayColor = timing.isLiveMatch
    ? 'linear-gradient(180deg, rgba(0,0,0,0.05) 0%, rgba(20,50,30,0.82) 55%, rgba(10,35,20,0.97) 100%)'
    : isWeekly
    ? 'linear-gradient(180deg, rgba(0,0,0,0.08) 0%, rgba(30,20,5,0.82) 55%, rgba(20,12,0,0.97) 100%)'
    : 'linear-gradient(180deg, rgba(0,0,0,0.05) 0%, rgba(25,15,10,0.80) 55%, rgba(15,8,4,0.97) 100%)';

  return (
    <Link
      to={`/tournament/${tournament.id}`}
      style={{ textDecoration: 'none', display: 'block', marginBottom: '16px' }}
    >
      <div style={{
        borderRadius: '20px',
        overflow: 'hidden',
        position: 'relative',
        boxShadow: isWeekly
          ? '0 8px 32px rgba(244, 183, 64, 0.25), 0 2px 8px rgba(0,0,0,0.15)'
          : timing.isLiveMatch
          ? '0 8px 24px rgba(63, 166, 92, 0.2), 0 2px 8px rgba(0,0,0,0.12)'
          : '0 4px 16px rgba(0,0,0,0.1)',
        border: isWeekly
          ? '2px solid rgba(244, 183, 64, 0.5)'
          : timing.isLiveMatch
          ? '2px solid rgba(63, 166, 92, 0.5)'
          : timing.isRoomWindow
          ? '2px solid rgba(232, 139, 0, 0.5)'
          : '1.5px solid rgba(255,255,255,0.08)',
        transition: 'transform 0.18s ease, box-shadow 0.18s ease',
      }}>

        {/* === HERO BANNER IMAGE === */}
        <div style={{ position: 'relative', height: '140px', overflow: 'hidden' }}>
          <img
            src={bannerSrc}
            alt="tournament banner"
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              objectPosition: 'center top',
              display: 'block',
            }}
          />
          {/* Dark gradient overlay */}
          <div style={{
            position: 'absolute',
            inset: 0,
            background: overlayColor,
          }} />

          {/* === TOP BADGES on image === */}
          <div style={{
            position: 'absolute',
            top: '10px',
            left: '12px',
            right: '12px',
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
          }}>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              {/* Game badge */}
              <span style={{
                fontSize: '10px',
                fontWeight: 800,
                padding: '3px 8px',
                borderRadius: '6px',
                background: tournament.game === 'pubg'
                  ? 'rgba(255, 107, 74, 0.9)'
                  : 'rgba(123, 79, 224, 0.9)',
                color: '#FFFFFF',
                letterSpacing: '0.5px',
                backdropFilter: 'blur(4px)',
              }}>
                {tournament.game === 'pubg' ? 'PUBG MOBILE' : 'FREE FIRE'}
              </span>

              {/* Mode badge */}
              <span style={{
                fontSize: '10px',
                fontWeight: 600,
                padding: '3px 8px',
                borderRadius: '6px',
                background: 'rgba(0,0,0,0.5)',
                color: '#E0D8CC',
                backdropFilter: 'blur(4px)',
              }}>
                {tournament.matchType || 'Solo'}{tournament.mapName ? ` • ${tournament.mapName}` : ''}
              </span>
            </div>

            {/* Status pill */}
            {timing.isLiveMatch ? (
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: '4px',
                fontSize: '10px', fontWeight: 800, color: '#FFFFFF',
                background: '#3FA65C', padding: '3px 9px', borderRadius: '10px',
                boxShadow: '0 2px 8px rgba(63,166,92,0.5)',
              }}>
                <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#fff', display: 'inline-block' }} />
                LIVE
              </span>
            ) : timing.isRoomWindow ? (
              <span style={{
                fontSize: '10px', fontWeight: 800, color: '#FFFFFF',
                background: '#E88B00', padding: '3px 9px', borderRadius: '10px',
                boxShadow: '0 2px 8px rgba(232,139,0,0.5)',
              }}>
                🔥 Room Open
              </span>
            ) : (
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: '4px',
                fontSize: '10px', fontWeight: 600, color: '#E0D8CC',
                background: 'rgba(0,0,0,0.5)', padding: '3px 8px', borderRadius: '8px',
                backdropFilter: 'blur(4px)',
              }}>
                <Clock size={10} />
                {timing.label}
              </span>
            )}
          </div>

          {/* FREE ribbon */}
          {isFree && (
            <div style={{
              position: 'absolute',
              top: '10px',
              right: '-24px',
              background: 'linear-gradient(135deg, #3FA65C 0%, #2E7D32 100%)',
              color: '#FFFFFF',
              fontSize: '9px',
              fontWeight: 800,
              letterSpacing: '1px',
              padding: '3px 32px',
              transform: 'rotate(45deg)',
              boxShadow: '0 2px 6px rgba(63,166,92,0.4)',
              zIndex: 2,
            }}>
              FREE
            </div>
          )}

          {/* === TOURNAMENT TITLE on bottom of image === */}
          <div style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            padding: '10px 14px',
          }}>
            {isWeekly && (
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                background: 'linear-gradient(90deg, #F4B740, #E88B00)',
                color: '#FFF',
                fontSize: '9px',
                fontWeight: 800,
                letterSpacing: '1.5px',
                padding: '2px 8px',
                borderRadius: '4px',
                marginBottom: '4px',
              }}>
                ⭐ WEEKLY CHAMPIONSHIP
              </div>
            )}
            <h3 style={{
              fontFamily: "'Poppins', sans-serif",
              fontWeight: 700,
              fontSize: 'clamp(13px, 4vw, 15px)',
              color: '#FFFFFF',
              margin: 0,
              lineHeight: 1.3,
              textShadow: '0 1px 4px rgba(0,0,0,0.5)',
              wordBreak: 'break-word',
            }}>
              {tournament.name}
            </h3>
          </div>
        </div>

        {/* === CARD BODY (dark) === */}
        <div style={{
          background: '#1A1410',
          padding: '12px 14px 14px',
        }}>

          {/* Schedule row */}
          {timing.regCloseStr && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '4px 8px',
              background: 'rgba(255,255,255,0.05)',
              padding: '6px 10px',
              borderRadius: '8px',
              fontSize: 'clamp(10px, 3vw, 11px)',
              color: '#A89E93',
              marginBottom: '10px',
              border: '1px solid rgba(255,255,255,0.07)',
            }}>
              <span>Reg Closes: <strong style={{ color: '#E0D8CC' }}>{timing.regCloseStr}</strong></span>
              <span style={{ color: 'rgba(255,255,255,0.2)' }}>•</span>
              <span style={{ color: '#5BC47A', fontWeight: 600 }}>Match: {timing.matchStartStr}</span>
            </div>
          )}

          {/* 3 Metrics */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr 1fr',
            gap: '8px',
            marginBottom: '10px',
          }}>
            {[
              {
                label: 'Entry Fee',
                value: tournament.registrationCharge > 0 ? `Rs ${tournament.registrationCharge}` : 'FREE',
                color: isFree ? '#5BC47A' : '#E0D8CC',
              },
              {
                label: 'Prize Pool',
                value: `Rs ${tournament.fixedReward || 0}`,
                color: '#FF6B4A',
              },
              {
                label: 'Slots',
                value: `${slotsFilled}/${maxSlots}`,
                color: isNearlyFull ? '#F4B740' : '#E0D8CC',
              },
            ].map((m) => (
              <div key={m.label} style={{
                background: 'rgba(255,255,255,0.04)',
                borderRadius: '10px',
                padding: '8px 8px',
                textAlign: 'center',
                border: '1px solid rgba(255,255,255,0.06)',
              }}>
                <div style={{ fontSize: '9px', color: '#6E6560', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{m.label}</div>
                <div style={{ fontWeight: 800, fontSize: 'clamp(12px, 3.5vw, 14px)', color: m.color, marginTop: '3px' }}>{m.value}</div>
              </div>
            ))}
          </div>

          {/* Progress bar */}
          <div style={{ marginBottom: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: '#6E6560', marginBottom: '5px' }}>
              <span>Slots Filled</span>
              <span style={{ fontWeight: 600, color: isNearlyFull ? '#F4B740' : '#A89E93' }}>
                {isFull ? 'Full (100%)' : `${fillPercentage}%`}
              </span>
            </div>
            <div style={{ width: '100%', height: '5px', borderRadius: '5px', background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
              <div style={{
                height: '100%',
                width: `${fillPercentage}%`,
                background: isFull
                  ? '#D9503F'
                  : isNearlyFull
                  ? 'linear-gradient(90deg, #F4B740, #D9503F)'
                  : 'linear-gradient(90deg, #3FA65C, #5BC47A)',
                borderRadius: '5px',
                transition: 'width 0.3s ease',
              }} />
            </div>
          </div>

          {/* Action button */}
          {registrationLoading ? (
            <div style={{
              width: '100%', height: '42px', borderRadius: '10px',
              background: 'rgba(255,255,255,0.06)',
              animation: 'shimmer 1.4s infinite',
            }} />
          ) : (
            <div style={{
              width: '100%',
              padding: '12px 14px',
              borderRadius: '12px',
              fontWeight: 700,
              fontSize: '13px',
              textAlign: 'center',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              background: isRegistered
                ? 'rgba(63, 166, 92, 0.15)'
                : timing.isLiveMatch
                ? 'linear-gradient(135deg, #3FA65C, #2E7D32)'
                : timing.isRoomWindow
                ? 'linear-gradient(135deg, #E88B00, #C87000)'
                : isFull
                ? 'rgba(255,255,255,0.06)'
                : 'linear-gradient(135deg, #FF6B4A 0%, #E8552F 100%)',
              color: isRegistered
                ? '#5BC47A'
                : isFull
                ? '#6E6560'
                : '#FFFFFF',
              border: isRegistered ? '1.5px solid rgba(63,166,92,0.3)' : 'none',
              boxShadow: (!isRegistered && !isFull)
                ? isWeekly
                  ? '0 4px 14px rgba(255, 107, 74, 0.35)'
                  : '0 3px 10px rgba(255, 107, 74, 0.28)'
                : 'none',
            }}>
              {isRegistered ? (
                <span>✓ Registered — View Room ID</span>
              ) : timing.isLiveMatch ? (
                <span>Match Live — View Details</span>
              ) : timing.isRoomWindow ? (
                <span>🔑 Room Open — View Now</span>
              ) : isFull ? (
                <span>Tournament Full</span>
              ) : (
                <>
                  <span>Join Tournament</span>
                  <ChevronRight size={16} />
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}
