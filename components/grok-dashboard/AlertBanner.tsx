// components/grok-dashboard/AlertBanner.tsx
"use client";

import React from 'react';
import { Alert } from '@/lib/grok-backtest-types';
import { cn } from '@/lib/utils';
import { AlertCircle, CheckCircle, AlertTriangle } from 'lucide-react';

interface AlertBannerProps {
  alerts: Alert[];
  className?: string;
}

export function AlertBanner({ alerts, className }: AlertBannerProps) {
  if (!alerts || alerts.length === 0) {
    return null;
  }

  return (
    <div className={cn("space-y-3", className)}>
      {alerts.map((alert, index) => {
        const Icon = alert.type === 'success'
          ? CheckCircle
          : alert.type === 'warning'
          ? AlertTriangle
          : AlertCircle;

        const bgColor = alert.type === 'success'
          ? 'bg-green-500/10 border-green-500/30'
          : alert.type === 'warning'
          ? 'bg-yellow-500/10 border-yellow-500/30'
          : 'bg-red-500/10 border-red-500/30';

        const iconColor = alert.type === 'success'
          ? 'text-green-600 dark:text-green-400'
          : alert.type === 'warning'
          ? 'text-yellow-600 dark:text-yellow-400'
          : 'text-red-600 dark:text-red-400';

        const textColor = alert.type === 'success'
          ? 'text-green-900 dark:text-green-100'
          : alert.type === 'warning'
          ? 'text-yellow-900 dark:text-yellow-100'
          : 'text-red-900 dark:text-red-100';

        return (
          <div
            key={index}
            className={cn(
              "flex items-start gap-3 p-4 rounded-lg border",
              bgColor
            )}
          >
            <Icon className={cn("w-5 h-5 mt-0.5 flex-shrink-0", iconColor)} />
            <div className="flex-1 min-w-0">
              <h4 className={cn("font-semibold text-sm mb-1", textColor)}>
                {alert.title}
              </h4>
              <p className={cn("text-sm opacity-90", textColor)}>
                {alert.message}
              </p>
              {alert.action && (
                <div className="mt-2">
                  <span className={cn(
                    "inline-flex items-center px-3 py-1 rounded-md text-xs font-medium",
                    alert.type === 'success' ? "bg-green-500/20" :
                    alert.type === 'warning' ? "bg-yellow-500/20" :
                    "bg-red-500/20",
                    textColor
                  )}>
                    💡 {alert.action}
                  </span>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
