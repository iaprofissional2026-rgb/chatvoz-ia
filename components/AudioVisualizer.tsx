'use client';

import React, { useMemo } from 'react';

interface AudioVisualizerProps {
  audioLevel: number; // 0 to 100
  isSpeaking: boolean;
  isMuted: boolean;
  barsCount?: number;
  height?: number;
  colorScheme?: 'red' | 'crimson' | 'lime' | 'amber';
  className?: string;
}

export function AudioVisualizer({
  audioLevel,
  isSpeaking,
  isMuted,
  barsCount = 14,
  height = 24,
  colorScheme = 'red',
  className = '',
}: AudioVisualizerProps) {
  // Purely derive bar heights from audioLevel & speaking status
  const bars = useMemo(() => {
    if (isMuted || !isSpeaking) {
      return Array(barsCount).fill(0.08);
    }

    const norm = Math.min(1, Math.max(0.15, audioLevel / 75));
    return Array.from({ length: barsCount }, (_, i) => {
      // Symmetrical bell curve pattern
      const centerFactor = 1 - Math.abs(i - (barsCount - 1) / 2) / ((barsCount - 1) / 2);
      const wave = Math.sin((i / (barsCount - 1 || 1)) * Math.PI) * centerFactor;
      // deterministic variation using sine
      const variation = Math.abs(Math.sin((i + 1) * (audioLevel + 3))) * 0.3;
      return Math.min(1, Math.max(0.1, (wave * 0.7 + variation) * norm));
    });
  }, [audioLevel, isSpeaking, isMuted, barsCount]);

  const getColorClasses = () => {
    if (isMuted) return 'bg-red-950/60 border-t border-red-800';
    if (!isSpeaking) return 'bg-zinc-800/80';
    switch (colorScheme) {
      case 'lime':
        return 'bg-gradient-to-t from-emerald-600 to-lime-400 shadow-[0_0_10px_rgba(57,255,20,0.8)]';
      case 'amber':
        return 'bg-gradient-to-t from-orange-600 to-amber-400 shadow-[0_0_10px_rgba(251,191,36,0.8)]';
      case 'crimson':
        return 'bg-gradient-to-t from-rose-700 via-red-600 to-rose-400 shadow-[0_0_12px_rgba(244,63,94,0.8)]';
      case 'red':
      default:
        return 'bg-gradient-to-t from-red-700 via-red-500 to-rose-400 shadow-[0_0_12px_rgba(255,0,55,0.85)]';
    }
  };

  return (
    <div
      className={`flex items-end justify-center gap-[3px] select-none ${className}`}
      style={{ height: `${height}px` }}
      aria-label="Audio Visualizer"
    >
      {bars.map((fraction, idx) => {
        const barHeight = Math.max(3, fraction * height);
        return (
          <div
            key={idx}
            className={`w-[3px] rounded-full transition-all duration-75 ${getColorClasses()}`}
            style={{
              height: `${barHeight}px`,
            }}
          />
        );
      })}
    </div>
  );
}
