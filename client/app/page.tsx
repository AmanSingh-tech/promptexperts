import Link from 'next/link';
import { Brain, Eye, Lightbulb, Target, Swords, MessagesSquare, ClipboardCheck, Trophy } from 'lucide-react';
import { LiveStats, TopPlayers } from '@/components/LandingLive';

const steps = [
  { icon: Swords, title: 'Pick a challenge', body: 'Algorithms, data structures, system design and web dev. Code is judged on hidden tests; written answers are graded by reviewers.' },
  { icon: MessagesSquare, title: 'Team up with AI', body: 'Chat with Claude beside your editor, or import the conversation you had in ChatGPT, Copilot or any other tool.' },
  { icon: ClipboardCheck, title: 'Get reviewed', body: 'Reviewers read your transcript and score how you used AI, helped by automatic metrics and an AI second opinion.' },
  { icon: Trophy, title: 'Climb the ranks', body: 'Earn XP from your best score on each challenge, level up, and move from Bronze to Diamond.' }
];

const stats = [
  { icon: Target, name: 'Efficiency', body: 'Sharp, well-scoped prompts with context, not "just give me the code".' },
  { icon: Brain, name: 'Learning', body: 'You understand and adapt suggestions instead of pasting them.' },
  { icon: Eye, name: 'Transparency', body: 'Your own reasoning shows up throughout the conversation.' },
  { icon: Lightbulb, name: 'Innovation', body: 'You use AI to test edge cases, compare approaches and review your work.' }
];

export default function Home() {
  return (
    <main className="overflow-x-clip">
      <section className="relative isolate">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 bottom-0 -z-10 h-[55%] overflow-hidden [perspective:420px]"
          style={{
            maskImage: 'linear-gradient(to bottom, transparent 0%, rgb(0 0 0 / 0.08) 12%, rgb(0 0 0 / 0.35) 30%, rgb(0 0 0 / 0.6) 50%, rgb(0 0 0 / 0.35) 75%, transparent 100%)',
            WebkitMaskImage: 'linear-gradient(to bottom, transparent 0%, rgb(0 0 0 / 0.08) 12%, rgb(0 0 0 / 0.35) 30%, rgb(0 0 0 / 0.6) 50%, rgb(0 0 0 / 0.35) 75%, transparent 100%)'
          }}
        >
          <div className="absolute inset-x-[-50%] top-0 h-[200%] origin-top [transform:rotateX(62deg)]">
            <div className="absolute inset-0 -top-12 animate-grid-scroll bg-[linear-gradient(rgb(63_227_242_/_0.35)_1px,transparent_1px),linear-gradient(90deg,rgb(130_87_255_/_0.35)_1px,transparent_1px)] bg-[size:48px_48px]" />
          </div>
        </div>

        <div className="mx-auto max-w-5xl px-4 pb-24 pt-20 text-center sm:pt-28">
          <p className="inline-flex animate-rise items-center gap-2 rounded-full border border-neon-400/30 bg-neon-400/10 px-3 py-1 font-display text-xs font-semibold uppercase tracking-[0.2em] text-neon-300">
            <span className="h-1.5 w-1.5 rounded-full bg-xp-400 shadow-[0_0_8px_rgb(189_240_67)]" /> Season 1 · Arena open
          </p>
          <h1 className="mt-6 animate-rise font-display text-5xl font-bold uppercase leading-[0.95] tracking-tight text-white [animation-delay:60ms] sm:text-7xl">
            Solve it. <span className="text-glow bg-gradient-to-r from-brand-300 via-brand-400 to-neon-400 bg-clip-text text-transparent">Prove how.</span>
          </h1>
          <p className="mx-auto mt-6 max-w-[60ch] animate-rise text-lg text-slate-300 [animation-delay:120ms]">
            The arena where getting the answer is only 40% of the score. The other 60% is how well you used AI to get there.
          </p>
          <div className="mt-9 flex animate-rise flex-wrap justify-center gap-3 [animation-delay:180ms]">
            <Link href="/problems" className="press chamfer bg-gradient-to-r from-brand-600 to-brand-500 px-7 py-3 font-display text-base font-bold uppercase tracking-wider text-white shadow-[0_0_32px_-6px_rgb(130_87_255_/_0.8)] hover:from-brand-500 hover:to-brand-400">
              Enter the arena
            </Link>
            <Link href="/leaderboard" className="press chamfer border border-slate-700 bg-slate-900/70 px-7 py-3 font-display text-base font-bold uppercase tracking-wider text-slate-100 hover:border-neon-400/50 hover:text-white">
              View rankings
            </Link>
          </div>
          <div className="mx-auto mt-16 max-w-3xl animate-rise [animation-delay:240ms]">
            <LiveStats />
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16">
        <p className="font-display text-xs font-semibold uppercase tracking-[0.2em] text-neon-400">How a match works</p>
        <h2 className="mt-2 font-display text-3xl font-bold uppercase text-white">Four rounds</h2>
        <ol className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map(({ icon: Icon, title, body }, i) => (
            <li key={title} className="hud rounded-xl bg-slate-900/70 p-5 shadow-[0_0_0_1px_rgb(160_166_196_/_0.12)]">
              <div className="flex items-center justify-between">
                <Icon className="h-6 w-6 text-neon-400" aria-hidden />
                <span className="font-mono text-xs text-slate-500">0{i + 1}</span>
              </div>
              <h3 className="mt-4 font-display text-lg font-bold uppercase text-white">{title}</h3>
              <p className="mt-1 text-sm text-slate-400">{body}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="border-y border-slate-800/80 bg-slate-950/60 py-16">
        <div className="mx-auto grid max-w-6xl gap-12 px-4 lg:grid-cols-2">
          <div>
            <p className="font-display text-xs font-semibold uppercase tracking-[0.2em] text-neon-400">Scoring</p>
            <h2 className="mt-2 font-display text-3xl font-bold uppercase text-white">Your score, split</h2>
            <p className="mt-3 max-w-[60ch] text-slate-400">
              Code challenges are auto-graded on hidden tests. Written challenges get a solution score from a reviewer. Every
              submission&apos;s AI usage is rated 1–5 on four stats and converted to 0–100.
            </p>
            <div className="mt-8 flex h-12 overflow-hidden rounded-lg font-display text-sm font-bold uppercase tracking-wider">
              <div className="flex w-[40%] items-center justify-center bg-xp-400 text-slate-950">Solution 40%</div>
              <div className="flex w-[60%] items-center justify-center bg-gradient-to-r from-brand-600 to-neon-500 text-white">AI usage 60%</div>
            </div>
            <p className="mt-3 font-mono text-sm text-slate-400">final = 0.4 × solution + 0.6 × AI usage</p>
          </div>
          <ul className="grid gap-3 sm:grid-cols-2">
            {stats.map(({ icon: Icon, name, body }) => (
              <li key={name} className="rounded-xl bg-slate-900/80 p-4 shadow-[0_0_0_1px_rgb(160_166_196_/_0.12)]">
                <p className="flex items-center gap-2 font-display font-bold uppercase tracking-wide text-white">
                  <Icon className="h-4 w-4 text-brand-300" aria-hidden /> {name}
                </p>
                <p className="mt-1 text-sm text-slate-400">{body}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="font-display text-xs font-semibold uppercase tracking-[0.2em] text-neon-400">Hall of fame</p>
            <h2 className="mt-2 font-display text-3xl font-bold uppercase text-white">Top players</h2>
          </div>
          <Link href="/leaderboard" className="font-display text-sm font-semibold uppercase tracking-wider text-neon-300 hover:text-neon-200">Full leaderboard →</Link>
        </div>
        <div className="mt-8">
          <TopPlayers />
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-4 pb-24 text-center">
        <h2 className="font-display text-4xl font-bold uppercase text-white">Ready player one?</h2>
        <p className="mt-3 text-slate-400">Create an account and take on your first challenge in under a minute.</p>
        <Link href="/register" className="press chamfer mt-8 inline-block bg-neon-400 px-8 py-3 font-display text-base font-bold uppercase tracking-wider text-slate-950 hover:bg-neon-300">
          Create account
        </Link>
      </section>
    </main>
  );
}
