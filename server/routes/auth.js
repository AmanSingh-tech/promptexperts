import { Router } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';
import { prisma } from '../lib/prisma.js';
import { badRequest, HttpError } from '../lib/http.js';
import { requireAuth, requireRole, optionalAuth, signToken, publicUser } from '../middleware/auth.js';
import { setSessionCookie, clearSessionCookie } from '../lib/cookies.js';
import { createLimiter } from '../lib/rate-limit.js';
import { sendMail } from '../lib/mailer.js';

const router = Router();
const loginLimiter = createLimiter({ limit: 10, windowMs: 15 * 60 * 1000 });
const forgotLimiter = createLimiter({ limit: 5, windowMs: 60 * 60 * 1000 });
const RESET_TTL_MS = 30 * 60 * 1000;

function validatePassword(password) {
  if (typeof password !== 'string' || password.length < 8) throw badRequest('Password must be at least 8 characters');
  if (password.length > 200) throw badRequest('Password is too long');
}

function startSession(res, user, status = 200) {
  const token = signToken(user);
  setSessionCookie(res, token);
  // The token is also returned for API clients; the web app relies on the httpOnly cookie only.
  res.status(status).json({ user: publicUser(user), token });
}

router.post('/register', async (req, res) => {
  const { username, email, password, firstName = '', lastName = '' } = req.body ?? {};
  if (!username || !email || !password) throw badRequest('username, email and password are required');
  if (!/^[a-zA-Z0-9_]{3,30}$/.test(username)) throw badRequest('Username must be 3-30 letters, digits or underscores');
  if (!/^\S+@\S+\.\S+$/.test(email)) throw badRequest('Invalid email address');
  validatePassword(password);

  const exists = await prisma.user.findFirst({ where: { OR: [{ username }, { email: email.toLowerCase() }] } });
  if (exists) throw new HttpError(409, 'Username or email already in use');

  const user = await prisma.user.create({
    data: {
      username,
      email: email.toLowerCase(),
      password: await bcrypt.hash(password, 10),
      firstName: String(firstName).slice(0, 60),
      lastName: String(lastName).slice(0, 60)
    }
  });
  startSession(res, user, 201);
});

router.post('/login', async (req, res) => {
  const { username, password } = req.body ?? {};
  if (!username || !password) throw badRequest('username and password are required');
  const key = `${req.ip}:${String(username).toLowerCase()}`;
  if (loginLimiter.blocked(key)) throw new HttpError(429, 'Too many failed sign-in attempts. Try again in 15 minutes.');

  const user = await prisma.user.findFirst({ where: { OR: [{ username }, { email: String(username).toLowerCase() }] } });
  if (!user || !(await bcrypt.compare(String(password), user.password))) {
    loginLimiter.hit(key);
    throw new HttpError(401, 'Invalid username or password');
  }
  loginLimiter.clear(key);
  startSession(res, user);
});

router.post('/logout', (req, res) => {
  clearSessionCookie(res);
  res.status(204).end();
});

router.get('/session', optionalAuth, (req, res) => {
  res.json({ user: req.user ? publicUser(req.user) : null });
});

router.get('/me', requireAuth, (req, res) => {
  res.json(publicUser(req.user));
});

router.patch('/password', requireAuth, async (req, res) => {
  const { currentPassword, newPassword } = req.body ?? {};
  if (!(await bcrypt.compare(String(currentPassword ?? ''), req.user.password))) throw badRequest('Current password is incorrect');
  validatePassword(newPassword);
  const user = await prisma.user.update({
    where: { id: req.user.id },
    data: { password: await bcrypt.hash(newPassword, 10), tokenVersion: { increment: 1 } }
  });
  // Other devices are signed out by the version bump; keep this one signed in.
  startSession(res, user);
});

router.post('/logout-everywhere', requireAuth, async (req, res) => {
  await prisma.user.update({ where: { id: req.user.id }, data: { tokenVersion: { increment: 1 } } });
  clearSessionCookie(res);
  res.status(204).end();
});

const hashToken = (token) => crypto.createHash('sha256').update(token).digest('hex');
const appUrl = () => (process.env.APP_URL || 'http://localhost:3000').replace(/\/$/, '');

export async function createResetLink(userId) {
  const token = crypto.randomBytes(32).toString('base64url');
  await prisma.passwordResetToken.create({
    data: { userId, tokenHash: hashToken(token), expiresAt: new Date(Date.now() + RESET_TTL_MS) }
  });
  return `${appUrl()}/reset?token=${token}`;
}

router.post('/forgot', async (req, res) => {
  const email = String(req.body?.email ?? '').toLowerCase().trim();
  if (!email) throw badRequest('email is required');
  const key = `${req.ip}:${email}`;
  if (forgotLimiter.blocked(key)) throw new HttpError(429, 'Too many reset requests. Try again later.');
  forgotLimiter.hit(key);

  const user = await prisma.user.findUnique({ where: { email } });
  if (user) {
    const link = await createResetLink(user.id);
    await sendMail({
      to: user.email,
      subject: 'Reset your AILOGRACER password',
      text: `Hi ${user.username},\n\nUse this link to choose a new password. It expires in 30 minutes and works once:\n\n${link}\n\nIf you didn't ask for this, you can ignore this email.`
    });
  }
  // Same response either way, so the endpoint can't be used to discover accounts.
  res.json({ ok: true });
});

router.post('/reset', async (req, res) => {
  const { token, password } = req.body ?? {};
  if (!token) throw badRequest('token is required');
  validatePassword(password);
  const record = await prisma.passwordResetToken.findUnique({ where: { tokenHash: hashToken(String(token)) } });
  if (!record || record.usedAt || record.expiresAt < new Date()) throw badRequest('This reset link is invalid or has expired.');

  const [, user] = await prisma.$transaction([
    prisma.passwordResetToken.updateMany({ where: { userId: record.userId, usedAt: null }, data: { usedAt: new Date() } }),
    prisma.user.update({
      where: { id: record.userId },
      data: { password: await bcrypt.hash(password, 10), tokenVersion: { increment: 1 } }
    })
  ]);
  startSession(res, user);
});

router.post('/admin/reset-link/:userId', requireRole('ADMIN'), async (req, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.params.userId } });
  if (!user) throw new HttpError(404, 'User not found');
  res.json({ link: await createResetLink(user.id), expiresInMinutes: RESET_TTL_MS / 60000 });
});

export default router;
