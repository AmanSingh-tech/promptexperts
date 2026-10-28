import type { Category, Difficulty, SolveStatus } from './types';

export const CATEGORY_LABELS: Record<Category, string> = {
  ALGORITHMS: 'Algorithms',
  DATA_STRUCTURES: 'Data structures',
  SYSTEM_DESIGN: 'System design',
  WEB_DEV: 'Web development',
  DEBUGGING: 'Debugging',
  OTHER: 'Other'
};

export const DIFFICULTY_LABELS: Record<Difficulty, string> = { EASY: 'Easy', MEDIUM: 'Medium', HARD: 'Hard' };

export const STATUS_LABELS: Record<SolveStatus | 'RAN', string> = {
  ACCEPTED: 'Accepted',
  WRONG_ANSWER: 'Wrong answer',
  COMPILE_ERROR: 'Compile error',
  RUNTIME_ERROR: 'Runtime error',
  TIME_LIMIT: 'Time limit exceeded',
  MANUAL_REVIEW: 'Awaiting review',
  JUDGE_ERROR: 'Judge error',
  RAN: 'Ran'
};

export const LANGUAGE_LABELS: Record<string, string> = { cpp: 'C++17', python: 'Python 3', javascript: 'JavaScript (Node)', text: 'Written answer' };

export const RUBRIC = [
  { key: 'aiEfficiency', label: 'Efficiency', hint: 'Quality and specificity of the questions asked' },
  { key: 'aiLearning', label: 'Learning', hint: 'Understood and built on suggestions instead of copying' },
  { key: 'aiTransparency', label: 'Transparency', hint: 'Own reasoning and process are visible' },
  { key: 'aiInnovation', label: 'Innovation', hint: 'Creative, high-leverage use (testing, comparing, reviewing)' }
] as const;

export function formatDate(iso: string) {
  return new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}
