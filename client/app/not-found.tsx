import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="mx-auto mt-24 max-w-md px-4 text-center">
      <p className="font-mono text-7xl font-semibold text-brand-700">404</p>
      <h1 className="mt-4 font-display text-2xl font-bold text-slate-900">Out of bounds</h1>
      <p className="mt-2 text-slate-600">That page doesn&apos;t exist.</p>
      <Link href="/problems" className="press mt-8 inline-block bg-brand-600 px-6 py-2.5 font-display text-sm font-bold text-white hover:bg-brand-700">
        Back to practice
      </Link>
    </main>
  );
}
