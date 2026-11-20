'use client';

import { Line, LineChart, ResponsiveContainer, YAxis } from 'recharts';
import { CHART } from '@/lib/chartTheme';
import type { PricePoint } from '@/features/investing/lib/types';

/** A small trend line with no axes. The parent sets the height. */
export default function Sparkline({ points, className = 'h-10' }: { points: PricePoint[]; className?: string }) {
  if (points.length < 2) return <div className={className} />;
  const up = points[points.length - 1].close >= points[0].close;
  return (
    <div className={className} aria-hidden>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={points} margin={{ top: 2, right: 0, bottom: 2, left: 0 }}>
          <YAxis hide domain={['dataMin', 'dataMax']} />
          <Line type="monotone" dataKey="close" stroke={up ? CHART.up : CHART.down} strokeWidth={2} dot={false} isAnimationActive={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
