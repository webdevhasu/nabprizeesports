import { useState, useEffect } from 'react';
import { FaMedal } from 'react-icons/fa';
import { collection, query, onSnapshot, limit } from 'firebase/firestore';
import { db } from '../firebase/config';
import TopBar from '../components/TopBar';
import LoadingSpinner from '../components/LoadingSpinner';
import { Trophy, Crown, Medal, Flame, Copy, Check, Users, Star } from 'lucide-react';

function PlayerAvatar({ photoURL, name, size = 36 }) {
  return photoURL ? (
    <img src={photoURL} alt={`${name || 'Player'} avatar`} referrerPolicy="no-referrer" style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', flexShrink: 0, border: '2px solid #FFFFFF', boxShadow: '0 1px 4px rgba(0,0,0,0.12)' }} />
  ) : (
    <div style={{ width: size, height: size, borderRadius: '50%', background: 'linear-gradient(135deg, #FF6B4A 0%, #E8552F 100%)', color: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: Math.max(12, Math.round(size * 0.38)), flexShrink: 0 }}>
      {(name || 'P').charAt(0).toUpperCase()}
    </div>
  );
}

export default function HallOfFame() {
  const [activeTab, setActiveTab] = useState('winners');
  const [results, setResults] = useState([]);
  const [allTimeFraggers, setAllTimeFraggers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [copiedUid, setCopiedUid] = useState(null);

  useEffect(() => {
    setLoading(true);

    // Listen to matchResults for winners and recent fraggers
    const unsubResults = onSnapshot(
      query(collection(db, 'matchResults'), limit(100)),
      (snapshot) => {
        const allResults = [];
        snapshot.forEach(doc => {
          const data = doc.data();
          if (data.players && Array.isArray(data.players)) {
            data.players.forEach(player => {
              allResults.push({
                ...player,
                tournamentId: doc.id,
                tournamentName: data.tournamentName || 'Tournament Match',
                game: data.game || 'pubg',
                timestamp: data.submittedAt,
                gameUid: player.gameUid || player.uid || '',
              });
            });
          }
        });
        // Build the public all-time fraggers list from public match results.
        // Do not read the private users collection from every player's browser.
        const fraggerMap = new Map();
        for (const player of allResults) {
          const kills = Number(player.kills) || 0;
          if (!player.userId || kills <= 0) continue;
          const existing = fraggerMap.get(player.userId) || {
            userId: player.userId,
            username: player.username || 'Player',
            photoURL: player.photoURL || '',
            totalKills: 0,
            totalChampionships: 0,
            games: [],
          };
          existing.totalKills += kills;
          if (player.isWinner) existing.totalChampionships += 1;
          const game = player.game || 'pubg';
          if (!existing.games.some(g => g.game === game)) {
            existing.games.push({ game, uid: player.gameUid || '', ign: player.ign || 'Player' });
          }
          fraggerMap.set(player.userId, existing);
        }
        setAllTimeFraggers(
          [...fraggerMap.values()]
            .sort((a, b) => b.totalKills - a.totalKills)
            .slice(0, 20)
        );
        setResults(allResults);
        setLoading(false);
      },
      (err) => {
        console.error('Error fetching Hall of Fame:', err);
        setLoading(false);
      }
    );

    return () => {
      unsubResults();
    };
  }, []);

  const handleCopyUid = (uid) => {
    if (!uid) return;
    navigator.clipboard.writeText(uid);
    setCopiedUid(uid);
    setTimeout(() => setCopiedUid(null), 2000);
  };

  // 1. MOST RECENT WINNER — Latest match winner
  const mostRecentWinner = results
    .filter(r => r.isWinner)
    .sort((a, b) => {
      const timeA = a.timestamp?.toMillis?.() || (a.timestamp ? new Date(a.timestamp).getTime() : 0);
      const timeB = b.timestamp?.toMillis?.() || (b.timestamp ? new Date(b.timestamp).getTime() : 0);
      return timeB - timeA;
    })[0] || null;

  // 2. ALL-TIME BEST TOP 10 — Most wins, then most kills as tiebreaker
  const winnerStatsMap = new Map();
  for (const r of results) {
    if (!r.isWinner || !r.userId) continue;
    const existing = winnerStatsMap.get(r.userId);
    if (existing) {
      existing.wins += 1;
      existing.totalKills += Number(r.kills) || 0;
      const tTime = r.timestamp?.toMillis?.() || (r.timestamp ? new Date(r.timestamp).getTime() : 0);
      if (tTime > existing.lastTimestampMs) {
        existing.lastTournament = r.tournamentName;
        existing.lastTimestamp = r.timestamp;
        existing.lastTimestampMs = tTime;
      }
    } else {
      const tTime = r.timestamp?.toMillis?.() || (r.timestamp ? new Date(r.timestamp).getTime() : 0);
      winnerStatsMap.set(r.userId, {
        userId: r.userId,
        username: r.username,
        photoURL: r.photoURL || '',
        ign: r.ign || '',
        gameUid: r.gameUid || r.uid || '',
        wins: 1,
        totalKills: Number(r.kills) || 0,
        lastTournament: r.tournamentName,
        lastTimestamp: r.timestamp,
        lastTimestampMs: tTime,
        game: r.game,
      });
    }
  }
  const allTimeTopChampions = Array.from(winnerStatsMap.values())
    .sort((a, b) => b.wins - a.wins || b.totalKills - a.totalKills)
    .slice(0, 10);

  // 3. RECENT TOP 3 FRAGGERS — From the single most recent match
  const recentMatches = results
    .filter(r => (Number(r.kills) || 0) > 0)
    .sort((a, b) => {
      const timeA = a.timestamp?.toMillis?.() || (a.timestamp ? new Date(a.timestamp).getTime() : 0);
      const timeB = b.timestamp?.toMillis?.() || (b.timestamp ? new Date(b.timestamp).getTime() : 0);
      return timeB - timeA;
    });

  // Get the single most recent match ID
  const latestMatchId = recentMatches.length > 0 ? recentMatches[0].tournamentId : null;

  // Get fraggers from the latest match only
  const recentFraggerMap = new Map();
  for (const r of recentMatches) {
    if (r.tournamentId !== latestMatchId) break;
    const kills = Number(r.kills) || 0;
    if (kills > 0 && r.userId) {
      const existing = recentFraggerMap.get(r.userId);
      if (!existing || kills > existing.kills) {
        recentFraggerMap.set(r.userId, {
          userId: r.userId,
          username: r.username,
          photoURL: r.photoURL || '',
          ign: r.ign || '',
          gameUid: r.gameUid || r.uid || '',
          kills,
          tournamentName: r.tournamentName,
          timestamp: r.timestamp,
          game: r.game,
        });
      }
    }
  }

  const recentTop3Fraggers = Array.from(recentFraggerMap.values())
    .sort((a, b) => b.kills - a.kills)
    .slice(0, 3);

  const formatDate = (timestamp) => {
    if (!timestamp) return 'Recent';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    if (isNaN(date.getTime())) return 'Recent';
    return date.toLocaleDateString('en-PK', { day: 'numeric', month: 'short' });
  };

  const getRankBadge = (index) => {
    if (index === 0) return { icon: <FaMedal size={18} color="#F4B740" />, color: '#F4B740', bg: '#FFF8E1', border: '#FFE082' };
    if (index === 1) return { icon: <FaMedal size={18} color="#9E9E9E" />, color: '#9E9E9E', bg: '#F5F5F5', border: '#E0E0E0' };
    if (index === 2) return { icon: <FaMedal size={18} color="#CD7F32" />, color: '#CD7F32', bg: '#FFF3E0', border: '#FFCC80' };
    return { icon: `#${index + 1}`, color: '#8A8078', bg: '#F8F6F1', border: '#EBE4DA' };
  };

  const getFraggerRankBadge = (index) => {
    if (index === 0) return { icon: <Crown size={18} color="#F4B740" />, color: '#F4B740', bg: '#FFF8E1', border: '#FFE082', label: '1ST' };
    if (index === 1) return { icon: <Medal size={18} color="#9E9E9E" />, color: '#9E9E9E', bg: '#F5F5F5', border: '#E0E0E0', label: '2ND' };
    if (index === 2) return { icon: <Medal size={18} color="#CD7F32" />, color: '#CD7F32', bg: '#FFF3E0', border: '#FFCC80', label: '3RD' };
    return { icon: `#${index + 1}`, color: '#8A8078', bg: '#F8F6F1', border: '#EBE4DA', label: `#${index + 1}` };
  };

  return (
    <>
      <TopBar title="Hall of Fame" />
      <div className="responsive-page-container" style={{ padding: '16px 16px 40px' }}>

        {/* Banner Header */}
        <div style={{
          background: 'linear-gradient(135deg, #1F1B18 0%, #3B322A 100%)',
          borderRadius: '16px',
          padding: '20px',
          color: '#FFFFFF',
          marginBottom: '16px',
          boxShadow: '0 4px 16px rgba(0,0,0,0.1)',
          position: 'relative',
          overflow: 'hidden',
        }}>
          <div style={{ position: 'relative', zIndex: 2 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#F4B740', fontSize: '12px', fontWeight: 700, letterSpacing: '0.5px', marginBottom: '4px' }}>
              <Crown size={16} /> NABPRIZE LEGENDS
            </div>
            <h2 style={{ fontFamily: "'Poppins', sans-serif", fontWeight: 800, fontSize: '20px', margin: '0 0 4px' }}>
              Hall of Fame
            </h2>
            <p style={{ fontSize: '12px', opacity: 0.8, margin: 0 }}>
              Champions, recent fraggers & all-time kill leaders
            </p>
          </div>
        </div>

        {/* Tab Switcher */}
        <div style={{
          display: 'flex',
          background: '#FFFFFF',
          borderRadius: '12px',
          padding: '4px',
          marginBottom: '16px',
          border: '1px solid #EBE4DA',
        }}>
          {[
            { key: 'winners', label: 'Champions', icon: <Trophy size={14} /> },
            { key: 'recent', label: 'Recent Top 3', icon: <Flame size={14} /> },
            { key: 'alltime', label: 'All-Time', icon: <Star size={14} /> },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              style={{
                flex: 1,
                padding: '10px 6px',
                borderRadius: '8px',
                border: 'none',
                cursor: 'pointer',
                fontWeight: 700,
                fontSize: '11px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '4px',
                background: activeTab === tab.key
                  ? (tab.key === 'winners' ? '#FF6B4A' : tab.key === 'recent' ? '#7B4FE0' : '#F4B740')
                  : 'transparent',
                color: activeTab === tab.key ? '#FFFFFF' : '#8A8078',
                transition: 'all 0.15s ease',
              }}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {loading ? (
          <LoadingSpinner text="Loading leaderboard..." />
        ) : activeTab === 'winners' ? (
          /* ─── WINNERS TAB ─── */
          !mostRecentWinner && allTimeTopChampions.length === 0 ? (
            <EmptyState icon={<Trophy size={44} />} title="No tournament champions yet" text="Compete in daily tournaments to claim your spot!" />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>

              {/* MOST RECENT WINNER — Top card */}
              {mostRecentWinner && (() => {
                const uid = mostRecentWinner.gameUid || mostRecentWinner.uid;
                return (
                  <div style={{
                    background: 'linear-gradient(135deg, #E8F5E9 0%, #FFFFFF 100%)',
                    borderRadius: '16px', padding: '18px',
                    border: '2px solid #3FA65C',
                    boxShadow: '0 6px 20px rgba(63, 166, 92, 0.2)',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#3FA65C', fontSize: '11px', fontWeight: 800, letterSpacing: '0.5px', marginBottom: '10px' }}>
                      <Trophy size={14} /> RECENT CHAMPION
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{
                        width: '48px', height: '48px', borderRadius: '14px',
                        background: 'linear-gradient(135deg, #3FA65C 0%, #2E7D32 100%)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        flexShrink: 0,
                      }}>
                        <Trophy size={24} color="#FFFFFF" />
                      </div>
                      <PlayerAvatar photoURL={mostRecentWinner.photoURL} name={mostRecentWinner.username} size={48} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 800, fontSize: '16px', color: '#2E2A26' }}>@{mostRecentWinner.username}</div>
                        <div style={{ fontSize: '11px', color: '#8A8078', marginTop: '2px', fontWeight: 600 }}>
                          {mostRecentWinner.tournamentName}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '6px', marginTop: '4px' }}>
                          <span style={{ fontSize: '11px', fontWeight: 600, color: '#FF6B4A', background: '#FFF0EC', padding: '2px 8px', borderRadius: '6px' }}>
                            IGN: {mostRecentWinner.ign || 'Player'}
                          </span>
                          {uid && (
                            <button onClick={() => handleCopyUid(uid)} style={{
                              display: 'inline-flex', alignItems: 'center', gap: '3px', fontSize: '11px',
                              fontFamily: 'monospace', fontWeight: 600, color: '#5E5851', background: '#F0ECE4',
                              padding: '2px 8px', borderRadius: '6px', border: 'none', cursor: 'pointer',
                            }}>
                              <span>UID: {uid}</span>
                              {copiedUid === uid ? <Check size={11} color="#3FA65C" /> : <Copy size={11} color="#8A8078" />}
                            </button>
                          )}
                        </div>
                      </div>
                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        <div style={{ fontSize: '11px', color: '#7B4FE0', fontWeight: 700 }}>{mostRecentWinner.kills || 0} Kills</div>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* ALL-TIME BEST TOP 10 */}
              {allTimeTopChampions.length > 0 && (
                <>
                  <p style={{ fontSize: '11px', color: '#8A8078', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginTop: '4px' }}>
                    All-Time Best Champions
                  </p>
                  {allTimeTopChampions.map((player, i) => {
                    const rank = getRankBadge(i);
                    const uid = player.gameUid;
                    return (
                      <div key={player.userId} style={{
                        background: '#FFFFFF', borderRadius: '14px', padding: '14px',
                        border: i < 3 ? `2px solid ${rank.border}` : '1px solid #EBE4DA',
                        boxShadow: i < 3 ? `0 4px 14px ${rank.color}22` : 'none',
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <div style={{
                            width: '36px', height: '36px', borderRadius: '10px',
                            background: rank.bg, border: `1px solid ${rank.border}`,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontWeight: 800, fontSize: i < 3 ? '18px' : '12px', color: rank.color, flexShrink: 0,
                          }}>{rank.icon}</div>

                          <PlayerAvatar photoURL={player.photoURL} name={player.username} />

                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontWeight: 700, fontSize: '14px', color: '#2E2A26' }}>@{player.username}</div>
                            <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '6px', marginTop: '3px' }}>
                              <span style={{ fontSize: '11px', fontWeight: 600, color: '#FF6B4A', background: '#FFF0EC', padding: '2px 8px', borderRadius: '6px' }}>
                                IGN: {player.ign || 'Player'}
                              </span>
                              {uid && (
                                <button onClick={() => handleCopyUid(uid)} style={{
                                  display: 'inline-flex', alignItems: 'center', gap: '3px', fontSize: '11px',
                                  fontFamily: 'monospace', fontWeight: 600, color: '#5E5851', background: '#F0ECE4',
                                  padding: '2px 8px', borderRadius: '6px', border: 'none', cursor: 'pointer',
                                }}>
                                  <span>UID: {uid}</span>
                                  {copiedUid === uid ? <Check size={11} color="#3FA65C" /> : <Copy size={11} color="#8A8078" />}
                                </button>
                              )}
                            </div>
                            <div style={{ fontSize: '11px', color: '#8A8078', marginTop: '3px' }}>
                              {player.lastTournament}
                            </div>
                          </div>

                          <div style={{ textAlign: 'right', flexShrink: 0 }}>
                            <div style={{ fontFamily: "'Poppins', sans-serif", fontWeight: 800, fontSize: '20px', color: '#FF6B4A', lineHeight: 1 }}>
                              {player.wins}
                            </div>
                            <div style={{ fontSize: '10px', fontWeight: 700, color: '#8A8078', marginTop: '2px', textTransform: 'uppercase' }}>
                              Championships
                            </div>
                            <div style={{ fontSize: '11px', color: '#7B4FE0', fontWeight: 700, marginTop: '2px' }}>
                              {player.totalKills} Kills
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </>
              )}
            </div>
          )
        ) : activeTab === 'recent' ? (
          /* ─── RECENT TOP 3 FRAGGERS ─── */
          recentTop3Fraggers.length === 0 ? (
            <EmptyState icon={<Flame size={44} />} title="No recent fraggers" text="Admin needs to submit match results with kills first." />
          ) : (
            <>
              <p style={{ fontSize: '12px', color: '#8A8078', marginBottom: '12px', textAlign: 'center' }}>
                Top 3 killers from recent matches
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {recentTop3Fraggers.map((frag, i) => {
                  const rank = getFraggerRankBadge(i);
                  const uid = frag.gameUid || frag.uid;
                  return (
                    <div key={`${frag.userId}-recent-${i}`} style={{
                      background: '#FFFFFF', borderRadius: '16px', padding: '16px',
                      border: i === 0 ? '2px solid #F4B740' : i === 1 ? '2px solid #C0C0C0' : i === 2 ? '2px solid #CD7F32' : '1px solid #EBE4DA',
                      boxShadow: i < 3 ? '0 4px 14px rgba(123, 79, 224, 0.15)' : 'none',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        {/* Rank Badge with 1ST/2ND/3RD */}
                        <div style={{
                          width: '48px', height: '48px', borderRadius: '12px',
                          background: rank.bg, border: `2px solid ${rank.border}`,
                          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                          flexShrink: 0,
                        }}>
                          {rank.icon}
                          <span style={{ fontSize: '8px', fontWeight: 800, color: rank.color, marginTop: '-2px' }}>{rank.label}</span>
                        </div>

                        <PlayerAvatar photoURL={frag.photoURL} name={frag.username} size={42} />

                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 700, fontSize: '14px', color: '#2E2A26' }}>@{frag.username}</div>
                          <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '6px', marginTop: '4px' }}>
                            <span style={{ fontSize: '11px', fontWeight: 600, color: '#7B4FE0', background: '#F3EEFF', padding: '2px 8px', borderRadius: '6px' }}>
                              IGN: {frag.ign || 'Player'}
                            </span>
                            {uid && (
                              <button onClick={() => handleCopyUid(uid)} style={{
                                display: 'inline-flex', alignItems: 'center', gap: '3px', fontSize: '11px',
                                fontFamily: 'monospace', fontWeight: 600, color: '#5E5851', background: '#F0ECE4',
                                padding: '2px 8px', borderRadius: '6px', border: 'none', cursor: 'pointer',
                              }}>
                                <span>UID: {uid}</span>
                                {copiedUid === uid ? <Check size={11} color="#3FA65C" /> : <Copy size={11} color="#8A8078" />}
                              </button>
                            )}
                          </div>
                          <div style={{ fontSize: '11px', color: '#8A8078', marginTop: '4px' }}>
                            {frag.tournamentName} • {formatDate(frag.timestamp)}
                          </div>
                        </div>

                        <div style={{ textAlign: 'right', flexShrink: 0 }}>
                          <div style={{ fontFamily: "'Poppins', sans-serif", fontWeight: 800, fontSize: '22px', color: '#7B4FE0', lineHeight: 1 }}>
                            {frag.kills}
                          </div>
                          <div style={{ fontSize: '10px', fontWeight: 700, color: '#8A8078', marginTop: '2px', textTransform: 'uppercase' }}>
                            Kills
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )
        ) : (
          /* ─── ALL-TIME TOP FRAGGERS ─── */
          allTimeFraggers.length === 0 ? (
            <EmptyState icon={<Star size={44} />} title="No fraggers yet" text="Play tournaments to appear on the All-Time leaderboard!" />
          ) : (
            <>
              <p style={{ fontSize: '12px', color: '#8A8078', marginBottom: '12px', textAlign: 'center' }}>
                Players with most kills across all matches
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {allTimeFraggers.map((frag, i) => {
                  const rank = getRankBadge(i);
                  const pubgGame = frag.games.find(g => g.game === 'pubg');
                  const ign = pubgGame?.ign || frag.games[0]?.ign || 'Player';
                  const uid = pubgGame?.uid || frag.games[0]?.uid || '';

                  return (
                    <div key={frag.userId} style={{
                      background: '#FFFFFF', borderRadius: '14px', padding: '14px',
                      border: i < 3 ? `2px solid ${rank.border}` : '1px solid #EBE4DA',
                      boxShadow: i < 3 ? `0 4px 14px ${rank.color}22` : 'none',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{
                          width: '36px', height: '36px', borderRadius: '10px',
                          background: rank.bg, border: `1px solid ${rank.border}`,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontWeight: 800, fontSize: i < 3 ? '18px' : '12px', color: rank.color, flexShrink: 0,
                        }}>{rank.icon}</div>

                        <PlayerAvatar photoURL={frag.photoURL} name={frag.username} />

                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 700, fontSize: '14px', color: '#2E2A26' }}>@{frag.username}</div>
                          <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '6px', marginTop: '3px' }}>
                            <span style={{ fontSize: '11px', fontWeight: 600, color: '#FF6B4A', background: '#FFF0EC', padding: '2px 8px', borderRadius: '6px' }}>
                              IGN: {ign}
                            </span>
                            {uid && (
                              <button onClick={() => handleCopyUid(uid)} style={{
                                display: 'inline-flex', alignItems: 'center', gap: '3px', fontSize: '11px',
                                fontFamily: 'monospace', fontWeight: 600, color: '#5E5851', background: '#F0ECE4',
                                padding: '2px 8px', borderRadius: '6px', border: 'none', cursor: 'pointer',
                              }}>
                                <span>UID: {uid}</span>
                                {copiedUid === uid ? <Check size={11} color="#3FA65C" /> : <Copy size={11} color="#8A8078" />}
                              </button>
                            )}
                          </div>
                          <div style={{ fontSize: '11px', color: '#8A8078', marginTop: '3px' }}>
                            {frag.totalChampionships || 0} wins
                          </div>
                        </div>

                        <div style={{ textAlign: 'right', flexShrink: 0 }}>
                          <div style={{ fontFamily: "'Poppins', sans-serif", fontWeight: 800, fontSize: '20px', color: '#7B4FE0', lineHeight: 1 }}>
                            {frag.totalKills}
                          </div>
                          <div style={{ fontSize: '10px', fontWeight: 700, color: '#8A8078', marginTop: '2px', textTransform: 'uppercase' }}>
                            Total Kills
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )
        )}
      </div>
    </>
  );
}

function EmptyState({ icon, title, text }) {
  return (
    <div style={{
      background: '#FFFFFF', borderRadius: '16px', textAlign: 'center',
      padding: '50px 20px', border: '1px solid #F0ECE4',
    }}>
      <div style={{ color: '#C4BCB2', margin: '0 auto 12px' }}>{icon}</div>
      <p style={{ fontWeight: 700, fontSize: '15px', color: '#2E2A26', margin: '0 0 6px' }}>{title}</p>
      <p style={{ fontSize: '12px', color: '#8A8078', margin: 0 }}>{text}</p>
    </div>
  );
}
