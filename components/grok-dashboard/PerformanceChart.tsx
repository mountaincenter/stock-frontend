// components/grok-dashboard/PerformanceChart.tsx
"use client";

import React from 'react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { DailyStats } from '@/lib/grok-backtest-types';
import { cn } from '@/lib/utils';

interface PerformanceChartProps {
  data: DailyStats[];
  className?: string;
  type?: 'line' | 'bar';
}

export function PerformanceChart({ data, className, type = 'line' }: PerformanceChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className={cn("flex items-center justify-center h-64 text-muted-foreground", className)}>
        データがありません
      </div>
    );
  }

  // 日付フォーマット (MM/DD)
  const chartData = data.map(d => ({
    ...d,
    date: new Date(d.date).toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' })
  }));

  const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: Array<{ value: number; payload: { date: string; avg_return: number; win_rate: number; count: number } }> }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-popover border border-border rounded-lg p-3 shadow-lg">
          <p className="text-sm font-medium mb-2">{payload[0].payload.date}</p>
          <div className="space-y-1">
            <p className="text-xs">
              <span className="text-muted-foreground">平均リターン: </span>
              <span className={cn(
                "font-semibold",
                payload[0].value >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
              )}>
                {payload[0].value.toFixed(2)}%
              </span>
            </p>
            <p className="text-xs">
              <span className="text-muted-foreground">勝率: </span>
              <span className="font-semibold">{payload[1]?.value?.toFixed(1)}%</span>
            </p>
            <p className="text-xs text-muted-foreground">
              サンプル数: {payload[0].payload.count}件
            </p>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className={cn("w-full", className)}>
      <ResponsiveContainer width="100%" height={300}>
        {type === 'line' ? (
          <LineChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" opacity={0.3} />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 12 }}
              className="text-muted-foreground"
            />
            <YAxis
              tick={{ fontSize: 12 }}
              className="text-muted-foreground"
              label={{ value: 'リターン (%)', angle: -90, position: 'insideLeft', style: { fontSize: 12 } }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <ReferenceLine y={0} stroke="hsl(var(--muted-foreground))" strokeDasharray="3 3" opacity={0.5} />
            <Line
              type="monotone"
              dataKey="avg_return"
              stroke="hsl(var(--primary))"
              strokeWidth={2}
              dot={{ r: 4 }}
              activeDot={{ r: 6 }}
              name="平均リターン"
            />
            <Line
              type="monotone"
              dataKey="win_rate"
              stroke="hsl(var(--chart-2))"
              strokeWidth={2}
              dot={{ r: 4 }}
              activeDot={{ r: 6 }}
              name="勝率"
              yAxisId={0}
            />
          </LineChart>
        ) : (
          <BarChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" opacity={0.3} />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 12 }}
              className="text-muted-foreground"
            />
            <YAxis
              tick={{ fontSize: 12 }}
              className="text-muted-foreground"
              label={{ value: 'リターン (%)', angle: -90, position: 'insideLeft', style: { fontSize: 12 } }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <ReferenceLine y={0} stroke="hsl(var(--muted-foreground))" strokeDasharray="3 3" opacity={0.5} />
            <Bar
              dataKey="avg_return"
              fill="hsl(var(--primary))"
              name="平均リターン"
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        )}
      </ResponsiveContainer>
    </div>
  );
}
