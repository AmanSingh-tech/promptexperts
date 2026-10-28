import jwt from 'jsonwebtoken';
import { prisma } from '../lib/prisma.js';
import { HttpError } from '../lib/http.js';
import { parseCookies, SESSION_COOKIE } from '../lib/cookies.js';

export function signToken(user) {
  return jwt.sign({ userId: user.id, v: user.tokenVersion }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRY || '7d'
  });
}

export const publicUser = (u) => ({
  id: u.id,
  username: u.username,
  email: u.email,
  firstName: u.firstName,
  lastName: u.lastName,
  role: u.role
});

function readToken(req) {
  const header = req.headers.authorization || '';
  if (header.startsWith('Bearer ')) return { token: header.slice(7), viaCookie: false };
  const cookie = parseCookies(req.headers.cookie)[SESSION_COOKIE];
  return cookie ? { token: cookie, viaCookie: true } : { token: null, viaCookie: false };
}

async function resolveUser(req) {
  const { token, viaCookie } = readToken(req);
  if (!token) return null;
  let payload;
  try {
    payload = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    throw new HttpError(401, 'Invalid or expired session');
  }
  const user = await prisma.user.findUnique({ where: { id: payload.userId } });
  if (!user || (payload.v ?? 0) !== user.tokenVersion) throw new HttpError(401, 'Session expired. Please sign in again.');
  req.authViaCookie = viaCookie;
  return user;
}

export async function requireAuth(req, res, next) {
  const user = await resolveUser(req);
  if (!user) throw new HttpError(401, 'Authentication required');
  req.user = user;
  next();
}

export async function optionalAuth(req, res, next) {
  req.user = await resolveUser(req).catch(() => null);
  next();
}

export const requireRole = (...roles) => async (req, res, next) => {
  await requireAuth(req, res, () => {});
  if (!roles.includes(req.user.role)) throw new HttpError(403, 'Insufficient permissions');
  next();
};

export const isStaff = (user) => user && (user.role === 'REVIEWER' || user.role === 'ADMIN');

// Cookie-authenticated writes must carry a custom header. Browsers only send custom headers
// cross-origin after a CORS preflight, which our CORS policy rejects for unknown origins.
export function csrfGuard(req, res, next) {
  const safe = req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS';
  const hasCookie = SESSION_COOKIE in parseCookies(req.headers.cookie);
  if (!safe && hasCookie && !req.headers.authorization && req.headers['x-requested-with'] !== 'ailogracer') {
    throw new HttpError(403, 'Missing CSRF header');
  }
  next();
}
