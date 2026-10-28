import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { badRequest, notFound, forbidden, HttpError } from '../lib/http.js';
import { requireAuth, isStaff } from '../middleware/auth.js';
import { chat } from '../lib/claude.js';
import { parseTranscript } from '../lib/transcript-parser.js';
import { MAX_EVENTS_PER_SESSION } from './submissions.js';
import { visibleProblemWhere } from '../lib/contests.js';

const router = Router();
router.use(requireAuth);

const MAX_MESSAGE_CHARS = 8000;
const MAX_IMPORT_CHARS = 200000;
const maxMessages = () => Number(process.env.MAX_MESSAGES_PER_SESSION || 60);

const withLogs = { logs: { orderBy: { timestamp: 'asc' } } };

async function loadSession(req, { ownerOnly = true } = {}) {
  const session = await prisma.aISession.findUnique({ where: { id: req.params.id }, include: withLogs });
  if (!session) throw notFound('Session not found');
  const owner = session.userId === req.user.id;
  if (!owner && (ownerOnly || !isStaff(req.user))) throw forbidden();
  return session;
}

function assertActive(session) {
  if (session.status !== 'ACTIVE') throw new HttpError(409, 'This session is closed. Start a new attempt to keep chatting.');
}

router.post('/', async (req, res) => {
  const { problemId } = req.body ?? {};
  if (!problemId) throw badRequest('problemId is required');
  const problem = await prisma.problem.findFirst({ where: { id: problemId, ...visibleProblemWhere() }, select: { id: true } });
  if (!problem) throw notFound('Problem not found');

  const existing = await prisma.aISession.findFirst({
    where: { userId: req.user.id, problemId, status: 'ACTIVE' },
    include: withLogs,
    orderBy: { startedAt: 'desc' }
  });
  if (existing) return res.json(existing);

  const session = await prisma.aISession.create({ data: { userId: req.user.id, problemId }, include: withLogs });
  res.status(201).json(session);
});

router.get('/:id', async (req, res) => {
  res.json(await loadSession(req, { ownerOnly: false }));
});

router.post('/:id/messages', async (req, res) => {
  const session = await loadSession(req);
  assertActive(session);
  const message = String(req.body?.message ?? '').trim();
  if (!message) throw badRequest('message is required');
  if (message.length > MAX_MESSAGE_CHARS) throw badRequest(`message must be under ${MAX_MESSAGE_CHARS} characters`);
  const platformPrompts = session.logs.filter((l) => l.role === 'USER' && l.source === 'PLATFORM').length;
  if (platformPrompts >= maxMessages()) throw new HttpError(429, `Message limit reached for this attempt (${maxMessages()}).`);

  const problem = await prisma.problem.findUnique({ where: { id: session.problemId } });
  const history = session.logs.filter((l) => l.source === 'PLATFORM');
  const reply = await chat({ problem, history, message });

  const [userLog, assistantLog] = await prisma.$transaction([
    prisma.aILog.create({ data: { sessionId: session.id, role: 'USER', content: message, tokensUsed: reply.inputTokens } }),
    prisma.aILog.create({ data: { sessionId: session.id, role: 'ASSISTANT', content: reply.text, tokensUsed: reply.outputTokens } }),
    prisma.aISession.update({
      where: { id: session.id },
      data: {
        totalMessages: { increment: 2 },
        inputTokens: { increment: reply.inputTokens },
        outputTokens: { increment: reply.outputTokens }
      }
    })
  ]);
  res.status(201).json({ userLog, assistantLog });
});

router.post('/:id/import', async (req, res) => {
  const session = await loadSession(req);
  assertActive(session);
  const transcript = String(req.body?.transcript ?? '');
  const tool = String(req.body?.tool ?? 'Other').trim().slice(0, 40) || 'Other';
  if (!transcript.trim()) throw badRequest('transcript is required');
  if (transcript.length > MAX_IMPORT_CHARS) throw badRequest(`transcript must be under ${MAX_IMPORT_CHARS} characters`);

  const parsed = parseTranscript(transcript);
  if (!parsed.some((m) => m.role === 'USER')) {
    throw badRequest('Could not find any messages. Label each turn with "User:" / "Assistant:" (or ChatGPT:, Claude:, ...) or paste a JSON export.');
  }

  const base = Date.now();
  await prisma.$transaction([
    prisma.aILog.createMany({
      data: parsed.map((m, i) => ({
        sessionId: session.id,
        role: m.role,
        content: m.content,
        source: 'IMPORTED',
        tool,
        timestamp: new Date(base + i)
      }))
    }),
    prisma.aISession.update({ where: { id: session.id }, data: { totalMessages: { increment: parsed.length } } })
  ]);
  res.status(201).json({ imported: parsed.length, session: await loadSession(req) });
});

router.post('/:id/events', async (req, res) => {
  const session = await prisma.aISession.findUnique({ where: { id: req.params.id }, select: { id: true, userId: true, status: true } });
  if (!session) throw notFound('Session not found');
  if (session.userId !== req.user.id) throw forbidden();
  if (session.status !== 'ACTIVE') throw new HttpError(409, 'This session is closed.');
  const { type, lines, chars } = req.body ?? {};
  if (type !== 'PASTE') throw badRequest('Only PASTE events can be recorded directly');
  const n = (v) => (Number.isInteger(v) && v >= 0 && v < 1e7 ? v : null);
  if (n(lines) == null || n(chars) == null) throw badRequest('lines and chars must be non-negative integers');
  if ((await prisma.sessionEvent.count({ where: { sessionId: session.id } })) >= MAX_EVENTS_PER_SESSION) {
    return res.status(202).json({ recorded: false });
  }
  await prisma.sessionEvent.create({ data: { sessionId: session.id, type: 'PASTE', lines, chars } });
  res.status(201).json({ recorded: true });
});

router.post('/:id/abandon', async (req, res) => {
  const session = await loadSession(req);
  assertActive(session);
  await prisma.aISession.update({ where: { id: session.id }, data: { status: 'ABANDONED', endedAt: new Date() } });
  res.status(204).end();
});

export default router;
