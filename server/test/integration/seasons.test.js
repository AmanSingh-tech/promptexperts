import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';

process.env.NODE_ENV = 'test';
const { app } = await import('../../index.js');
const { prisma } = await import('../../lib/prisma.js');

let server;
let base;
const suffix = `s${Date.now().toString(36)}`;
const DAY = 86400000;
// Far in the past so these seasons can't clash with real ones.
const year = 1990 + (Date.now() % 9);
const at = (month, day) => new Date(Date.UTC(year, month, day)).toISOString();

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

let admin;
let reviewer;
before(async () => {
  await new Promise((resolve) => {
    server = app.listen(0, resolve);
  });
  base = `http://127.0.0.1:${server.address().port}`;
  admin = await login('admin', 'admin12345');
  reviewer = await login('reviewer', 'reviewer12345');
});

after(async () => {
  await prisma.season.deleteMany({ where: { slug: { contains: suffix } } });
  await prisma.user.deleteMany({ where: { username: { endsWith: `_${suffix}` } } });
  await new Promise((resolve) => server.close(resolve));
  await prisma.$disconnect();
});

test('only admins manage seasons, and seasons cannot overlap', async () => {
  const player = await register('p');
  const body = { name: `Spring ${suffix}`, startsAt: at(2, 1), endsAt: at(5, 1) };
  assert.equal((await api('POST', '/api/seasons', { token: player.token, body })).status, 403);
  const created = await api('POST', '/api/seasons', { token: admin, body });
  assert.equal(created.status, 201);
  assert.equal(created.body.state, 'ENDED');

  const clash = await api('POST', '/api/seasons', { token: admin, body: { name: `Clash ${suffix}`, startsAt: at(4, 1), endsAt: at(7, 1) } });
  assert.equal(clash.status, 409);
  const next = await api('POST', '/api/seasons', { token: admin, body: { name: `Summer ${suffix}`, startsAt: at(5, 1), endsAt: at(8, 1) } });
  assert.equal(next.status, 201, 'a season may start exactly when the last one ends');
  assert.equal((await api('PATCH', `/api/seasons/${next.body.id}`, { token: admin, body: { startsAt: at(4, 15) } })).status, 409);
  assert.equal((await api('PATCH', `/api/seasons/${next.body.id}`, { token: admin, body: { endsAt: at(4, 1) } })).status, 400);

  const list = (await api('GET', '/api/seasons')).body.map((s) => s.slug);
  assert.ok(list.indexOf(next.body.slug) < list.indexOf(created.body.slug), 'newest first');
  assert.equal((await api('GET', '/api/leaderboard?season=missing-season')).status, 404);
  assert.equal((await api('DELETE', `/api/seasons/${next.body.id}`, { token: admin })).status, 204);
});

test('a season board counts only its window, and medals wait for every review', async () => {
  const problem = (await api('GET', '/api/problems/design-url-shortener')).body;
  const players = [];
  for (let i = 0; i < 4; i++) players.push(await register(`m${i}`));
  const outsider = await register('late');

  const season = (await api('POST', '/api/seasons', {
    token: admin,
    body: { name: `Autumn ${suffix}`, startsAt: at(9, 1), endsAt: at(11, 1) }
  })).body;

  async function submit(player, when, score) {
    const session = (await api('POST', '/api/sessions', { token: player.token, body: { problemId: problem.id } })).body;
    const solve = (await api('POST', '/api/submissions', { token: player.token, body: { problemId: problem.id, sessionId: session.id, code: 'my design' } })).body;
    await prisma.solve.update({ where: { id: solve.id }, data: { submittedAt: new Date(when) } });
    if (score != null) {
      await api('PUT', `/api/evaluations/${solve.id}`, {
        token: reviewer,
        body: { aiEfficiency: 4, aiLearning: 4, aiTransparency: 4, aiInnovation: 4, solutionScore: score, notes: 'ok' }
      });
    }
    return solve;
  }

  for (const [i, p] of players.entries()) await submit(p, at(9, 10 + i), 90 - i * 10);
  await submit(outsider, at(11, 1), 100); // the instant the season ends: outside it
  const pending = await submit(players[3], at(10, 1), null);

  const board = (await api('GET', `/api/leaderboard?season=${season.slug}`)).body;
  const ours = board.rows.filter((r) => r.username.endsWith(suffix)).map((r) => r.username);
  assert.equal(board.season.slug, season.slug);
  assert.deepEqual(ours, players.map((p) => p.username));

  const medal = async (p) => (await api('GET', `/api/players/${p.username}`)).body.achievements.find((a) => a.key === 'season-podium');
  assert.equal((await medal(players[0])).earnedAt, null, 'an unreviewed submission holds the medals back');

  await api('PUT', `/api/evaluations/${pending.id}`, {
    token: reviewer,
    body: { aiEfficiency: 1, aiLearning: 1, aiTransparency: 1, aiInnovation: 1, solutionScore: 0, notes: 'no' }
  });
  // Other unsettled submissions in the window (from other tests or real data) would also hold medals back.
  const unsettled = await prisma.solve.count({
    where: { submittedAt: { gte: new Date(season.startsAt), lt: new Date(season.endsAt) }, OR: [{ evaluation: null }, { evaluation: { status: { not: 'FINAL' } } }] }
  });
  assert.equal(unsettled, 0);
  assert.equal(new Date((await medal(players[0])).earnedAt).getTime(), new Date(season.endsAt).getTime());
  assert.equal((await medal(players[3])).earnedAt, null);
  assert.equal((await medal(outsider)).earnedAt, null);
});
