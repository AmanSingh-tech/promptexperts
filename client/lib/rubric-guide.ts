import type { Rubric } from './types';

export interface RubricLevel {
  score: 1 | 3 | 5;
  summary: string;
  example: string;
}

export interface RubricGuideEntry {
  key: keyof Rubric;
  label: string;
  question: string;
  levels: RubricLevel[];
  watchFor: string[];
}

// Anchors for consistent scoring: reviewers pick 2 or 4 when behaviour sits between two anchors.
export const RUBRIC_GUIDE: RubricGuideEntry[] = [
  {
    key: 'aiEfficiency',
    label: 'Efficiency',
    question: 'Did the player ask well-scoped questions that gave the AI what it needed?',
    levels: [
      { score: 1, summary: 'Vague or answer-seeking prompts with no context.', example: '"solve two sum" · "give me the code" · "fix it"' },
      { score: 3, summary: 'Clear questions, but context is missing or prompts are repeated without new information.', example: '"How do I make this faster?" with no code or constraint mentioned.' },
      { score: 5, summary: 'Each prompt states the goal, what was tried and the exact gap, so the AI can answer in one go.', example: '"My O(n²) loop times out at n=10⁵. I think a hash map works, but how do I handle duplicates like [3,3]?"' }
    ],
    watchFor: ['Many very short prompts', 'The same question re-asked after an unhelpful answer', 'Pasting the whole problem statement with no question']
  },
  {
    key: 'aiLearning',
    label: 'Learning',
    question: 'Did the player understand and build on the suggestions rather than copy them?',
    levels: [
      { score: 1, summary: 'Final answer is the AI output pasted in, with no sign it was understood.', example: 'High copied-code percentage, one large paste, no follow-up questions.' },
      { score: 3, summary: 'Some adaptation or follow-up, but key parts were taken as given.', example: 'Asked one "why" question, then pasted the suggested solution with renamed variables.' },
      { score: 5, summary: 'Asked why, challenged answers, and wrote their own version of the idea.', example: '"Why is sorting worse here?" followed by a solution structured differently from the AI\'s.' }
    ],
    watchFor: ['Copied-code percentage above 40%', 'First code snapshot already matching the final code', 'Follow-ups that show a misconception was corrected']
  },
  {
    key: 'aiTransparency',
    label: 'Transparency',
    question: 'Can you follow the player\'s own reasoning from the transcript and history?',
    levels: [
      { score: 1, summary: 'Only requests; no sign of the player\'s own thinking.', example: 'Every message is an instruction to the AI.' },
      { score: 3, summary: 'Some reasoning is visible, but large decisions happen off-screen.', example: '"I tried a set" appears once; the final approach is never discussed.' },
      { score: 5, summary: 'The player narrates hypotheses, attempts and decisions throughout.', example: '"I think…", "I tried X and it failed on Y", "I\'ll go with Z because…"' }
    ],
    watchFor: ['Imported transcripts that look trimmed or out of order', 'Gaps between the transcript and the code history']
  },
  {
    key: 'aiInnovation',
    label: 'Innovation',
    question: 'Did the player use AI for more than producing an answer?',
    levels: [
      { score: 1, summary: 'AI used only to get or fix the answer.', example: 'Single request for a solution.' },
      { score: 3, summary: 'One extra use, such as asking for test cases or a complexity check.', example: '"What edge cases should I test?"' },
      { score: 5, summary: 'Several high-leverage uses: generating tests, comparing approaches, reviewing their own code, exploring trade-offs.', example: 'Asked for adversarial inputs, compared two designs, then had the AI critique the final version.' }
    ],
    watchFor: ['"Used AI for" areas in the automatic analysis', 'Runs with custom input after an AI-suggested edge case']
  }
];
