'use client';

import React from 'react';
import { PeerInfo } from '@/lib/types';
import { AudioVisualizer } from './AudioVisualizer';
import { Mic, MicOff, Volume2, VolumeX, Headphones, Bot, Shield, Signal } from 'lucide-react';

interface PeerCardProps {
  peer: PeerInfo;
  isSelf: boolean;
  volume: number;
  onVolumeChange?: (newVolume: number) => void;
  onPoke?: () => void;
}

export function PeerCard({
  peer,
  isSelf,
  volume,
  onVolumeChange,
  onPoke,
}: PeerCardProps) {
  // Generate consistent vibrant gamer color from avatarSeed
  const getGamerGradient = (seed: string) => {
    const charCode = seed.charCodeAt(0) || 65;
    const gradients = [
      'from-cyan-500 via-blue-600 to-indigo-900',
      'from-fuchsia-500 via-pink-600 to-purple-950',
      'from-emerald-400 via-teal-600 to-cyan-950',
      'from-amber-400 via-orange-600 to-red-950',
      'from-purple-500 via-indigo-600 to-slate-950',
      'from-rose-500 via-pink-600 to-indigo-950',
    ];
    return gradients[charCode % gradients.length];
  };

  const ringGlow = peer.isSpeaking && !peer.isMuted
    ? 'ring-4 ring-emerald-400 shadow-[0_0_24px_rgba(57,255,20,0.8)] border-emerald-300'
    : peer.isMuted
    ? 'border-rose-500/50 opacity-85'
    : 'border-cyan-500/30';

  return (
    <div
      className={`relative group flex flex-col items-center justify-between p-4 rounded-xl border bg-slate-900/80 backdrop-blur-md transition-all duration-200 overflow-hidden ${
        peer.isSpeaking && !peer.isMuted
          ? 'border-emerald-500/80 bg-slate-900/95 shadow-[0_0_20px_rgba(57,255,20,0.25)]'
          : 'border-slate-800 hover:border-cyan-500/50 hover:bg-slate-850'
      }`}
    >
      {/* Decorative cyber corner accents */}
      <div className="absolute top-0 left-0 w-2.5 h-2.5 border-t-2 border-l-2 border-cyan-400" />
      <div className="absolute top-0 right-0 w-2.5 h-2.5 border-t-2 border-r-2 border-pink-500" />
      <div className="absolute bottom-0 left-0 w-2.5 h-2.5 border-b-2 border-l-2 border-cyan-400" />
      <div className="absolute bottom-0 right-0 w-2.5 h-2.5 border-b-2 border-r-2 border-pink-500" />

      {/* Top Header: Ping + Status Badge */}
      <div className="w-full flex items-center justify-between text-xs mb-3">
        <div className="flex items-center gap-1.5 font-mono text-[10px] text-slate-400">
          <Signal className="w-3 h-3 text-emerald-400" />
          <span>{peer.pingMs || 18}ms</span>
        </div>

        {peer.isAiBot ? (
          <span className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-fuchsia-950/80 border border-fuchsia-500/60 text-fuchsia-300 shadow-[0_0_8px_rgba(255,0,127,0.4)]">
            <Bot className="w-3 h-3" /> AI COACH
          </span>
        ) : isSelf ? (
          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-cyan-950/80 border border-cyan-500/60 text-cyan-300 shadow-[0_0_8px_rgba(0,240,255,0.4)]">
            YOU (VOCÊ)
          </span>
        ) : (
          <span className="flex items-center gap-1 text-[10px] text-slate-400 font-mono">
            <Shield className="w-2.5 h-2.5 text-cyan-400" /> SQUAD
          </span>
        )}
      </div>

      {/* Avatar with speaking wave ring */}
      <div className="relative my-2">
        {/* Pulsing ring when talking */}
        {peer.isSpeaking && !peer.isMuted && (
          <div className="absolute -inset-2 rounded-full border-2 border-emerald-400 animate-ping opacity-60 pointer-events-none" />
        )}

        <div
          className={`relative w-20 h-20 rounded-full flex items-center justify-center font-bold text-2xl uppercase text-white shadow-xl transition-all border-2 bg-gradient-to-br ${getGamerGradient(
            peer.avatarSeed || peer.name
          )} ${ringGlow}`}
        >
          {peer.isAiBot ? (
            <Bot className="w-10 h-10 text-cyan-200 animate-pulse" />
          ) : (
            <span>{peer.name.slice(0, 2)}</span>
          )}

          {/* Status Icon Badges */}
          <div className="absolute -bottom-1 -right-1 flex gap-1">
            {peer.isDeafened ? (
              <div
                className="p-1 rounded-full bg-amber-600 text-white shadow-md border border-amber-400"
                title="Ensurdecido (Deafened)"
              >
                <Headphones className="w-3 h-3" />
              </div>
            ) : peer.isMuted ? (
              <div
                className="p-1 rounded-full bg-rose-600 text-white shadow-md border border-rose-400"
                title="Microfone Mutado"
              >
                <MicOff className="w-3 h-3" />
              </div>
            ) : (
              <div
                className="p-1 rounded-full bg-emerald-600 text-white shadow-md border border-emerald-400"
                title="Microfone Ativo"
              >
                <Mic className="w-3 h-3" />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Player Name */}
      <div className="text-center w-full px-2 mt-1">
        <h4 className="font-bold text-sm tracking-wide text-slate-100 truncate max-w-full">
          {peer.name}
        </h4>
        <div className="h-5 flex items-center justify-center mt-1">
          {peer.isMuted ? (
            <span className="text-[11px] font-mono text-rose-400 flex items-center gap-1">
              <MicOff className="w-2.5 h-2.5" /> MUTADO
            </span>
          ) : peer.isSpeaking ? (
            <span className="text-[11px] font-mono text-emerald-400 font-bold flex items-center gap-1 animate-pulse">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" /> FALANDO...
            </span>
          ) : (
            <span className="text-[11px] font-mono text-slate-500">CONECTADO</span>
          )}
        </div>
      </div>

      {/* Mini Audio Visualizer */}
      <div className="w-full my-2 flex justify-center">
        <AudioVisualizer
          audioLevel={peer.audioLevel || (peer.isSpeaking ? 50 : 0)}
          isSpeaking={peer.isSpeaking}
          isMuted={peer.isMuted || peer.isDeafened}
          barsCount={12}
          height={18}
          colorScheme={peer.isAiBot ? 'magenta' : 'lime'}
        />
      </div>

      {/* Peer volume slider (for remote friends) */}
      {!isSelf && onVolumeChange && (
        <div className="w-full pt-2 mt-1 border-t border-slate-800/80">
          <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1">
            <span className="flex items-center gap-1">
              {volume === 0 ? <VolumeX className="w-2.5 h-2.5 text-rose-400" /> : <Volume2 className="w-2.5 h-2.5" />}
              Volume
            </span>
            <span className="font-mono text-cyan-400 font-bold">{Math.round(volume * 100)}%</span>
          </div>
          <input
            type="range"
            min="0"
            max="1.5"
            step="0.05"
            value={volume}
            onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
            className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
          />
        </div>
      )}

      {/* Quick interaction button */}
      {!isSelf && onPoke && (
        <button
          onClick={onPoke}
          className="mt-2 text-[10px] font-mono text-slate-400 hover:text-cyan-300 py-0.5 px-2 rounded hover:bg-slate-800 transition-colors"
        >
          ⚡ Dar Poke
        </button>
      )}
    </div>
  );
}
