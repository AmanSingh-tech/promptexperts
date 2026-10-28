import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';

process.env.NODE_ENV = 'test';
const { app } = await import('../../index.js');
const { prisma } = await import('../../lib/prisma.js');

let server;
let base;
const suffix = `a${Date.now().toString(36)}`;

async function call(method, path, { body, cookie, token, csrf } = {}) {
  const res = await fetch(base + path, {
    method,
    headers: {
      ...(body && { 'content-type': 'application/json' }),
      ...(cookie && { cookie }),
      ...(token && { authorization: `Bearer ${token}` }),
      ...(csrf && { 'x-requested-with': 'ailogracer' })
    },
    body: body ? JSON.stringify(body) : undefined
  });
  const text = await res.text();
  const setCookie = res.headers.get('set-cookie');
  return { status: res.status, body: text ? JSON.parse(text) : null, cookie: setCookie?.split(';')[0], setCookie };
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

test('cookie sessions, CSRF header, logout', async () => {
  const reg = await call('POST', '/api/auth/register', {
    body: { username: `cookie_${suffix}`, email: `cookie_${suffix}@example.com`, password: 'password123' }
  });
  assert.equal(reg.status, 201);
  assert.match(reg.setCookie, /HttpOnly/);
  assert.match(reg.setCookie, /SameSite=Lax/);

  assert.equal((await call('GET', '/api/auth/me', { cookie: reg.cookie })).status, 200);

  const problem = await prisma.problem.findUnique({ where: { slug: 'two-sum' } });
  const noHeader = await call('POST', '/api/sessions', { cookie: reg.cookie, body: { problemId: problem.id } });
  assert.equal(noHeader.status, 403, 'cookie-authenticated writes need the CSRF header');
  const withHeader = await call('POST', '/api/sessions', { cookie: reg.cookie, csrf: true, body: { problemId: problem.id } });
  assert.equal(withHeader.status, 201);

  const out = await call('POST', '/api/auth/logout', { cookie: reg.cookie, csrf: true });
  assert.equal(out.status, 204);
  assert.match(out.setCookie, /Max-Age=0/);
});

test('password change revokes other sessions; reset links work once', async () => {
  const reg = await call('POST', '/api/auth/register', {
    body: { username: `reset_${suffix}`, email: `reset_${suffix}@example.com`, password: 'password123' }
  });
  const oldToken = reg.body.token;

  const wrong = await call('PATCH', '/api/auth/password', { token: oldToken, body: { currentPassword: 'nope', newPassword: 'newpassword1' } });
  assert.equal(wrong.status, 400);
  const changed = await call('PATCH', '/api/auth/password', { token: oldToken, body: { currentPassword: 'password123', newPassword: 'newpassword1' } });
  assert.equal(changed.status, 200);
  assert.equal((await call('GET', '/api/auth/me', { token: oldToken })).status, 401, 'old session is revoked');
  assert.equal((await call('GET', '/api/auth/me', { token: changed.body.token })).status, 200);

  assert.equal((await call('POST', '/api/auth/forgot', { body: { email: 'nobody@example.com' } })).status, 200, 'no account enumeration');

  const admin = await call('POST', '/api/auth/login', { body: { username: 'admin', password: 'admin12345' } });
  const link = await call('POST', `/api/auth/admin/reset-link/${reg.body.user.id}`, { token: admin.body.token });
  assert.equal(link.status, 200);
  const resetToken = new URL(link.body.link).searchParams.get('token');

  const reset = await call('POST', '/api/auth/reset', { body: { token: resetToken, password: 'brandnewpass' } });
  assert.equal(reset.status, 200);
  assert.equal((await call('GET', '/api/auth/me', { token: changed.body.token })).status, 401, 'reset revokes sessions');
  assert.equal((await call('POST', '/api/auth/reset', { body: { token: resetToken, password: 'another1234' } })).status, 400, 'single use');
  assert.equal((await call('POST', '/api/auth/login', { body: { username: `reset_${suffix}`, password: 'brandnewpass' } })).status, 200);

  const user = await call('POST', '/api/auth/login', { body: { username: `reset_${suffix}`, password: 'brandnewpass' } });
  assert.equal((await call('POST', `/api/auth/admin/reset-link/${reg.body.user.id}`, { token: user.body.token })).status, 403);
});

test('login is rate limited after repeated failures', async () => {
  let last;
  for (let i = 0; i < 11; i++) {
    last = await call('POST', '/api/auth/login', { body: { username: `ghost_${suffix}`, password: 'wrongpass' } });
  }
  assert.equal(last.status, 429);
});
