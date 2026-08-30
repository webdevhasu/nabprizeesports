import { useState, useEffect } from 'react';
import { collection, query, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase/config';
import TopBar from '../components/TopBar';
import LoadingSpinner from '../components/LoadingSpinner';
import { Trophy, Target, Crown, Medal, Flame, Copy, Check } from 'lucide-react';

export default function HallOfFame() {
  const [activeTab, setActiveTab] = useState('winners');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [copiedUid, setCopiedUid] = useState(null);

  useEffect(() => {
    setLoading(true);
    const unsubscribe = onSnapshot(
      query(collection(db, 'matchResults')),
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
        setResults(allResults);
        setLoading(false);
      },
      (err) => {
        console.error('Error fetching Hall of Fame:', err);
        setLoading(false);
      }
    );
    return unsubscribe;
  }, []);

  const handleCopyUid = (uid) => {
    if (!uid) return;
    navigator.clipboard.writeText(uid);
    setCopiedUid(uid);
    setTimeout(() => setCopiedUid(null), 2000);
  };

  // 1. RECENT WINNERS — Top 10 Most Recent Match Champions
  const top10Winners = results
    .filter(r => r.isWinner)
    .sort((a, b) => {
      const timeA = a.timestamp?.toMillis?.() || (a.timestamp ? new Date(a.timestamp).getTime() : 0);
      const timeB = b.timestamp?.toMillis?.() || (b.timestamp ? new Date(b.timestamp).getTime() : 0);
      return timeB - timeA;
    })
    .slice(0, 10);

  // 2. TOP FRAGGERS — Strictly Top 10 Highest Killers (Deduplicated by Player ID)
  // If Ali got 10 kills in Match 1 and 20 kills in Match 2, his 10-kill record is replaced by 20 kills!
  const fraggerMap = new Map();
  for (const r of results) {
    const kills = Number(r.kills) || 0;
    if (kills > 0 && r.userId) {
      const existing = fraggerMap.get(r.userId);
      if (!existing || kills > existing.kills) {
        fraggerMap.set(r.userId, {
          userId: r.userId,
          username: r.username,
          ign: r.ign || '',
          gameUid: r.gameUid || r.uid || '',
          kills: kills,
          tournamentName: r.tournamentName,
          timestamp: r.timestamp,
          game: r.game,
        });
      }
    }
  }

  const top10Fraggers = Array.from(fraggerMap.values())
    .sort((a, b) => b.kills - a.kills)
    .slice(0, 10);

  const formatDate = (timestamp) => {
    if (!timestamp) return 'Recent';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    if (isNaN(date.getTime())) return 'Recent';
    return date.toLocaleDateString('en-PK', { day: 'numeric', month: 'short' });
  };

  const getRankBadge = (index) => {
    if (index === 0) return { icon: '🥇', color: '#F4B740', bg: '#FFF8E1', border: '#FFE082' };
    if (index === 1) return { icon: '🥈', color: '#9E9E9E', bg: '#F5F5F5', border: '#E0E0E0' };
    if (index === 2) return { icon: '🥉', color: '#CD7F32', bg: '#FFF3E0', border: '#FFCC80' };
    return { icon: `#${index + 1}`, color: '#8A8078', bg: '#F8F6F1', border: '#EBE4DA' };
  };

  return (
    <>
      <TopBar title="Hall of Fame" />
      <div style={{ padding: '16px 16px 40px' }}>
        
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
              Top 10 Champions & Fraggers
            </h2>
            <p style={{ fontSize: '12px', opacity: 0.8, margin: 0 }}>
              Live leaderboard of top 10 match winners and deadliest killers
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
            { key: 'winners', label: 'Top 10 Recent Winners', icon: <Trophy size={16} /> },
            { key: 'fraggers', label: 'Top 10 Kill Leaders', icon: <Flame size={16} /> },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              style={{
                flex: 1,
                padding: '10px',
                borderRadius: '8px',
                border: 'none',
                cursor: 'pointer',
                fontWeight: 700,
                fontSize: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                background: activeTab === tab.key ? (tab.key === 'winners' ? '#FF6B4A' : '#7B4FE0') : 'transparent',
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
          /* WINNERS TAB — TOP 10 RECENT WINNERS */
          top10Winners.length === 0 ? (
            <div style={{
              background: '#FFFFFF',
              borderRadius: '16px',
              textAlign: 'center',
              padding: '50px 20px',
              border: '1px solid #F0ECE4',
            }}>
              <Trophy size={44} color="#C4BCB2" style={{ margin: '0 auto 12px' }} />
              <p style={{ fontWeight: 700, fontSize: '15px', color: '#2E2A26', margin: '0 0 6px' }}>
                No tournament winners yet
              </p>
              <p style={{ fontSize: '12px', color: '#8A8078', margin: 0 }}>
                Compete in daily tournaments to claim your spot in the Top 10 Winners!
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {top10Winners.map((winner, i) => {
                const rank = getRankBadge(i);
                const uid = winner.gameUid || winner.uid;

                return (
                  <div
                    key={`${winner.tournamentId}-${winner.userId}-${i}`}
                    style={{
                      background: '#FFFFFF',
                      borderRadius: '16px',
                      padding: '16px',
                      border: i === 0 ? '2px solid #F4B740' : '1px solid #EBE4DA',
                      boxShadow: i === 0 ? '0 4px 14px rgba(244, 183, 64, 0.15)' : '0 1px 3px rgba(0,0,0,0.02)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      
                      {/* Rank Indicator */}
                      <div style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '10px',
                        background: rank.bg,
                        border: `1px solid ${rank.border}`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 800,
                        fontSize: i < 3 ? '18px' : '12px',
                        color: rank.color,
                        flexShrink: 0,
                      }}>
                        {rank.icon}
                      </div>

                      {/* User Info */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ fontWeight: 700, fontSize: '14px', color: '#2E2A26' }}>
                            @{winner.username}
                          </span>
                          {i === 0 && (
                            <span style={{ fontSize: '10px', background: '#FFF8E1', color: '#F4B740', padding: '1px 6px', borderRadius: '6px', fontWeight: 800 }}>
                              LATEST CHAMP
                            </span>
                          )}
                        </div>

                        {/* PUBG / Free Fire In-Game Name & Game UID Badges */}
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          flexWrap: 'wrap',
                          gap: '6px',
                          marginTop: '4px',
                        }}>
                          {/* In-Game Name (IGN) */}
                          <span style={{
                            fontSize: '11px',
                            fontWeight: 600,
                            color: '#FF6B4A',
                            background: '#FFF0EC',
                            padding: '2px 8px',
                            borderRadius: '6px',
                          }}>
                            IGN: {winner.ign || 'Player'}
                          </span>

                          {/* Game UID */}
                          {uid && (
                            <button
                              onClick={() => handleCopyUid(uid)}
                              title="Click to copy UID"
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '3px',
                                fontSize: '11px',
                                fontFamily: 'monospace',
                                fontWeight: 600,
                                color: '#5E5851',
                                background: '#F0ECE4',
                                padding: '2px 8px',
                                borderRadius: '6px',
                                border: 'none',
                                cursor: 'pointer',
                              }}
                            >
                              <span>UID: {uid}</span>
                              {copiedUid === uid ? <Check size={11} color="#3FA65C" /> : <Copy size={11} color="#8A8078" />}
                            </button>
                          )}
                        </div>

                        {/* Tournament & Date */}
                        <div style={{ fontSize: '11px', color: '#8A8078', marginTop: '4px' }}>
                          {winner.tournamentName} • {formatDate(winner.timestamp)}
                        </div>
                      </div>

                      {/* Prize Reward & Kills */}
                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        <div style={{
                          fontFamily: "'Poppins', sans-serif",
                          fontWeight: 800,
                          fontSize: '17px',
                          color: '#2E7D32',
                        }}>
                          Rs {winner.reward || 0}
                        </div>
                        <div style={{
                          fontSize: '11px',
                          color: '#7B4FE0',
                          fontWeight: 700,
                          marginTop: '2px',
                        }}>
                          {winner.kills || 0} Kills
                        </div>
                      </div>

                    </div>
                  </div>
                );
              })}
            </div>
          )
        ) : (
          /* TOP 10 FRAGGERS TAB — Top 10 Single-Match Peak Killers */
          top10Fraggers.length === 0 ? (
            <div style={{
              background: '#FFFFFF',
              borderRadius: '16px',
              textAlign: 'center',
              padding: '50px 20px',
              border: '1px solid #F0ECE4',
            }}>
              <Flame size={44} color="#C4BCB2" style={{ margin: '0 auto 12px' }} />
              <p style={{ fontWeight: 700, fontSize: '15px', color: '#2E2A26', margin: '0 0 6px' }}>
                No fraggers recorded yet
              </p>
              <p style={{ fontSize: '12px', color: '#8A8078', margin: 0 }}>
                Score frags in tournaments to enter the Top 10 Kill Leaderboard!
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {top10Fraggers.map((frag, i) => {
                const rank = getRankBadge(i);
                const uid = frag.gameUid || frag.uid;

                return (
                  <div
                    key={`${frag.userId}-${i}`}
                    style={{
                      background: '#FFFFFF',
                      borderRadius: '16px',
                      padding: '16px',
                      border: i < 3 ? '2px solid #7B4FE0' : '1px solid #EBE4DA',
                      boxShadow: i < 3 ? '0 4px 14px rgba(123, 79, 224, 0.15)' : '0 1px 3px rgba(0,0,0,0.02)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      
                      {/* Rank Indicator */}
                      <div style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '10px',
                        background: rank.bg,
                        border: `1px solid ${rank.border}`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 800,
                        fontSize: i < 3 ? '18px' : '12px',
                        color: rank.color,
                        flexShrink: 0,
                      }}>
                        {rank.icon}
                      </div>

                      {/* Player Info */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 700, fontSize: '14px', color: '#2E2A26' }}>
                          @{frag.username}
                        </div>

                        {/* In Game Name & UID */}
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          flexWrap: 'wrap',
                          gap: '6px',
                          marginTop: '4px',
                        }}>
                          <span style={{
                            fontSize: '11px',
                            fontWeight: 600,
                            color: '#7B4FE0',
                            background: '#F3EEFF',
                            padding: '2px 8px',
                            borderRadius: '6px',
                          }}>
                            IGN: {frag.ign || 'Player'}
                          </span>

                          {uid && (
                            <button
                              onClick={() => handleCopyUid(uid)}
                              title="Click to copy UID"
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '3px',
                                fontSize: '11px',
                                fontFamily: 'monospace',
                                fontWeight: 600,
                                color: '#5E5851',
                                background: '#F0ECE4',
                                padding: '2px 8px',
                                borderRadius: '6px',
                                border: 'none',
                                cursor: 'pointer',
                              }}
                            >
                              <span>UID: {uid}</span>
                              {copiedUid === uid ? <Check size={11} color="#3FA65C" /> : <Copy size={11} color="#8A8078" />}
                            </button>
                          )}
                        </div>

                        <div style={{ fontSize: '11px', color: '#8A8078', marginTop: '4px' }}>
                          Match Peak: {frag.tournamentName} • {formatDate(frag.timestamp)}
                        </div>
                      </div>

                      {/* Highest Kills Badge */}
                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        <div style={{
                          fontFamily: "'Poppins', sans-serif",
                          fontWeight: 800,
                          fontSize: '20px',
                          color: '#7B4FE0',
                          lineHeight: 1,
                        }}>
                          {frag.kills || 0}
                        </div>
                        <div style={{ fontSize: '10px', fontWeight: 700, color: '#8A8078', marginTop: '2px', textTransform: 'uppercase' }}>
                          Peak Kills
                        </div>
                      </div>

                    </div>
                  </div>
                );
              })}
            </div>
          )
        )}
      </div>
    </>
  );
}
