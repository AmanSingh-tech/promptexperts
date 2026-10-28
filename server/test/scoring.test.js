import { test } from 'node:test';
import assert from 'node:assert/strict';
import { aiUsageScore, finalScore } from '../lib/scoring.js';

test('rubric of all 1s is 0 and all 5s is 100', () => {
  assert.equal(aiUsageScore({ aiEfficiency: 1, aiLearning: 1, aiTransparency: 1, aiInnovation: 1 }), 0);
  assert.equal(aiUsageScore({ aiEfficiency: 5, aiLearning: 5, aiTransparency: 5, aiInnovation: 5 }), 100);
  assert.equal(aiUsageScore({ aiEfficiency: 3, aiLearning: 3, aiTransparency: 3, aiInnovation: 3 }), 50);
});

test('final score weights solution 40% and AI usage 60%', () => {
  assert.equal(finalScore(100, 0), 40);
  assert.equal(finalScore(0, 100), 60);
  assert.equal(finalScore(80, 50), 62);
});
