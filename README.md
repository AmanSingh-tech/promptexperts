# AILOGRACER

A practice platform where people solve problems **with AI** and are scored on two things:

- **Solution (40%)**: code problems are auto-judged on hidden tests in a sandbox; written problems (system design, web dev) are graded by a reviewer.
- **AI usage (60%)**: reviewers read the full AI transcript and score it 1–5 on four rubrics: efficiency, learning, transparency and innovation.

The AI conversation is captured in two ways: a built-in Claude assistant next to the editor, and an importer for transcripts from ChatGPT, Claude.ai, Gemini, Copilot, Cursor and others (labelled text or JSON exports).

## Features

| Area | What it does |
| --- | --- |
| Workspace | Problem statement, Monaco editor (Python, C++17, JavaScript) or Markdown answer editor, run on samples or custom input, Claude chat, transcript import |
| Judge | Each run executes in a throwaway Docker container: no network, 256 MB RAM, 1 CPU, 64 PIDs, read-only filesystem, per-test time limit |
| Attempts | Every attempt is an AI session. Submitting locks the code and the transcript together; "New attempt" discards the current conversation |
| Review | Queue of pending/reviewed submissions, automatic transcript analysis (prompt quality, why/how questions, solution requests, code copied from AI, strengths and concerns) with suggested scores, and an optional Claude second opinion with rationale |
| Scores | `AI usage = (mean rubric − 1) / 4 × 100`, `final = 0.4 × solution + 0.6 × AI usage` |
| Leaderboard | Three boards: **XP** (sum of best final score per challenge), **AI mastery** (average AI-usage score) and **Solvers** (average solution score). The average boards need at least 2 reviewed challenges. Filter by all time, the last 30 days or the last 7 days, and by category or difficulty. Your own position stays pinned even outside the top 100 |
| Player pages | Public `/players/:username` pages with level, tier, rank, skill stats, score history and cleared challenges. Code and AI transcripts stay private |
| Profile | Score trend, rubric averages and a tip for the weakest rubric |
| Admin | Create/edit problems with hidden and sample tests, starter code and tags; manage user roles (user, reviewer, admin); usage overview including Claude tokens |

## Design

The web app uses a dark, game-style look: the problem list is "the Arena", submissions are runs in a match history, and players earn XP (each player's best final score per challenge, added up). They level up every 100 XP and get a tier (Bronze to Diamond) from their average final score. Motion and interaction follow [Emil Kowalski's design-engineering skills](https://github.com/emilkowalski/skills): strong ease-out curves under 300 ms, `scale(0.97)` press feedback, hover effects only on devices with a real pointer, stagger only on first load, transform/opacity-only animation, `prefers-reduced-motion` support, Sonner toasts and NumberFlow score counters. It also includes the mobile fixes (`100dvh`, 16px inputs, no tap flash).

## Stack

- **API**: Node 18+, Express 5, Prisma 6, PostgreSQL 16, `@anthropic-ai/sdk` (`server/`)
- **Web**: Next.js 15 (App Router), React 19, Tailwind CSS 3, Monaco, Recharts, Sonner, NumberFlow (`client/`)
- **Sandbox**: Alpine image with g++, Python 3 and Node (`server/sandbox/`)

## Getting started

Requirements: Node 18.18+, Docker (with `docker-compose`).

```bash
npm run install:all
cp server/.env.example server/.env        # set JWT_SECRET; add ANTHROPIC_API_KEY for the AI features
cp client/.env.example client/.env.local
npm run setup                              # Postgres on :5435, sandbox image, migrations, seed data
npm run dev                                # API on :3001, web on :3000
```

Seeded accounts (change these outside local development):

| Username | Password | Role |
| --- | --- | --- |
| `admin` | `admin12345` | Admin |
| `reviewer` | `reviewer12345` | Reviewer |

To see a populated leaderboard, `npm --prefix server run db:seed:demo` adds eight `demo_*` players (password `demo12345`) with reviewed runs; `npm --prefix server run db:seed:demo -- --remove` deletes them.

The seed adds nine problems: six algorithm/data-structure problems with verified hidden tests, two system-design problems and one web-development problem.

### Claude configuration

The server uses the Anthropic SDK's standard credential lookup (`ANTHROPIC_API_KEY`, or an `ant auth login` profile). `CLAUDE_MODEL` defaults to `claude-opus-5-5`. Requests opt into server-side refusal fallback (`fallbacks: "default"`), so if the model declines a message the API retries on a fallback model. Without credentials, everything works except the chat and the Claude second opinion, which return a clear "not configured" error. Imported transcripts work without credentials.

`MAX_MESSAGES_PER_SESSION` (default 60) caps chat messages per attempt.

### Judge modes

`JUDGE_MODE=docker` (default) runs code in the sandbox image. `JUDGE_MODE=local` runs the same runner script directly on the host. It's faster for development but **not isolated**, so never use it with untrusted users.

## Tests

```bash
npm test
```

- `server/test/*.test.js`: scoring, transcript parser, AI-usage heuristics, output comparison
- `server/test/integration/`: end-to-end API flow against the real database and sandbox (register → session → import → run → submit → review → leaderboard, role checks, written problems, admin problem management)
- client type check

Expected outputs for the seeded problems are generated from reference solutions with `npm --prefix server run seed:expected`.

## API overview

| Method | Path | Who |
| --- | --- | --- |
| POST | `/api/auth/register`, `/api/auth/login`; GET `/api/auth/me` | anyone / signed in |
| GET | `/api/problems`, `/api/problems/:idOrSlug` | anyone (hidden tests only for staff) |
| POST/PATCH/DELETE | `/api/problems[/:id]` | admin |
| POST | `/api/sessions` (start or resume), `/api/sessions/:id/messages`, `/api/sessions/:id/import`, `/api/sessions/:id/abandon` | owner |
| POST | `/api/submissions/run`, `/api/submissions` | signed in |
| GET | `/api/submissions/mine`, `/api/submissions/:id` | owner or staff |
| GET | `/api/evaluations/queue`, `/api/evaluations/:solveId/analysis` | reviewer, admin |
| POST | `/api/evaluations/:solveId/ai-review` | reviewer, admin |
| PUT | `/api/evaluations/:solveId` | reviewer, admin (not on own submissions) |
| GET | `/api/leaderboard?board=xp\|ai\|solution&period=all\|month\|week`, `/api/players/:username` | anyone |
| GET | `/api/me/stats` | signed in |
| GET/PATCH | `/api/admin/overview`, `/api/admin/users`, `/api/admin/users/:id/role` | admin |

## Known limitations

- Auth tokens are stored in `localStorage` (simple, but exposed to any XSS). Move to httpOnly cookies before production.
- Rate limiting is in-process (one concurrent judge run per user, `MAX_CONCURRENT_JUDGES` overall); use a shared limiter when running several API instances.
- The automatic analysis is heuristic and English-centric; it suggests scores, and the reviewer decides.
- There is no browser extension yet; external tools are covered by transcript import.
