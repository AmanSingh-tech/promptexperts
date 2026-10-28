import { test } from 'node:test';
import assert from 'node:assert/strict';
import { analyzeSession, copyOverlap } from '../lib/ai-metrics.js';

const log = (role, content, i = 0) => ({ role, content, source: 'PLATFORM', timestamp: new Date(1_700_000_000_000 + i * 60000) });

test('no AI usage gets minimum suggestions and a flag', () => {
  const r = analyzeSession({ logs: [], finalCode: 'x', problemType: 'CODE' });
  assert.deepEqual(Object.values(r.suggested), [1, 1, 1, 1]);
  assert.match(r.concerns[0], /No AI interaction/);
});

test('copy-paste behaviour scores lower on learning than thoughtful use', () => {
  const aiCode = '```python\nn,t=map(int,input().split())\na=list(map(int,input().split()))\nseen={}\nfor j,x in enumerate(a):\n    if t-x in seen:\n        print(seen[t-x],j)\n    seen[x]=j\n```';
  const finalCode = 'n,t=map(int,input().split())\na=list(map(int,input().split()))\nseen={}\nfor j,x in enumerate(a):\n    if t-x in seen:\n        print(seen[t-x],j)\n    seen[x]=j';

  const copier = analyzeSession({
    logs: [log('USER', 'give me the full code'), log('ASSISTANT', aiCode, 1)],
    finalCode,
    problemType: 'CODE'
  });
  const learner = analyzeSession({
    logs: [
      log('USER', 'I think a brute force O(n^2) works, but why would a hash map be faster here? Explain the intuition.'),
      log('ASSISTANT', 'Because lookups are O(1)...', 1),
      log('USER', 'My approach: store each value index as I scan. What edge cases should I test, like duplicates?', 2),
      log('ASSISTANT', 'Test duplicates like [3,3]...', 3)
    ],
    finalCode: 'def solve():\n    pass',
    problemType: 'CODE'
  });

  assert.ok(copier.metrics.copyOverlapPct >= 90);
  assert.equal(copier.metrics.solutionRequests, 1);
  assert.ok(learner.suggested.aiLearning > copier.suggested.aiLearning);
  assert.ok(learner.suggested.aiTransparency > copier.suggested.aiTransparency);
  assert.ok(learner.metrics.explorationAreas.includes('testing'));
});

test('copyOverlap ignores braces and comments', () => {
  assert.equal(copyOverlap('}\n// note\n', ['```\n}\n// note\n```']), 0);
});

test('process analysis flags large pastes and code that appeared complete at once', () => {
  const finalCode = 'a = read()\nb = parse(a)\nprint(solve(b))\nexit(0)';
  const r = analyzeSession({
    logs: [log('USER', 'why is this approach linear?')],
    events: [
      { type: 'PASTE', lines: 40, chars: 900 },
      { type: 'RUN', code: finalCode }
    ],
    finalCode,
    problemType: 'CODE'
  });
  assert.equal(r.metrics.process.largePastes, 1);
  assert.equal(r.metrics.process.firstRunCompletenessPct, 100);
  assert.ok(r.concerns.some((c) => /large block/.test(c)));
  assert.ok(r.concerns.some((c) => /first snapshot/.test(c)));
});

test('incremental work across runs counts as a strength', () => {
  const finalCode = 'line_one = 1\nline_two = 2\nline_three = 3\nline_four = 4\nprint(line_one)';
  const r = analyzeSession({
    logs: [log('USER', 'how should I structure this?')],
    events: [
      { type: 'RUN', code: 'line_one = 1' },
      { type: 'RUN', code: 'line_one = 1\nline_two = 2' },
      { type: 'RUN', code: finalCode }
    ],
    finalCode,
    problemType: 'CODE'
  });
  assert.ok(r.strengths.some((s) => /Built the solution up over 3 runs/.test(s)));
});
