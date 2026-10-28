import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { badRequest, notFound, forbidden, HttpError } from '../lib/http.js';
import { requireAuth, isStaff } from '../middleware/auth.js';
import { judge, LANGUAGES } from '../lib/judge.js';

const router = Router();
router.use(requireAuth);

const MAX_CODE_CHARS = 100000;
const MAX_JUDGES = Number(process.env.MAX_CONCURRENT_JUDGES || 4);
let activeJudges = 0;
const busyUsers = new Set();

async function withJudgeSlot(userId, fn) {
  if (busyUsers.has(userId)) throw new HttpError(429, 'You already have a run in progress.');
  if (activeJudges >= MAX_JUDGES) throw new HttpError(503, 'The judge is busy. Please retry in a few seconds.');
  busyUsers.add(userId);
  activeJudges++;
  try {
    return await fn();
  } finally {
    activeJudges--;
    busyUsers.delete(userId);
  }
}

function validateCode(problem, { language, code }) {
  if (typeof code !== 'string' || !code.trim()) throw badRequest('code is required');
  if (code.length > MAX_CODE_CHARS) throw badRequest('Submission is too large');
  if (problem.type === 'CODE' && !LANGUAGES[language]) throw badRequest(`language must be one of ${Object.keys(LANGUAGES).join(', ')}`);
}

async function loadProblem(problemId) {
  if (!problemId) throw badRequest('problemId is required');
  const problem = await prisma.problem.findFirst({
    where: { id: problemId, published: true },
    include: { testCases: { orderBy: { position: 'asc' } } }
  });
  if (!problem) throw notFound('Problem not found');
  return problem;
}

router.post('/run', async (req, res) => {
  const { problemId, language, code, input, sessionId } = req.body ?? {};
  const problem = await loadProblem(problemId);
  if (problem.type !== 'CODE') throw badRequest('Only code problems can be run');
  validateCode(problem, { language, code });

  const custom = typeof input === 'string';
  const tests = custom
    ? [{ input, expectedOutput: null }]
    : problem.testCases.filter((t) => t.isSample);
  if (!tests.length) throw badRequest('This problem has no sample tests; provide custom input');

  const result = await withJudgeSlot(req.user.id, () =>
    judge({ language, code, tests, timeLimitMs: problem.timeLimitMs })
  );

  if (sessionId) {
    await prisma.aISession.updateMany({
      where: { id: sessionId, userId: req.user.id, status: 'ACTIVE' },
      data: { runCount: { increment: 1 } }
    });
  }

  res.json({
    status: custom && result.status === 'WRONG_ANSWER' ? 'RAN' : result.status,
    compileError: result.compileError,
    tests: result.tests.map((r, i) => ({
      ...r,
      verdict: custom && r.verdict === 'WRONG_ANSWER' ? 'RAN' : r.verdict,
      input: tests[i].input,
      expectedOutput: tests[i].expectedOutput
    }))
  });
});

router.post('/', async (req, res) => {
  const { problemId, sessionId, language, code } = req.body ?? {};
  const problem = await loadProblem(problemId);
  validateCode(problem, { language, code });
  if (!sessionId) throw badRequest('sessionId is required');

  const session = await prisma.aISession.findUnique({ where: { id: sessionId } });
  if (!session || session.userId !== req.user.id || session.problemId !== problem.id) throw badRequest('Invalid session for this problem');
  if (session.status !== 'ACTIVE') throw new HttpError(409, 'This attempt was already submitted');

  // Claim the session first so a double-click cannot submit the same attempt twice.
  const claimed = await prisma.aISession.updateMany({
    where: { id: session.id, status: 'ACTIVE' },
    data: { status: 'SUBMITTED', endedAt: new Date() }
  });
  if (!claimed.count) throw new HttpError(409, 'This attempt was already submitted');

  let verdict;
  try {
    if (problem.type === 'CODE') {
      const result = await withJudgeSlot(req.user.id, () =>
        judge({ language, code, tests: problem.testCases, timeLimitMs: problem.timeLimitMs })
      );
      verdict = {
        language,
        status: result.status,
        passedCount: result.passed,
        totalCount: result.total,
        autoScore: result.total ? Math.round((result.passed / result.total) * 100) : 0,
        results: {
          compileError: result.compileError ?? null,
          tests: result.tests.map((r, i) => ({ ...r, isSample: problem.testCases[i].isSample }))
        }
      };
    } else {
      verdict = { language: 'text', status: 'MANUAL_REVIEW', passedCount: 0, totalCount: 0, autoScore: null, results: null };
    }
  } catch (err) {
    await prisma.aISession.update({ where: { id: session.id }, data: { status: 'ACTIVE', endedAt: null } });
    throw err;
  }

  const solve = await prisma.solve.create({
    data: { ...verdict, code, userId: req.user.id, problemId: problem.id, aiSessionId: session.id }
  });
  res.status(201).json(solve);
});

router.get('/mine', async (req, res) => {
  const solves = await prisma.solve.findMany({
    where: { userId: req.user.id },
    orderBy: { submittedAt: 'desc' },
    select: {
      id: true, status: true, language: true, passedCount: true, totalCount: true, autoScore: true, submittedAt: true,
      problem: { select: { id: true, slug: true, title: true, type: true, difficulty: true } },
      evaluation: { select: { finalScore: true, aiUsageScore: true, solutionScore: true } },
      aiSession: { select: { totalMessages: true } }
    }
  });
  res.json(solves);
});

router.get('/:id', async (req, res) => {
  const solve = await prisma.solve.findUnique({
    where: { id: req.params.id },
    include: {
      user: { select: { id: true, username: true } },
      problem: { select: { id: true, slug: true, title: true, type: true, difficulty: true, category: true, description: true } },
      aiSession: { include: { logs: { orderBy: { timestamp: 'asc' } } } },
      evaluation: { include: { reviewer: { select: { username: true } } } }
    }
  });
  if (!solve) throw notFound('Submission not found');
  const staff = isStaff(req.user);
  if (solve.userId !== req.user.id && !staff) throw forbidden();

  if (!staff) {
    delete solve.autoReview;
    if (solve.results?.tests) {
      solve.results.tests = solve.results.tests.map((t) =>
        t.isSample ? t : { verdict: t.verdict, isSample: false }
      );
    }
  }
  res.json(solve);
});

export default router;
