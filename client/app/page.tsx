import Link from 'next/link';
import { Brain, ClipboardCheck, Eye, Lightbulb, ListChecks, MessagesSquare, Target, Trophy } from 'lucide-react';
import { LiveStats, TopPlayers } from '@/components/LandingLive';

const steps = [
  { icon: ListChecks, title: 'Pick a challenge', body: 'Algorithms, data structures, system design and web dev. Code is judged on hidden tests; written answers are graded by reviewers.' },
  { icon: MessagesSquare, title: 'Work with AI', body: 'Chat with Claude beside your editor, or import the conversation you had in ChatGPT, Copilot or any other tool.' },
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
    <main>
      <section className="bg-slate-950 text-white">
        <div className="mx-auto max-w-6xl px-4 pb-20 pt-16 sm:pt-24">
          <h1 className="max-w-3xl text-4xl font-bold leading-tight sm:text-6xl">Solve it, and show how you used AI</h1>
          <p className="mt-5 max-w-[60ch] text-lg text-slate-300">
            Getting the answer is 40% of your score. The other 60% is how well you used AI to get there.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/problems" className="press rounded bg-brand-600 px-6 py-3 font-semibold text-white hover:bg-brand-700">Start practicing</Link>
            <Link href="/leaderboard" className="press rounded border border-slate-500 px-6 py-3 font-semibold text-white hover:bg-slate-800">View leaderboard</Link>
          </div>
        </div>
      </section>

      <section className="mx-auto -mt-8 max-w-6xl px-4">
        <LiveStats />
      </section>

      <section className="mx-auto max-w-6xl px-4 py-14">
        <h2 className="text-2xl font-bold text-slate-900">How it works</h2>
        <ol className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map(({ icon: Icon, title, body }) => (
            <li key={title} className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
              <Icon className="h-6 w-6 text-brand-600" aria-hidden />
              <h3 className="mt-3 font-semibold text-slate-900">{title}</h3>
              <p className="mt-1 text-sm text-slate-600">{body}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="border-y border-slate-200 bg-white py-14">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 lg:grid-cols-2">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">How you&apos;re scored</h2>
            <p className="mt-3 max-w-[60ch] text-slate-600">
              Code challenges are auto-graded on hidden tests. Written challenges get a solution score from a reviewer. Every
              submission&apos;s AI usage is rated 1–5 on four skills and converted to 0–100.
            </p>
            <div className="mt-6 flex h-10 overflow-hidden rounded text-sm font-semibold">
              <div className="flex w-[40%] items-center justify-center bg-slate-700 text-white">Solution 40%</div>
              <div className="flex w-[60%] items-center justify-center bg-brand-600 text-white">AI usage 60%</div>
            </div>
            <p className="mt-3 font-mono text-sm text-slate-600">final = 0.4 × solution + 0.6 × AI usage</p>
          </div>
          <ul className="grid gap-3 sm:grid-cols-2">
            {stats.map(({ icon: Icon, name, body }) => (
              <li key={name} className="rounded-md border border-slate-200 p-4">
                <p className="flex items-center gap-2 font-semibold text-slate-900">
                  <Icon className="h-4 w-4 text-brand-600" aria-hidden /> {name}
                </p>
                <p className="mt-1 text-sm text-slate-600">{body}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-14">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <h2 className="text-2xl font-bold text-slate-900">Top players</h2>
          <Link href="/leaderboard" className="text-sm font-semibold text-brand-700 hover:underline">Full leaderboard →</Link>
        </div>
        <div className="mt-6">
          <TopPlayers />
        </div>
      </section>

      <section className="bg-slate-950 py-14 text-center text-white">
        <h2 className="text-2xl font-bold">Ready to start?</h2>
        <p className="mt-2 text-slate-300">Create an account and take on your first challenge in under a minute.</p>
        <Link href="/register" className="press mt-6 inline-block rounded bg-brand-600 px-6 py-3 font-semibold text-white hover:bg-brand-700">Create account</Link>
      </section>
    </main>
  );
}
