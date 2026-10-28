'use client';

import { useEffect } from 'react';
import { RequireAuth } from '@/components/RequireAuth';
import { useAuth } from '@/components/AuthProvider';
import { PlayerView } from '@/components/PlayerView';
import { LinkButton, Spinner } from '@/components/ui';

function Profile() {
  const { user, player, refreshPlayer } = useAuth();
  useEffect(() => refreshPlayer(), [refreshPlayer]);
  if (!user) return null;
  if (!player) return <Spinner className="mt-24" />;
  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <div className="mb-4 flex justify-end">
        <LinkButton href={`/players/${user.username}`} variant="secondary">View public profile</LinkButton>
      </div>
      <PlayerView
        own
        name={[user.firstName, user.lastName].filter(Boolean).join(' ') || user.username}
        username={user.username}
        subtitle={`@${user.username}${user.role !== 'USER' ? ` · ${user.role.toLowerCase()}` : ''}`}
        stats={player}
      />
    </main>
  );
}

export default function ProfilePage() {
  return (
    <RequireAuth>
      <Profile />
    </RequireAuth>
  );
}
