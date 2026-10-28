import jwt from 'jsonwebtoken';
import { prisma } from '../lib/prisma.js';
import { HttpError } from '../lib/http.js';

export function signToken(user) {
  return jwt.sign({ userId: user.id }, process.env.JWT_SECRET, {
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

async function resolveUser(req) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return null;
  let payload;
  try {
    payload = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    throw new HttpError(401, 'Invalid or expired token');
  }
  const user = await prisma.user.findUnique({ where: { id: payload.userId } });
  if (!user) throw new HttpError(401, 'User no longer exists');
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
