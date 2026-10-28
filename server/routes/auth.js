import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '../lib/prisma.js';
import { badRequest, HttpError } from '../lib/http.js';
import { requireAuth, signToken, publicUser } from '../middleware/auth.js';

const router = Router();

router.post('/register', async (req, res) => {
  const { username, email, password, firstName = '', lastName = '' } = req.body ?? {};
  if (!username || !email || !password) throw badRequest('username, email and password are required');
  if (!/^[a-zA-Z0-9_]{3,30}$/.test(username)) throw badRequest('Username must be 3-30 letters, digits or underscores');
  if (!/^\S+@\S+\.\S+$/.test(email)) throw badRequest('Invalid email address');
  if (String(password).length < 8) throw badRequest('Password must be at least 8 characters');

  const exists = await prisma.user.findFirst({ where: { OR: [{ username }, { email: email.toLowerCase() }] } });
  if (exists) throw new HttpError(409, 'Username or email already in use');

  const user = await prisma.user.create({
    data: {
      username,
      email: email.toLowerCase(),
      password: await bcrypt.hash(String(password), 10),
      firstName: String(firstName).slice(0, 60),
      lastName: String(lastName).slice(0, 60)
    }
  });
  res.status(201).json({ user: publicUser(user), token: signToken(user) });
});

router.post('/login', async (req, res) => {
  const { username, password } = req.body ?? {};
  if (!username || !password) throw badRequest('username and password are required');
  const user = await prisma.user.findFirst({
    where: { OR: [{ username }, { email: String(username).toLowerCase() }] }
  });
  if (!user || !(await bcrypt.compare(String(password), user.password))) {
    throw new HttpError(401, 'Invalid username or password');
  }
  res.json({ user: publicUser(user), token: signToken(user) });
});

router.get('/me', requireAuth, (req, res) => {
  res.json(publicUser(req.user));
});

export default router;
