'use client';

import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { MyStats } from '@/lib/types';

const SERIES = [
  { key: 'finalScore', name: 'Final', color: 'var(--series-1)' },
  { key: 'aiUsageScore', name: 'AI usage', color: 'var(--series-2)' },
  { key: 'solutionScore', name: 'Solution', color: 'var(--series-3)' }
] as const;

export function ScoreTrend({ timeline }: { timeline: MyStats['timeline'] }) {
  const data = timeline.map((t, i) => ({ ...t, n: i + 1 }));
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer>
        <LineChart data={data} margin={{ top: 8, right: 16, bottom: 4, left: -16 }}>
          <CartesianGrid stroke="var(--chart-grid)" vertical={false} />
          <XAxis dataKey="n" tick={{ fill: 'var(--chart-axis)', fontSize: 12 }} tickLine={false} axisLine={{ stroke: 'var(--chart-grid)' }} allowDecimals={false} />
          <YAxis domain={[0, 100]} ticks={[0, 25, 50, 75, 100]} tick={{ fill: 'var(--chart-axis)', fontSize: 12 }} tickLine={false} axisLine={false} />
          <Tooltip
            cursor={{ stroke: 'var(--chart-axis)', strokeDasharray: '3 3' }}
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const row = payload[0].payload as (typeof data)[number];
              return (
                <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs shadow-md dark:border-slate-700 dark:bg-slate-900">
                  <p className="font-semibold text-slate-900 dark:text-slate-100">#{row.n} · {row.problem}</p>
                  <p className="mb-1 text-slate-500">{new Date(row.date).toLocaleDateString()}</p>
                  {SERIES.map((s) => (
                    <p key={s.key} className="flex items-center gap-2 text-slate-700 dark:text-slate-200">
                      <span className="h-2 w-2 rounded-full" style={{ background: s.color }} />
                      {s.name} <span className="ml-auto font-semibold tabular-nums">{row[s.key]}</span>
                    </p>
                  ))}
                </div>
              );
            }}
          />
          <Legend itemSorter={null} iconType="plainline" wrapperStyle={{ fontSize: 12, color: 'var(--chart-axis)' }} />
          {SERIES.map((s) => (
            <Line
              key={s.key}
              type="monotone"
              dataKey={s.key}
              name={s.name}
              stroke={s.color}
              strokeWidth={2}
              dot={{ r: 4, strokeWidth: 2, fill: s.color, stroke: 'var(--chart-grid)' }}
              activeDot={{ r: 5 }}
              isAnimationActive={false}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
