'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';
import { LogOut, Menu, X } from 'lucide-react';
import { levelFor, tierFor } from '@/lib/game';
import { useAuth, isStaff } from './AuthProvider';
import { XpBar } from './XpBar';
import { cx } from './ui';

export function Logo() {
  return (
    <Link href="/" className="press flex items-center gap-2 font-display text-lg font-bold uppercase tracking-wider text-white">
      <span className="chamfer-sm grid h-8 w-8 place-items-center bg-gradient-to-br from-brand-500 to-neon-500 text-xs text-slate-950">AI</span>
      <span>
        AILOG<span className="text-neon-400">RACER</span>
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
    <Link href="/profile" className="press group flex items-center gap-3 rounded-lg px-2 py-1 hover:bg-slate-800/70" title={`${toNext} XP to level ${level + 1}`}>
      <span className="chamfer-sm grid h-9 w-9 place-items-center bg-slate-800 font-display text-sm font-bold text-neon-300">{level}</span>
      <span className="w-40">
        <span className="flex items-baseline justify-between gap-2">
          <span className="truncate text-sm font-semibold text-slate-100">{user.username}</span>
          {tier && <span className={cx('font-display text-[10px] font-bold uppercase', tier.className.split(' ')[0])}>{tier.name}</span>}
        </span>
        <XpBar progress={progress} className="mt-1" />
      </span>
    </Link>
  );
}

export function Navbar() {
  const { user, ready, signOut } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const links = [
    { href: '/problems', label: 'Arena' },
    { href: '/leaderboard', label: 'Leaderboard' },
    ...(user ? [{ href: '/submissions', label: 'Match history' }] : []),
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
        className={cx(
          'press relative rounded-md px-3 py-2 font-display text-sm font-semibold uppercase tracking-wider',
          active ? 'text-white' : 'text-slate-400 hover:text-white'
        )}
      >
        {l.label}
        {active && <span className="absolute inset-x-3 -bottom-[9px] hidden h-0.5 bg-neon-400 shadow-[0_0_12px_rgb(63_227_242)] md:block" />}
      </Link>
    );
  };

  const doSignOut = () => {
    signOut();
    setOpen(false);
    router.push('/');
  };

  return (
    <header className="sticky top-0 z-30 border-b border-slate-800/80 bg-slate-950/85 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-7xl items-center gap-4 px-4">
        <Logo />
        <nav className="hidden flex-1 items-center gap-1 md:flex">{links.map(navLink)}</nav>
        <div className="ml-auto hidden items-center gap-2 md:flex">
          {ready && user ? (
            <>
              <PlayerChip />
              <button onClick={doSignOut} className="press rounded-md p-2 text-slate-400 hover:bg-slate-800 hover:text-white" aria-label="Sign out" title="Sign out">
                <LogOut className="h-4 w-4" />
              </button>
            </>
          ) : ready ? (
            <>
              <Link href="/login" className="press px-3 py-2 font-display text-sm font-semibold uppercase tracking-wider text-slate-300 hover:text-white">Sign in</Link>
              <Link href="/register" className="press chamfer-sm bg-neon-400 px-4 py-1.5 font-display text-sm font-bold uppercase tracking-wider text-slate-950 hover:bg-neon-300">
                Play now
              </Link>
            </>
          ) : null}
        </div>
        <button className="press ml-auto rounded-md p-2 md:hidden" aria-label="Toggle menu" aria-expanded={open} onClick={() => setOpen(!open)}>
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
              <button className="press rounded-md px-3 py-2 text-left font-display text-sm font-semibold uppercase tracking-wider text-slate-400" onClick={doSignOut}>
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
