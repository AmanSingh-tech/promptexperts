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
