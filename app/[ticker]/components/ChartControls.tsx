// app/[ticker]/components/ChartControls.tsx
"use client";

import React from "react";

export interface ChartOptions {
  showMA5: boolean;
  showMA25: boolean;
  showMA75: boolean;
  showBollinger: boolean;
  showVolume: boolean;
}

interface ChartControlsProps {
  options: ChartOptions;
  onChange: (options: ChartOptions) => void;
}

export default function ChartControls({ options, onChange }: ChartControlsProps) {
  const handleToggle = (key: keyof ChartOptions) => {
    onChange({ ...options, [key]: !options[key] });
  };

  return (
    <div className="flex flex-wrap items-center gap-4 px-4 py-3 bg-muted/20 border border-border/30 rounded-lg">
      {/* Moving Averages */}
      <div className="flex items-center gap-3">
        <span className="text-sm font-medium text-muted-foreground mr-1">移動平均:</span>
        <label className="flex items-center gap-2 cursor-pointer group">
          <input
            type="checkbox"
            checked={options.showMA5}
            onChange={() => handleToggle("showMA5")}
            className="w-4 h-4 rounded border-border/50 text-yellow-500 focus:ring-2 focus:ring-yellow-500/20 cursor-pointer"
          />
          <span className="text-sm font-medium text-yellow-600 dark:text-yellow-400 group-hover:text-yellow-500">
            MA5
          </span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer group">
          <input
            type="checkbox"
            checked={options.showMA25}
            onChange={() => handleToggle("showMA25")}
            className="w-4 h-4 rounded border-border/50 text-blue-500 focus:ring-2 focus:ring-blue-500/20 cursor-pointer"
          />
          <span className="text-sm font-medium text-blue-600 dark:text-blue-400 group-hover:text-blue-500">
            MA25
          </span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer group">
          <input
            type="checkbox"
            checked={options.showMA75}
            onChange={() => handleToggle("showMA75")}
            className="w-4 h-4 rounded border-border/50 text-purple-500 focus:ring-2 focus:ring-purple-500/20 cursor-pointer"
          />
          <span className="text-sm font-medium text-purple-600 dark:text-purple-400 group-hover:text-purple-500">
            MA75
          </span>
        </label>
      </div>

      {/* Divider */}
      <div className="h-5 w-px bg-border/50" />

      {/* Bollinger Bands */}
      <div className="flex items-center gap-3">
        <label className="flex items-center gap-2 cursor-pointer group">
          <input
            type="checkbox"
            checked={options.showBollinger}
            onChange={() => handleToggle("showBollinger")}
            className="w-4 h-4 rounded border-border/50 text-cyan-500 focus:ring-2 focus:ring-cyan-500/20 cursor-pointer"
          />
          <span className="text-sm font-medium text-cyan-600 dark:text-cyan-400 group-hover:text-cyan-500">
            Bollinger
          </span>
        </label>
      </div>

      {/* Divider */}
      <div className="h-5 w-px bg-border/50" />

      {/* Volume */}
      <div className="flex items-center gap-3">
        <label className="flex items-center gap-2 cursor-pointer group">
          <input
            type="checkbox"
            checked={options.showVolume}
            onChange={() => handleToggle("showVolume")}
            className="w-4 h-4 rounded border-border/50 text-emerald-500 focus:ring-2 focus:ring-emerald-500/20 cursor-pointer"
          />
          <span className="text-sm font-medium text-muted-foreground group-hover:text-foreground">
            出来高
          </span>
        </label>
      </div>
    </div>
  );
}
