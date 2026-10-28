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

import { aggregateReviews } from '../lib/scoring.js';

const review = (e, l, t, i, solutionScore = null) => ({ aiEfficiency: e, aiLearning: l, aiTransparency: t, aiInnovation: i, solutionScore });

test('aggregate averages rubrics exactly before converting', () => {
  const agg = aggregateReviews([review(4, 4, 3, 3), review(5, 4, 3, 4)], { problemType: 'CODE', autoScore: 100 });
  // means 4.5, 4, 3, 3.5 -> avg 3.75 -> (2.75 / 4) * 100 = 68.75
  assert.equal(agg.aiUsageScore, 69);
  assert.equal(agg.solutionScore, 100);
  assert.equal(agg.finalScore, Math.round(40 + 69 * 0.6));
  assert.equal(agg.disagreement, false);
});

test('large gaps between reviewers are flagged', () => {
  assert.equal(aggregateReviews([review(5, 4, 4, 4), review(2, 4, 4, 4)], { problemType: 'CODE', autoScore: 100 }).disagreement, true);
  assert.equal(aggregateReviews([review(3, 3, 3, 3, 90), review(3, 3, 3, 3, 50)], { problemType: 'WRITTEN' }).disagreement, true);
  assert.equal(aggregateReviews([review(3, 3, 3, 3)], { problemType: 'CODE', autoScore: 50 }).disagreement, false);
});
