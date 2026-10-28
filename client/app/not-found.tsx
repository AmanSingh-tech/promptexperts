import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="mx-auto mt-24 max-w-md px-4 text-center">
      <h1 className="text-2xl font-bold">Page not found</h1>
      <p className="mt-2 text-slate-500">That page doesn&apos;t exist.</p>
      <Link href="/problems" className="mt-6 inline-block text-brand-600 hover:underline">Go to problems</Link>
    </main>
  );
}
