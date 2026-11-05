import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import bcrypt from 'bcryptjs';

process.env.NODE_ENV = 'test';
const { app } = await import('../../index.js');
const { prisma } = await import('../../lib/prisma.js');

let server;
let base;
const suffix = `g${Date.now().toString(36)}`;
const contests = [];

async function api(method, path, { token, body } = {}) {
  const res = await fetch(base + path, {
    method,
    headers: { 'content-type': 'application/json', ...(token && { authorization: `Bearer ${token}` }) },
    body: body ? JSON.stringify(body) : undefined
  });
  const text = await res.text();
  return { status: res.status, body: text ? JSON.parse(text) : null };
}

const login = async (username, password) => (await api('POST', '/api/auth/login', { body: { username, password } })).body.token;

async function register(name) {
  const username = `${name}_${suffix}`;
  const res = await api('POST', '/api/auth/register', { body: { username, email: `${username}@example.com`, password: 'password123' } });
  return { username, token: res.body.token, id: res.body.user.id };
}

async function review(token, problemId, reviewer, solutionScore = 100) {
  const session = await api('POST', '/api/sessions', { token, body: { problemId } });
  const sub = await api('POST', '/api/submissions', { token, body: { problemId, sessionId: session.body.id, code: 'design...' } });
  const res = await api('PUT', `/api/evaluations/${sub.body.id}`, {
    token: reviewer,
    body: { aiEfficiency: 5, aiLearning: 5, aiTransparency: 5, aiInnovation: 5, solutionScore, notes: 'great' }
  });
  assert.equal(res.body.status, 'FINAL');
  return sub.body.id;
}

before(async () => {
  server = app.listen(0);
  await new Promise((r) => server.once('listening', r));
  base = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  await prisma.contest.deleteMany({ where: { id: { in: contests } } });
  await prisma.user.deleteMany({ where: { username: { endsWith: suffix } } });
  server.close();
  await prisma.$disconnect();
});

test('a final review shows once as progress, then stays quiet until the next gain', async () => {
  const player = await register('prog');
  const reviewer = await login('reviewer', 'reviewer12345');
  const problem = (await api('GET', '/api/problems/design-url-shortener')).body;

  const empty = await api('GET', '/api/me/progress', { token: player.token });
  assert.equal(empty.body.previous.totalPoints, 0);
  assert.equal(empty.body.current.totalPoints, 0);
  assert.deepEqual(empty.body.newAchievements, []);

  await review(player.token, problem.id, reviewer);
  const first = await api('GET', '/api/me/progress', { token: player.token });
  assert.equal(first.body.current.totalPoints, 100);
  assert.ok(first.body.current.rank >= 1);
  const keys = first.body.newAchievements.map((a) => a.key);
  assert.ok(keys.includes('first-run') && keys.includes('prompt-master') && keys.includes('flawless'), keys.join());

  assert.equal((await api('POST', '/api/me/progress/seen', { token: player.token })).status, 204);
  const seen = await api('GET', '/api/me/progress', { token: player.token });
  assert.equal(seen.body.previous.totalPoints, 100);
  assert.deepEqual(seen.body.newAchievements, []);
});

test('accounts older than progress updates start from their current progress, with no catch-up', async () => {
  const player = await register('legacy');
  const reviewer = await login('reviewer', 'reviewer12345');
  const problem = (await api('GET', '/api/problems/design-url-shortener')).body;
  await review(player.token, problem.id, reviewer);
  await prisma.$executeRaw`UPDATE "User" SET "progressSeen" = NULL WHERE id = ${player.id}`;

  const first = await api('GET', '/api/me/progress', { token: player.token });
  assert.equal(first.body.previous.totalPoints, 100);
  assert.deepEqual(first.body.newAchievements, []);
  assert.equal((await prisma.user.findUnique({ where: { id: player.id } })).progressSeen.totalPoints, 100);
});

test('achievements use the date of the run that earned them, and a low review removes a streak day', async () => {
  const player = await register('dated');
  const reviewer = await login('reviewer', 'reviewer12345');
  const problem = (await api('GET', '/api/problems/design-url-shortener')).body;
  const session = await api('POST', '/api/sessions', { token: player.token, body: { problemId: problem.id } });
  const sub = await api('POST', '/api/submissions', { token: player.token, body: { problemId: problem.id, sessionId: session.body.id, code: 'junk' } });

  const pending = await api('GET', `/api/players/${player.username}`);
  assert.equal(pending.body.streak.current, 1);

  const longAgo = new Date('2026-01-15T10:00:00Z');
  await prisma.solve.update({ where: { id: sub.body.id }, data: { submittedAt: longAgo } });
  await api('PUT', `/api/evaluations/${sub.body.id}`, {
    token: reviewer,
    body: { aiEfficiency: 3, aiLearning: 3, aiTransparency: 3, aiInnovation: 3, solutionScore: 10, notes: 'junk' }
  });

  const page = await api('GET', `/api/players/${player.username}`);
  assert.equal(new Date(page.body.achievements.find((a) => a.key === 'first-run').earnedAt).toISOString(), longAgo.toISOString());
  assert.equal(page.body.streak.best, 0);
});

test('progress is private and player pages show streak and achievements', async () => {
  assert.equal((await api('GET', '/api/me/progress')).status, 401);
  assert.equal((await api('POST', '/api/me/progress/seen')).status, 401);

  const player = await register('page');
  const reviewer = await login('reviewer', 'reviewer12345');
  const problem = (await api('GET', '/api/problems/design-url-shortener')).body;
  await review(player.token, problem.id, reviewer);
  await api('POST', '/api/me/progress/seen', { token: player.token });

  const page = await api('GET', `/api/players/${player.username}`);
  assert.deepEqual(page.body.streak, { current: 1, best: 1, activeToday: true });
  assert.equal(page.body.achievements.length, 11);
  assert.ok(page.body.achievements.find((a) => a.key === 'first-run').earnedAt);
  assert.equal(page.body.achievements.find((a) => a.key === 'podium').earnedAt, null);
  assert.equal(page.body.progressSeen, undefined);
});

test('the daily challenge is stable within a day and only a qualifying run clears it', async () => {
  const player = await register('daily');
  const anon = await api('GET', '/api/daily');
  assert.ok(anon.body.problem.slug);
  assert.equal(anon.body.streak, null);
  assert.equal(anon.body.problem.published, undefined);
  assert.ok(new Date(anon.body.resetsAt) > new Date());

  const solve = (status) => ({ userId: player.id, problemId: anon.body.problem.id, language: 'python', code: 'x', status });

  await prisma.solve.create({ data: solve('WRONG_ANSWER') });
  const failed = await api('GET', '/api/daily', { token: player.token });
  assert.equal(failed.body.problem.id, anon.body.problem.id);
  assert.equal(failed.body.completed, false);
  assert.equal(failed.body.streak.current, 0);

  await prisma.solve.create({ data: solve('ACCEPTED') });
  const passed = await api('GET', '/api/daily', { token: player.token });
  assert.equal(passed.body.completed, true);
  assert.deepEqual(passed.body.streak, { current: 1, best: 1, activeToday: true });
});

test('podium needs an ended contest, more than 3 entrants and no pending reviews', async () => {
  const players = await Promise.all(['a', 'b', 'c', 'd'].map((n) => register(`pod${n}`)));
  const problem = (await api('GET', '/api/problems/design-url-shortener')).body;
  const hour = 3600000;
  const contest = await prisma.contest.create({
    data: {
      slug: `pod-${suffix}`, title: 'Podium', description: 'x',
      startsAt: new Date(Date.now() - 2 * hour), endsAt: new Date(Date.now() - hour),
      problems: { create: [{ problemId: problem.id }] },
      entries: { create: players.map((p) => ({ userId: p.id })) }
    }
  });
  contests.push(contest.id);
  const podium = async () => (await api('GET', `/api/players/${players[0].username}`)).body.achievements.find((a) => a.key === 'podium').earnedAt;

  const solve = (p) => prisma.solve.create({ data: { userId: p.id, problemId: problem.id, contestId: contest.id, language: 'markdown', code: 'x', status: 'MANUAL_REVIEW' } });
  const scored = await solve(players[0]);
  const pending = await solve(players[1]);
  const scores = { solutionScore: 80, aiEfficiency: 4, aiLearning: 4, aiTransparency: 4, aiInnovation: 4, aiUsageScore: 75, finalScore: 77, reviewerId: players[3].id };
  await prisma.evaluation.create({ data: { solveId: scored.id, ...scores } });
  assert.equal(await podium(), null, 'a review is still pending');

  await prisma.evaluation.create({ data: { solveId: pending.id, ...scores, finalScore: 70 } });
  assert.ok(await podium());
});
