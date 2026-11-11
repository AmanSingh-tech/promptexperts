# AILOGRACER

A practice platform where people solve problems **with AI** and are scored on two things:

- **Solution (40%)**: code problems are auto-judged on hidden tests in a sandbox; written problems (system design, web dev) are graded by a reviewer.
- **AI usage (60%)**: reviewers read the full AI transcript and score it 1–5 on four rubrics: efficiency, learning, transparency and innovation.

The AI conversation is captured in three ways: a built-in Claude assistant next to the editor, an importer for transcripts from ChatGPT, Claude.ai, Gemini, Copilot, Cursor and others (labelled text or JSON exports), and a [Chrome extension](extension/README.md) that sends the open ChatGPT, Claude or Gemini conversation to an attempt.

## Features

| Area | What it does |
| --- | --- |
| Workspace | Problem statement, Monaco editor (Python, C++17, JavaScript) or Markdown answer editor, run on samples or custom input, Claude chat, transcript import |
| Judge | Each run executes in a throwaway Docker container: no network, 256 MB RAM, 1 CPU, 64 PIDs, read-only filesystem, per-test time limit. Each player gets one run at a time, with `MAX_CONCURRENT_JUDGES` (default 4) across all API instances |
| Attempts | Every attempt is an AI session. Submitting locks the code and the transcript together; "New attempt" discards the current conversation |
| Review | Queue with **To review / Disputed / Final** tabs. Reviewers get automatic transcript analysis with suggested scores, a code-history timeline with diffs (it flags large pastes), and an optional Claude second opinion. A rubric guide gives anchored examples for scores 1, 3 and 5 (`/review/guide`). With `REQUIRED_REVIEWS` set above 1, each submission needs that many independent reviews. Reviewers can't see each other's scores until they submit their own. If reviewers disagree (a gap of 2+ rubric points, 25+ solution points or 15+ final points), the result is **disputed** until an admin accepts it or adds a deciding review. Only final results reach the player and the leaderboard |
| Scores | `AI usage = (mean rubric − 1) / 4 × 100`, `final = 0.4 × solution + 0.6 × AI usage` |
| Leaderboard | Three boards: **XP** (sum of best final score per challenge), **AI mastery** (average AI-usage score) and **Solvers** (average solution score). The average boards need at least 2 reviewed challenges. Filter by season, all time, the last 30 days or the last 7 days, and by category or difficulty. Your own position stays pinned even outside the top 100 |
| Contests | Timed events with a start and end, an ordered set of challenges, and entrants. Unpublished challenges in a contest stay hidden until it starts. A submission counts only when it's made during the contest by someone who joined, on one of its challenges. Standings add up each player's best reviewed score per challenge, show pending reviews separately, and break ties by who reached their total first. Admins create and edit contests in **Admin → Contests** |
| Seasons | Admins set named, non-overlapping date ranges in **Admin → Seasons**. Each season has its own XP board, and the leaderboard opens on the live one. XP, levels and tiers are lifetime and never reset. The top three on an ended season's board with more than 3 players get a **Season medal**, once every review of a submission made during the season is final |
| Daily challenge | One featured challenge per UTC day on the Practice page, cycling through every published challenge before repeating. It gives no extra XP |
| Streaks | Count consecutive UTC days with a passing submission or a written answer sent for review. A repeat of a challenge only counts on the day it's the daily. Written answers count straight away but drop out if the reviewer gives them a solution score under 50. A streak ends after a full day is missed |
| Achievements | Eleven badges for reviews, scores, streaks, daily challenges, contest podiums and season medals, shown on player pages. Earned dates come from the player's history, unreviewed written answers don't count towards them, and once earned they stay, even if a re-review lowers the score |
| Level-up updates | After a review goes final, a dialog shows XP gained plus any new level, tier, rank and achievements since the player last dismissed it. It waits until they leave the problem workspace. Accounts created before this feature start from their current progress, so their history isn't replayed as one update |
| Player pages | Public `/players/:username` pages with level, tier, rank, streak, achievements, skill stats, score history and cleared challenges. Code and AI transcripts stay private |
| Profile | Score trend, rubric averages and a tip for the weakest rubric |
| Admin | Create/edit problems with hidden and sample tests, starter code and tags; manage user roles (user, reviewer, admin); usage overview including Claude tokens |

## Design

The web app follows the look of developer practice sites such as HackerRank: a dark navy top bar over light grey pages, white square-cornered cards, one green accent and sentence-case text. The Practice page lists challenges as rows with a filter sidebar, and the workspace keeps the problem, editor and AI chat side by side with **Run Code** and **Submit Code** under the editor.

Players still earn XP (each player's best final score per challenge, added up), level up every 100 XP and get a tier (Bronze to Diamond) from their average final score. Motion stays restrained: strong ease-out curves under 300 ms, `scale(0.97)` press feedback, hover effects only on devices with a real pointer, transform/opacity-only animation, `prefers-reduced-motion` support, Sonner toasts and NumberFlow score counters. It also includes the mobile fixes (`100dvh`, 16px inputs, no tap flash). Colour shades that carry white text keep at least 4.5:1 contrast.

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

### Accounts and security

- Sessions are httpOnly, `SameSite=Lax` cookies. Cookie-authenticated writes must send `X-Requested-With: ailogracer`, which the web app does automatically. API clients can use the `token` returned by login as a Bearer token instead.
- The web app proxies `/api/*` to the API (`API_ORIGIN`), so the cookie belongs to the site itself and no CORS is needed in production.
- Sign-in is rate-limited (10 failures per 15 minutes per IP and username). Limits are stored in Postgres, so they hold across API instances. Password reset links expire after 30 minutes and work once. They are emailed through `SMTP_URL`, or printed to the API log when that isn't set. Admins can generate reset links from **Admin → Users**.
- Changing or resetting a password, or choosing **Sign out everywhere**, revokes every other session.

### Production deployment

```bash
cp .env.production.example .env.production   # fill in secrets
docker-compose -f docker-compose.prod.yml --env-file .env.production up -d --build
docker-compose -f docker-compose.prod.yml exec api node prisma/seed.js   # first run only
```

This builds the judge sandbox image, runs migrations on start, and serves the web app on `WEB_PORT` (default 3000). Put an HTTPS reverse proxy in front of it. The API container mounts the host Docker socket to start sandboxes, plus a host directory at the same path (`JUDGE_DIR`, default `/var/lib/ailogracer-judge`). Anyone who compromises the API container controls the host's Docker daemon, so run the stack on a dedicated host or VM.

CI (`.github/workflows/ci.yml`) runs migrations, seeds, the unit and API tests, and the client type check and build on every push and pull request.

### Judge modes

`JUDGE_MODE=docker` (default) runs code in the sandbox image. `JUDGE_MODE=local` runs the same runner script directly on the host. It's faster for development but **not isolated**, so never use it with untrusted users.

## Tests

```bash
npm test
```

- `server/test/*.test.js`: scoring, transcript parser, AI-usage heuristics, output comparison, streaks and achievements
- `server/test/integration/`: end-to-end API flow against the real database and sandbox (register → session → import → run → submit → review → leaderboard, role checks, written problems, admin problem management), plus seasons, shared rate limits, judge slots and the extension's attempt list
- client type check

Expected outputs for the seeded problems are generated from reference solutions with `npm --prefix server run seed:expected`.

## API overview

| Method | Path | Who |
| --- | --- | --- |
| POST | `/api/auth/register`, `/api/auth/login`; GET `/api/auth/me` | anyone / signed in |
| GET | `/api/problems`, `/api/problems/:idOrSlug` | anyone (hidden tests only for staff) |
| POST/PATCH/DELETE | `/api/problems[/:id]` | admin |
| GET | `/api/sessions/active` | signed in |
| POST | `/api/sessions` (start or resume), `/api/sessions/:id/messages`, `/api/sessions/:id/import`, `/api/sessions/:id/abandon` | owner |
| POST | `/api/submissions/run`, `/api/submissions` | signed in |
| GET | `/api/submissions/mine`, `/api/submissions/:id` | owner or staff |
| GET | `/api/evaluations/queue`, `/api/evaluations/:solveId/analysis` | reviewer, admin |
| POST | `/api/evaluations/:solveId/ai-review` | reviewer, admin |
| PUT | `/api/evaluations/:solveId` | reviewer, admin (not on own submissions) |
| GET | `/api/leaderboard?board=xp\|ai\|solution&period=all\|month\|week` (or `&season=<slug>`), `/api/players/:username` | anyone |
| GET | `/api/me/stats`, `/api/me/progress`; POST `/api/me/progress/seen` | signed in |
| GET | `/api/daily` | anyone (streak and completion when signed in) |
| GET | `/api/contests`, `/api/contests/:slug` (details plus standings) | anyone |
| POST | `/api/contests/:slug/join`; `contestId` on `POST /api/submissions` | signed in |
| POST/PATCH/DELETE | `/api/contests[/:id]` | admin |
| GET | `/api/seasons` | anyone |
| POST/PATCH/DELETE | `/api/seasons[/:id]` | admin |
| GET/PATCH | `/api/admin/overview`, `/api/admin/users`, `/api/admin/users/:id/role` | admin |

## Known limitations

- The automatic analysis is heuristic and English-centric; it suggests scores, and the reviewer decides.
- The Chrome extension reads each site's page structure, which can change without notice. Its selectors have only been tested against sample pages, so check them on the live sites. Transcript import and file upload remain the fallback.
- The Claude chat and AI second opinion have only been exercised against a stubbed API in tests; check them once with a real `ANTHROPIC_API_KEY`.

## Contributing

Contributions are welcome. This section covers the local development workflow.

### Prerequisites

- Node 18.18+
- Docker with `docker-compose`, which runs Postgres (port 5435) and the judge sandbox image

### Install and run locally

```bash
# 1. Install the root, server/ and client/ dependencies
npm run install:all

# 2. Configure the API: set JWT_SECRET; ANTHROPIC_API_KEY is optional and only needed for the AI features
cp server/.env.example server/.env

# 3. Configure the web app
cp client/.env.example client/.env.local

# 4. Start the db container, build the ailogracer-sandbox image, apply migrations and seed data
npm run setup

# 5. Start the API on :3001 (node --watch) and the web app on :3000
npm run dev
```

Sign in with the seeded accounts listed under [Getting started](#getting-started). To add leaderboard data, you can also run `npm --prefix server run db:seed:demo`.

### Making changes

- For schema changes, create a migration with `npm --prefix server run db:migrate` (`prisma migrate dev`).
- `JUDGE_MODE=local` runs the judge faster during development but is **not isolated**. See [Judge modes](#judge-modes).
- Add or update tests next to the existing ones: `server/test/*.test.js` for unit tests, `server/test/integration/` for API tests.

### Before opening a pull request

- Run `npm test`. It runs the unit tests, the API tests and the client type check. The API tests need the database from `npm run setup` to be running.
- CI (`.github/workflows/ci.yml`) runs the same checks on every push and pull request.
- Keep pull requests small and focused.
