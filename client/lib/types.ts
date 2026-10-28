export type Role = 'USER' | 'REVIEWER' | 'ADMIN';
export type Difficulty = 'EASY' | 'MEDIUM' | 'HARD';
export type Category = 'ALGORITHMS' | 'DATA_STRUCTURES' | 'SYSTEM_DESIGN' | 'WEB_DEV' | 'DEBUGGING' | 'OTHER';
export type ProblemType = 'CODE' | 'WRITTEN';
export type Language = 'cpp' | 'python' | 'javascript';
export type SolveStatus =
  | 'ACCEPTED' | 'WRONG_ANSWER' | 'COMPILE_ERROR' | 'RUNTIME_ERROR' | 'TIME_LIMIT' | 'MANUAL_REVIEW' | 'JUDGE_ERROR';
export type Verdict = 'PASSED' | 'WRONG_ANSWER' | 'RUNTIME_ERROR' | 'TIME_LIMIT' | 'RAN';

export interface User {
  id: string;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  role: Role;
}

export interface ProblemSummary {
  id: string;
  slug: string;
  title: string;
  difficulty: Difficulty;
  category: Category;
  type: ProblemType;
  published: boolean;
  tags: string[];
  submissions: number;
  solved: boolean;
}

export interface TestCase {
  id: string;
  input: string;
  expectedOutput: string;
  isSample: boolean;
  position: number;
}

export interface Problem extends Omit<ProblemSummary, 'submissions' | 'solved'> {
  description: string;
  constraints: string | null;
  starterCode: Partial<Record<Language, string>> | null;
  timeLimitMs: number;
  testCases: TestCase[];
  totalTests: number;
}

export interface AILog {
  id: string;
  role: 'USER' | 'ASSISTANT';
  content: string;
  source: 'PLATFORM' | 'IMPORTED';
  tool: string | null;
  timestamp: string;
}

export interface AISession {
  id: string;
  problemId: string;
  status: 'ACTIVE' | 'SUBMITTED' | 'ABANDONED';
  totalMessages: number;
  inputTokens: number;
  outputTokens: number;
  runCount: number;
  startedAt: string;
  logs: AILog[];
}

export interface TestResult {
  verdict: Verdict;
  exitCode?: number;
  stdout?: string;
  stderr?: string;
  input?: string;
  expectedOutput?: string | null;
  isSample?: boolean;
}

export interface RunResult {
  status: SolveStatus | 'RAN';
  compileError?: string;
  tests: TestResult[];
}

export interface Evaluation {
  id: string;
  solveId: string;
  solutionScore: number;
  aiEfficiency: number;
  aiLearning: number;
  aiTransparency: number;
  aiInnovation: number;
  aiUsageScore: number;
  finalScore: number;
  notes: string | null;
  updatedAt: string;
  reviewer?: { username: string };
}

export interface Submission {
  id: string;
  status: SolveStatus;
  language: string;
  code: string;
  passedCount: number;
  totalCount: number;
  autoScore: number | null;
  submittedAt: string;
  results: { compileError: string | null; tests: TestResult[] } | null;
  user: { id: string; username: string };
  problem: { id: string; slug: string; title: string; type: ProblemType; difficulty: Difficulty; category: Category; description: string };
  aiSession: AISession | null;
  evaluation: Evaluation | null;
}

export interface SubmissionSummary {
  id: string;
  status: SolveStatus;
  language: string;
  passedCount: number;
  totalCount: number;
  autoScore: number | null;
  submittedAt: string;
  problem: { id: string; slug: string; title: string; type: ProblemType; difficulty: Difficulty };
  evaluation: { finalScore: number; aiUsageScore: number; solutionScore: number } | null;
  aiSession: { totalMessages: number } | null;
}

export interface QueueItem {
  id: string;
  status: SolveStatus;
  passedCount: number;
  totalCount: number;
  autoScore: number | null;
  submittedAt: string;
  language: string;
  user: { id: string; username: string };
  problem: { id: string; title: string; type: ProblemType; difficulty: Difficulty; category: Category };
  aiSession: { totalMessages: number; runCount: number } | null;
  evaluation: { finalScore: number; reviewer: { username: string } } | null;
}

export type Rubric = { aiEfficiency: number; aiLearning: number; aiTransparency: number; aiInnovation: number };

export interface Analysis {
  metrics: {
    promptCount: number;
    avgPromptWords?: number;
    solutionRequests?: number;
    conceptualQuestions?: number;
    debuggingPrompts?: number;
    ownReasoningPrompts?: number;
    promptsWithCode?: number;
    explorationAreas?: string[];
    copyOverlapPct?: number;
    durationMinutes?: number;
    importedLogs: boolean;
  };
  suggested: Rubric;
  strengths: string[];
  concerns: string[];
  ai: (Rubric & { rationale: string; strengths: string[]; concerns: string[]; model: string; generatedAt: string }) | null;
}

export interface LeaderboardRow {
  rank: number;
  userId: string;
  username: string;
  problemsEvaluated: number;
  totalPoints: number;
  avgSolutionScore: number;
  avgAiUsageScore: number;
  avgFinalScore: number;
}

export interface MyStats {
  submissions: number;
  problemsAttempted: number;
  accepted: number;
  evaluated: number;
  avgSolutionScore: number;
  avgAiUsageScore: number;
  avgFinalScore: number;
  rubric: Record<keyof Rubric, number | null>;
  avgMessagesPerAttempt: number;
  timeline: { solveId: string; problem: string; date: string; solutionScore: number; aiUsageScore: number; finalScore: number }[];
}
