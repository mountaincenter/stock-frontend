// app/[ticker]/demo/PlaybackControls.tsx
"use client";

import React from "react";
import type { PlaybackSpeed } from "./hooks/usePlayback";

interface PlaybackControlsProps {
  isPlaying: boolean;
  speed: PlaybackSpeed;
  currentIndex: number;
  totalBars: number;
  progress: number;
  onTogglePlay: () => void;
  onSpeedChange: (speed: PlaybackSpeed) => void;
  onStepForward: () => void;
  onStepBackward: () => void;
  onReset: () => void;
  onSeek: (index: number) => void;
  currentTime?: string;
}

const SPEEDS: PlaybackSpeed[] = [1, 5, 10, 30];

export default function PlaybackControls({
  isPlaying,
  speed,
  currentIndex,
  totalBars,
  progress,
  onTogglePlay,
  onSpeedChange,
  onStepForward,
  onStepBackward,
  onReset,
  onSeek,
  currentTime,
}: PlaybackControlsProps) {
  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    onSeek(parseInt(e.target.value, 10));
  };

  return (
    <div className="flex flex-col gap-3 p-4 rounded-xl bg-card/50 border border-border/40 backdrop-blur-sm">
      {/* Time display */}
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground font-mono">
          {currentTime || `Bar ${currentIndex + 1} / ${totalBars}`}
        </span>
        <span className="text-muted-foreground">
          {Math.round(progress)}%
        </span>
      </div>

      {/* Progress bar / Seek slider */}
      <input
        type="range"
        min={0}
        max={totalBars - 1}
        value={currentIndex}
        onChange={handleSeek}
        className="w-full h-2 rounded-lg appearance-none cursor-pointer bg-muted
          [&::-webkit-slider-thumb]:appearance-none
          [&::-webkit-slider-thumb]:w-4
          [&::-webkit-slider-thumb]:h-4
          [&::-webkit-slider-thumb]:rounded-full
          [&::-webkit-slider-thumb]:bg-primary
          [&::-webkit-slider-thumb]:cursor-pointer
          [&::-webkit-slider-thumb]:shadow-md
          [&::-webkit-slider-thumb]:transition-transform
          [&::-webkit-slider-thumb]:hover:scale-110
          [&::-moz-range-thumb]:w-4
          [&::-moz-range-thumb]:h-4
          [&::-moz-range-thumb]:rounded-full
          [&::-moz-range-thumb]:bg-primary
          [&::-moz-range-thumb]:cursor-pointer
          [&::-moz-range-thumb]:border-0"
      />

      {/* Control buttons */}
      <div className="flex items-center justify-between gap-2">
        {/* Left: Playback controls */}
        <div className="flex items-center gap-1">
          {/* Reset */}
          <button
            onClick={onReset}
            className="p-2 rounded-lg hover:bg-muted/50 transition-colors text-muted-foreground hover:text-foreground"
            title="リセット"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>

          {/* Step backward */}
          <button
            onClick={onStepBackward}
            disabled={currentIndex === 0}
            className="p-2 rounded-lg hover:bg-muted/50 transition-colors text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed"
            title="1本戻る"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12.066 11.2a1 1 0 000 1.6l5.334 4A1 1 0 0019 16V8a1 1 0 00-1.6-.8l-5.333 4zM4.066 11.2a1 1 0 000 1.6l5.334 4A1 1 0 0011 16V8a1 1 0 00-1.6-.8l-5.334 4z" />
            </svg>
          </button>

          {/* Play/Pause */}
          <button
            onClick={onTogglePlay}
            className="p-3 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-colors shadow-lg"
            title={isPlaying ? "一時停止" : "再生"}
          >
            {isPlaying ? (
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
              </svg>
            ) : (
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
            )}
          </button>

          {/* Step forward */}
          <button
            onClick={onStepForward}
            disabled={currentIndex >= totalBars - 1}
            className="p-2 rounded-lg hover:bg-muted/50 transition-colors text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed"
            title="1本進む"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.933 12.8a1 1 0 000-1.6L6.6 7.2A1 1 0 005 8v8a1 1 0 001.6.8l5.333-4zM19.933 12.8a1 1 0 000-1.6l-5.333-4A1 1 0 0013 8v8a1 1 0 001.6.8l5.333-4z" />
            </svg>
          </button>
        </div>

        {/* Right: Speed selector */}
        <div className="flex items-center gap-1 bg-muted/30 rounded-lg p-1">
          {SPEEDS.map((s) => (
            <button
              key={s}
              onClick={() => onSpeedChange(s)}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                speed === s
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              }`}
            >
              {s}x
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
