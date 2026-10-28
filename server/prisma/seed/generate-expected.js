// Regenerates expected.json by running each problem's reference solution in the judge sandbox.
import { writeFile } from 'node:fs/promises';
import { problems } from './problems.js';
import { judge } from '../../lib/judge.js';

const expected = {};
for (const p of problems.filter((x) => x.reference)) {
  const result = await judge({ language: 'python', code: p.reference, tests: p.tests.map((t) => ({ input: t.input, expectedOutput: '' })), timeLimitMs: 10000 });
  const bad = result.tests.find((t) => t.exitCode !== 0);
  if (result.status === 'COMPILE_ERROR' || result.status === 'JUDGE_ERROR' || bad) {
    throw new Error(`Reference for ${p.slug} failed: ${result.compileError || bad?.stderr}`);
  }
  expected[p.slug] = result.tests.map((t) => t.stdout.trim());
  console.log(p.slug, expected[p.slug].map((o) => o.slice(0, 30)));
}
await writeFile(new URL('./expected.json', import.meta.url), JSON.stringify(expected, null, 2) + '\n');
