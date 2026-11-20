'use client';

import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, type TooltipContentProps } from 'recharts';
import { format, parseISO } from 'date-fns';
import { CHART } from '@/lib/chartTheme';
import { formatCurrency } from '@/lib/utils';
import type { PricePoint } from '@/features/investing/lib/types';

function PriceTooltip({ active, payload }: TooltipContentProps) {
  const point = payload?.[0]?.payload as PricePoint | undefined;
  if (!active || !point) return null;
  return (
    <div style={CHART.tooltip.contentStyle} className="px-3 py-2 text-sm">
      <p className="text-ink-muted">{format(parseISO(point.date), 'EEE, MMM d, yyyy')}</p>
      <p className="text-ink font-medium">{formatCurrency(point.close)}</p>
    </div>
  );
}

/** Daily closes as a line over a faint fill; teal when up over the range, red when down. */
export default function PriceChart({ points, label }: { points: PricePoint[]; label: string }) {
  const up = points.length < 2 || points[points.length - 1].close >= points[0].close;
  const color = up ? CHART.up : CHART.down;
  return (
    <div className="h-64" role="img" aria-label={`${label} price chart`}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={points} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          <CartesianGrid stroke={CHART.grid} vertical={false} />
          <XAxis
            dataKey="date"
            tickFormatter={(d: string) => format(parseISO(d), 'MMM d')}
            stroke={CHART.axis}
            tick={{ fill: CHART.axis, fontSize: 12 }}
            tickLine={false}
            axisLine={false}
            minTickGap={40}
          />
          <YAxis
            domain={['auto', 'auto']}
            tickFormatter={(v: number) => `$${Math.round(v)}`}
            stroke={CHART.axis}
            tick={{ fill: CHART.axis, fontSize: 12 }}
            tickLine={false}
            axisLine={false}
            width={56}
          />
          <Tooltip content={PriceTooltip} cursor={{ stroke: CHART.axis, strokeDasharray: '3 3' }} />
          <Area type="monotone" dataKey="close" stroke={color} strokeWidth={2} fill={color}
            fillOpacity={0.08} isAnimationActive={false} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
