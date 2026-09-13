const fs = require('fs');
const file = 'src/pages/TournamentDetail.jsx';
let content = fs.readFileSync(file, 'utf8');

// Update handleJoin
const handleJoinOld =   const handleJoin = async () => {
    if (!currentUser || !userProfile || !tournament) {
      setJoinError('failed');
      return;
    }
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
      const idToken = await currentUser.getIdToken();
      const response = await fetch('https://asia-southeast1-nabprize-esports.cloudfunctions.net/registerForTournamentHttp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: \Bearer \\ },
        body: JSON.stringify({ tournamentId: id }),
      });;

const handleJoinNew =   const handleJoin = async () => {
    if (!currentUser || !userProfile || !tournament) {
      setJoinError('failed');
      return;
    }
    const isFree = !tournament.registrationCharge || tournament.registrationCharge === 0;
    if (!isFree && userProfile.walletBalance < tournament.registrationCharge) {
      setJoinError('insufficient');
      return;
    }
    if ((tournament.slotsFilled || 0) >= tournament.maxSlots) {
      setJoinError('full');
      return;
    }

    const isSquad = tournament.matchType?.toLowerCase().includes('squad');
    if (isSquad) {
      if (!teamName.trim()) {
        setJoinError('Team Name is required for Squad matches.');
        return;
      }
      if (!teammate1.ign.trim() || !teammate1.uid.trim()) {
        setJoinError('At least one teammate (Player 2) is required.');
        return;
      }
    }

    setJoining(true);
    setJoinError('');
    try {
      let logoUrl = null;
      if (isSquad && teamLogo) {
        setUploadingLogo(true);
        const storageRef = ref(storage, \	ournaments/\/teams/\_\\);
        await uploadBytes(storageRef, teamLogo);
        logoUrl = await getDownloadURL(storageRef);
        setUploadingLogo(false);
      }
      
      const teammates = isSquad 
        ? [teammate1, teammate2, teammate3].filter(t => t.ign.trim() && t.uid.trim())
        : [];

      const idToken = await currentUser.getIdToken();
      const response = await fetch('https://asia-southeast1-nabprize-esports.cloudfunctions.net/registerForTournamentHttp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: \Bearer \\ },
        body: JSON.stringify({ 
          tournamentId: id,
          teamName: isSquad ? teamName.trim() : undefined,
          teamLogo: logoUrl,
          teammates: isSquad ? teammates : undefined
        }),
      });;

content = content.replace(handleJoinOld, handleJoinNew);

// Update Players list avatar
const playerListOld =                   <div style={{
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
                  </div>;

const playerListNew =                   <div style={{
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
                    overflow: 'hidden',
                  }}>
                    {player.isSquad && player.teamLogo ? (
                      <img src={player.teamLogo} alt={player.teamName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      (player.isSquad ? (player.teamName || 'T') : (player.username || 'U'))[0].toUpperCase()
                    )}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    {player.isSquad ? (
                      <>
                        <div style={{ fontWeight: 700, fontSize: '13px', color: '#2E2A26' }}>
                          Team {player.teamSlot || 'N/A'}: {player.teamName}
                        </div>
                        <div style={{ display: 'flex', gap: '8px', fontSize: '11px', color: '#8A8078', marginTop: '2px', flexWrap: 'wrap' }}>
                          <span>Leader: <strong>{player.ign || 'Player'}</strong> <code style={{ background: '#F0ECE4', padding: '1px 5px', borderRadius: '4px', fontSize: '10px' }}>{player.uid}</code></span>
                          {player.teammates && player.teammates.map((t, idx) => (
                            <span key={idx}>• P{idx+2}: <strong>{t.ign}</strong> <code style={{ background: '#F0ECE4', padding: '1px 5px', borderRadius: '4px', fontSize: '10px' }}>{t.uid}</code></span>
                          ))}
                        </div>
                      </>
                    ) : (
                      <>
                        <div style={{ fontWeight: 700, fontSize: '13px', color: '#2E2A26' }}>
                          @{player.username}
                        </div>
                        <div style={{ display: 'flex', gap: '8px', fontSize: '11px', color: '#8A8078', marginTop: '2px' }}>
                          <span>IGN: <strong>{player.ign || 'Player'}</strong></span>
                          {player.uid && <span>• UID: <code style={{ background: '#F0ECE4', padding: '1px 5px', borderRadius: '4px', fontSize: '10px' }}>{player.uid}</code></span>}
                        </div>
                      </>
                    )}
                  </div>;

content = content.replace(playerListOld, playerListNew);

// Update Registration Sheet Form
const regFormOld =                   Room ID will be released at <strong>{timeline?.regCloseStr}</strong> with a 10-minute joining window before match starts at <strong>{timeline?.matchStartStr}</strong>.
                </div>

                <label style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', marginBottom: '20px', cursor: 'pointer' }}>;

const regFormNew =                   Room ID will be released at <strong>{timeline?.regCloseStr}</strong> with a 10-minute joining window before match starts at <strong>{timeline?.matchStartStr}</strong>.
                </div>

                {/* SQUAD REGISTRATION FORM */}
                {tournament?.matchType?.toLowerCase().includes('squad') && (
                  <div style={{ marginBottom: '20px', background: '#F8F6F1', padding: '16px', borderRadius: '12px', border: '1px solid #EBE4DA' }}>
                    <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#2E2A26', margin: '0 0 12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Users size={16} color="#FF6B4A" /> Squad Details
                    </h3>
                    
                    <div style={{ marginBottom: '12px' }}>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#5E5851', marginBottom: '4px' }}>Team Name *</label>
                      <input 
                        type="text" 
                        value={teamName} 
                        onChange={e => setTeamName(e.target.value)} 
                        placeholder="Enter your Team/Clan Name"
                        style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #EBE4DA', fontSize: '13px', boxSizing: 'border-box' }}
                      />
                    </div>

                    <div style={{ marginBottom: '16px' }}>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#5E5851', marginBottom: '4px' }}>Team Logo (Optional)</label>
                      <input 
                        type="file" 
                        accept="image/*"
                        onChange={e => setTeamLogo(e.target.files[0])} 
                        style={{ width: '100%', fontSize: '12px' }}
                      />
                    </div>

                    <div style={{ fontSize: '12px', fontWeight: 600, color: '#2E2A26', marginBottom: '8px', paddingBottom: '4px', borderBottom: '1px solid #EBE4DA' }}>
                      Team Roster
                    </div>
                    
                    <div style={{ marginBottom: '8px', background: '#FFFFFF', padding: '8px', borderRadius: '8px', border: '1px solid #EBE4DA' }}>
                      <div style={{ fontSize: '11px', fontWeight: 700, color: '#FF6B4A', marginBottom: '4px' }}>Player 1 (Leader - You)</div>
                      <div style={{ fontSize: '12px', color: '#5E5851' }}>IGN: {userProfile?.games?.[0]?.ign || 'Set in profile'} | UID: {userProfile?.games?.[0]?.uid || 'Set in profile'}</div>
                    </div>

                    {/* Player 2 (Required) */}
                    <div style={{ marginBottom: '8px', background: '#FFFFFF', padding: '8px', borderRadius: '8px', border: '1px solid #EBE4DA' }}>
                      <div style={{ fontSize: '11px', fontWeight: 700, color: '#2E2A26', marginBottom: '4px' }}>Player 2 (Required) *</div>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <input type="text" placeholder="IGN" value={teammate1.ign} onChange={e => setTeammate1({...teammate1, ign: e.target.value})} style={{ flex: 1, padding: '6px 8px', borderRadius: '6px', border: '1px solid #EBE4DA', fontSize: '12px' }} />
                        <input type="text" placeholder="UID" value={teammate1.uid} onChange={e => setTeammate1({...teammate1, uid: e.target.value})} style={{ flex: 1, padding: '6px 8px', borderRadius: '6px', border: '1px solid #EBE4DA', fontSize: '12px' }} />
                      </div>
                    </div>

                    {/* Player 3 (Optional) */}
                    <div style={{ marginBottom: '8px', background: '#FFFFFF', padding: '8px', borderRadius: '8px', border: '1px solid #EBE4DA' }}>
                      <div style={{ fontSize: '11px', fontWeight: 700, color: '#8A8078', marginBottom: '4px' }}>Player 3 (Optional)</div>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <input type="text" placeholder="IGN" value={teammate2.ign} onChange={e => setTeammate2({...teammate2, ign: e.target.value})} style={{ flex: 1, padding: '6px 8px', borderRadius: '6px', border: '1px solid #EBE4DA', fontSize: '12px' }} />
                        <input type="text" placeholder="UID" value={teammate2.uid} onChange={e => setTeammate2({...teammate2, uid: e.target.value})} style={{ flex: 1, padding: '6px 8px', borderRadius: '6px', border: '1px solid #EBE4DA', fontSize: '12px' }} />
                      </div>
                    </div>

                    {/* Player 4 (Optional) */}
                    <div style={{ marginBottom: '8px', background: '#FFFFFF', padding: '8px', borderRadius: '8px', border: '1px solid #EBE4DA' }}>
                      <div style={{ fontSize: '11px', fontWeight: 700, color: '#8A8078', marginBottom: '4px' }}>Player 4 (Optional)</div>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <input type="text" placeholder="IGN" value={teammate3.ign} onChange={e => setTeammate3({...teammate3, ign: e.target.value})} style={{ flex: 1, padding: '6px 8px', borderRadius: '6px', border: '1px solid #EBE4DA', fontSize: '12px' }} />
                        <input type="text" placeholder="UID" value={teammate3.uid} onChange={e => setTeammate3({...teammate3, uid: e.target.value})} style={{ flex: 1, padding: '6px 8px', borderRadius: '6px', border: '1px solid #EBE4DA', fontSize: '12px' }} />
                      </div>
                    </div>

                  </div>
                )}

                <label style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', marginBottom: '20px', cursor: 'pointer' }}>;

content = content.replace(regFormOld, regFormNew);

// Update Registering Spinner
const joinBtnOld =                     <>
                      <div style={{
                        width: '16px', height: '16px', border: '2px solid #FFFFFF',
                        borderTop: '2px solid transparent', borderRadius: '50%',
                        animation: 'spin 0.8s linear infinite',
                      }} />
                      Registering...
                    </>;

const joinBtnNew =                     <>
                      <div style={{
                        width: '16px', height: '16px', border: '2px solid #FFFFFF',
                        borderTop: '2px solid transparent', borderRadius: '50%',
                        animation: 'spin 0.8s linear infinite',
                      }} />
                      {uploadingLogo ? 'Uploading Logo...' : 'Registering...'}
                    </>;
content = content.replace(joinBtnOld, joinBtnNew);

fs.writeFileSync(file, content, 'utf8');
