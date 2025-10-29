// components/grok-dashboard/StatsCard.tsx
"use client";

import React from 'react';
import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface StatsCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  icon?: React.ReactNode;
  className?: string;
  highlight?: boolean;
}

export function StatsCard({
  title,
  value,
  subtitle,
  trend,
  trendValue,
  icon,
  className,
  highlight = false
}: StatsCardProps) {
  const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus;

  const trendColor = trend === 'up'
    ? 'text-green-600 dark:text-green-400'
    : trend === 'down'
    ? 'text-red-600 dark:text-red-400'
    : 'text-muted-foreground';

  return (
    <div
      className={cn(
        "relative p-6 rounded-lg border bg-card transition-all duration-200",
        highlight && "border-primary/50 bg-primary/5",
        "hover:shadow-md",
        className
      )}
    >
      {/* Icon */}
      {icon && (
        <div className="absolute top-4 right-4 opacity-10">
          {icon}
        </div>
      )}

      {/* Title */}
      <div className="text-sm font-medium text-muted-foreground mb-2">
        {title}
      </div>

      {/* Value */}
      <div className="text-3xl font-bold tracking-tight mb-1">
        {value}
      </div>

      {/* Subtitle and Trend */}
      <div className="flex items-center gap-2 text-sm">
        {subtitle && (
          <span className="text-muted-foreground">{subtitle}</span>
        )}
        {trend && trendValue && (
          <span className={cn("flex items-center gap-1 font-medium", trendColor)}>
            <TrendIcon className="w-3.5 h-3.5" />
            {trendValue}
          </span>
        )}
      </div>
    </div>
  );
}
