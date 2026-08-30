import { useState, useEffect } from 'react';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db } from '../firebase/config';
import {
  Trophy,
  Flame,
  Crown,
  Search,
  Copy,
  Check,
  Medal,
  DollarSign,
  Users,
  Target,
  Gamepad2,
  Sparkles
} from 'lucide-react';
import AdminLayout from './AdminLayout';
import LoadingSpinner from '../components/LoadingSpinner';

const cardStyle = {
  background: '#FFFFFF',
  borderRadius: '14px',
  padding: '22px',
  border: '1px solid #EBE4DA',
  boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
};

const inputStyle = {
  width: '100%',
  padding: '10px 14px',
  borderRadius: '8px',
  border: '1px solid #D9D3CC',
  fontSize: '13px',
  boxSizing: 'border-box',
  background: '#FFFFFF',
  outline: 'none',
};

export default function AdminHallOfFame() {
  const [activeTab, setActiveTab] = useState('allTimeWinners'); // 'allTimeWinners' | 'allTimeFraggers'
  const [matchResultsList, setMatchResultsList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterGame, setFilterGame] = useState('all');
  const [sortBy, setSortBy] = useState('wins'); // 'wins' | 'prize' | 'kills'
  const [copiedUid, setCopiedUid] = useState(null);

  useEffect(() => {
    setLoading(true);
    const unsub = onSnapshot(
      collection(db, 'matchResults'),
      (snap) => {
        setMatchResultsList(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        setLoading(false);
      },
      (err) => {
        console.error('Error loading match results:', err);
        setLoading(false);
      }
    );
    return unsub;
  }, []);

  const handleCopyUid = (uid) => {
    if (!uid) return;
    navigator.clipboard.writeText(uid);
    setCopiedUid(uid);
    setTimeout(() => setCopiedUid(null), 2000);
  };

  // 1. ALL-TIME WINNERS AGGREGATION (NO LIMIT - SHOWS ALL PLAYERS)
  // If player won 2 times -> single card/row with "2x Champion", sum of prize money!
  const allTimeWinnersMap = new Map();
  for (const match of matchResultsList) {
    if (match.players && Array.isArray(match.players)) {
      for (const p of match.players) {
        if (p.isWinner && p.userId) {
          const existing = allTimeWinnersMap.get(p.userId);
          const reward = Number(p.reward) || 0;
          const kills = Number(p.kills) || 0;

          if (!existing) {
            allTimeWinnersMap.set(p.userId, {
              userId: p.userId,
              username: p.username || 'User',
              ign: p.ign || '',
              gameUid: p.gameUid || p.uid || '',
              game: match.game || 'pubg',
              winsCount: 1,
              totalPrizeWon: reward,
              totalKills: kills,
              latestTournamentName: match.tournamentName || 'Tournament Match',
              latestWinDate: match.submittedAt,
              matchesWon: [match.tournamentName || 'Match'],
            });
          } else {
            existing.winsCount += 1;
            existing.totalPrizeWon += reward;
            existing.totalKills += kills;
            if (p.ign && !existing.ign) existing.ign = p.ign;
            if (p.gameUid && !existing.gameUid) existing.gameUid = p.gameUid;
            if (!existing.matchesWon.includes(match.tournamentName)) {
              existing.matchesWon.push(match.tournamentName);
            }
          }
        }
      }
    }
  }

  const allTimeWinnersList = Array.from(allTimeWinnersMap.values())
    .filter(c => {
      const matchesGame = filterGame === 'all' || c.game === filterGame;
      const q = searchQuery.toLowerCase();
      const matchesSearch = !searchQuery ||
        c.username?.toLowerCase().includes(q) ||
        c.ign?.toLowerCase().includes(q) ||
        c.gameUid?.toString().includes(q) ||
        c.userId?.toLowerCase().includes(q);
      return matchesGame && matchesSearch;
    })
    .sort((a, b) => {
      if (sortBy === 'prize') return b.totalPrizeWon - a.totalPrizeWon;
      if (sortBy === 'kills') return b.totalKills - a.totalKills;
      return b.winsCount - a.winsCount || b.totalPrizeWon - a.totalPrizeWon;
    });

  // 2. ALL-TIME TOP FRAGGERS (NO LIMIT - SHOWS ALL KILLERS WITH PEAK KILLS & TOTAL KILLS)
  // If Ali had 10 kills in Match 1 and 20 kills in Match 2 -> Ali has 1 record with 20 Peak Kills & 30 Total Kills!
  const allTimeFraggersMap = new Map();
  for (const match of matchResultsList) {
    if (match.players && Array.isArray(match.players)) {
      for (const p of match.players) {
        const kills = Number(p.kills) || 0;
        if (kills > 0 && p.userId) {
          const existing = allTimeFraggersMap.get(p.userId);
          if (!existing) {
            allTimeFraggersMap.set(p.userId, {
              userId: p.userId,
              username: p.username || 'User',
              ign: p.ign || '',
              gameUid: p.gameUid || p.uid || '',
              game: match.game || 'pubg',
              peakKills: kills,
              totalKills: kills,
              matchesWithKills: 1,
              bestMatchName: match.tournamentName || 'Tournament Match',
            });
          } else {
            existing.totalKills += kills;
            existing.matchesWithKills += 1;
            if (kills > existing.peakKills) {
              existing.peakKills = kills;
              existing.bestMatchName = match.tournamentName || 'Tournament Match';
            }
            if (p.ign && !existing.ign) existing.ign = p.ign;
            if (p.gameUid && !existing.gameUid) existing.gameUid = p.gameUid;
          }
        }
      }
    }
  }

  const allTimeFraggersList = Array.from(allTimeFraggersMap.values())
    .filter(f => {
      const matchesGame = filterGame === 'all' || f.game === filterGame;
      const q = searchQuery.toLowerCase();
      const matchesSearch = !searchQuery ||
        f.username?.toLowerCase().includes(q) ||
        f.ign?.toLowerCase().includes(q) ||
        f.gameUid?.toString().includes(q);
      return matchesGame && matchesSearch;
    })
    .sort((a, b) => b.peakKills - a.peakKills || b.totalKills - a.totalKills);

  const totalPrizeDistributed = Array.from(allTimeWinnersMap.values())
    .reduce((sum, w) => sum + w.totalPrizeWon, 0);

  return (
    <AdminLayout
      title="All-Time Hall of Fame & Champions"
      subtitle="Master all-time records of every tournament champion and top killer without limits"
    >
      {loading ? <LoadingSpinner text="Loading hall of fame..." /> : (
      <>
      {/* Top Banner Stats Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '16px',
        marginBottom: '28px',
      }}>
        <div style={{
          background: '#FFFFFF',
          borderRadius: '14px',
          padding: '18px 20px',
          border: '1px solid #EBE4DA',
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
        }}>
          <div>
            <div style={{ fontSize: '12px', color: '#8A8078', fontWeight: 600, marginBottom: '4px' }}>
              Unique Champions
            </div>
            <div style={{ fontWeight: 800, fontSize: '24px', color: '#FF6B4A', lineHeight: 1.1 }}>
              {allTimeWinnersMap.size} Players
            </div>
            <div style={{ fontSize: '11px', color: '#A69E94', marginTop: '4px' }}>Won 1 or more matches</div>
          </div>
          <div style={{
            width: '38px', height: '38px', borderRadius: '10px', background: '#FFF0EC',
            display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#FF6B4A',
          }}>
            <Trophy size={18} />
          </div>
        </div>

        <div style={{
          background: '#FFFFFF',
          borderRadius: '14px',
          padding: '18px 20px',
          border: '1px solid #EBE4DA',
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
        }}>
          <div>
            <div style={{ fontSize: '12px', color: '#8A8078', fontWeight: 600, marginBottom: '4px' }}>
              Total Prize Distributed
            </div>
            <div style={{ fontWeight: 800, fontSize: '24px', color: '#2E7D32', lineHeight: 1.1 }}>
              Rs {totalPrizeDistributed.toLocaleString()}
            </div>
            <div style={{ fontSize: '11px', color: '#A69E94', marginTop: '4px' }}>Awarded to champions</div>
          </div>
          <div style={{
            width: '38px', height: '38px', borderRadius: '10px', background: '#E8F5E9',
            display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2E7D32',
          }}>
            <DollarSign size={18} />
          </div>
        </div>

        <div style={{
          background: '#FFFFFF',
          borderRadius: '14px',
          padding: '18px 20px',
          border: '1px solid #EBE4DA',
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
        }}>
          <div>
            <div style={{ fontSize: '12px', color: '#8A8078', fontWeight: 600, marginBottom: '4px' }}>
              Recorded Fraggers
            </div>
            <div style={{ fontWeight: 800, fontSize: '24px', color: '#7B4FE0', lineHeight: 1.1 }}>
              {allTimeFraggersMap.size} Killers
            </div>
            <div style={{ fontSize: '11px', color: '#A69E94', marginTop: '4px' }}>Scored 1 or more kills</div>
          </div>
          <div style={{
            width: '38px', height: '38px', borderRadius: '10px', background: '#F3EEFF',
            display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#7B4FE0',
          }}>
            <Flame size={18} />
          </div>
        </div>
      </div>

      {/* Main Container Card */}
      <div style={cardStyle}>
        
        {/* Navigation Tabs Switcher */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '14px',
          marginBottom: '20px',
          borderBottom: '1px solid #F0ECE4',
          paddingBottom: '16px',
        }}>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={() => setActiveTab('allTimeWinners')}
              style={{
                padding: '10px 18px',
                borderRadius: '10px',
                border: activeTab === 'allTimeWinners' ? '1px solid #FF6B4A' : '1px solid #EBE4DA',
                background: activeTab === 'allTimeWinners' ? '#FF6B4A' : '#FFFFFF',
                color: activeTab === 'allTimeWinners' ? '#FFFFFF' : '#5E5851',
                fontWeight: 700,
                fontSize: '13px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'all 0.15s ease',
              }}
            >
              <Trophy size={16} /> All-Time Champions ({allTimeWinnersMap.size})
            </button>

            <button
              onClick={() => setActiveTab('allTimeFraggers')}
              style={{
                padding: '10px 18px',
                borderRadius: '10px',
                border: activeTab === 'allTimeFraggers' ? '1px solid #7B4FE0' : '1px solid #EBE4DA',
                background: activeTab === 'allTimeFraggers' ? '#7B4FE0' : '#FFFFFF',
                color: activeTab === 'allTimeFraggers' ? '#FFFFFF' : '#5E5851',
                fontWeight: 700,
                fontSize: '13px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'all 0.15s ease',
              }}
            >
              <Flame size={16} /> All-Time Fraggers ({allTimeFraggersMap.size})
            </button>
          </div>

          {/* Game Filters */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '12px', color: '#8A8078', fontWeight: 600 }}>Game:</span>
            {[
              { key: 'all', label: 'All' },
              { key: 'pubg', label: 'PUBG' },
              { key: 'freefire', label: 'Free Fire' },
            ].map(f => (
              <button
                key={f.key}
                onClick={() => setFilterGame(f.key)}
                style={{
                  padding: '5px 12px',
                  borderRadius: '14px',
                  border: filterGame === f.key ? '1px solid #2E2A26' : '1px solid #EBE4DA',
                  background: filterGame === f.key ? '#2E2A26' : '#FFFFFF',
                  color: filterGame === f.key ? '#FFFFFF' : '#8A8078',
                  fontSize: '11px',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Search & Sort Controls Bar */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '14px',
          marginBottom: '20px',
        }}>
          <div style={{ position: 'relative', width: '100%', maxWidth: '380px' }}>
            <Search size={16} color="#A69E94" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
            <input
              type="text"
              placeholder="Search by username, in-game name (IGN), UID..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              style={{ ...inputStyle, paddingLeft: '36px' }}
            />
          </div>

          {activeTab === 'allTimeWinners' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '12px', color: '#8A8078', fontWeight: 600 }}>Sort Champions:</span>
              <button
                onClick={() => setSortBy('wins')}
                style={{
                  padding: '6px 14px',
                  borderRadius: '20px',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  border: sortBy === 'wins' ? '1px solid #FF6B4A' : '1px solid #E8E2DA',
                  background: sortBy === 'wins' ? '#FF6B4A' : '#FFFFFF',
                  color: sortBy === 'wins' ? '#FFFFFF' : '#8A8078',
                }}
              >
                Total Wins (e.g. 2x, 5x)
              </button>
              <button
                onClick={() => setSortBy('prize')}
                style={{
                  padding: '6px 14px',
                  borderRadius: '20px',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  border: sortBy === 'prize' ? '1px solid #FF6B4A' : '1px solid #E8E2DA',
                  background: sortBy === 'prize' ? '#FF6B4A' : '#FFFFFF',
                  color: sortBy === 'prize' ? '#FFFFFF' : '#8A8078',
                }}
              >
                Total Cash Won (Rs)
              </button>
            </div>
          )}
        </div>

        {/* TAB 1: ALL-TIME WINNERS FULL TABLE */}
        {activeTab === 'allTimeWinners' ? (
          <div style={{ overflowX: 'auto', width: '100%' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', minWidth: '880px' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #F0ECE4', background: '#FCFAF7' }}>
                  <th style={{ textAlign: 'left', padding: '12px 14px', color: '#8A8078', fontWeight: 600, fontSize: '11px', textTransform: 'uppercase' }}>Rank</th>
                  <th style={{ textAlign: 'left', padding: '12px 14px', color: '#8A8078', fontWeight: 600, fontSize: '11px', textTransform: 'uppercase' }}>Player Account</th>
                  <th style={{ textAlign: 'left', padding: '12px 14px', color: '#8A8078', fontWeight: 600, fontSize: '11px', textTransform: 'uppercase' }}>In-Game Name (IGN) & UID</th>
                  <th style={{ textAlign: 'center', padding: '12px 14px', color: '#8A8078', fontWeight: 600, fontSize: '11px', textTransform: 'uppercase' }}>Champion Multiplier</th>
                  <th style={{ textAlign: 'center', padding: '12px 14px', color: '#8A8078', fontWeight: 600, fontSize: '11px', textTransform: 'uppercase' }}>Total Cash Won</th>
                  <th style={{ textAlign: 'center', padding: '12px 14px', color: '#8A8078', fontWeight: 600, fontSize: '11px', textTransform: 'uppercase' }}>Total Match Kills</th>
                  <th style={{ textAlign: 'left', padding: '12px 14px', color: '#8A8078', fontWeight: 600, fontSize: '11px', textTransform: 'uppercase' }}>Recent Match Victory</th>
                </tr>
              </thead>
              <tbody>
                {allTimeWinnersList.length === 0 ? (
                  <tr>
                    <td colSpan="7" style={{ textAlign: 'center', padding: '40px', color: '#8A8078' }}>
                      No tournament winners found.
                    </td>
                  </tr>
                ) : (
                  allTimeWinnersList.map((champ, index) => (
                    <tr
                      key={champ.userId}
                      style={{
                        borderBottom: '1px solid #F0ECE4',
                        background: index === 0 ? '#FFFDF8' : 'transparent',
                        transition: 'background 0.15s ease',
                      }}
                    >
                      {/* Rank */}
                      <td style={{ padding: '14px', fontWeight: 800, fontSize: index < 3 ? '16px' : '13px', color: index === 0 ? '#F4B740' : '#8A8078' }}>
                        {index === 0 ? '🥇 #1' : index === 1 ? '🥈 #2' : index === 2 ? '🥉 #3' : `#${index + 1}`}
                      </td>

                      {/* Player User */}
                      <td style={{ padding: '14px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div style={{
                            width: '36px',
                            height: '36px',
                            borderRadius: '50%',
                            background: index === 0 ? '#FFF6E0' : '#FFF0EC',
                            color: index === 0 ? '#F4B740' : '#FF6B4A',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 800,
                            fontSize: '14px',
                          }}>
                            {champ.username[0]?.toUpperCase() || 'U'}
                          </div>
                          <div>
                            <div style={{ fontWeight: 800, color: '#2E2A26', fontSize: '14px' }}>
                              @{champ.username}
                            </div>
                            <div style={{ fontSize: '10px', color: '#A69E94', fontFamily: 'monospace' }}>
                              ID: {champ.userId?.slice(0, 10)}...
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* IGN & UID */}
                      <td style={{ padding: '14px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                          <span style={{
                            fontSize: '11px',
                            fontWeight: 700,
                            color: '#FF6B4A',
                            background: '#FFF0EC',
                            padding: '2px 8px',
                            borderRadius: '6px',
                          }}>
                            IGN: {champ.ign || 'Player'}
                          </span>

                          {champ.gameUid && (
                            <button
                              onClick={() => handleCopyUid(champ.gameUid)}
                              title="Click to copy UID"
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '3px',
                                fontSize: '11px',
                                fontFamily: 'monospace',
                                fontWeight: 700,
                                color: '#5E5851',
                                background: '#F0ECE4',
                                padding: '2px 8px',
                                borderRadius: '6px',
                                border: 'none',
                                cursor: 'pointer',
                              }}
                            >
                              <span>UID: {champ.gameUid}</span>
                              {copiedUid === champ.gameUid ? <Check size={11} color="#3FA65C" /> : <Copy size={11} color="#8A8078" />}
                            </button>
                          )}
                        </div>
                      </td>

                      {/* Champion Multiplier Badge (e.g. 2x Champion) */}
                      <td style={{ padding: '14px', textAlign: 'center' }}>
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          padding: '4px 10px',
                          borderRadius: '8px',
                          fontWeight: 800,
                          fontSize: '12px',
                          background: champ.winsCount >= 3 ? '#FFF6E0' : champ.winsCount === 2 ? '#FFF0EC' : '#F0ECE4',
                          color: champ.winsCount >= 3 ? '#E88B00' : champ.winsCount === 2 ? '#FF6B4A' : '#5E5851',
                          border: champ.winsCount >= 2 ? '1px solid currentColor' : 'none',
                        }}>
                          <Crown size={13} />
                          {champ.winsCount > 1 ? `${champ.winsCount}x Champion` : '1 Win'}
                        </span>
                      </td>

                      {/* Total Prize Won */}
                      <td style={{ padding: '14px', textAlign: 'center', fontWeight: 800, color: '#2E7D32', fontSize: '15px' }}>
                        Rs {champ.totalPrizeWon.toLocaleString()}
                      </td>

                      {/* Total Kills */}
                      <td style={{ padding: '14px', textAlign: 'center', fontWeight: 700, color: '#7B4FE0', fontSize: '13px' }}>
                        {champ.totalKills} Kills
                      </td>

                      {/* Latest Tournament Won */}
                      <td style={{ padding: '14px' }}>
                        <div style={{ fontWeight: 600, color: '#2E2A26', fontSize: '12px' }}>
                          {champ.latestTournamentName}
                        </div>
                        <div style={{ fontSize: '11px', color: '#8A8078' }}>
                          {champ.matchesWon.length} tournaments won total
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        ) : (
          /* TAB 2: ALL-TIME FRAGGERS FULL TABLE (NO LIMIT) */
          <div style={{ overflowX: 'auto', width: '100%' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', minWidth: '880px' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #F0ECE4', background: '#FCFAF7' }}>
                  <th style={{ textAlign: 'left', padding: '12px 14px', color: '#8A8078', fontWeight: 600, fontSize: '11px', textTransform: 'uppercase' }}>Rank</th>
                  <th style={{ textAlign: 'left', padding: '12px 14px', color: '#8A8078', fontWeight: 600, fontSize: '11px', textTransform: 'uppercase' }}>Player Account</th>
                  <th style={{ textAlign: 'left', padding: '12px 14px', color: '#8A8078', fontWeight: 600, fontSize: '11px', textTransform: 'uppercase' }}>In-Game Name (IGN) & UID</th>
                  <th style={{ textAlign: 'center', padding: '12px 14px', color: '#8A8078', fontWeight: 600, fontSize: '11px', textTransform: 'uppercase' }}>Peak Single-Match Kills</th>
                  <th style={{ textAlign: 'center', padding: '12px 14px', color: '#8A8078', fontWeight: 600, fontSize: '11px', textTransform: 'uppercase' }}>Total Frags (All Matches)</th>
                  <th style={{ textAlign: 'center', padding: '12px 14px', color: '#8A8078', fontWeight: 600, fontSize: '11px', textTransform: 'uppercase' }}>Matches With Frags</th>
                  <th style={{ textAlign: 'left', padding: '12px 14px', color: '#8A8078', fontWeight: 600, fontSize: '11px', textTransform: 'uppercase' }}>Best Match Record</th>
                </tr>
              </thead>
              <tbody>
                {allTimeFraggersList.length === 0 ? (
                  <tr>
                    <td colSpan="7" style={{ textAlign: 'center', padding: '40px', color: '#8A8078' }}>
                      No fraggers recorded yet.
                    </td>
                  </tr>
                ) : (
                  allTimeFraggersList.map((frag, index) => (
                    <tr
                      key={frag.userId}
                      style={{
                        borderBottom: '1px solid #F0ECE4',
                        background: index === 0 ? '#FBF9FF' : 'transparent',
                        transition: 'background 0.15s ease',
                      }}
                    >
                      {/* Rank */}
                      <td style={{ padding: '14px', fontWeight: 800, fontSize: index < 3 ? '16px' : '13px', color: index === 0 ? '#7B4FE0' : '#8A8078' }}>
                        {index === 0 ? '🥇 #1' : index === 1 ? '🥈 #2' : index === 2 ? '🥉 #3' : `#${index + 1}`}
                      </td>

                      {/* Player */}
                      <td style={{ padding: '14px' }}>
                        <div style={{ fontWeight: 800, color: '#2E2A26', fontSize: '14px' }}>
                          @{frag.username}
                        </div>
                        <div style={{ fontSize: '10px', color: '#A69E94', fontFamily: 'monospace' }}>
                          ID: {frag.userId?.slice(0, 10)}...
                        </div>
                      </td>

                      {/* IGN & UID */}
                      <td style={{ padding: '14px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                          <span style={{
                            fontSize: '11px',
                            fontWeight: 700,
                            color: '#7B4FE0',
                            background: '#F3EEFF',
                            padding: '2px 8px',
                            borderRadius: '6px',
                          }}>
                            IGN: {frag.ign || 'Player'}
                          </span>

                          {frag.gameUid && (
                            <button
                              onClick={() => handleCopyUid(frag.gameUid)}
                              title="Click to copy UID"
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '3px',
                                fontSize: '11px',
                                fontFamily: 'monospace',
                                fontWeight: 700,
                                color: '#5E5851',
                                background: '#F0ECE4',
                                padding: '2px 8px',
                                borderRadius: '6px',
                                border: 'none',
                                cursor: 'pointer',
                              }}
                            >
                              <span>UID: {frag.gameUid}</span>
                              {copiedUid === frag.gameUid ? <Check size={11} color="#3FA65C" /> : <Copy size={11} color="#8A8078" />}
                            </button>
                          )}
                        </div>
                      </td>

                      {/* Peak Single Match Kills */}
                      <td style={{ padding: '14px', textAlign: 'center' }}>
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          padding: '4px 10px',
                          borderRadius: '8px',
                          fontWeight: 800,
                          fontSize: '13px',
                          background: '#F3EEFF',
                          color: '#7B4FE0',
                        }}>
                          <Flame size={13} /> {frag.peakKills} Peak Kills
                        </span>
                      </td>

                      {/* Total Frags */}
                      <td style={{ padding: '14px', textAlign: 'center', fontWeight: 800, color: '#2E2A26', fontSize: '15px' }}>
                        {frag.totalKills} Frags
                      </td>

                      {/* Matches Count */}
                      <td style={{ padding: '14px', textAlign: 'center', fontWeight: 600, color: '#8A8078', fontSize: '12px' }}>
                        {frag.matchesWithKills} Matches
                      </td>

                      {/* Best Match */}
                      <td style={{ padding: '14px' }}>
                        <div style={{ fontWeight: 600, color: '#2E2A26', fontSize: '12px' }}>
                          {frag.bestMatchName}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

      </div>
      </>
      )}
    </AdminLayout>
  );
}
