import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';

process.env.NODE_ENV = 'test';
const { app } = await import('../../index.js');
const { prisma } = await import('../../lib/prisma.js');

let server;
let base;
const suffix = `c${Date.now().toString(36)}`;
const created = { contests: [], problems: [] };

async function api(method, path, { token, body } = {}) {
  const res = await fetch(base + path, {
    method,
    headers: { 'content-type': 'application/json', ...(token && { authorization: `Bearer ${token}` }) },
    body: body ? JSON.stringify(body) : undefined
  });
  const text = await res.text();
  return { status: res.status, body: text ? JSON.parse(text) : null };
}
const login = async (u, p) => (await api('POST', '/api/auth/login', { body: { username: u, password: p } })).body.token;
const hours = (h) => new Date(Date.now() + h * 3600000).toISOString();

before(async () => {
  server = app.listen(0);
  await new Promise((r) => server.once('listening', r));
  base = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  await prisma.contest.deleteMany({ where: { id: { in: created.contests } } });
  await prisma.problem.deleteMany({ where: { id: { in: created.problems } } });
  await prisma.user.deleteMany({ where: { username: { endsWith: suffix } } });
  server.close();
  await prisma.$disconnect();
});

test('live contest: hidden problem, join, tagged submission, standings', async () => {
  const admin = await login('admin', 'admin12345');
  const secret = await api('POST', '/api/problems', {
    token: admin,
    body: { title: `Echo ${suffix}`, description: 'Print the input', published: false, testCases: [{ input: '7\n', expectedOutput: '7', isSample: true }] }
  });
  created.problems.push(secret.body.id);
  const twoSum = await api('GET', '/api/problems/two-sum');

  const reg = await api('POST', '/api/auth/register', { body: { username: `player_${suffix}`, email: `player_${suffix}@example.com`, password: 'password123' } });
  const token = reg.body.token;

  const upcoming = await api('POST', '/api/contests', {
    token: admin,
    body: { title: `Future ${suffix}`, description: 'Soon', startsAt: hours(2), endsAt: hours(4), problemIds: [secret.body.id] }
  });
  created.contests.push(upcoming.body.id);
  assert.equal((await api('GET', `/api/problems/${secret.body.slug}`, { token })).status, 404, 'hidden before any contest starts');
  const upcomingView = await api('GET', `/api/contests/${upcoming.body.slug}`, { token });
  assert.equal(upcomingView.body.state, 'UPCOMING');
  assert.deepEqual(upcomingView.body.problems, []);
  assert.equal(upcomingView.body.problemCount, 1);

  const live = await api('POST', '/api/contests', {
    token: admin,
    body: { title: `Live ${suffix}`, description: 'Now', startsAt: hours(-1), endsAt: hours(1), problemIds: [secret.body.id, twoSum.body.id] }
  });
  created.contests.push(live.body.id);
  assert.equal((await api('GET', `/api/problems/${secret.body.slug}`, { token })).status, 200, 'visible once its contest started');

  const session = await api('POST', '/api/sessions', { token, body: { problemId: secret.body.id } });
  const body = { problemId: secret.body.id, sessionId: session.body.id, language: 'python', code: 'print(input())', contestId: live.body.id };
  assert.equal((await api('POST', '/api/submissions', { token, body })).status, 409, 'must join first');

  assert.equal((await api('POST', `/api/contests/${live.body.slug}/join`, { token })).status, 201);
  const sub = await api('POST', '/api/submissions', { token, body });
  assert.equal(sub.status, 201);
  assert.equal(sub.body.contestId, live.body.id);

  let view = await api('GET', `/api/contests/${live.body.slug}`, { token });
  assert.equal(view.body.joined, true);
  assert.equal(view.body.standings[0].pending, 1);
  assert.equal(view.body.standings[0].total, 0);

  const reviewer = await login('reviewer', 'reviewer12345');
  await api('PUT', `/api/evaluations/${sub.body.id}`, {
    token: reviewer,
    body: { aiEfficiency: 3, aiLearning: 3, aiTransparency: 3, aiInnovation: 3, notes: 'ok' }
  });
  view = await api('GET', `/api/contests/${live.body.slug}`, { token });
  assert.equal(view.body.standings[0].total, 70);
  assert.equal(view.body.standings[0].cells[secret.body.id].best, 70);

  const list = await api('GET', '/api/contests', { token });
  const liveItem = list.body.find((c) => c.id === live.body.id);
  assert.equal(liveItem.state, 'LIVE');
  assert.equal(liveItem.joined, true);
});

test('ended contests reject joins and submissions', async () => {
  const admin = await login('admin', 'admin12345');
  const twoSum = await api('GET', '/api/problems/two-sum');
  const ended = await api('POST', '/api/contests', {
    token: admin,
    body: { title: `Past ${suffix}`, description: 'Done', startsAt: hours(-3), endsAt: hours(-1), problemIds: [twoSum.body.id] }
  });
  created.contests.push(ended.body.id);
  const reg = await api('POST', '/api/auth/register', { body: { username: `late_${suffix}`, email: `late_${suffix}@example.com`, password: 'password123' } });
  assert.equal((await api('POST', `/api/contests/${ended.body.slug}/join`, { token: reg.body.token })).status, 409);
  assert.equal((await api('POST', '/api/contests', { token: reg.body.token, body: {} })).status, 403);
  assert.equal((await api('POST', '/api/contests', { token: admin, body: { title: 'x', startsAt: hours(2), endsAt: hours(1), problemIds: [twoSum.body.id] } })).status, 400);
});
