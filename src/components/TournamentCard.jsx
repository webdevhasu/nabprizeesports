import { Link } from 'react-router-dom';
import { Trophy, Users, DollarSign, Clock, MapPin, ShieldCheck, ChevronRight, Zap, Key } from 'lucide-react';

export default function TournamentCard({ tournament, isRegistered = false }) {
  const isLive = tournament.status === 'live';
  const slotsFilled = tournament.slotsFilled || 0;
  const maxSlots = tournament.maxSlots || 25;
  const fillPercentage = Math.min(100, Math.round((slotsFilled / maxSlots) * 100));
  const isNearlyFull = fillPercentage >= 85;
  const isFull = slotsFilled >= maxSlots;
  const isWeekly = tournament.tournamentType === 'Weekly Championship' || tournament.tournamentType === 'Special Cup';

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
      return { label: `🔥 Room Open (${minsLeft}m to start)`, isRoomWindow: true, isLiveMatch: false, regCloseStr, matchStartStr };
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

    return {
      label: `Reg ends in ${countdownStr}`,
      isRoomWindow: false,
      isLiveMatch: false,
      regCloseStr,
      matchStartStr,
    };
  };

  const timing = getTimingDetails(tournament.startTime);

  return (
    <Link
      to={`/tournament/${tournament.id}`}
      style={{ textDecoration: 'none', display: 'block', marginBottom: '14px' }}
    >
      <div style={{
        background: '#FFFFFF',
        borderRadius: '18px',
        border: isWeekly
          ? '2px solid #F4B740'
          : timing.isLiveMatch
          ? '2px solid #3FA65C'
          : timing.isRoomWindow
          ? '2px solid #E88B00'
          : '1px solid #EBE4DA',
        overflow: 'hidden',
        boxShadow: isWeekly
          ? '0 6px 20px rgba(244, 183, 64, 0.18)'
          : '0 2px 8px rgba(0,0,0,0.03)',
        transition: 'transform 0.15s ease, box-shadow 0.15s ease',
      }}>
        
        {/* Weekly Header Banner if applicable */}
        {isWeekly && (
          <div style={{
            background: 'linear-gradient(90deg, #F4B740 0%, #E88B00 100%)',
            color: '#FFFFFF',
            padding: '6px 14px',
            fontSize: '11px',
            fontWeight: 800,
            letterSpacing: '1px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              ⭐ WEEKLY CHAMPIONSHIP
            </span>
            <span style={{ fontSize: '10px', background: 'rgba(0,0,0,0.15)', padding: '2px 6px', borderRadius: '4px' }}>
              BIG PRIZE
            </span>
          </div>
        )}

        <div style={{ padding: '16px' }}>
          
          {/* Card Top: Badges */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px', flexWrap: 'wrap', gap: '6px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
              {/* Game Badge */}
              <span style={{
                fontSize: '11px',
                fontWeight: 700,
                padding: '3px 8px',
                borderRadius: '6px',
                background: tournament.game === 'pubg' ? '#FFF0EC' : '#F3EEFF',
                color: tournament.game === 'pubg' ? '#FF6B4A' : '#7B4FE0',
                letterSpacing: '0.3px',
              }}>
                {tournament.game === 'pubg' ? 'PUBG MOBILE' : 'FREE FIRE'}
              </span>

              {/* Mode & Map Badge */}
              <span style={{
                fontSize: '11px',
                fontWeight: 600,
                color: '#5E5851',
                background: '#F0ECE4',
                padding: '3px 8px',
                borderRadius: '6px',
              }}>
                {tournament.matchType || 'Solo'} {tournament.mapName ? `• ${tournament.mapName}` : ''}
              </span>
            </div>

            {/* Live or Countdown Pill */}
            {timing.isLiveMatch ? (
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
                boxShadow: '0 2px 6px rgba(63, 166, 92, 0.35)',
              }}>
                <span style={{
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  background: '#FFFFFF',
                  display: 'inline-block',
                }} />
                LIVE NOW
              </span>
            ) : timing.isRoomWindow ? (
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
                boxShadow: '0 2px 6px rgba(232, 139, 0, 0.35)',
              }}>
                {timing.label}
              </span>
            ) : (
              <span style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                fontSize: '11px',
                fontWeight: 600,
                color: '#8A8078',
                background: '#FAF8F5',
                border: '1px solid #EBE4DA',
                padding: '3px 8px',
                borderRadius: '8px',
              }}>
                <Clock size={12} color="#8A8078" />
                {timing.label}
              </span>
            )}
          </div>

          {/* Tournament Title */}
          <h3 style={{
            fontFamily: "'Poppins', sans-serif",
            fontWeight: 700,
            fontSize: '16px',
            color: '#2E2A26',
            margin: '0 0 8px',
            lineHeight: 1.3,
          }}>
            {tournament.name}
          </h3>

          {/* PKT Schedule Timeline Sub-banner */}
          {timing.regCloseStr && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: '#F8F6F1',
              padding: '6px 10px',
              borderRadius: '8px',
              fontSize: '11px',
              color: '#5E5851',
              marginBottom: '12px',
            }}>
              <span>Reg Close: <strong>{timing.regCloseStr}</strong></span>
              <span>•</span>
              <span style={{ color: '#2E7D32', fontWeight: 600 }}>Match Start: {timing.matchStartStr}</span>
            </div>
          )}

          {/* 3 Metrics Box */}
          <div style={{
            background: '#FAF8F5',
            borderRadius: '12px',
            padding: '12px 14px',
            display: 'grid',
            gridTemplateColumns: '1fr 1fr 1fr',
            gap: '8px',
            border: '1px solid #F0ECE4',
            marginBottom: '12px',
          }}>
            <div>
              <div style={{ fontSize: '10px', color: '#8A8078', fontWeight: 600, textTransform: 'uppercase' }}>Registration Fee</div>
              <div style={{ fontWeight: 800, fontSize: '15px', color: '#2E2A26', marginTop: '2px' }}>
                {tournament.registrationCharge > 0 ? `Rs ${tournament.registrationCharge}` : 'FREE'}
              </div>
            </div>

            <div>
              <div style={{ fontSize: '10px', color: '#8A8078', fontWeight: 600, textTransform: 'uppercase' }}>Prize Pool</div>
              <div style={{ fontWeight: 800, fontSize: '15px', color: '#FF6B4A', marginTop: '2px' }}>
                Rs {tournament.fixedReward || 0}
              </div>
            </div>

            <div>
              <div style={{ fontSize: '10px', color: '#8A8078', fontWeight: 600, textTransform: 'uppercase' }}>Slots Left</div>
              <div style={{
                fontWeight: 800,
                fontSize: '15px',
                color: isNearlyFull ? '#D9503F' : '#2E2A26',
                marginTop: '2px',
              }}>
                {slotsFilled}/{maxSlots}
              </div>
            </div>
          </div>

          {/* Slots Progress Bar */}
          <div style={{ marginBottom: '14px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#8A8078', marginBottom: '4px' }}>
              <span>Registration Status</span>
              <span style={{ fontWeight: 600, color: isNearlyFull ? '#D9503F' : '#2E2A26' }}>
                {isFull ? 'Full (100%)' : `${fillPercentage}% Filled`}
              </span>
            </div>
            <div style={{
              width: '100%',
              height: '6px',
              borderRadius: '6px',
              background: '#EBE4DA',
              overflow: 'hidden',
            }}>
              <div style={{
                height: '100%',
                width: `${fillPercentage}%`,
                background: isFull
                  ? '#D9503F'
                  : isNearlyFull
                  ? 'linear-gradient(90deg, #F4B740, #D9503F)'
                  : 'linear-gradient(90deg, #3FA65C, #2E7D32)',
                borderRadius: '6px',
                transition: 'width 0.3s ease',
              }} />
            </div>
          </div>

          {/* Action Button */}
          <div style={{
            width: '100%',
            padding: '11px 14px',
            borderRadius: '10px',
            fontWeight: 700,
            fontSize: '13px',
            textAlign: 'center',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            background: isRegistered
              ? '#E8F5E9'
              : timing.isLiveMatch
              ? '#3FA65C'
              : timing.isRoomWindow
              ? '#E88B00'
              : isFull
              ? '#EBE4DA'
              : '#FF6B4A',
            color: isRegistered
              ? '#2E7D32'
              : isFull
              ? '#8A8078'
              : '#FFFFFF',
            border: isRegistered ? '1.5px solid #C8E6C9' : 'none',
            boxShadow: (!isRegistered && !isFull)
              ? '0 2px 8px rgba(255, 107, 74, 0.25)'
              : 'none',
          }}>
            {isRegistered ? (
              <span>✓ Registered (View Room ID)</span>
            ) : timing.isLiveMatch ? (
              <span>Match Live — View Details</span>
            ) : timing.isRoomWindow ? (
              <span>Room Open (10m) — View</span>
            ) : isFull ? (
              <span>Tournament Full</span>
            ) : (
              <>
                <span>Join Tournament</span>
                <ChevronRight size={16} />
              </>
            )}
          </div>

        </div>
      </div>
    </Link>
  );
}
