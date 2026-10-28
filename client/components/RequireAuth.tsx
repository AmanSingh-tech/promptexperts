'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from './AuthProvider';
import { Spinner } from './ui';
import type { Role } from '@/lib/types';

export function RequireAuth({ roles, children }: { roles?: Role[]; children: React.ReactNode }) {
  const { user, ready } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (ready && !user) router.replace(`/login?next=${encodeURIComponent(pathname)}`);
  }, [ready, user, router, pathname]);

  if (!ready || !user) return <Spinner className="mt-24" />;
  if (roles && !roles.includes(user.role)) {
    return (
      <div className="mx-auto mt-24 max-w-md text-center">
        <h1 className="text-xl font-semibold">Access restricted</h1>
        <p className="mt-2 text-sm text-slate-500">This page is only available to {roles.join(' or ').toLowerCase()}s.</p>
      </div>
    );
  }
  return <>{children}</>;
}
