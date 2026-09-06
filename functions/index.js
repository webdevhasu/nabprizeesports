const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { onDocumentCreated } = require('firebase-functions/v2/firestore');
const { setGlobalOptions } = require('firebase-functions/v2');
const { initializeApp } = require('firebase-admin/app');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');
const { getMessaging } = require('firebase-admin/messaging');

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
  if (!['live', 'completed'].includes(tournament.status)) {
    throw new HttpsError('failed-precondition', 'Start the tournament before declaring results.');
  }

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
    transaction.set(db.doc(`platformLedger/${tournamentId}`), {
      tournamentId,
      tournamentName: tournament.name || 'Tournament',
      payoutTotal: FieldValue.increment(players.reduce((sum, player) => sum + player.reward + player.killReward, 0)),
      payoutRecorded: true,
      updatedAt: FieldValue.serverTimestamp(),
    }, { merge: true });
    transaction.update(tournamentRef, { status: 'completed' });
  });

  return { ok: true, tournamentId, winnerId: winner.userId };
});

// Firestore notification documents are the app's durable inbox. This trigger
// also delivers them as real FCM pushes when the app/PWA is backgrounded or closed.
exports.sendNotificationPush = onDocumentCreated(
  { document: 'users/{userId}/notifications/{notificationId}' },
  async (event) => {
    const notification = event.data?.data();
    const userId = event.params.userId;
    if (!notification) return;

    const userSnap = await db.doc(`users/${userId}`).get();
    const tokens = Array.isArray(userSnap.data()?.fcmTokens)
      ? userSnap.data().fcmTokens.filter((token) => typeof token === 'string' && token.length > 0)
      : [];
    if (tokens.length === 0) return;

    const staleTokens = [];
    const response = await getMessaging().sendEachForMulticast({
      tokens: tokens.slice(0, 500),
      notification: {
        title: String(notification.title || 'NabPrize Esports'),
        body: String(notification.body || 'You have a new notification.'),
      },
      data: {
        title: String(notification.title || 'NabPrize Esports'),
        body: String(notification.body || 'You have a new notification.'),
        url: String(notification.url || '/'),
        type: String(notification.type || 'general'),
      },
      webpush: {
        fcmOptions: { link: String(notification.url || '/') },
      },
    });

    response.responses.forEach((result, index) => {
      const code = result.error?.code || '';
      if (code.includes('registration-token-not-registered') || code.includes('invalid-registration-token')) {
        staleTokens.push(tokens[index]);
      }
    });
    if (staleTokens.length > 0) {
      await db.doc(`users/${userId}`).update({
        fcmTokens: FieldValue.arrayRemove(...staleTokens),
      }).catch(() => {});
    }
  }
);

exports.submitReview = onCall(async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Sign in to submit a review.');

  const rating = Number(request.data?.rating);
  const comment = typeof request.data?.comment === 'string' ? request.data.comment.trim() : '';
  if (!Number.isInteger(rating) || rating < 1 || rating > 5 || !comment || comment.length > 1000) {
    throw new HttpsError('invalid-argument', 'Valid rating and comment are required.');
  }

  const userRef = db.doc(`users/${request.auth.uid}`);
  const userSnap = await userRef.get();
  if (!userSnap.exists || Number(userSnap.data().tournamentsPlayed || 0) < 1) {
    throw new HttpsError('failed-precondition', 'Play at least one tournament before reviewing.');
  }

  const now = new Date();
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const existing = await db.collection('reviews')
    .where('reviewerUid', '==', request.auth.uid)
    .get();
  const monthlyCount = existing.docs.filter((doc) => {
    const createdAt = doc.data().createdAt?.toDate?.();
    return createdAt && createdAt >= monthStart;
  }).length;
  if (monthlyCount >= 5) {
    throw new HttpsError('resource-exhausted', 'Monthly review limit reached.');
  }

  const profile = userSnap.data();
  const reviewerName = String(profile.fullName || profile.username || request.auth.token.name || request.auth.token.email?.split('@')[0] || 'Player').trim();
  await db.collection('reviews').add({
    reviewerUid: request.auth.uid,
    reviewerName: reviewerName || 'Player',
    targetName: 'NabPrize Esports',
    rating,
    comment,
    createdAt: FieldValue.serverTimestamp(),
  });
  return { ok: true };
});

exports.submitReport = onCall(async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Sign in to submit a report.');

  const data = request.data || {};
  const type = data.type === 'support' ? 'support' : data.type === 'player' ? 'player' : null;
  if (!type) throw new HttpsError('invalid-argument', 'Report type is required.');

  const text = (value, max) => typeof value === 'string' ? value.trim().slice(0, max) : '';
  const details = text(data.details, 2000);
  if (details.length < 3) throw new HttpsError('invalid-argument', 'Report details are required.');

  const userSnap = await db.doc(`users/${request.auth.uid}`).get();
  const profile = userSnap.data() || {};
  const now = new Date();
  const dayKey = now.toISOString().slice(0, 10);
  const rateRef = db.doc(`reportRateLimits/${request.auth.uid}_${dayKey}`);
  const reportRef = db.collection('reports').doc();

  const report = {
    type,
    reporterUid: request.auth.uid,
    userId: request.auth.uid,
    reporterName: String(profile.fullName || profile.username || request.auth.token.name || 'Player'),
    reporterEmail: String(profile.email || request.auth.token.email || ''),
    status: 'pending',
    details,
    description: details,
    createdAt: FieldValue.serverTimestamp(),
  };

  if (type === 'support') {
    const subject = text(data.subject, 100);
    const contactEmail = text(data.contactEmail, 100);
    const contactWhatsapp = text(data.contactWhatsapp, 20);
    if (subject.length < 3 || (!contactEmail && !contactWhatsapp)) {
      throw new HttpsError('invalid-argument', 'Subject and email or WhatsApp are required.');
    }
    Object.assign(report, { subject, contactEmail, contactWhatsapp });
  } else {
    const tournamentId = text(data.tournamentId, 150);
    const tournamentName = text(data.tournamentName, 200) || 'Unknown';
    const suspectName = text(data.suspectName, 100);
    const suspectUid = text(data.suspectUid, 100);
    const reason = text(data.reason, 100);
    if (!tournamentId || !suspectName || suspectUid.length < 4 || !reason) {
      throw new HttpsError('invalid-argument', 'Tournament, player and reason are required.');
    }
    Object.assign(report, { tournamentId, tournamentName, suspectName, suspectUid, reason });
  }

  let remaining = 0;
  await db.runTransaction(async (transaction) => {
    const rateSnap = await transaction.get(rateRef);
    const count = Number(rateSnap.data()?.count || 0);
    if (count >= 5) {
      throw new HttpsError('resource-exhausted', 'Daily report limit reached. Try again tomorrow.');
    }
    remaining = 4 - count;
    transaction.set(rateRef, {
      uid: request.auth.uid,
      day: dayKey,
      count: count + 1,
      updatedAt: FieldValue.serverTimestamp(),
    }, { merge: true });
    transaction.create(reportRef, report);
  });

  return { ok: true, remaining };
});

// Server-owned transaction history. Clients can no longer create fake entries.
exports.createRegistrationLedgerEntry = onDocumentCreated(
  { document: 'tournaments/{tournamentId}/players/{userId}' },
  async (event) => {
    const player = event.data?.data();
    if (!player || player.status !== 'registered') return;
    const tournamentSnap = await db.doc(`tournaments/${event.params.tournamentId}`).get();
    const tournament = tournamentSnap.data();
    const amount = Number(tournament?.registrationCharge || 0);
    if (amount <= 0) return;
    const ledgerRef = db.doc(`platformLedger/${event.params.tournamentId}`);
    const registrationRef = ledgerRef.collection('registrations').doc(event.params.userId);
    await db.runTransaction(async (transaction) => {
      const registrationSnap = await transaction.get(registrationRef);
      if (registrationSnap.exists) return;
      transaction.create(registrationRef, {
        userId: event.params.userId,
        amount,
        tournamentId: event.params.tournamentId,
        createdAt: FieldValue.serverTimestamp(),
      });
      transaction.set(ledgerRef, {
        tournamentId: event.params.tournamentId,
        tournamentName: tournament.name || 'Tournament',
        grossRevenue: FieldValue.increment(amount),
        registrationCount: FieldValue.increment(1),
        updatedAt: FieldValue.serverTimestamp(),
      }, { merge: true });
      transaction.set(db.doc(`transactions/${event.params.userId}/history/registration_${event.params.tournamentId}`), {
        type: 'debit', amount, tournamentId: event.params.tournamentId,
        description: `Tournament: ${tournament.name || 'Tournament'}`,
        timestamp: FieldValue.serverTimestamp(), status: 'completed',
      });
    });
  }
);

exports.createWithdrawalLedgerEntry = onDocumentCreated(
  { document: 'withdrawals/{withdrawalId}' },
  async (event) => {
    const withdrawal = event.data?.data();
    if (!withdrawal || withdrawal.status !== 'pending') return;
    await db.doc(`transactions/${withdrawal.userId}/history/withdrawal_${event.params.withdrawalId}`).create({
      type: 'debit', amount: Number(withdrawal.amount), method: withdrawal.method,
      description: `Withdrawal to ${withdrawal.method === 'jazzcash' ? 'JazzCash' : 'EasyPaisa'}`,
      withdrawalId: event.params.withdrawalId,
      timestamp: FieldValue.serverTimestamp(), status: 'pending',
    }).catch((error) => {
      if (error.code !== 6 && error.code !== 'already-exists') throw error;
    });
  }
);
