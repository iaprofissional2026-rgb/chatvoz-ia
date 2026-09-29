'use client';

import React from 'react';

interface GamerLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'hero';
  showText?: boolean;
  className?: string;
  glow?: boolean;
}

export function GamerLogo({
  size = 'md',
  showText = true,
  className = '',
  glow = true,
}: GamerLogoProps) {
  const sizeMap = {
    sm: { icon: 36, text: 'text-lg', sub: 'text-[9px]' },
    md: { icon: 48, text: 'text-xl', sub: 'text-[10px]' },
    lg: { icon: 64, text: 'text-2xl', sub: 'text-xs' },
    hero: { icon: 88, text: 'text-4xl', sub: 'text-sm' },
  };

  const currentSize = sizeMap[size];

  return (
    <div className={`flex items-center gap-3.5 select-none ${className}`}>
      {/* Aggressive Gamer Futuristic Neon Logo Icon */}
      <div
        className={`relative flex items-center justify-center transition-transform hover:scale-105 ${
          glow ? 'drop-shadow-[0_0_18px_rgba(0,240,255,0.7)]' : ''
        }`}
        style={{ width: currentSize.icon, height: currentSize.icon }}
      >
        <svg
          viewBox="0 0 100 100"
          className="w-full h-full overflow-visible"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <linearGradient id="neonCyanPink" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#00F0FF" />
              <stop offset="50%" stopColor="#8A2BE2" />
              <stop offset="100%" stopColor="#FF007F" />
            </linearGradient>

            <linearGradient id="cyberArmor" x1="50%" y1="0%" x2="50%" y2="100%">
              <stop offset="0%" stopColor="#1E293B" />
              <stop offset="100%" stopColor="#090D16" />
            </linearGradient>

            <linearGradient id="limeGlow" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#39FF14" />
              <stop offset="100%" stopColor="#00F0FF" />
            </linearGradient>

            <filter id="neonBlur" x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation="3.5" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Background Outer Cyber Shield Frame */}
          <polygon
            points="50,4 88,18 96,62 50,96 4,62 12,18"
            fill="url(#cyberArmor)"
            stroke="url(#neonCyanPink)"
            strokeWidth="3.2"
            strokeLinejoin="round"
            className="transition-all"
          />

          {/* Outer Cyber Decorative Angular Flares */}
          <path
            d="M50 8 L82 20 L89 58 L50 88 L11 58 L18 20 Z"
            fill="#0B0F19"
            stroke="#1E293B"
            strokeWidth="1.5"
          />

          {/* Aggressive Headset Arch */}
          <path
            d="M24 45 C24 24 76 24 76 45"
            stroke="url(#neonCyanPink)"
            strokeWidth="5"
            strokeLinecap="round"
            filter="url(#neonBlur)"
          />
          <path
            d="M24 45 C24 24 76 24 76 45"
            stroke="#FFFFFF"
            strokeWidth="1.8"
            strokeLinecap="round"
          />

          {/* Left Headset Ear Cup - Angular Cyber Design */}
          <polygon
            points="14,40 28,34 31,58 17,64"
            fill="#0f172a"
            stroke="#00F0FF"
            strokeWidth="2.5"
          />
          <line x1="21" y1="42" x2="24" y2="56" stroke="#00F0FF" strokeWidth="2" />

          {/* Right Headset Ear Cup */}
          <polygon
            points="86,40 72,34 69,58 83,64"
            fill="#0f172a"
            stroke="#FF007F"
            strokeWidth="2.5"
          />
          <line x1="79" y1="42" x2="76" y2="56" stroke="#FF007F" strokeWidth="2" />

          {/* Headset Boom Microphone with glowing tip */}
          <path
            d="M26 58 Q32 78 48 76"
            stroke="#00F0FF"
            strokeWidth="3"
            strokeLinecap="round"
          />
          <circle cx="49" cy="76" r="4.5" fill="#39FF14" filter="url(#neonBlur)" />
          <circle cx="49" cy="76" r="2.2" fill="#FFFFFF" />

          {/* Aggressive Cyber Wolf / Skull Visor Geometry */}
          {/* Forehead Crest */}
          <polygon points="50,22 42,32 50,37 58,32" fill="#00F0FF" />

          {/* Angular Neon Eyes / Visor */}
          <polygon
            points="34,44 46,47 44,52 32,48"
            fill="#39FF14"
            filter="url(#neonBlur)"
          />
          <polygon
            points="66,44 54,47 56,52 68,48"
            fill="#39FF14"
            filter="url(#neonBlur)"
          />

          {/* Center Mecha Nose & Snout Plates */}
          <polygon points="50,42 47,56 50,62 53,56" fill="#1E293B" stroke="#00F0FF" strokeWidth="1" />
          <polygon points="46,63 50,71 54,63 50,65" fill="#FF007F" />

          {/* Lower Jaw Cyber Spikes */}
          <polygon points="40,68 44,79 47,70" fill="#00F0FF" />
          <polygon points="60,68 56,79 53,70" fill="#FF007F" />

          {/* Glowing Equalizer Frequency Bars inside shield bottom */}
          <rect x="36" y="83" width="3" height="5" rx="1.5" fill="#00F0FF" />
          <rect x="42" y="80" width="3" height="8" rx="1.5" fill="#39FF14" />
          <rect x="48" y="78" width="4" height="10" rx="2" fill="#FFFFFF" />
          <rect x="55" y="80" width="3" height="8" rx="1.5" fill="#39FF14" />
          <rect x="61" y="83" width="3" height="5" rx="1.5" fill="#FF007F" />
        </svg>

        {/* Outer subtle radar ping effect */}
        <div className="absolute inset-0 rounded-full border border-cyan-400/20 animate-pulse pointer-events-none -m-1" />
      </div>

      {/* Brand Typography */}
      {showText && (
        <div className="flex flex-col tracking-tight">
          <div className="flex items-center gap-1.5">
            <span
              className={`font-black tracking-wider uppercase bg-gradient-to-r from-cyan-400 via-fuchsia-400 to-pink-500 bg-clip-text text-transparent italic ${currentSize.text}`}
              style={{
                fontFamily:
                  'Impact, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
              }}
            >
              VORTEX
            </span>
            <span className="text-xs px-1.5 py-0.5 font-bold uppercase rounded bg-cyan-950/90 text-cyan-300 border border-cyan-500/50 shadow-[0_0_8px_rgba(0,240,255,0.4)] tracking-widest">
              VOICE
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping inline-block" />
            <span className={`font-mono uppercase tracking-[0.22em] text-slate-400 ${currentSize.sub}`}>
              LOW-LATENCY // SQUAD COMMS
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
