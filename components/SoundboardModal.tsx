'use client';

import React from 'react';
import { triggerSfxById } from '@/lib/soundEffects';
import { Volume2, Zap, X, ShieldAlert, Trophy, Crosshair, Sparkles, Radio, Bomb } from 'lucide-react';

interface SoundboardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onBroadcastSfx: (sfxId: string) => void;
}

interface SfxItem {
  id: string;
  name: string;
  desc: string;
  icon: React.ReactNode;
  category: 'hype' | 'tactical' | 'meme';
  color: string;
}

export function SoundboardModal({ isOpen, onClose, onBroadcastSfx }: SoundboardModalProps) {
  if (!isOpen) return null;

  const soundList: SfxItem[] = [
    {
      id: 'airhorn',
      name: 'AIRHORN CLUTCH',
      desc: 'Triple blaster de comemoração',
      icon: <Volume2 className="w-5 h-5 text-red-400" />,
      category: 'hype',
      color: 'border-red-900/60 hover:border-red-500 hover:bg-red-950/50 text-red-300',
    },
    {
      id: 'victory',
      name: 'VICTORY GG',
      desc: 'Fanfarra de round ganho',
      icon: <Trophy className="w-5 h-5 text-amber-400" />,
      category: 'hype',
      color: 'border-amber-900/60 hover:border-amber-500 hover:bg-amber-950/50 text-amber-300',
    },
    {
      id: 'enemy_spotted',
      name: 'ENEMY SPOTTED!',
      desc: 'Alarme duplo de contato visual',
      icon: <ShieldAlert className="w-5 h-5 text-red-500" />,
      category: 'tactical',
      color: 'border-red-700 hover:border-red-400 hover:bg-red-950/70 text-red-200',
    },
    {
      id: 'hitmarker',
      name: 'HITMARKER CRUNCH',
      desc: 'Feedback de headshot certeiro',
      icon: <Crosshair className="w-5 h-5 text-rose-400" />,
      category: 'tactical',
      color: 'border-rose-900/60 hover:border-rose-500 hover:bg-rose-950/50 text-rose-300',
    },
    {
      id: 'coin',
      name: 'LEVEL UP / COIN',
      desc: '8-bit arcade power-up',
      icon: <Sparkles className="w-5 h-5 text-yellow-400" />,
      category: 'meme',
      color: 'border-yellow-900/60 hover:border-yellow-500 hover:bg-yellow-950/50 text-yellow-300',
    },
    {
      id: 'nuke',
      name: 'NUKE / RED ALERT',
      desc: 'Sirene de clutch ou perigo iminente',
      icon: <Radio className="w-5 h-5 text-red-500" />,
      category: 'tactical',
      color: 'border-red-600 hover:border-red-400 hover:bg-red-950/80 text-red-100',
    },
    {
      id: 'rush_b',
      name: 'RUSH B DROP',
      desc: 'Sub-bass agressivo para rushar',
      icon: <Bomb className="w-5 h-5 text-rose-400" />,
      category: 'hype',
      color: 'border-red-800/80 hover:border-red-500 hover:bg-red-950/60 text-red-200',
    },
  ];

  const handlePlay = (id: string) => {
    triggerSfxById(id);
    onBroadcastSfx(id);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-xl p-6 rounded-2xl bg-zinc-950 border border-red-600/40 shadow-[0_0_50px_rgba(255,0,55,0.25)]">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-red-950/70">
          <div className="flex items-center gap-2">
            <Zap className="w-6 h-6 text-red-500 animate-pulse" />
            <div>
              <h3 className="text-lg font-black tracking-wide text-white uppercase flex items-center gap-2">
                SOUNDBOARD TÁTICO
                <span className="text-[10px] px-2 py-0.5 rounded bg-red-950 text-red-400 border border-red-500/40 font-mono">
                  LIVE SYNC
                </span>
              </h3>
              <p className="text-xs text-zinc-400">
                Toque para tocar no seu fone e no fone de todo o esquadrão em tempo real.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-900 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Sound Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 my-5 max-h-[60vh] overflow-y-auto pr-1">
          {soundList.map((sound) => (
            <button
              key={sound.id}
              onClick={() => handlePlay(sound.id)}
              className={`flex items-center gap-3.5 p-3.5 rounded-xl border bg-black/80 transition-all text-left group active:scale-95 ${sound.color}`}
            >
              <div className="p-2.5 rounded-lg bg-zinc-900 border border-zinc-800 group-hover:scale-110 transition-transform">
                {sound.icon}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-bold text-sm tracking-wide flex items-center justify-between">
                  <span className="truncate">{sound.name}</span>
                  <span className="text-[10px] opacity-70 uppercase font-mono">{sound.category}</span>
                </div>
                <div className="text-xs text-zinc-400 truncate">{sound.desc}</div>
              </div>
            </button>
          ))}
        </div>

        {/* Footer info */}
        <div className="pt-3 border-t border-red-950/70 flex items-center justify-between text-xs text-zinc-400">
          <span className="font-mono text-[11px] text-red-400/80">Sintetizador Web Audio API • 0 latência</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-white font-medium transition-colors border border-zinc-800 hover:border-red-900"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
