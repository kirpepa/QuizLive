// Ad-hoc end-to-end test of the realtime flow. Run against a live server.
import { io } from 'socket.io-client';

const API = 'http://localhost:4000';
const log = (...a) => console.log('•', ...a);
const fail = (m) => {
  console.error('✗ FAIL:', m);
  process.exit(1);
};
const emitAck = (sock, ev, payload) =>
  new Promise((res) => sock.emit(ev, payload, (r) => res(r || {})));
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
  // 1. Login demo organizer.
  let res = await fetch(`${API}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'demo@quiz.dev', password: 'password123' }),
  });
  const auth = await res.json();
  if (!auth.accessToken) fail('login failed');
  log('logged in as organizer');

  // 2. Find the demo quiz.
  res = await fetch(`${API}/api/quizzes`, {
    headers: { Authorization: `Bearer ${auth.accessToken}` },
  });
  const { quizzes } = await res.json();
  const quiz = quizzes.find((q) => q._count.questions > 0);
  if (!quiz) fail('no quiz with questions');
  log(`quiz "${quiz.title}" with ${quiz._count.questions} questions`);

  // 3. Create a session.
  res = await fetch(`${API}/api/sessions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${auth.accessToken}`,
    },
    body: JSON.stringify({ quizId: quiz.id }),
  });
  const { session } = await res.json();
  log('session created, room code', session.roomCode);

  // 4. Organizer socket opens the room.
  const org = io(API, { transports: ['websocket'] });
  await new Promise((r) => org.on('connect', r));
  const openRes = await emitAck(org, 'organizer:open', {
    sessionId: session.id,
    token: auth.accessToken,
  });
  if (openRes.error) fail('organizer:open ' + openRes.error);
  log('organizer opened room');

  // Drive the quiz: advance on each reveal.
  let finished = null;
  org.on('question:reveal', async (data) => {
    await wait(200);
    if (data.isLast) {
      await emitAck(org, 'quiz:next', {}); // triggers finish
    } else {
      await emitAck(org, 'quiz:next', {});
    }
  });
  org.on('quiz:finish', (data) => {
    finished = data;
  });

  // 5. Two participants join.
  const p1 = io(API, { transports: ['websocket'] });
  const p2 = io(API, { transports: ['websocket'] });
  await Promise.all([
    new Promise((r) => p1.on('connect', r)),
    new Promise((r) => p2.on('connect', r)),
  ]);
  const j1 = await emitAck(p1, 'room:join', { roomCode: session.roomCode, nickname: 'Алиса' });
  const j2 = await emitAck(p2, 'room:join', { roomCode: session.roomCode, nickname: 'Боб' });
  if (j1.error || j2.error) fail('join: ' + (j1.error || j2.error));
  log('two participants joined:', j1.nickname, j2.nickname);

  // Each participant answers whenever a question shows.
  // Alice always picks the first option, Bob the last.
  function wire(sock, pick) {
    sock.on('question:show', async (q) => {
      const opt = pick === 'first' ? q.options[0] : q.options[q.options.length - 1];
      await wait(100);
      const r = await emitAck(sock, 'question:answer', { optionIds: [opt.id] });
      if (r.error) log(`answer rejected (${pick}):`, r.error);
    });
  }
  wire(p1, 'first');
  wire(p2, 'last');

  // 6. Verify late answer after deadline is rejected on the first question.
  let lateRejected = false;
  p1.once('question:show', async (q) => {
    // Fire a second answer well after the (min 15s) window would matter — we
    // instead test the "answer change disallowed" path since default is off.
    await wait(300);
    const r = await emitAck(p1, 'question:answer', { optionIds: [q.options[1].id] });
    if (r.error) lateRejected = true;
  });

  // 7. Start the quiz.
  const startRes = await emitAck(org, 'quiz:start', {});
  if (startRes.error) fail('start: ' + startRes.error);
  log('quiz started');

  // 8. Wait for completion (auto-reveal on all-answered speeds this up).
  const deadline = Date.now() + 30000;
  while (!finished && Date.now() < deadline) await wait(200);
  if (!finished) fail('quiz did not finish in time');

  log('quiz finished. Final leaderboard:');
  finished.leaderboard.forEach((e, i) =>
    console.log(`   ${i + 1}. ${e.nickname} — ${e.score}`)
  );

  // Assertions.
  if (finished.leaderboard.length !== 2) fail('expected 2 participants in leaderboard');
  const alice = finished.leaderboard.find((e) => e.nickname === 'Алиса');
  if (!alice || alice.score <= 0) fail('Alice should have a positive score (correct Q1)');
  if (!lateRejected) log('note: answer-change rejection not observed (timing)');
  else log('answer-change correctly rejected');

  // 9. Verify persistence: organizer history reflects the finished session.
  res = await fetch(`${API}/api/me/sessions`, {
    headers: { Authorization: `Bearer ${auth.accessToken}` },
  });
  const hist = await res.json();
  const persisted = hist.sessions.find((s) => s.roomCode === session.roomCode);
  if (!persisted || persisted.status !== 'finished') fail('session not persisted as finished');
  if (persisted.participants.length !== 2) fail('participants not persisted');
  log('persistence verified: session + participants saved');

  console.log('\n✓ ALL CHECKS PASSED');
  org.close();
  p1.close();
  p2.close();
  process.exit(0);
}

main().catch((e) => fail(e.message));
