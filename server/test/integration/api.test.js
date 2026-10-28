// Requires the database (docker-compose up -d db), a seeded DB and the sandbox image.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';

process.env.NODE_ENV = 'test';
const { app } = await import('../../index.js');
const { prisma } = await import('../../lib/prisma.js');

let server;
let base;
const suffix = Date.now().toString(36);

async function api(method, path, { token, body } = {}) {
  const res = await fetch(base + path, {
    method,
    headers: { 'content-type': 'application/json', ...(token && { authorization: `Bearer ${token}` }) },
    body: body ? JSON.stringify(body) : undefined
  });
  const text = await res.text();
  return { status: res.status, body: text ? JSON.parse(text) : null };
}

before(async () => {
  server = app.listen(0);
  await new Promise((r) => server.once('listening', r));
  base = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  await prisma.user.deleteMany({ where: { username: { endsWith: suffix } } });
  server.close();
  await prisma.$disconnect();
});

test('full solve -> import -> submit -> review -> leaderboard flow', async () => {
  const reg = await api('POST', '/api/auth/register', {
    body: { username: `alice_${suffix}`, email: `alice_${suffix}@example.com`, password: 'password123' }
  });
  assert.equal(reg.status, 201);
  const token = reg.body.token;
  assert.equal(reg.body.user.role, 'USER');
  assert.equal(reg.body.user.password, undefined);

  const dup = await api('POST', '/api/auth/register', {
    body: { username: `alice_${suffix}`, email: `other_${suffix}@example.com`, password: 'password123' }
  });
  assert.equal(dup.status, 409);

  const list = await api('GET', '/api/problems', { token });
  assert.ok(list.body.length >= 9);
  const twoSum = list.body.find((p) => p.slug === 'two-sum');

  const detail = await api('GET', '/api/problems/two-sum', { token });
  assert.ok(detail.body.testCases.every((t) => t.isSample), 'hidden tests must not leak');
  assert.ok(detail.body.totalTests > detail.body.testCases.length);

  const session = await api('POST', '/api/sessions', { token, body: { problemId: twoSum.id } });
  assert.equal(session.status, 201);
  const again = await api('POST', '/api/sessions', { token, body: { problemId: twoSum.id } });
  assert.equal(again.body.id, session.body.id, 'active session is resumed');

  const imp = await api('POST', `/api/sessions/${session.body.id}/import`, {
    token,
    body: {
      tool: 'ChatGPT',
      transcript: 'User: I think brute force is O(n^2). Why is a hash map faster? What edge cases should I test?\nChatGPT: Lookups are O(1). Test duplicates like 3 3.'
    }
  });
  assert.equal(imp.status, 201);
  assert.equal(imp.body.imported, 2);

  const code = 'n,t=map(int,input().split())\na=list(map(int,input().split()))\nseen={}\nfor j,x in enumerate(a):\n    if t-x in seen:\n        print(seen[t-x],j);break\n    seen.setdefault(x,j)';
  const run = await api('POST', '/api/submissions/run', {
    token,
    body: { problemId: twoSum.id, language: 'python', code, sessionId: session.body.id }
  });
  assert.equal(run.status, 200);
  assert.equal(run.body.status, 'ACCEPTED');

  const custom = await api('POST', '/api/submissions/run', {
    token,
    body: { problemId: twoSum.id, language: 'python', code, input: '2 4\n1 3\n' }
  });
  assert.equal(custom.body.tests[0].stdout.trim(), '0 1');

  const sub = await api('POST', '/api/submissions', {
    token,
    body: { problemId: twoSum.id, language: 'python', code, sessionId: session.body.id }
  });
  assert.equal(sub.status, 201);
  assert.equal(sub.body.status, 'ACCEPTED');
  assert.equal(sub.body.autoScore, 100);

  const resubmit = await api('POST', '/api/submissions', {
    token,
    body: { problemId: twoSum.id, language: 'python', code, sessionId: session.body.id }
  });
  assert.equal(resubmit.status, 409);

  // A regular user cannot review.
  assert.equal((await api('GET', '/api/evaluations/queue', { token })).status, 403);
  assert.equal((await api('PUT', `/api/evaluations/${sub.body.id}`, { token, body: {} })).status, 403);

  const reviewer = await api('POST', '/api/auth/login', { body: { username: 'reviewer', password: 'reviewer12345' } });
  const rtoken = reviewer.body.token;

  const queue = await api('GET', '/api/evaluations/queue', { token: rtoken });
  assert.ok(queue.body.some((s) => s.id === sub.body.id));

  const reviewView = await api('GET', `/api/submissions/${sub.body.id}`, { token: rtoken });
  assert.equal(reviewView.status, 200, 'reviewers can open any submission');
  assert.equal(reviewView.body.aiSession.logs.length, 2);

  const analysis = await api('GET', `/api/evaluations/${sub.body.id}/analysis`, { token: rtoken });
  assert.equal(analysis.body.metrics.promptCount, 1);
  assert.equal(analysis.body.metrics.importedLogs, true);

  const missingNotes = await api('PUT', `/api/evaluations/${sub.body.id}`, {
    token: rtoken,
    body: { aiEfficiency: 4, aiLearning: 4, aiTransparency: 3, aiInnovation: 3 }
  });
  assert.equal(missingNotes.status, 400);

  const evaluation = await api('PUT', `/api/evaluations/${sub.body.id}`, {
    token: rtoken,
    body: { aiEfficiency: 4, aiLearning: 4, aiTransparency: 3, aiInnovation: 3, notes: 'Good conceptual questions.' }
  });
  assert.equal(evaluation.status, 200);
  assert.equal(evaluation.body.solutionScore, 100);
  assert.equal(evaluation.body.aiUsageScore, 63);
  assert.equal(evaluation.body.finalScore, 78);

  const own = await api('GET', `/api/submissions/${sub.body.id}`, { token });
  assert.equal(own.body.evaluation.finalScore, 78);
  assert.equal(own.body.autoReview, undefined);

  const board = await api('GET', '/api/leaderboard');
  const row = board.body.find((r) => r.username === `alice_${suffix}`);
  assert.equal(row.totalPoints, 78);

  const stats = await api('GET', '/api/me/stats', { token });
  assert.equal(stats.body.evaluated, 1);
  assert.equal(stats.body.rubric.aiEfficiency, 4);
  assert.equal(stats.body.totalPoints, 78);
  assert.ok(stats.body.rank >= 1);
});

test('written problems need a reviewer-assigned solution score', async () => {
  const reg = await api('POST', '/api/auth/register', {
    body: { username: `bob_${suffix}`, email: `bob_${suffix}@example.com`, password: 'password123' }
  });
  const token = reg.body.token;
  const problem = await api('GET', '/api/problems/design-url-shortener', { token });
  const session = await api('POST', '/api/sessions', { token, body: { problemId: problem.body.id } });
  const sub = await api('POST', '/api/submissions', {
    token,
    body: { problemId: problem.body.id, sessionId: session.body.id, code: 'Use base62 ids from a counter service...' }
  });
  assert.equal(sub.body.status, 'MANUAL_REVIEW');

  const admin = await api('POST', '/api/auth/login', { body: { username: 'admin', password: 'admin12345' } });
  const bad = await api('PUT', `/api/evaluations/${sub.body.id}`, {
    token: admin.body.token,
    body: { aiEfficiency: 1, aiLearning: 1, aiTransparency: 1, aiInnovation: 1, notes: 'No AI used.' }
  });
  assert.equal(bad.status, 400);
  const ok = await api('PUT', `/api/evaluations/${sub.body.id}`, {
    token: admin.body.token,
    body: { solutionScore: 70, aiEfficiency: 1, aiLearning: 1, aiTransparency: 1, aiInnovation: 1, notes: 'No AI used.' }
  });
  assert.equal(ok.body.finalScore, 28);
});

test('admin-only problem management', async () => {
  const user = await api('POST', '/api/auth/register', {
    body: { username: `carol_${suffix}`, email: `carol_${suffix}@example.com`, password: 'password123' }
  });
  const body = { title: `Echo ${suffix}`, description: 'Print input', testCases: [{ input: '1\n', expectedOutput: '1', isSample: true }] };
  assert.equal((await api('POST', '/api/problems', { token: user.body.token, body })).status, 403);

  const admin = await api('POST', '/api/auth/login', { body: { username: 'admin', password: 'admin12345' } });
  const created = await api('POST', '/api/problems', { token: admin.body.token, body: { ...body, tags: ['IO'] } });
  assert.equal(created.status, 201);
  const fetched = await api('GET', `/api/problems/${created.body.slug}`, { token: admin.body.token });
  assert.deepEqual(fetched.body.tags, ['io']);
  assert.equal((await api('DELETE', `/api/problems/${created.body.id}`, { token: admin.body.token })).status, 204);

  const roles = await api('PATCH', `/api/admin/users/${user.body.user.id}/role`, { token: admin.body.token, body: { role: 'REVIEWER' } });
  assert.equal(roles.body.role, 'REVIEWER');
});
