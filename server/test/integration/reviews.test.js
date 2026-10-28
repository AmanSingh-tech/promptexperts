import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import bcrypt from 'bcryptjs';

process.env.NODE_ENV = 'test';
const { app } = await import('../../index.js');
const { prisma } = await import('../../lib/prisma.js');

let server;
let base;
const suffix = `r${Date.now().toString(36)}`;

async function api(method, path, { token, body } = {}) {
  const res = await fetch(base + path, {
    method,
    headers: { 'content-type': 'application/json', ...(token && { authorization: `Bearer ${token}` }) },
    body: body ? JSON.stringify(body) : undefined
  });
  const text = await res.text();
  return { status: res.status, body: text ? JSON.parse(text) : null };
}

async function login(username, password) {
  return (await api('POST', '/api/auth/login', { body: { username, password } })).body.token;
}

before(async () => {
  server = app.listen(0);
  await new Promise((r) => server.once('listening', r));
  base = `http://127.0.0.1:${server.address().port}`;
  await prisma.user.create({
    data: { username: `rev2_${suffix}`, email: `rev2_${suffix}@example.com`, password: await bcrypt.hash('password123', 10), role: 'REVIEWER' }
  });
  process.env.REQUIRED_REVIEWS = '2';
});

after(async () => {
  delete process.env.REQUIRED_REVIEWS;
  await prisma.user.deleteMany({ where: { username: { endsWith: suffix } } });
  server.close();
  await prisma.$disconnect();
});

async function writtenSubmission(username) {
  const reg = await api('POST', '/api/auth/register', { body: { username, email: `${username}@example.com`, password: 'password123' } });
  const problem = await api('GET', '/api/problems/design-url-shortener');
  const session = await api('POST', '/api/sessions', { token: reg.body.token, body: { problemId: problem.body.id } });
  const sub = await api('POST', '/api/submissions', { token: reg.body.token, body: { problemId: problem.body.id, sessionId: session.body.id, code: 'design...' } });
  return { token: reg.body.token, solveId: sub.body.id };
}

const scores = (e, l, t, i, solutionScore) => ({ aiEfficiency: e, aiLearning: l, aiTransparency: t, aiInnovation: i, solutionScore, notes: 'notes' });

test('two agreeing reviews finalize; review stays hidden from the player until then', async () => {
  const player = await writtenSubmission(`p1_${suffix}`);
  const r1 = await login('reviewer', 'reviewer12345');
  const r2 = await login(`rev2_${suffix}`, 'password123');

  const first = await api('PUT', `/api/evaluations/${player.solveId}`, { token: r1, body: scores(4, 4, 3, 3, 80) });
  assert.equal(first.body.status, 'PENDING');
  assert.equal((await api('GET', `/api/submissions/${player.solveId}`, { token: player.token })).body.evaluation, null);
  assert.equal((await api('GET', `/api/submissions/${player.solveId}`, { token: player.token })).body.reviewProgress.count, 1);

  const blind = await api('GET', `/api/evaluations/${player.solveId}/reviews`, { token: r2 });
  assert.equal(blind.body.hidden, true);
  assert.equal(blind.body.count, 1);
  assert.deepEqual(blind.body.reviews, []);

  const todo = await api('GET', '/api/evaluations/queue?status=todo', { token: r2 });
  assert.ok(todo.body.items.some((s) => s.id === player.solveId));
  const todoForFirst = await api('GET', '/api/evaluations/queue?status=todo', { token: r1 });
  assert.ok(!todoForFirst.body.items.some((s) => s.id === player.solveId), 'already reviewed by me');

  const second = await api('PUT', `/api/evaluations/${player.solveId}`, { token: r2, body: scores(4, 3, 3, 4, 70) });
  assert.equal(second.body.status, 'FINAL');
  assert.equal(second.body.reviewCount, 2);
  assert.equal(second.body.solutionScore, 75);

  const seen = await api('GET', `/api/evaluations/${player.solveId}/reviews`, { token: r2 });
  assert.equal(seen.body.hidden, false);
  assert.equal(seen.body.reviews.length, 2);

  const own = await api('GET', `/api/submissions/${player.solveId}`, { token: player.token });
  assert.equal(own.body.evaluation.status, 'FINAL');
  assert.equal(own.body.reviews.length, 2);
});

test('disagreement is disputed until an admin accepts it', async () => {
  const player = await writtenSubmission(`p2_${suffix}`);
  const r1 = await login('reviewer', 'reviewer12345');
  const r2 = await login(`rev2_${suffix}`, 'password123');
  await api('PUT', `/api/evaluations/${player.solveId}`, { token: r1, body: scores(5, 5, 5, 5, 90) });
  const second = await api('PUT', `/api/evaluations/${player.solveId}`, { token: r2, body: scores(2, 2, 2, 2, 40) });
  assert.equal(second.body.status, 'DISPUTED');

  const disputed = await api('GET', '/api/evaluations/queue?status=disputed', { token: r1 });
  assert.ok(disputed.body.items.some((s) => s.id === player.solveId));
  const board = await api('GET', '/api/leaderboard');
  assert.ok(!board.body.rows.some((r) => r.username === `p2_${suffix}`), 'disputed results are not ranked');

  assert.equal((await api('POST', `/api/evaluations/${player.solveId}/accept`, { token: r1 })).status, 403);
  const admin = await login('admin', 'admin12345');
  const accepted = await api('POST', `/api/evaluations/${player.solveId}/accept`, { token: admin });
  assert.equal(accepted.body.status, 'FINAL');
  assert.ok((await api('GET', '/api/leaderboard')).body.rows.some((r) => r.username === `p2_${suffix}`));
});
