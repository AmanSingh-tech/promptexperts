import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="mx-auto mt-24 max-w-md px-4 text-center">
      <p className="font-mono text-7xl font-semibold text-neon-400 text-glow">404</p>
      <h1 className="mt-4 font-display text-2xl font-bold uppercase text-white">Out of bounds</h1>
      <p className="mt-2 text-slate-400">That page doesn&apos;t exist.</p>
      <Link href="/problems" className="press chamfer mt-8 inline-block bg-neon-400 px-6 py-2.5 font-display text-sm font-bold uppercase tracking-wider text-slate-950 hover:bg-neon-300">
        Back to the arena
      </Link>
    </main>
  );
}
