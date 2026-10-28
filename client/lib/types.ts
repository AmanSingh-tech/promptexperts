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

export interface SessionEvent {
  id: string;
  type: 'RUN' | 'SUBMIT' | 'PASTE';
  language: string | null;
  code: string | null;
  verdict: string | null;
  lines: number | null;
  chars: number | null;
  createdAt: string;
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
  events?: SessionEvent[];
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
  status: 'PENDING' | 'DISPUTED' | 'FINAL';
  reviewCount: number;
  updatedAt: string;
  reviewer?: { username: string };
}

export interface Review extends Rubric {
  id: string;
  solutionScore: number | null;
  notes: string;
  updatedAt: string;
  reviewerId?: string;
  reviewer: { id?: string; username: string };
}

export interface ReviewsResponse {
  requiredReviews: number;
  count: number;
  mine: Review | null;
  hidden: boolean;
  reviews: Review[];
  evaluation: Evaluation | null;
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
  reviews: Review[];
  reviewProgress: { count: number; required: number };
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
  evaluation: { finalScore: number; status: Evaluation['status']; reviewCount: number; reviewer: { username: string } } | null;
  reviewCount: number;
  reviewedByMe: boolean;
}

export interface QueueResponse {
  requiredReviews: number;
  items: QueueItem[];
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
    process?: { runs: number; pastes: number; largePastes: number; largestPasteLines: number; firstRunCompletenessPct: number | null };
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
  totalPoints: number;
  rank: number | null;
  submissions: number;
  problemsAttempted: number;
  accepted: number;
  evaluated: number;
  avgSolutionScore: number;
  avgAiUsageScore: number;
  avgFinalScore: number;
  rubric: Record<keyof Rubric, number | null>;
  avgMessagesPerAttempt: number;
  cleared: { slug: string; title: string; difficulty: Difficulty; bestFinalScore: number | null }[];
  timeline: { solveId?: string; problem: string; slug: string; date: string; solutionScore: number; aiUsageScore: number; finalScore: number }[];
}

export interface PublicPlayer extends MyStats {
  player: { username: string; firstName: string; role: Role; joinedAt: string };
}

export type Board = 'xp' | 'ai' | 'solution';
export type Period = 'week' | 'month' | 'all';

export interface LeaderboardResponse {
  board: Board;
  period: Period;
  minForAverage: number;
  total: number;
  rows: LeaderboardRow[];
  me: LeaderboardRow | null;
}

export type ContestState = 'UPCOMING' | 'LIVE' | 'ENDED';

export interface ContestSummary {
  id: string;
  slug: string;
  title: string;
  description: string;
  startsAt: string;
  endsAt: string;
  published: boolean;
  state: ContestState;
  entrants: number;
  problemCount: number;
  joined: boolean;
}

export interface StandingRow {
  rank: number;
  userId: string;
  username: string;
  total: number;
  solved: number;
  pending: number;
  lastImprovementAt: string | null;
  cells: Record<string, { best: number | null; pending: number }>;
}

export interface ContestDetail extends Omit<ContestSummary, 'problemCount'> {
  problemCount: number;
  serverTime: string;
  problems: { id: string; slug: string; title: string; difficulty: Difficulty; category: Category; type: ProblemType }[];
  standings: StandingRow[];
}
