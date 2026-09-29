'use client';

import React, { useMemo } from 'react';

interface AudioVisualizerProps {
  audioLevel: number; // 0 to 100
  isSpeaking: boolean;
  isMuted: boolean;
  barsCount?: number;
  height?: number;
  colorScheme?: 'cyan' | 'magenta' | 'lime';
  className?: string;
}

export function AudioVisualizer({
  audioLevel,
  isSpeaking,
  isMuted,
  barsCount = 14,
  height = 24,
  colorScheme = 'cyan',
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
    if (isMuted) return 'bg-rose-500/40';
    if (!isSpeaking) return 'bg-slate-700/60';
    switch (colorScheme) {
      case 'magenta':
        return 'bg-gradient-to-t from-pink-600 to-fuchsia-400 shadow-[0_0_8px_rgba(255,0,127,0.7)]';
      case 'lime':
        return 'bg-gradient-to-t from-lime-600 to-emerald-400 shadow-[0_0_8px_rgba(57,255,20,0.8)]';
      case 'cyan':
      default:
        return 'bg-gradient-to-t from-cyan-600 to-teal-300 shadow-[0_0_8px_rgba(0,240,255,0.7)]';
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
