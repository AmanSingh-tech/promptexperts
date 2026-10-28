import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { prisma } from './lib/prisma.js';
import authRoutes from './routes/auth.js';
import problemRoutes from './routes/problems.js';
import sessionRoutes from './routes/sessions.js';
import submissionRoutes from './routes/submissions.js';
import evaluationRoutes from './routes/evaluations.js';
import statsRoutes from './routes/stats.js';

if (!process.env.JWT_SECRET) {
  console.error('JWT_SECRET is not set. Copy .env.example to .env first.');
  process.exit(1);
}

export const app = express();
app.disable('x-powered-by');
app.use(cors({ origin: (process.env.CORS_ORIGIN || 'http://localhost:3000').split(',') }));
app.use(express.json({ limit: '1mb' }));

app.get('/health', async (req, res) => {
  await prisma.$queryRaw`SELECT 1`;
  res.json({ status: 'ok' });
});

app.use('/api/auth', authRoutes);
app.use('/api/problems', problemRoutes);
app.use('/api/sessions', sessionRoutes);
app.use('/api/submissions', submissionRoutes);
app.use('/api/evaluations', evaluationRoutes);
app.use('/api', statsRoutes);

app.use((req, res) => res.status(404).json({ error: 'Not found' }));

app.use((err, req, res, next) => {
  const status = err.status || err.statusCode || 500;
  if (status >= 500) console.error(err);
  res.status(status).json({ error: status >= 500 && !err.status ? 'Internal server error' : err.message });
});

if (process.env.NODE_ENV !== 'test') {
  const port = Number(process.env.PORT || 3001);
  app.listen(port, () => console.log(`AILOGRACER API listening on :${port}`));
}
