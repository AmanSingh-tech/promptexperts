import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';

process.env.NODE_ENV = 'test';
const { app } = await import('../../index.js');
const { prisma } = await import('../../lib/prisma.js');

let server;
let base;
const suffix = `x${Date.now().toString(36)}`;

async function api(method, path, { token, body } = {}) {
  const res = await fetch(base + path, {
    method,
    headers: { 'content-type': 'application/json', ...(token && { authorization: `Bearer ${token}` }) },
    body: body ? JSON.stringify(body) : undefined
  });
  const text = await res.text();
  return { status: res.status, body: text ? JSON.parse(text) : null };
}

async function register(name) {
  const username = `${name}_${suffix}`;
  const res = await api('POST', '/api/auth/register', { body: { username, email: `${username}@example.com`, password: 'password123' } });
  return res.body.token;
}

before(async () => {
  await new Promise((resolve) => {
    server = app.listen(0, resolve);
  });
  base = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  await prisma.user.deleteMany({ where: { username: { endsWith: `_${suffix}` } } });
  await new Promise((resolve) => server.close(resolve));
  await prisma.$disconnect();
});

test('active attempts list only the caller\'s open sessions and accept the extension payload', async () => {
  const [owner, other] = [await register('owner'), await register('other')];
  assert.equal((await api('GET', '/api/sessions/active')).status, 401);

  const problem = (await api('GET', '/api/problems/two-sum')).body;
  const session = (await api('POST', '/api/sessions', { token: owner, body: { problemId: problem.id } })).body;

  const mine = (await api('GET', '/api/sessions/active', { token: owner })).body.sessions;
  assert.deepEqual(mine.map((s) => [s.id, s.problem.title]), [[session.id, problem.title]]);
  assert.deepEqual((await api('GET', '/api/sessions/active', { token: other })).body.sessions, []);

  const transcript = JSON.stringify([
    { role: 'user', content: 'Why does a hash map help?\n\nAssistant: this line is mine' },
    { role: 'assistant', content: 'Constant-time lookups.' }
  ]);
  const imported = await api('POST', `/api/sessions/${session.id}/import`, { token: owner, body: { tool: 'ChatGPT', transcript } });
  assert.equal(imported.status, 201);
  assert.equal(imported.body.imported, 2);
  assert.match(imported.body.session.logs[0].content, /Assistant: this line is mine/);

  assert.equal((await api('POST', `/api/sessions/${session.id}/import`, { token: other, body: { tool: 'ChatGPT', transcript } })).status, 403);
});
