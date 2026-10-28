export const SOLUTION_WEIGHT = 0.4;
export const AI_USAGE_WEIGHT = 0.6;
export const RUBRIC_KEYS = ['aiEfficiency', 'aiLearning', 'aiTransparency', 'aiInnovation'];

export function aiUsageScore(rubric) {
  const sum = RUBRIC_KEYS.reduce((acc, k) => acc + rubric[k], 0);
  return Math.round(((sum / RUBRIC_KEYS.length - 1) / 4) * 100);
}

export function finalScore(solutionScore, usageScore) {
  return Math.round(solutionScore * SOLUTION_WEIGHT + usageScore * AI_USAGE_WEIGHT);
}

export const DISAGREEMENT = { rubric: 2, solution: 25, final: 15 };

export function requiredReviews() {
  const n = Number(process.env.REQUIRED_REVIEWS || 1);
  return Number.isInteger(n) && n >= 1 ? n : 1;
}

const spread = (xs) => (xs.length ? Math.max(...xs) - Math.min(...xs) : 0);
const mean = (xs) => xs.reduce((a, b) => a + b, 0) / xs.length;

// Combines individual reviews into the score the player sees.
export function aggregateReviews(reviews, { problemType, autoScore }) {
  const means = Object.fromEntries(RUBRIC_KEYS.map((k) => [k, mean(reviews.map((r) => r[k]))]));
  const reviewSolution = (r) => (problemType === 'CODE' ? autoScore ?? 0 : r.solutionScore ?? 0);
  const solutionScore = Math.round(mean(reviews.map(reviewSolution)));
  const usage = aiUsageScore(means);
  const perReviewFinal = reviews.map((r) => finalScore(reviewSolution(r), aiUsageScore(r)));

  const spreads = {
    ...Object.fromEntries(RUBRIC_KEYS.map((k) => [k, spread(reviews.map((r) => r[k]))])),
    solution: spread(reviews.map(reviewSolution)),
    final: spread(perReviewFinal)
  };
  const disagreement =
    reviews.length > 1 &&
    (RUBRIC_KEYS.some((k) => spreads[k] >= DISAGREEMENT.rubric) ||
      spreads.solution >= DISAGREEMENT.solution ||
      spreads.final >= DISAGREEMENT.final);

  return {
    rubric: Object.fromEntries(RUBRIC_KEYS.map((k) => [k, Math.round(means[k])])),
    solutionScore,
    aiUsageScore: usage,
    finalScore: finalScore(solutionScore, usage),
    disagreement,
    spreads
  };
}
