import Link from 'next/link';
import { Bot, ClipboardCheck, Code2, Gauge, MessagesSquare, Trophy } from 'lucide-react';

const steps = [
  { icon: Code2, title: 'Pick a problem', body: 'Algorithms, data structures, system design and web development, judged against hidden tests or graded by reviewers.' },
  { icon: MessagesSquare, title: 'Solve it with AI', body: 'Chat with Claude next to your editor, or import a transcript from ChatGPT, Copilot or any other tool you used.' },
  { icon: ClipboardCheck, title: 'Get reviewed', body: 'Reviewers read your transcript and score how well you used AI. Automatic metrics and an AI second opinion help them.' },
  { icon: Trophy, title: 'Climb the board', body: 'Your score is 40% solution and 60% AI usage, so how you get the answer matters.' }
];

const rubric = [
  ['Efficiency', 'Specific, well-scoped questions with context, not "just give me the code".'],
  ['Learning', 'You understand and adapt suggestions instead of pasting them.'],
  ['Transparency', 'Your own reasoning is visible throughout the conversation.'],
  ['Innovation', 'You use AI to test edge cases, compare approaches and review your work.']
];

export default function Home() {
  return (
    <main>
      <section className="mx-auto max-w-5xl px-4 pb-16 pt-20 text-center">
        <p className="mb-4 inline-flex items-center gap-2 rounded-full bg-brand-50 px-3 py-1 text-xs font-medium text-brand-700 dark:bg-brand-900/30 dark:text-brand-300">
          <Bot className="h-3.5 w-3.5" /> Graded on the answer and the process
        </p>
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">Solve problems. Show how you used AI.</h1>
        <p className="mx-auto mt-5 max-w-2xl text-lg text-slate-600 dark:text-slate-300">
          AILOGRACER scores your solution and your AI conversation together, so you practise the skill that matters
          now: using AI well, not just getting it to produce an answer.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link href="/problems" className="rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-700">
            Browse problems
          </Link>
          <Link href="/leaderboard" className="rounded-lg border border-slate-300 px-5 py-2.5 text-sm font-semibold hover:bg-white dark:border-slate-700 dark:hover:bg-slate-900">
            View leaderboard
          </Link>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-4 px-4 pb-16 sm:grid-cols-2 lg:grid-cols-4">
        {steps.map(({ icon: Icon, title, body }, i) => (
          <div key={title} className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center gap-2 text-brand-600">
              <Icon className="h-5 w-5" />
              <span className="text-xs font-semibold text-slate-400">STEP {i + 1}</span>
            </div>
            <h3 className="mt-3 font-semibold">{title}</h3>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{body}</p>
          </div>
        ))}
      </section>

      <section className="border-t border-slate-200 bg-white py-16 dark:border-slate-800 dark:bg-slate-900/40">
        <div className="mx-auto grid max-w-5xl gap-10 px-4 md:grid-cols-2">
          <div>
            <h2 className="flex items-center gap-2 text-2xl font-bold"><Gauge className="h-6 w-6 text-brand-600" /> How scoring works</h2>
            <p className="mt-3 text-slate-600 dark:text-slate-300">
              Code problems are auto-graded on hidden tests (the share of tests passed). Written problems get a solution
              score from a reviewer. Every submission's AI usage is scored 1–5 on four rubrics, converted to 0–100.
            </p>
            <div className="mt-5 rounded-lg bg-slate-100 p-4 font-mono text-sm dark:bg-slate-800">
              final = 0.4 × solution + 0.6 × AI usage
            </div>
          </div>
          <dl className="space-y-4">
            {rubric.map(([k, v]) => (
              <div key={k}>
                <dt className="font-semibold">{k}</dt>
                <dd className="text-sm text-slate-600 dark:text-slate-400">{v}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>
    </main>
  );
}
