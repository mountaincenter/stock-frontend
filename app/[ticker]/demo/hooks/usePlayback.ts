// app/[ticker]/demo/hooks/usePlayback.ts
"use client";

import { useState, useCallback, useRef, useEffect } from "react";

export type PlaybackSpeed = 1 | 5 | 10 | 30;

interface UsePlaybackProps {
  totalBars: number;
  onIndexChange?: (index: number) => void;
}

interface UsePlaybackReturn {
  currentIndex: number;
  isPlaying: boolean;
  speed: PlaybackSpeed;
  play: () => void;
  pause: () => void;
  togglePlay: () => void;
  setSpeed: (speed: PlaybackSpeed) => void;
  stepForward: () => void;
  stepBackward: () => void;
  jumpTo: (index: number) => void;
  reset: () => void;
  progress: number; // 0-100
}

// Speed to interval mapping (ms per bar)
// 1x = realtime (5min = 300000ms), but we use 5000ms as base for demo
// 5x = 1 bar per 1 second (1000ms)
// 10x = 1 bar per 500ms
// 30x = 1 bar per ~166ms
const SPEED_INTERVALS: Record<PlaybackSpeed, number> = {
  1: 5000,   // 1 bar per 5 seconds
  5: 1000,   // 1 bar per 1 second
  10: 500,   // 1 bar per 0.5 seconds
  30: 166,   // 1 bar per ~0.16 seconds
};

export function usePlayback({
  totalBars,
  onIndexChange,
}: UsePlaybackProps): UsePlaybackReturn {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeedState] = useState<PlaybackSpeed>(5);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const clearPlaybackInterval = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const updateIndex = useCallback(
    (newIndex: number) => {
      const clampedIndex = Math.max(0, Math.min(newIndex, totalBars - 1));
      setCurrentIndex(clampedIndex);
      onIndexChange?.(clampedIndex);
    },
    [totalBars, onIndexChange]
  );

  const startPlayback = useCallback(() => {
    clearPlaybackInterval();

    intervalRef.current = setInterval(() => {
      setCurrentIndex((prev) => {
        const next = prev + 1;
        if (next >= totalBars) {
          clearPlaybackInterval();
          setIsPlaying(false);
          return prev;
        }
        onIndexChange?.(next);
        return next;
      });
    }, SPEED_INTERVALS[speed]);
  }, [speed, totalBars, clearPlaybackInterval, onIndexChange]);

  const play = useCallback(() => {
    if (currentIndex >= totalBars - 1) {
      // Reset to beginning if at end
      updateIndex(0);
    }
    setIsPlaying(true);
  }, [currentIndex, totalBars, updateIndex]);

  const pause = useCallback(() => {
    setIsPlaying(false);
    clearPlaybackInterval();
  }, [clearPlaybackInterval]);

  const togglePlay = useCallback(() => {
    if (isPlaying) {
      pause();
    } else {
      play();
    }
  }, [isPlaying, play, pause]);

  const setSpeed = useCallback((newSpeed: PlaybackSpeed) => {
    setSpeedState(newSpeed);
  }, []);

  const stepForward = useCallback(() => {
    pause();
    updateIndex(currentIndex + 1);
  }, [currentIndex, updateIndex, pause]);

  const stepBackward = useCallback(() => {
    pause();
    updateIndex(currentIndex - 1);
  }, [currentIndex, updateIndex, pause]);

  const jumpTo = useCallback(
    (index: number) => {
      pause();
      updateIndex(index);
    },
    [updateIndex, pause]
  );

  const reset = useCallback(() => {
    pause();
    updateIndex(0);
  }, [updateIndex, pause]);

  // Handle play/pause state changes
  useEffect(() => {
    if (isPlaying) {
      startPlayback();
    } else {
      clearPlaybackInterval();
    }
    return clearPlaybackInterval;
  }, [isPlaying, startPlayback, clearPlaybackInterval]);

  // Restart playback when speed changes during play
  useEffect(() => {
    if (isPlaying) {
      startPlayback();
    }
  }, [speed, isPlaying, startPlayback]);

  // Cleanup on unmount
  useEffect(() => {
    return clearPlaybackInterval;
  }, [clearPlaybackInterval]);

  const progress = totalBars > 0 ? (currentIndex / (totalBars - 1)) * 100 : 0;

  return {
    currentIndex,
    isPlaying,
    speed,
    play,
    pause,
    togglePlay,
    setSpeed,
    stepForward,
    stepBackward,
    jumpTo,
    reset,
    progress,
  };
}
