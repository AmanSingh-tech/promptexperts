'use client';

import { use, useEffect, useState } from 'react';
import { api, errorMessage } from '@/lib/api';
import type { PublicPlayer } from '@/lib/types';
import { useAuth } from '@/components/AuthProvider';
import { PlayerView } from '@/components/PlayerView';
import { ErrorBox, Spinner } from '@/components/ui';

export default function PlayerPage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = use(params);
  const { user } = useAuth();
  const [data, setData] = useState<PublicPlayer | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setData(null);
    api<PublicPlayer>(`/api/players/${encodeURIComponent(username)}`).then(setData).catch((e) => setError(errorMessage(e)));
  }, [username]);

  if (error) return <div className="mx-auto mt-12 max-w-xl px-4"><ErrorBox message={error} /></div>;
  if (!data) return <Spinner className="mt-24" />;

  const joined = new Date(data.player.joinedAt).toLocaleDateString(undefined, { month: 'short', year: 'numeric' });
  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <PlayerView
        own={user?.username === data.player.username}
        name={data.player.firstName || data.player.username}
        username={data.player.username}
        subtitle={`@${data.player.username} · joined ${joined}${data.player.role !== 'USER' ? ` · ${data.player.role.toLowerCase()}` : ''}`}
        stats={data}
      />
    </main>
  );
}
