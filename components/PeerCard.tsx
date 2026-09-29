'use client';

import React, { useEffect, useRef } from 'react';
import { PeerInfo } from '@/lib/types';
import { AudioVisualizer } from './AudioVisualizer';
import { Mic, MicOff, Volume2, VolumeX, Headphones, Bot, Shield, Signal, Radio } from 'lucide-react';

interface PeerCardProps {
  peer: PeerInfo;
  isSelf: boolean;
  volume: number;
  stream?: MediaStream | null;
  onVolumeChange?: (newVolume: number) => void;
  onPoke?: () => void;
  onAudioError?: () => void;
}

export function PeerCard({
  peer,
  isSelf,
  volume,
  stream,
  onVolumeChange,
  onPoke,
  onAudioError,
}: PeerCardProps) {
  const audioElRef = useRef<HTMLAudioElement | null>(null);

  // Attach and play remote stream in DOM audio element
  useEffect(() => {
    if (isSelf || !audioElRef.current) return;

    if (stream) {
      audioElRef.current.srcObject = stream;
      audioElRef.current.volume = Math.min(1, Math.max(0, volume));
      audioElRef.current.play().catch((err) => {
        console.warn('Audio play prevented by browser policy:', err);
        onAudioError?.();
      });
    } else {
      audioElRef.current.srcObject = null;
    }
  }, [stream, isSelf, volume, onAudioError]);

  // Sync volume changes to audio element
  useEffect(() => {
    if (audioElRef.current) {
      audioElRef.current.volume = Math.min(1, Math.max(0, volume));
    }
  }, [volume]);

  // Generate consistent vibrant gamer color from avatarSeed in Red & Black theme
  const getGamerGradient = (seed: string) => {
    const charCode = seed.charCodeAt(0) || 65;
    const gradients = [
      'from-red-600 via-rose-700 to-black',
      'from-rose-600 via-red-800 to-zinc-950',
      'from-red-500 via-neutral-900 to-black',
      'from-amber-600 via-red-700 to-black',
      'from-red-700 via-zinc-800 to-black',
      'from-rose-700 via-red-900 to-zinc-950',
    ];
    return gradients[charCode % gradients.length];
  };

  const ringGlow = peer.isSpeaking && !peer.isMuted
    ? 'ring-4 ring-red-500 shadow-[0_0_24px_rgba(255,0,55,0.85)] border-red-400'
    : peer.isMuted
    ? 'border-red-950/70 opacity-80'
    : 'border-red-900/40';

  return (
    <div
      className={`relative group flex flex-col items-center justify-between p-4 rounded-xl border bg-black/90 backdrop-blur-md transition-all duration-200 overflow-hidden ${
        peer.isSpeaking && !peer.isMuted
          ? 'border-red-600/90 bg-zinc-950/95 shadow-[0_0_20px_rgba(255,0,55,0.3)]'
          : 'border-red-950/60 hover:border-red-600/60 hover:bg-zinc-950/90'
      }`}
    >
      {/* Hidden real DOM audio element for remote squadmate */}
      {!isSelf && (
        <audio
          ref={audioElRef}
          autoPlay
          playsInline
          className="hidden"
          aria-hidden="true"
        />
      )}

      {/* Decorative cyber corner accents in Red */}
      <div className="absolute top-0 left-0 w-2.5 h-2.5 border-t-2 border-l-2 border-red-500" />
      <div className="absolute top-0 right-0 w-2.5 h-2.5 border-t-2 border-r-2 border-red-500" />
      <div className="absolute bottom-0 left-0 w-2.5 h-2.5 border-b-2 border-l-2 border-red-500" />
      <div className="absolute bottom-0 right-0 w-2.5 h-2.5 border-b-2 border-r-2 border-red-500" />

      {/* Top Header: Ping + Status Badge */}
      <div className="w-full flex items-center justify-between text-xs mb-3">
        <div className="flex items-center gap-1.5 font-mono text-[10px] text-zinc-400">
          <Signal className="w-3 h-3 text-red-500" />
          <span>{peer.pingMs || 18}ms</span>
          {!isSelf && stream && (
            <span className="flex items-center gap-0.5 text-red-400 font-bold ml-1">
              <Radio className="w-2.5 h-2.5 animate-pulse" /> P2P
            </span>
          )}
        </div>

        {peer.isAiBot ? (
          <span className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-950/80 border border-red-500/60 text-red-400 shadow-[0_0_8px_rgba(255,0,55,0.4)]">
            <Bot className="w-3 h-3" /> AI COACH
          </span>
        ) : isSelf ? (
          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-950/80 border border-red-600/60 text-red-400 shadow-[0_0_8px_rgba(255,0,55,0.4)]">
            YOU (VOCÊ)
          </span>
        ) : (
          <span className="flex items-center gap-1 text-[10px] text-zinc-400 font-mono">
            <Shield className="w-2.5 h-2.5 text-red-500" /> SQUAD
          </span>
        )}
      </div>

      {/* Avatar with speaking wave ring */}
      <div className="relative my-2">
        {/* Pulsing ring when talking */}
        {peer.isSpeaking && !peer.isMuted && (
          <div className="absolute -inset-2 rounded-full border-2 border-red-500 animate-ping opacity-60 pointer-events-none" />
        )}

        <div
          className={`relative w-20 h-20 rounded-full flex items-center justify-center font-bold text-2xl uppercase text-white shadow-xl transition-all border-2 bg-gradient-to-br ${getGamerGradient(
            peer.avatarSeed || peer.name
          )} ${ringGlow}`}
        >
          {peer.isAiBot ? (
            <Bot className="w-10 h-10 text-red-300 animate-pulse" />
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
                className="p-1 rounded-full bg-red-800 text-white shadow-md border border-red-500"
                title="Microfone Mutado"
              >
                <MicOff className="w-3 h-3" />
              </div>
            ) : (
              <div
                className="p-1 rounded-full bg-red-600 text-white shadow-md border border-red-400"
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
        <h4 className="font-bold text-sm tracking-wide text-zinc-100 truncate max-w-full">
          {peer.name}
        </h4>
        <div className="h-5 flex items-center justify-center mt-1">
          {peer.isMuted ? (
            <span className="text-[11px] font-mono text-red-400 flex items-center gap-1">
              <MicOff className="w-2.5 h-2.5" /> MUTADO
            </span>
          ) : peer.isSpeaking ? (
            <span className="text-[11px] font-mono text-red-500 font-bold flex items-center gap-1 animate-pulse">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 inline-block" /> FALANDO...
            </span>
          ) : (
            <span className="text-[11px] font-mono text-zinc-500">
              {!isSelf && stream ? 'ÁUDIO ATIVO' : 'CONECTADO'}
            </span>
          )}
        </div>
      </div>

      {/* Audio Visualizer Meter in Red */}
      <div className="w-full my-2 flex justify-center">
        <AudioVisualizer
          audioLevel={peer.audioLevel || (peer.isSpeaking ? 55 : 0)}
          isSpeaking={peer.isSpeaking}
          isMuted={peer.isMuted || peer.isDeafened}
          barsCount={14}
          height={20}
          colorScheme="red"
        />
      </div>

      {/* Peer volume slider (for remote friends) */}
      {!isSelf && onVolumeChange && (
        <div className="w-full pt-2 mt-1 border-t border-red-950/60">
          <div className="flex items-center justify-between text-[10px] text-zinc-400 mb-1">
            <span className="flex items-center gap-1">
              {volume === 0 ? <VolumeX className="w-2.5 h-2.5 text-red-500" /> : <Volume2 className="w-2.5 h-2.5" />}
              Volume
            </span>
            <span className="font-mono text-red-400 font-bold">{Math.round(volume * 100)}%</span>
          </div>
          <input
            type="range"
            min="0"
            max="1.5"
            step="0.05"
            value={volume}
            onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
            className="w-full h-1 bg-zinc-900 rounded-lg appearance-none cursor-pointer accent-red-500"
          />
        </div>
      )}

      {/* Quick interaction button */}
      {!isSelf && onPoke && (
        <button
          onClick={onPoke}
          className="mt-2 text-[10px] font-mono text-zinc-400 hover:text-red-400 py-0.5 px-2 rounded hover:bg-red-950/40 transition-colors"
        >
          ⚡ Dar Poke
        </button>
      )}
    </div>
  );
}
