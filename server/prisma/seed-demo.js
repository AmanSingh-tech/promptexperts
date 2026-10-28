// Optional demo data: players named demo_* with reviewed runs, so the leaderboard has something to show.
// Remove it again with: node prisma/seed-demo.js --remove
import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { prisma } from '../lib/prisma.js';
import { aiUsageScore, finalScore } from '../lib/scoring.js';

const NAMES = ['demo_nova', 'demo_quark', 'demo_pixel', 'demo_vector', 'demo_glitch', 'demo_cipher', 'demo_echo', 'demo_rune'];

let seed = 7;
const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
const pick = (n, max) => Math.max(1, Math.min(max, Math.round(n)));

async function remove() {
  const { count } = await prisma.user.deleteMany({ where: { username: { startsWith: 'demo_' } } });
  console.log(`Removed ${count} demo players.`);
}

async function main() {
  if (process.argv.includes('--remove')) return remove();
  const reviewer = await prisma.user.findUnique({ where: { username: 'reviewer' } });
  if (!reviewer) throw new Error('Run the main seed first (npm run db:seed).');
  const problems = await prisma.problem.findMany({ where: { published: true } });
  const password = await bcrypt.hash('demo12345', 10);

  for (const [i, username] of NAMES.entries()) {
    if (await prisma.user.findUnique({ where: { username } })) continue;
    const user = await prisma.user.create({
      data: { username, email: `${username}@ailogracer.local`, password, firstName: username.slice(5).replace(/^./, (c) => c.toUpperCase()) }
    });
    const skill = 1.5 + rand() * 3.5;
    const count = 1 + Math.floor(rand() * Math.min(6, problems.length));
    const chosen = [...problems].sort(() => rand() - 0.5).slice(0, count);
    for (const problem of chosen) {
      const submittedAt = new Date(Date.now() - Math.floor(rand() * 60) * 86400000 - i * 3600000);
      const session = await prisma.aISession.create({
        data: {
          userId: user.id, problemId: problem.id, status: 'SUBMITTED', totalMessages: 2, startedAt: submittedAt, endedAt: submittedAt,
          logs: {
            create: [
              { role: 'USER', content: `I think a ${problem.category === 'SYSTEM_DESIGN' ? 'cache in front of the database' : 'single pass with a hash map'} works here. What edge cases am I missing?`, timestamp: submittedAt },
              { role: 'ASSISTANT', content: 'Consider empty input, duplicates and the largest constraints.', timestamp: submittedAt }
            ]
          }
        }
      });
      const autoScore = problem.type === 'CODE' ? (rand() < 0.75 ? 100 : 50 + Math.floor(rand() * 4) * 10) : null;
      const solve = await prisma.solve.create({
        data: {
          userId: user.id, problemId: problem.id, aiSessionId: session.id, submittedAt,
          language: problem.type === 'CODE' ? 'python' : 'text', code: '# demo submission',
          status: problem.type === 'CODE' ? (autoScore === 100 ? 'ACCEPTED' : 'WRONG_ANSWER') : 'MANUAL_REVIEW',
          passedCount: autoScore === 100 ? 5 : 3, totalCount: problem.type === 'CODE' ? 5 : 0, autoScore
        }
      });
      const rubric = {
        aiEfficiency: pick(skill + rand() - 0.5, 5),
        aiLearning: pick(skill + rand() - 0.5, 5),
        aiTransparency: pick(skill + rand() - 0.7, 5),
        aiInnovation: pick(skill + rand() - 1, 5)
      };
      const solutionScore = autoScore ?? pick(40 + skill * 12 + rand() * 10, 100);
      const usage = aiUsageScore(rubric);
      await prisma.evaluation.create({
        data: { ...rubric, solveId: solve.id, reviewerId: reviewer.id, solutionScore, aiUsageScore: usage, finalScore: finalScore(solutionScore, usage), notes: 'Demo review.' }
      });
    }
    console.log(`+ ${username} (${count} reviewed ${count === 1 ? "run" : "runs"})`);
  }
  console.log('Demo players use password demo12345. Remove them with: npm run db:seed:demo -- --remove');
}

main().finally(() => prisma.$disconnect());
