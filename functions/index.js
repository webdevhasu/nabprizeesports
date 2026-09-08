const { onCall, onRequest, HttpsError } = require('firebase-functions/v2/https');
const { onDocumentCreated } = require('firebase-functions/v2/firestore');
const { setGlobalOptions } = require('firebase-functions/v2');
const { initializeApp } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');
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

// Count actual Firebase Authentication accounts, not stale Firestore profiles.
exports.getRegisteredUserCount = onCall(async (request) => {
  assertAdmin(request);

  let count = 0;
  let pageToken;
  do {
    const page = await getAuth().listUsers(1000, pageToken);
    count += page.users.filter(user => user.email !== ADMIN_EMAIL).length;
    pageToken = page.pageToken;
  } while (pageToken);

  return { count };
});

const ALLOWED_ORIGINS = ['https://nabprizeesports.vercel.app', 'http://localhost:5173', 'http://localhost:4173'];

function handleCors(request, response) {
  const origin = request.get('origin') || '';
  if (ALLOWED_ORIGINS.includes(origin)) {
    response.set('Access-Control-Allow-Origin', origin);
  }
  response.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
  response.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  response.set('Access-Control-Max-Age', '3600');
  if (request.method === 'OPTIONS') {
    response.status(204).send('');
    return true;
  }
  return false;
}

async function declareMatchWinnerLogic(request) {
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
      photoURL: player.photoURL || '',
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
}

exports.declareMatchWinner = onCall({ cors: true }, async (request) => {
  return declareMatchWinnerLogic(request);
});

exports.declareMatchWinnerHttp = onRequest(async (request, response) => {
  if (handleCors(request, response)) return;
  try {
    if (request.method !== 'POST') return response.status(405).json({ error: 'POST required' });
    const authorization = String(request.get('authorization') || '');
    if (!authorization.startsWith('Bearer ')) return response.status(401).json({ error: 'Admin access required.' });
    const token = await getAuth().verifyIdToken(authorization.slice(7));
    if (token.email !== ADMIN_EMAIL) return response.status(403).json({ error: 'Admin access required.' });

    request.auth = { uid: token.uid, token };
    const result = await declareMatchWinnerLogic(request);
    return response.status(200).json(result);
  } catch (error) {
    const message = error.message || 'Failed to declare winner.';
    const status = message.includes('already') ? 409 : message.includes('not found') ? 404 : message.includes('permission') || message.includes('Admin') ? 403 : 400;
    return response.status(status).json({ error: message });
  }
});

// Lightweight aggregate for public PWA install CTA clicks. The client applies
// a 24-hour cooldown; this function stores counters only, not individual users.
exports.trackInstallClick = onCall({
  cors: true,
}, async (request) => {
  const source = typeof request.data?.source === 'string' ? request.data.source.slice(0, 40) : 'unknown';
  const day = new Date().toISOString().slice(0, 10);
  const summaryRef = db.doc('analytics/installClicks');
  const dailyRef = db.doc(`analytics/installClicks/daily/${day}`);
  await db.runTransaction(async (transaction) => {
    transaction.set(summaryRef, { total: FieldValue.increment(1), updatedAt: FieldValue.serverTimestamp() }, { merge: true });
    transaction.set(dailyRef, { total: FieldValue.increment(1), [source]: FieldValue.increment(1), updatedAt: FieldValue.serverTimestamp() }, { merge: true });
  });
  return { ok: true };
});

exports.registerForTournament = onCall({ invoker: 'public' }, async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Please sign in first.');
  const tournamentId = request.data?.tournamentId;
  if (typeof tournamentId !== 'string' || tournamentId.length < 1 || tournamentId.length > 150) {
    throw new HttpsError('invalid-argument', 'Tournament is required.');
  }

  const uid = request.auth.uid;
  const tournamentRef = db.doc(`tournaments/${tournamentId}`);
  const userRef = db.doc(`users/${uid}`);
  const playerRef = tournamentRef.collection('players').doc(uid);

  await db.runTransaction(async (transaction) => {
    const [tournamentSnap, userSnap, playerSnap] = await Promise.all([
      transaction.get(tournamentRef),
      transaction.get(userRef),
      transaction.get(playerRef),
    ]);
    if (!tournamentSnap.exists) throw new HttpsError('not-found', 'Tournament not found.');
    if (!userSnap.exists) throw new HttpsError('failed-precondition', 'Complete your profile first.');
    if (playerSnap.exists) throw new HttpsError('already-exists', 'You are already registered for this tournament.');

    const tournament = tournamentSnap.data();
    const user = userSnap.data();
    const fee = Number(tournament.registrationCharge) || 0;
    if (tournament.status !== 'upcoming') throw new HttpsError('failed-precondition', 'Registration is closed.');
    if (!tournament.maxSlots || Number(tournament.slotsFilled || 0) >= Number(tournament.maxSlots)) {
      throw new HttpsError('resource-exhausted', 'Tournament is full.');
    }
    if (fee > 0 && Number(user.walletBalance || 0) < fee) {
      throw new HttpsError('failed-precondition', 'Insufficient wallet balance.');
    }

    const games = Array.isArray(user.games) ? user.games : [];
    const primaryGame = games.find((game) => game.game === tournament.game) || games[0] || {};
    transaction.update(userRef, {
      ...(fee > 0 ? { walletBalance: FieldValue.increment(-fee) } : {}),
      tournamentsPlayed: FieldValue.increment(1),
    });
    transaction.update(tournamentRef, { slotsFilled: FieldValue.increment(1) });
    transaction.set(playerRef, {
      userId: uid,
      username: user.username || 'Player',
      photoURL: user.photoURL || '',
      ign: primaryGame.ign || 'Unknown',
      uid: primaryGame.uid || '',
      registeredAt: FieldValue.serverTimestamp(),
      status: 'registered',
    });
  });

  return { ok: true, tournamentId };
});

// Browser fallback for registration when callable preflight is blocked by the
// network layer. Authentication is still verified server-side with the ID token.
exports.registerForTournamentHttp = onRequest({
  cors: ['https://nabprizeesports.vercel.app', 'http://localhost:5173', 'http://localhost:4173'],
}, async (request, response) => {
  try {
    if (request.method !== 'POST') return response.status(405).json({ error: 'POST required' });
    const authorization = String(request.get('authorization') || '');
    if (!authorization.startsWith('Bearer ')) return response.status(401).json({ error: 'Please sign in first.' });
    const token = await getAuth().verifyIdToken(authorization.slice(7));
    const tournamentId = request.body?.tournamentId;
    if (typeof tournamentId !== 'string' || !tournamentId) return response.status(400).json({ error: 'Tournament is required.' });

    const tournamentRef = db.doc(`tournaments/${tournamentId}`);
    const userRef = db.doc(`users/${token.uid}`);
    const playerRef = tournamentRef.collection('players').doc(token.uid);
    await db.runTransaction(async (transaction) => {
      const [tournamentSnap, userSnap, playerSnap] = await Promise.all([
        transaction.get(tournamentRef), transaction.get(userRef), transaction.get(playerRef),
      ]);
      if (!tournamentSnap.exists) throw new Error('Tournament not found.');
      if (!userSnap.exists) throw new Error('Complete your profile first.');
      if (playerSnap.exists) throw new Error('You are already registered for this tournament.');
      const tournament = tournamentSnap.data();
      const user = userSnap.data();
      const fee = Number(tournament.registrationCharge) || 0;
      if (tournament.status !== 'upcoming') throw new Error('Registration is closed.');
      if (!tournament.maxSlots || Number(tournament.slotsFilled || 0) >= Number(tournament.maxSlots)) throw new Error('Tournament is full.');
      if (fee > 0 && Number(user.walletBalance || 0) < fee) throw new Error('Insufficient wallet balance.');
      const games = Array.isArray(user.games) ? user.games : [];
      const primaryGame = games.find((game) => game.game === tournament.game) || games[0] || {};
      transaction.update(userRef, { ...(fee > 0 ? { walletBalance: FieldValue.increment(-fee) } : {}), tournamentsPlayed: FieldValue.increment(1) });
      transaction.update(tournamentRef, { slotsFilled: FieldValue.increment(1) });
      transaction.set(playerRef, { userId: token.uid, username: user.username || 'Player', photoURL: user.photoURL || '', ign: primaryGame.ign || 'Unknown', uid: primaryGame.uid || '', registeredAt: FieldValue.serverTimestamp(), status: 'registered' });
    });
    return response.status(200).json({ ok: true, tournamentId });
  } catch (error) {
    const message = error.message || 'Registration failed.';
    const status = message.includes('already registered') ? 409 : message.includes('full') ? 409 : message.includes('Insufficient') ? 412 : 400;
    return response.status(status).json({ error: message });
  }
});

exports.getInstallClickStats = onCall(async (request) => {
  assertAdmin(request);
  const day = new Date().toISOString().slice(0, 10);
  const [summarySnap, dailySnap] = await Promise.all([
    db.doc('analytics/installClicks').get(),
    db.doc(`analytics/installClicks/daily/${day}`).get(),
  ]);
  return {
    total: Number(summarySnap.data()?.total) || 0,
    today: Number(dailySnap.data()?.total) || 0,
  };
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

exports.submitReview = onCall({
  cors: true,
}, async (request) => {
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

// Browser-facing fallback for deployments where the callable preflight is
// rejected by the hosting/network layer. It keeps the same server validation.
exports.submitReviewHttp = onRequest({
  cors: ['https://nabprizeesports.vercel.app', 'http://localhost:5173', 'http://localhost:4173'],
}, async (request, response) => {
  try {
    if (request.method !== 'POST') {
      response.status(405).json({ error: 'POST required' });
      return;
    }
    const authorization = String(request.get('authorization') || '');
    if (!authorization.startsWith('Bearer ')) {
      response.status(401).json({ error: 'Sign in to submit a review.' });
      return;
    }
    const token = await getAuth().verifyIdToken(authorization.slice(7));
    const rating = Number(request.body?.rating);
    const comment = typeof request.body?.comment === 'string' ? request.body.comment.trim() : '';
    if (!Number.isInteger(rating) || rating < 1 || rating > 5 || !comment || comment.length > 1000) {
      response.status(400).json({ error: 'Valid rating and comment are required.' });
      return;
    }
    const userRef = db.doc(`users/${token.uid}`);
    const userSnap = await userRef.get();
    if (!userSnap.exists || Number(userSnap.data().tournamentsPlayed || 0) < 1) {
      response.status(412).json({ error: 'Play at least one tournament before reviewing.' });
      return;
    }
    const monthStart = new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), 1));
    const existing = await db.collection('reviews').where('reviewerUid', '==', token.uid).get();
    const monthlyCount = existing.docs.filter((review) => {
      const createdAt = review.data().createdAt?.toDate?.();
      return createdAt && createdAt >= monthStart;
    }).length;
    if (monthlyCount >= 5) {
      response.status(429).json({ error: 'Monthly review limit reached.' });
      return;
    }
    const profile = userSnap.data();
    const reviewerName = String(profile.fullName || profile.username || token.name || token.email?.split('@')[0] || 'Player').trim();
    await db.collection('reviews').add({
      reviewerUid: token.uid,
      reviewerName: reviewerName || 'Player',
      targetName: 'NabPrize Esports',
      rating,
      comment,
      createdAt: FieldValue.serverTimestamp(),
    });
    response.json({ ok: true });
  } catch (error) {
    console.error('HTTP review submission failed:', error);
    response.status(500).json({ error: 'Unable to submit review right now.' });
  }
});

exports.submitReport = onCall({
  cors: true,
}, async (request) => {
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
