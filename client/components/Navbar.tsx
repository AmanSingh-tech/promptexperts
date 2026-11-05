'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { LogOut, Menu, X } from 'lucide-react';
import { levelFor, tierFor } from '@/lib/game';
import { useAuth, isStaff } from './AuthProvider';
import { XpBar } from './XpBar';
import { cx } from './ui';

export function Logo() {
  return (
    <Link href="/" className="press flex items-center gap-2 text-lg font-bold text-white">
      <span className="grid h-7 w-7 place-items-center rounded bg-brand-500 text-xs text-slate-950">AI</span>
      <span>
        LOG<span className="text-brand-400">RACER</span>
      </span>
    </Link>
  );
}

function PlayerChip() {
  const { user, player } = useAuth();
  if (!user) return null;
  const { level, progress, toNext } = levelFor(player?.totalPoints ?? 0);
  const tier = tierFor(player?.avgFinalScore ?? 0, player?.evaluated ?? 0);
  return (
    <Link href="/profile" className="press flex items-center gap-3 rounded px-2 py-1 hover:bg-slate-800" title={`${toNext} XP to level ${level + 1}`}>
      <span className="grid h-8 w-8 place-items-center rounded-full bg-slate-700 text-sm font-semibold text-white">{user.username[0].toUpperCase()}</span>
      <span className="w-48">
        <span className="flex items-baseline justify-between gap-2">
          <span className="truncate text-sm font-medium text-white">{user.username}</span>
          <span className="shrink-0 text-xs text-slate-300">{tier ? `${tier.name} · ` : ''}Lv {level}</span>
        </span>
        <XpBar progress={progress} className="mt-1" trackClass="bg-slate-700" />
      </span>
    </Link>
  );
}

export function Navbar() {
  const { user, ready, signOut } = useAuth();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const links = [
    { href: '/problems', label: 'Practice' },
    { href: '/contests', label: 'Contests' },
    { href: '/leaderboard', label: 'Leaderboard' },
    ...(user ? [{ href: '/submissions', label: 'Submissions' }] : []),
    ...(isStaff(user) ? [{ href: '/review', label: 'Review' }] : []),
    ...(user?.role === 'ADMIN' ? [{ href: '/admin', label: 'Admin' }] : [])
  ];

  const navLink = (l: { href: string; label: string }) => {
    const active = pathname.startsWith(l.href);
    return (
      <Link
        key={l.href}
        href={l.href}
        onClick={() => setOpen(false)}
        aria-current={active ? 'page' : undefined}
        className={cx('press relative flex h-full items-center px-3 py-2 text-sm font-medium md:py-0', active ? 'text-white' : 'text-slate-300 hover:text-white')}
      >
        {l.label}
        {active && <span className="absolute inset-x-3 bottom-0 hidden h-0.5 bg-brand-400 md:block" />}
      </Link>
    );
  };

  const doSignOut = () => {
    setOpen(false);
    signOut('/');
  };

  return (
    <header className="sticky top-0 z-30 bg-slate-950 text-white">
      <div className="mx-auto flex h-14 max-w-7xl items-center gap-4 px-4">
        <Logo />
        <nav className="hidden h-full flex-1 items-stretch md:flex">{links.map(navLink)}</nav>
        <div className="ml-auto hidden items-center gap-2 md:flex">
          {ready && user ? (
            <>
              <PlayerChip />
              <button onClick={doSignOut} className="press rounded p-2 text-slate-300 hover:bg-slate-800 hover:text-white" aria-label="Sign out" title="Sign out">
                <LogOut className="h-4 w-4" />
              </button>
            </>
          ) : ready ? (
            <>
              <Link href="/login" className="press px-3 py-2 text-sm font-medium text-slate-300 hover:text-white">Log in</Link>
              <Link href="/register" className="press rounded bg-brand-600 px-4 py-1.5 text-sm font-semibold text-white hover:bg-brand-700">Sign up</Link>
            </>
          ) : null}
        </div>
        <button className="press ml-auto rounded p-2 md:hidden" aria-label="Toggle menu" aria-expanded={open} onClick={() => setOpen(!open)}>
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>
      {open && (
        <nav className="flex flex-col gap-1 border-t border-slate-800 px-4 py-3 md:hidden">
          {user && <div className="mb-2"><PlayerChip /></div>}
          {links.map(navLink)}
          {user ? (
            <>
              {navLink({ href: '/profile', label: 'Profile' })}
              <button className="press px-3 py-2 text-left text-sm font-medium text-slate-300" onClick={doSignOut}>Log out</button>
            </>
          ) : (
            <>
              {navLink({ href: '/login', label: 'Log in' })}
              {navLink({ href: '/register', label: 'Sign up' })}
            </>
          )}
        </nav>
      )}
    </header>
  );
}
