import { useState, useEffect } from 'react';
import { collection, query, onSnapshot, orderBy, doc, setDoc, updateDoc, increment, getDocs, getDoc, serverTimestamp, addDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import {
  ArrowLeft,
  Crown,
  Target,
  Search,
  Save,
  Medal,
  Trophy,
  Users,
  Gamepad2,
  CheckCircle2,
  AlertCircle,
  Flame,
  DollarSign,
  Copy,
  Check,
  Award
} from 'lucide-react';
import { FaMedal, FaTrophy, FaExclamationTriangle } from 'react-icons/fa';
import AdminLayout from './AdminLayout';
import LoadingSpinner from '../components/LoadingSpinner';
import { notifyMultipleUsers, notifyUser } from '../utils/notify';

const inputStyle = {
  width: '100%',
  padding: '8px 12px',
  borderRadius: '6px',
  border: '1px solid #D9D3CC',
  fontSize: '13px',
  boxSizing: 'border-box',
  background: '#FFFFFF',
  outline: 'none',
};

const cardStyle = {
  background: '#FFFFFF',
  borderRadius: '14px',
  padding: '22px',
  border: '1px solid #EBE4DA',
  boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
};

export default function MatchResults() {
  const [adminTab, setAdminTab] = useState('scoring'); // 'scoring' | 'allTimeWinners'
  const [tournaments, setTournaments] = useState([]);
  const [matchResultsList, setMatchResultsList] = useState([]);
  const [selectedTournament, setSelectedTournament] = useState(null);
  const [registeredPlayers, setRegisteredPlayers] = useState([]);
  const [playerKills, setPlayerKills] = useState({});
  const [winnerId, setWinnerId] = useState(null);
  const [loadingPlayers, setLoadingPlayers] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [submittingWinner, setSubmittingWinner] = useState(false);
  const [submittingFraggers, setSubmittingFraggers] = useState(false);
  const [filterGame, setFilterGame] = useState('all');

  // All-time champions search & sort state
  const [championSearch, setChampionSearch] = useState('');
  const [championSortBy, setChampionSortBy] = useState('wins'); // 'wins' | 'prize'
  const [copiedUid, setCopiedUid] = useState(null);

  // Listen to tournaments
  useEffect(() => {
    const unsubTournaments = onSnapshot(
      query(collection(db, 'tournaments'), orderBy('createdAt', 'desc')),
      (snap) => setTournaments(snap.docs.map(d => ({ id: d.id, ...d.data() }))),
      () => {}
    );

    // Listen to all matchResults for all-time winners aggregation
    const unsubResults = onSnapshot(
      collection(db, 'matchResults'),
      (snap) => setMatchResultsList(snap.docs.map(d => ({ id: d.id, ...d.data() }))),
      () => {}
    );

    return () => { unsubTournaments(); unsubResults(); };
  }, []);

  const handleCopyUid = (uid) => {
    if (!uid) return;
    navigator.clipboard.writeText(uid);
    setCopiedUid(uid);
    setTimeout(() => setCopiedUid(null), 2000);
  };

  const handleSelectTournament = async (tournament) => {
    setSelectedTournament(tournament);
    setLoadingPlayers(true);
    setWinnerId(null);
    setPlayerKills({});
    setSearchQuery('');
    try {
      const playersSnap = await getDocs(collection(db, 'tournaments', tournament.id, 'players'));
      const players = playersSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      setRegisteredPlayers(players);

      // Check if results were already entered
      const existing = matchResultsList.find(d => d.id === tournament.id);
      if (existing) {
        if (existing.winnerId) {
          const matchPlayer = players.find(p => p.userId === existing.winnerId);
          if (matchPlayer) setWinnerId(matchPlayer.id);
        }
        if (existing.players && Array.isArray(existing.players)) {
          const killsMap = {};
          existing.players.forEach(p => {
            const registered = players.find(rp => rp.userId === p.userId);
            if (registered) killsMap[registered.id] = p.kills || 0;
          });
          setPlayerKills(killsMap);
        }
      }
    } catch (error) {
      console.error('Error fetching players:', error);
      setRegisteredPlayers([]);
    }
    setLoadingPlayers(false);
  };

  const updateKills = (playerId, kills) => {
    setPlayerKills(prev => ({ ...prev, [playerId]: Math.max(0, parseInt(kills) || 0) }));
  };

  const topFraggers = registeredPlayers
    .filter(p => (playerKills[p.id] || 0) > 0)
    .sort((a, b) => (playerKills[b.id] || 0) - (playerKills[a.id] || 0));

  const existingResult = selectedTournament ? matchResultsList.find(d => d.id === selectedTournament.id) : null;

  const submitWinner = async () => {
    if (!selectedTournament || !winnerId) return;
    setSubmittingWinner(true);
    try {
      // Fresh Firestore read to prevent double declaration
      const resultDoc = await getDoc(doc(db, 'matchResults', selectedTournament.id));
      if (resultDoc.exists() && resultDoc.data().winnerDeclared) {
        alert('Winner already declared for this tournament.');
        setSubmittingWinner(false);
        return;
      }

      const winnerPlayer = registeredPlayers.find(p => p.id === winnerId);
      if (!winnerPlayer) {
        setSubmittingWinner(false);
        return;
      }

      const players = registeredPlayers.map(p => ({
        userId: p.userId,
        username: p.username,
        ign: p.ign || '',
        gameUid: p.uid || '',
        kills: playerKills[p.id] || 0,
        reward: p.id === winnerId ? (selectedTournament.fixedReward || 0) : 0,
        isWinner: p.id === winnerId,
        placement: p.id === winnerId ? 1 : 0,
      }));

      await setDoc(doc(db, 'matchResults', selectedTournament.id), {
        tournamentName: selectedTournament.name,
        game: selectedTournament.game,
        players,
        winnerDeclared: true,
        winnerId: winnerPlayer.userId,
        winnerUsername: winnerPlayer.username,
        submittedAt: serverTimestamp(),
      }, { merge: true });

      // Update tournament status to completed
      await updateDoc(doc(db, 'tournaments', selectedTournament.id), {
        status: 'completed',
      });

      // Update winner user profile stats
      await updateDoc(doc(db, 'users', winnerPlayer.userId), {
        walletBalance: increment(selectedTournament.fixedReward || 0),
        totalWins: increment(1),
        totalKills: increment(playerKills[winnerId] || 0),
      });

      // Log transaction in winner's history ledger
      await addDoc(collection(db, 'transactions', winnerPlayer.userId, 'history'), {
        type: 'credit',
        amount: selectedTournament.fixedReward || 0,
        description: `Prize Won: ${selectedTournament.name}`,
        timestamp: serverTimestamp(),
        status: 'completed',
      });

      // Update kill stats for other participants
      for (const player of players) {
        if (player.kills > 0 && player.userId !== winnerPlayer.userId) {
          await updateDoc(doc(db, 'users', player.userId), {
            totalKills: increment(player.kills),
          });
        }
      }

      // Auto-notify winner
      notifyUser(winnerPlayer.userId, {
        type: 'winner',
        title: 'Congratulations, Champion!',
        body: `You won Rs ${(selectedTournament.fixedReward || 0).toLocaleString()} in "${selectedTournament.name}"! Reward has been credited to your wallet.`,
        url: '/rewards',
      }).catch(() => {});

      // Auto-notify all other participants
      const otherPlayerUids = players
        .filter(p => p.userId !== winnerPlayer.userId)
        .map(p => p.userId);
      if (otherPlayerUids.length > 0) {
        notifyMultipleUsers(otherPlayerUids, {
          type: 'tournament',
          title: 'Match Results Declared',
          body: `Results for "${selectedTournament.name}" are out. Winner: @${winnerPlayer.username}. Check Hall of Fame!`,
          url: '/hall-of-fame',
        }).catch(() => {});
      }

      alert(`Winner assigned! @${winnerPlayer.username} won Rs ${selectedTournament.fixedReward}. All-Time Champions list has been updated.`);
    } catch (error) {
      console.error('Error submitting winner:', error);
      alert('Error declaring winner');
    }
    setSubmittingWinner(false);
  };

  const submitFraggers = async () => {
    if (!selectedTournament || topFraggers.length === 0) return;
    // Check if already submitted
    if (existingResult?.fraggersSubmitted) {
      alert('Top fraggers already submitted for this tournament.');
      return;
    }
    setSubmittingFraggers(true);
    try {
      const fraggerData = topFraggers.slice(0, 10).map((p, i) => ({
        rank: i + 1,
        userId: p.userId,
        username: p.username,
        ign: p.ign || '',
        gameUid: p.uid || '',
        kills: playerKills[p.id] || 0,
      }));

      await setDoc(doc(db, 'matchResults', selectedTournament.id), {
        tournamentName: selectedTournament.name,
        game: selectedTournament.game,
        topFraggers: fraggerData,
        fraggersSubmitted: true,
        submittedAt: serverTimestamp(),
      }, { merge: true });

      // Auto-notify top fraggers
      const fraggerUids = fraggerData.map(f => f.userId);
      if (fraggerUids.length > 0) {
        notifyMultipleUsers(fraggerUids, {
          type: 'winner',
          title: 'Top Fragger Recognition!',
          body: `You made it to the Top Fraggers leaderboard for "${selectedTournament.name}"! Check Hall of Fame.`,
          url: '/hall-of-fame',
        }).catch(() => {});
      }

      alert(`Top ${fraggerData.length} Fraggers submitted for Hall of Fame!`);
    } catch (error) {
      console.error('Error submitting fraggers:', error);
      alert('Error submitting fraggers');
    }
    setSubmittingFraggers(false);
  };

  const filteredPlayers = registeredPlayers.filter(p => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      p.username?.toLowerCase().includes(q) ||
      p.ign?.toLowerCase().includes(q) ||
      p.uid?.toString().includes(q)
    );
  });

  const winnerPlayer = registeredPlayers.find(p => p.id === winnerId);

  // ALL-TIME WINNERS AGGREGATION LOGIC
  // Groups multiple wins by same player so "Ali" who won 2 times appears ONCE as "2x Champion"!
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
              winsCount: 1,
              totalPrizeWon: reward,
              totalKills: kills,
              latestTournamentName: match.tournamentName || 'Tournament',
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

  const allTimeChampionsList = Array.from(allTimeWinnersMap.values())
    .filter(c => {
      if (!championSearch) return true;
      const q = championSearch.toLowerCase();
      return (
        c.username?.toLowerCase().includes(q) ||
        c.ign?.toLowerCase().includes(q) ||
        c.gameUid?.toString().includes(q) ||
        c.userId?.toLowerCase().includes(q)
      );
    })
    .sort((a, b) => {
      if (championSortBy === 'prize') return b.totalPrizeWon - a.totalPrizeWon;
      return b.winsCount - a.winsCount || b.totalPrizeWon - a.totalPrizeWon;
    });

  // ALL-TIME WINNERS LEADERBOARD VIEW
  if (adminTab === 'allTimeWinners') {
    return (
      <AdminLayout
        title="All-Time Champions Leaderboard"
        subtitle="Aggregated master list of all tournament winners with win counts (e.g. 2x, 5x Champion), prize earnings, and IGNs"
        actions={
          <button
            onClick={() => setAdminTab('scoring')}
            style={{
              padding: '8px 16px',
              background: '#FF6B4A',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: '8px',
              fontWeight: 600,
              fontSize: '13px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <Gamepad2 size={16} /> Enter Match Scoring
          </button>
        }
      >
        {/* Navigation Switcher */}
        <div style={{ display: 'flex', gap: '10px', marginBottom: '22px' }}>
          <button
            onClick={() => setAdminTab('scoring')}
            style={{
              padding: '10px 18px',
              borderRadius: '10px',
              border: '1px solid #EBE4DA',
              background: '#FFFFFF',
              color: '#5E5851',
              fontWeight: 600,
              fontSize: '13px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <Gamepad2 size={16} /> Match Scoring & Declaration
          </button>

          <button
            onClick={() => setAdminTab('allTimeWinners')}
            style={{
              padding: '10px 18px',
              borderRadius: '10px',
              border: '1px solid #FF6B4A',
              background: '#FF6B4A',
              color: '#FFFFFF',
              fontWeight: 700,
              fontSize: '13px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 2px 6px rgba(255, 107, 74, 0.25)',
            }}
          >
            <Trophy size={16} /> <FaTrophy size={16} style={{display:'inline'}} /> All-Time Champions ({allTimeChampionsList.length})
          </button>
        </div>

        {/* Master Champions Table Card */}
        <div style={cardStyle}>
          {/* Controls Bar */}
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
                placeholder="Search champion by username, IGN, UID..."
                value={championSearch}
                onChange={e => setChampionSearch(e.target.value)}
                style={{ ...inputStyle, paddingLeft: '36px' }}
              />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '12px', color: '#8A8078', fontWeight: 600 }}>Sort By:</span>
              <button
                onClick={() => setChampionSortBy('wins')}
                style={{
                  padding: '6px 14px',
                  borderRadius: '20px',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  border: championSortBy === 'wins' ? '1px solid #FF6B4A' : '1px solid #E8E2DA',
                  background: championSortBy === 'wins' ? '#FF6B4A' : '#FFFFFF',
                  color: championSortBy === 'wins' ? '#FFFFFF' : '#8A8078',
                }}
              >
                Total Wins (e.g. 2x, 3x)
              </button>
              <button
                onClick={() => setChampionSortBy('prize')}
                style={{
                  padding: '6px 14px',
                  borderRadius: '20px',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  border: championSortBy === 'prize' ? '1px solid #FF6B4A' : '1px solid #E8E2DA',
                  background: championSortBy === 'prize' ? '#FF6B4A' : '#FFFFFF',
                  color: championSortBy === 'prize' ? '#FFFFFF' : '#8A8078',
                }}
              >
                Total Prize Won (Rs)
              </button>
            </div>
          </div>

          {/* Desktop Table View */}
          <div style={{ overflowX: 'auto', width: '100%' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', minWidth: '850px' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #F0ECE4', background: '#FCFAF7' }}>
                  <th style={{ textAlign: 'left', padding: '12px 14px', color: '#8A8078', fontWeight: 600, fontSize: '11px', textTransform: 'uppercase' }}>Rank</th>
                  <th style={{ textAlign: 'left', padding: '12px 14px', color: '#8A8078', fontWeight: 600, fontSize: '11px', textTransform: 'uppercase' }}>Champion Player</th>
                  <th style={{ textAlign: 'left', padding: '12px 14px', color: '#8A8078', fontWeight: 600, fontSize: '11px', textTransform: 'uppercase' }}>In-Game Name (IGN) & UID</th>
                  <th style={{ textAlign: 'center', padding: '12px 14px', color: '#8A8078', fontWeight: 600, fontSize: '11px', textTransform: 'uppercase' }}>Total Wins</th>
                  <th style={{ textAlign: 'center', padding: '12px 14px', color: '#8A8078', fontWeight: 600, fontSize: '11px', textTransform: 'uppercase' }}>Total Prize Won</th>
                  <th style={{ textAlign: 'center', padding: '12px 14px', color: '#8A8078', fontWeight: 600, fontSize: '11px', textTransform: 'uppercase' }}>Total Kills</th>
                  <th style={{ textAlign: 'left', padding: '12px 14px', color: '#8A8078', fontWeight: 600, fontSize: '11px', textTransform: 'uppercase' }}>Latest Victory</th>
                </tr>
              </thead>
              <tbody>
                {allTimeChampionsList.length === 0 ? (
                  <tr>
                    <td colSpan="7" style={{ textAlign: 'center', padding: '40px', color: '#8A8078' }}>
                      No tournament winners recorded yet. Declare a winner in Match Results to see them here!
                    </td>
                  </tr>
                ) : (
                  allTimeChampionsList.map((champ, index) => (
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
                        {index === 0 ? (<><FaMedal color="#F4B740" /> #1</>) : index === 1 ? (<><FaMedal color="#9E9E9E" /> #2</>) : index === 2 ? (<><FaMedal color="#CD7F32" /> #3</>) : `#${index + 1}`}
                      </td>

                      {/* Champion User */}
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
                              UID: {champ.userId?.slice(0, 10)}...
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

                      {/* Total Wins Badge (e.g. 2x Champion) */}
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
                          {champ.matchesWon.length} tournaments total
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </AdminLayout>
    );
  }

  // VIEW 1: MATCH SELECTION VIEW (SCORING TAB)
  if (!selectedTournament) {
    const selectableTournaments = tournaments.filter(t => {
      const isGame = filterGame === 'all' || t.game === filterGame;
      return isGame;
    });

    return (
      <AdminLayout
        title="Match Results & Scoring"
        subtitle="Select a match to record kills and award cash prizes, or view the All-Time Champions Leaderboard"
        actions={
          <button
            onClick={() => setAdminTab('allTimeWinners')}
            style={{
              padding: '8px 16px',
              background: '#FFF0EC',
              color: '#FF6B4A',
              border: '1px solid #FFDACF',
              borderRadius: '8px',
              fontWeight: 700,
              fontSize: '13px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <Trophy size={16} /> All-Time Champions ({allTimeWinnersMap.size})
          </button>
        }
      >
        {/* Navigation Switcher */}
        <div style={{ display: 'flex', gap: '10px', marginBottom: '22px' }}>
          <button
            onClick={() => setAdminTab('scoring')}
            style={{
              padding: '10px 18px',
              borderRadius: '10px',
              border: '1px solid #7B4FE0',
              background: '#7B4FE0',
              color: '#FFFFFF',
              fontWeight: 700,
              fontSize: '13px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 2px 6px rgba(123, 79, 224, 0.25)',
            }}
          >
            <Gamepad2 size={16} /> Match Scoring & Declaration
          </button>

          <button
            onClick={() => setAdminTab('allTimeWinners')}
            style={{
              padding: '10px 18px',
              borderRadius: '10px',
              border: '1px solid #EBE4DA',
              background: '#FFFFFF',
              color: '#5E5851',
              fontWeight: 600,
              fontSize: '13px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <Trophy size={16} /> <FaTrophy size={16} style={{display:'inline'}} /> All-Time Champions ({allTimeWinnersMap.size})
          </button>
        </div>

        {/* Filter Controls */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          marginBottom: '22px',
        }}>
          <span style={{ fontSize: '12px', color: '#8A8078', fontWeight: 600 }}>Filter Game:</span>
          {[
            { key: 'all', label: 'All Games' },
            { key: 'pubg', label: 'PUBG Mobile' },
            { key: 'freefire', label: 'Free Fire' },
          ].map(f => (
            <button
              key={f.key}
              onClick={() => setFilterGame(f.key)}
              style={{
                padding: '6px 14px',
                borderRadius: '20px',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
                border: filterGame === f.key ? '1px solid #7B4FE0' : '1px solid #E8E2DA',
                background: filterGame === f.key ? '#7B4FE0' : '#FFFFFF',
                color: filterGame === f.key ? '#FFFFFF' : '#8A8078',
                transition: 'all 0.15s ease',
              }}
            >
              {f.label}
            </button>
          ))}
        </div>

        {selectableTournaments.length === 0 ? (
          <div style={{ ...cardStyle, textAlign: 'center', padding: '60px 20px' }}>
            <Gamepad2 size={40} color="#C4BCB2" style={{ margin: '0 auto 12px' }} />
            <h4 style={{ fontSize: '16px', color: '#2E2A26', margin: '0 0 6px' }}>No tournaments found</h4>
            <p style={{ fontSize: '13px', color: '#8A8078', margin: 0 }}>Create a tournament first to input scores.</p>
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
            gap: '18px',
          }}>
            {selectableTournaments.map(t => (
              <div
                key={t.id}
                style={{
                  ...cardStyle,
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                }}
              >
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                    <div style={{
                      padding: '4px 8px',
                      borderRadius: '6px',
                      background: t.game === 'pubg' ? '#FFF0EC' : '#F3EEFF',
                      color: t.game === 'pubg' ? '#FF6B4A' : '#7B4FE0',
                      fontSize: '11px',
                      fontWeight: 700,
                    }}>
                      {t.game === 'pubg' ? 'PUBG MOBILE' : 'FREE FIRE'}
                    </div>

                    <span style={{
                      fontSize: '11px',
                      fontWeight: 700,
                      padding: '3px 8px',
                      borderRadius: '6px',
                      background: t.status === 'live' ? '#E8F5E9' : t.status === 'completed' ? '#F0ECE4' : '#FFF8E1',
                      color: t.status === 'live' ? '#3FA65C' : t.status === 'completed' ? '#5E5851' : '#E88B00',
                    }}>
                      {t.status?.toUpperCase()}
                    </span>
                  </div>

                  <h3 style={{ fontWeight: 700, fontSize: '16px', color: '#2E2A26', margin: '0 0 6px' }}>
                    {t.name}
                  </h3>

                  <div style={{ fontSize: '12px', color: '#8A8078', marginBottom: '14px' }}>
                    {t.matchType} • {t.mapName || 'Erangel'} • {t.tournamentType || 'Daily'}
                  </div>

                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 12px',
                    background: '#FAF8F5',
                    borderRadius: '8px',
                    marginBottom: '16px',
                    fontSize: '12px',
                  }}>
                    <div>
                      <span style={{ color: '#8A8078' }}>Joined: </span>
                      <strong>{t.slotsFilled || 0} / {t.maxSlots}</strong>
                    </div>
                    <div>
                      <span style={{ color: '#8A8078' }}>Prize Pool: </span>
                      <strong style={{ color: '#FF6B4A' }}>Rs {t.fixedReward}</strong>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => handleSelectTournament(t)}
                  style={{
                    width: '100%',
                    padding: '11px',
                    background: '#7B4FE0',
                    color: '#FFFFFF',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    boxShadow: '0 2px 6px rgba(123, 79, 224, 0.25)',
                  }}
                >
                  <Gamepad2 size={16} /> Enter / Edit Match Results
                </button>
              </div>
            ))}
          </div>
        )}
      </AdminLayout>
    );
  }

  // VIEW 2: RESULTS ENTRY DESKTOP SPLIT VIEW
  return (
    <AdminLayout
      title={`Match Results: ${selectedTournament.name}`}
      subtitle={`${selectedTournament.game === 'pubg' ? 'PUBG Mobile' : 'Free Fire'} • ${selectedTournament.matchType} • Prize Pool: Rs ${selectedTournament.fixedReward}`}
      actions={
        <button
          onClick={() => { setSelectedTournament(null); setRegisteredPlayers([]); }}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            background: '#F0ECE4',
            color: '#2E2A26',
            padding: '8px 16px',
            borderRadius: '8px',
            border: 'none',
            fontSize: '13px',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          <ArrowLeft size={16} /> Back to Matches
        </button>
      }
    >
      {loadingPlayers ? (
        <LoadingSpinner text="Loading registered players..." />
      ) : registeredPlayers.length === 0 ? (
        <div style={{ ...cardStyle, textAlign: 'center', padding: '60px 20px' }}>
          <Users size={36} color="#C4BCB2" style={{ margin: '0 auto 12px' }} />
          <h4 style={{ fontSize: '16px', color: '#2E2A26', margin: '0 0 6px' }}>No players joined yet</h4>
          <p style={{ fontSize: '13px', color: '#8A8078', margin: 0 }}>
            Zero players have registered for this tournament so far.
          </p>
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1fr) 360px',
          gap: '24px',
          alignItems: 'start',
        }}>

          {/* LEFT: Participant Scoring Table */}
          <div>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '14px',
              gap: '12px',
            }}>
              <div style={{ position: 'relative', flex: 1 }}>
                <Search size={16} color="#A69E94" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                <input
                  type="text"
                  placeholder="Search player by username, In-Game Name (IGN), or UID..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  style={{ ...inputStyle, paddingLeft: '36px' }}
                />
              </div>
              <div style={{ fontSize: '12px', color: '#8A8078', fontWeight: 600, whiteSpace: 'nowrap' }}>
                {registeredPlayers.length} Total Players
              </div>
            </div>

            <div style={{ ...cardStyle, padding: '0', overflow: 'hidden' }}>
              <div style={{ overflowX: 'auto', width: '100%' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', minWidth: '650px' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid #F0ECE4', background: '#FCFAF7' }}>
                      <th style={{ textAlign: 'left', padding: '12px 14px', color: '#8A8078', fontWeight: 600, fontSize: '11px' }}>#</th>
                      <th style={{ textAlign: 'left', padding: '12px 14px', color: '#8A8078', fontWeight: 600, fontSize: '11px' }}>PLAYER</th>
                      <th style={{ textAlign: 'left', padding: '12px 14px', color: '#8A8078', fontWeight: 600, fontSize: '11px' }}>IN-GAME (IGN)</th>
                      <th style={{ textAlign: 'left', padding: '12px 14px', color: '#8A8078', fontWeight: 600, fontSize: '11px' }}>GAME UID</th>
                      <th style={{ textAlign: 'center', padding: '12px 14px', color: '#8A8078', fontWeight: 600, fontSize: '11px' }}>KILLS</th>
                      <th style={{ textAlign: 'center', padding: '12px 14px', color: '#8A8078', fontWeight: 600, fontSize: '11px' }}>WINNER</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredPlayers.map((player, idx) => {
                      const isWinner = player.id === winnerId;
                      const fragRank = topFraggers.findIndex(f => f.id === player.id);
                      const isTop3 = fragRank >= 0 && fragRank < 3;

                      return (
                        <tr
                          key={player.id}
                          style={{
                            borderBottom: '1px solid #F0ECE4',
                            background: isWinner ? '#E8F5E9' : isTop3 ? '#F7F3FF' : 'transparent',
                            transition: 'background 0.15s ease',
                          }}
                        >
                          <td style={{ padding: '12px 14px', fontWeight: 600, color: '#A69E94' }}>
                            {idx + 1}
                          </td>

                          <td style={{ padding: '12px 14px' }}>
                            <div style={{ fontWeight: 700, color: '#2E2A26' }}>
                              @{player.username}
                            </div>
                            <div style={{ fontSize: '10px', color: '#A69E94', fontFamily: 'monospace' }}>
                              ID: {player.userId?.slice(0, 8)}...
                            </div>
                          </td>

                          <td style={{ padding: '12px 14px', color: '#5E5851', fontWeight: 500 }}>
                            {player.ign || '—'}
                          </td>

                          <td style={{ padding: '12px 14px', color: '#8A8078', fontFamily: 'monospace', fontSize: '12px' }}>
                            {player.uid || '—'}
                          </td>

                          <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                            <input
                              type="number"
                              min="0"
                              max="99"
                              value={playerKills[player.id] !== undefined ? playerKills[player.id] : ''}
                              placeholder="0"
                              onChange={e => updateKills(player.id, e.target.value)}
                              style={{
                                ...inputStyle,
                                width: '64px',
                                textAlign: 'center',
                                fontWeight: 700,
                                fontSize: '14px',
                                padding: '6px',
                                border: (playerKills[player.id] || 0) > 0 ? '1px solid #7B4FE0' : '1px solid #D9D3CC',
                                background: (playerKills[player.id] || 0) > 0 ? '#F3EEFF' : '#FFFFFF',
                                color: (playerKills[player.id] || 0) > 0 ? '#7B4FE0' : '#2E2A26',
                              }}
                            />
                          </td>

                          <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                            <button
                              onClick={() => setWinnerId(isWinner ? null : player.id)}
                              style={{
                                padding: '6px 12px',
                                borderRadius: '6px',
                                border: 'none',
                                cursor: 'pointer',
                                fontWeight: 700,
                                fontSize: '11px',
                                background: isWinner ? '#3FA65C' : '#F0ECE4',
                                color: isWinner ? '#FFFFFF' : '#5E5851',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                              }}
                            >
                              {isWinner ? <CheckCircle2 size={12} /> : null}
                              {isWinner ? 'Winner' : 'Set Winner'}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* RIGHT: Winner Declaration & Fraggers Sticky Sidebar */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', position: 'sticky', top: '80px' }}>

            {/* Winner Card */}
            <div style={{ ...cardStyle, border: winnerId ? '2px solid #81C784' : '1px solid #EBE4DA' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                <Crown size={20} color="#F4B740" />
                <h4 style={{ fontWeight: 700, fontSize: '16px', color: '#2E2A26', margin: 0 }}>
                  Declare Match Winner
                </h4>
              </div>
              <p style={{ fontSize: '12px', color: '#8A8078', margin: '0 0 14px' }}>
                Winner will be credited Rs {selectedTournament.fixedReward} and recorded in the All-Time Champions list.
              </p>

              {winnerPlayer ? (
                <div style={{
                  background: '#E8F5E9',
                  borderRadius: '10px',
                  padding: '14px',
                  marginBottom: '16px',
                  border: '1px solid #C8E6C9',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ fontWeight: 800, fontSize: '15px', color: '#2E7D32' }}>
                      @{winnerPlayer.username}
                    </div>
                    <span style={{ fontSize: '11px', background: '#3FA65C', color: '#FFF', padding: '2px 8px', borderRadius: '10px', fontWeight: 700 }}>
                      1st Place
                    </span>
                  </div>

                  <div style={{ fontSize: '12px', color: '#388E3C', marginTop: '6px' }}>
                    IGN: <strong>{winnerPlayer.ign || 'N/A'}</strong> • UID: {winnerPlayer.uid || 'N/A'}
                  </div>

                  <div style={{ fontSize: '12px', color: '#388E3C', marginTop: '4px', fontWeight: 600 }}>
                    Kills: {playerKills[winnerId] || 0} • Reward: Rs {selectedTournament.fixedReward}
                  </div>
                </div>
              ) : (
                <div style={{
                  background: '#FFF8E1',
                  borderRadius: '10px',
                  padding: '12px',
                  marginBottom: '16px',
                  fontSize: '12px',
                  color: '#E88B00',
                  border: '1px solid #FFE082',
                }}>
                  <FaExclamationTriangle size={14} style={{display:'inline'}} /> Click "Set Winner" next to a player in the table.
                </div>
              )}

              <button
                onClick={submitWinner}
                disabled={!winnerId || submittingWinner || existingResult?.winnerDeclared}
                style={{
                  width: '100%',
                  padding: '12px',
                  background: winnerId && !submittingWinner && !existingResult?.winnerDeclared ? '#3FA65C' : '#C4BCB2',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: '8px',
                  fontWeight: 700,
                  fontSize: '13px',
                  cursor: winnerId && !submittingWinner && !existingResult?.winnerDeclared ? 'pointer' : 'not-allowed',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  boxShadow: winnerId ? '0 2px 6px rgba(63, 166, 92, 0.3)' : 'none',
                }}
              >
                <Save size={16} />
                {submittingWinner ? 'Crediting & Saving...' : `Submit Winner & Credit Rs ${selectedTournament.fixedReward}`}
              </button>
            </div>

            {/* Top Fraggers Card */}
            <div style={cardStyle}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                <Target size={20} color="#7B4FE0" />
                <h4 style={{ fontWeight: 700, fontSize: '16px', color: '#2E2A26', margin: 0 }}>
                  Match Top Fraggers
                </h4>
              </div>
              <p style={{ fontSize: '12px', color: '#8A8078', margin: '0 0 14px' }}>
                Calculated automatically from kills entered in table
              </p>

              {topFraggers.length === 0 ? (
                <div style={{
                  background: '#F8F6F1',
                  borderRadius: '10px',
                  padding: '14px',
                  fontSize: '12px',
                  color: '#8A8078',
                  textAlign: 'center',
                  marginBottom: '16px',
                }}>
                  Enter kill numbers in the table to generate match fraggers.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
                  {topFraggers.slice(0, 5).map((p, i) => (
                    <div
                      key={p.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        padding: '8px 10px',
                        borderRadius: '8px',
                        background: i === 0 ? '#FFF8E1' : '#F9F7F4',
                        border: i === 0 ? '1px solid #FFE082' : '1px solid #F0ECE4',
                      }}
                    >
                      <span style={{ fontSize: '14px' }}>
                        {i === 0 ? (<><FaMedal color="#F4B740" /></>) : i === 1 ? (<><FaMedal color="#9E9E9E" /></>) : i === 2 ? (<><FaMedal color="#CD7F32" /></>) : `#${i + 1}`}
                      </span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 700, fontSize: '12px', color: '#2E2A26' }}>
                          @{p.username}
                        </div>
                        <div style={{ fontSize: '10px', color: '#8A8078' }}>
                          IGN: {p.ign || 'N/A'}
                        </div>
                      </div>
                      <div style={{ fontWeight: 800, fontSize: '13px', color: '#7B4FE0' }}>
                        {playerKills[p.id] || 0} kills
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <button
                onClick={submitFraggers}
                disabled={topFraggers.length === 0 || submittingFraggers}
                style={{
                  width: '100%',
                  padding: '11px',
                  background: topFraggers.length > 0 && !submittingFraggers ? '#7B4FE0' : '#C4BCB2',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: '8px',
                  fontWeight: 600,
                  fontSize: '13px',
                  cursor: topFraggers.length > 0 && !submittingFraggers ? 'pointer' : 'not-allowed',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  boxShadow: topFraggers.length > 0 ? '0 2px 6px rgba(123, 79, 224, 0.25)' : 'none',
                }}
              >
                <Medal size={16} />
                {submittingFraggers ? 'Submitting...' : `Submit Top ${Math.min(topFraggers.length, 10)} Fraggers`}
              </button>
            </div>

          </div>
        </div>
      )}
    </AdminLayout>
  );
}
