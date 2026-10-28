'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';
import { Menu, X } from 'lucide-react';
import { useAuth, isStaff } from './AuthProvider';
import { cx } from './ui';

export function Navbar() {
  const { user, ready, signOut } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const links = [
    { href: '/problems', label: 'Problems' },
    { href: '/leaderboard', label: 'Leaderboard' },
    ...(user ? [{ href: '/submissions', label: 'My submissions' }] : []),
    ...(isStaff(user) ? [{ href: '/review', label: 'Review' }] : []),
    ...(user?.role === 'ADMIN' ? [{ href: '/admin', label: 'Admin' }] : [])
  ];

  const navLink = (l: { href: string; label: string }) => (
    <Link
      key={l.href}
      href={l.href}
      onClick={() => setOpen(false)}
      className={cx(
        'rounded-md px-3 py-2 text-sm font-medium',
        pathname.startsWith(l.href)
          ? 'bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-white'
          : 'text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white'
      )}
    >
      {l.label}
    </Link>
  );

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 backdrop-blur dark:border-slate-800 dark:bg-slate-950/90">
      <div className="mx-auto flex h-14 max-w-7xl items-center gap-4 px-4">
        <Link href="/" className="flex items-center gap-2 font-bold tracking-tight text-slate-900 dark:text-white">
          <span className="grid h-7 w-7 place-items-center rounded-md bg-brand-600 text-xs text-white">AI</span>
          AILOGRACER
        </Link>
        <nav className="hidden flex-1 items-center gap-1 md:flex">{links.map(navLink)}</nav>
        <div className="ml-auto hidden items-center gap-2 md:flex">
          {ready && user ? (
            <>
              <Link href="/profile" className="text-sm font-medium text-slate-700 hover:text-slate-900 dark:text-slate-200">
                {user.username}
                {user.role !== 'USER' && <span className="ml-1 text-xs text-brand-600">({user.role.toLowerCase()})</span>}
              </Link>
              <button
                onClick={() => {
                  signOut();
                  router.push('/');
                }}
                className="rounded-md px-3 py-2 text-sm text-slate-500 hover:text-slate-900 dark:hover:text-white"
              >
                Sign out
              </button>
            </>
          ) : ready ? (
            <>
              <Link href="/login" className="px-3 py-2 text-sm font-medium text-slate-700 dark:text-slate-200">Sign in</Link>
              <Link href="/register" className="rounded-lg bg-brand-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-700">
                Get started
              </Link>
            </>
          ) : null}
        </div>
        <button className="ml-auto md:hidden" aria-label="Toggle menu" onClick={() => setOpen(!open)}>
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>
      {open && (
        <nav className="flex flex-col gap-1 border-t border-slate-200 px-4 py-3 md:hidden dark:border-slate-800">
          {links.map(navLink)}
          {user ? (
            <>
              {navLink({ href: '/profile', label: 'Profile' })}
              <button
                className="rounded-md px-3 py-2 text-left text-sm text-slate-500"
                onClick={() => {
                  signOut();
                  setOpen(false);
                  router.push('/');
                }}
              >
                Sign out
              </button>
            </>
          ) : (
            <>
              {navLink({ href: '/login', label: 'Sign in' })}
              {navLink({ href: '/register', label: 'Create account' })}
            </>
          )}
        </nav>
      )}
    </header>
  );
}
