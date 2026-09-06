const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { setGlobalOptions } = require('firebase-functions/v2');
const { initializeApp } = require('firebase-admin/app');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');

initializeApp();
setGlobalOptions({ region: 'asia-southeast1', maxInstances: 10 });

const db = getFirestore();
const ADMIN_EMAIL = 'nabprize.official@gmail.com';

function assertAdmin(request) {
  if (!request.auth || request.auth.token.email !== ADMIN_EMAIL) {
    throw new HttpsError('permission-denied', 'Admin access required.');
  }
}

function asNonNegativeInteger(value) {
  const number = Number(value);
  return Number.isInteger(number) && number >= 0 ? number : null;
}

exports.declareMatchWinner = onCall(async (request) => {
  assertAdmin(request);

  const { tournamentId, winnerId, killsByPlayer } = request.data || {};
  if (typeof tournamentId !== 'string' || typeof winnerId !== 'string' || !killsByPlayer || typeof killsByPlayer !== 'object') {
    throw new HttpsError('invalid-argument', 'Tournament, winner and kills are required.');
  }

  const tournamentRef = db.doc(`tournaments/${tournamentId}`);
  const resultRef = db.doc(`matchResults/${tournamentId}`);
  const tournamentSnap = await tournamentRef.get();
  if (!tournamentSnap.exists) throw new HttpsError('not-found', 'Tournament not found.');
  const tournament = tournamentSnap.data();

  const playersSnap = await tournamentRef.collection('players').get();
  const registeredPlayers = playersSnap.docs.map((snapshot) => ({ id: snapshot.id, ...snapshot.data() }));
  const winner = registeredPlayers.find((player) => player.id === winnerId);
  if (!winner || !winner.userId) throw new HttpsError('invalid-argument', 'Winner is not registered in this tournament.');

  const players = registeredPlayers.map((player) => {
    const kills = asNonNegativeInteger(killsByPlayer[player.id] ?? 0);
    if (kills === null || kills > 99) throw new HttpsError('invalid-argument', 'Invalid kill count.');
    const isWinner = player.id === winnerId;
    const perKillReward = Number(tournament.perKillReward) || 0;
    return {
      userId: player.userId,
      username: player.username || 'Player',
      ign: player.ign || '',
      gameUid: player.uid || player.gameUid || '',
      uid: player.uid || player.gameUid || '',
      kills,
      killReward: kills * perKillReward,
      reward: isWinner ? (Number(tournament.fixedReward) || 0) : 0,
      isWinner,
      placement: isWinner ? 1 : 0,
    };
  });

  const existingResult = await resultRef.get();
  if (existingResult.exists && existingResult.data().winnerDeclared === true) {
    throw new HttpsError('already-exists', 'Winner has already been declared.');
  }

  const perKillReward = Number(tournament.perKillReward) || 0;
  const fixedReward = Number(tournament.fixedReward) || 0;
  const userRefs = new Map();
  for (const player of players) {
    const userRef = db.doc(`users/${player.userId}`);
    userRefs.set(player.userId, userRef);
  }

  // All reads happen before the transaction writes. The result document is the
  // idempotency lock, and deterministic ledger IDs make retries safe.
  await db.runTransaction(async (transaction) => {
    const freshResult = await transaction.get(resultRef);
    if (freshResult.exists && freshResult.data().winnerDeclared === true) {
      throw new HttpsError('already-exists', 'Winner has already been declared.');
    }

    const userSnapshots = new Map();
    for (const player of players) {
      const userRef = userRefs.get(player.userId);
      userSnapshots.set(player.userId, await transaction.get(userRef));
    }
    for (const player of players) {
      const userRef = userRefs.get(player.userId);
      const userSnap = userSnapshots.get(player.userId);
      if (!userSnap.exists) throw new HttpsError('failed-precondition', 'A registered player profile is missing.');
      transaction.update(userRef, {
        walletBalance: FieldValue.increment(player.reward + player.killReward),
        totalKills: FieldValue.increment(player.kills),
        ...(player.isWinner ? { totalWins: FieldValue.increment(1) } : {}),
      });

      if (player.reward > 0) {
        transaction.set(db.doc(`transactions/${player.userId}/history/prize_${tournamentId}`), {
          type: 'credit', amount: player.reward, description: `Prize Won: ${tournament.name}`,
          tournamentId, timestamp: FieldValue.serverTimestamp(), status: 'completed',
        });
      }
      if (player.killReward > 0) {
        transaction.set(db.doc(`transactions/${player.userId}/history/kills_${tournamentId}`), {
          type: 'credit', amount: player.killReward, description: `Kill Reward (${player.kills} kills): ${tournament.name}`,
          tournamentId, timestamp: FieldValue.serverTimestamp(), status: 'completed',
        });
      }
    }

    transaction.set(resultRef, {
      tournamentName: tournament.name,
      game: tournament.game,
      players,
      winnerDeclared: true,
      winnerId: winner.userId,
      winnerUsername: winner.username || 'Winner',
      perKillReward,
      fixedReward,
      submittedAt: FieldValue.serverTimestamp(),
      processedBy: request.auth.uid,
    }, { merge: true });
    transaction.update(tournamentRef, { status: 'completed' });
  });

  return { ok: true, tournamentId, winnerId: winner.userId };
});
