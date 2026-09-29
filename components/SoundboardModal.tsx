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
      icon: <Volume2 className="w-5 h-5 text-cyan-400" />,
      category: 'hype',
      color: 'border-cyan-500/50 hover:bg-cyan-950/40 text-cyan-300',
    },
    {
      id: 'victory',
      name: 'VICTORY GG',
      desc: 'Fanfarra de round ganho',
      icon: <Trophy className="w-5 h-5 text-amber-400" />,
      category: 'hype',
      color: 'border-amber-500/50 hover:bg-amber-950/40 text-amber-300',
    },
    {
      id: 'enemy_spotted',
      name: 'ENEMY SPOTTED!',
      desc: 'Alarme duplo de contato visual',
      icon: <ShieldAlert className="w-5 h-5 text-rose-500" />,
      category: 'tactical',
      color: 'border-rose-500/50 hover:bg-rose-950/40 text-rose-300',
    },
    {
      id: 'hitmarker',
      name: 'HITMARKER CRUNCH',
      desc: 'Feedback de headshot certeiro',
      icon: <Crosshair className="w-5 h-5 text-emerald-400" />,
      category: 'tactical',
      color: 'border-emerald-500/50 hover:bg-emerald-950/40 text-emerald-300',
    },
    {
      id: 'coin',
      name: 'LEVEL UP / COIN',
      desc: '8-bit arcade power-up',
      icon: <Sparkles className="w-5 h-5 text-yellow-400" />,
      category: 'meme',
      color: 'border-yellow-500/50 hover:bg-yellow-950/40 text-yellow-300',
    },
    {
      id: 'nuke',
      name: 'NUKE / RED ALERT',
      desc: 'Sirene de clutch ou perigo iminente',
      icon: <Radio className="w-5 h-5 text-red-500" />,
      category: 'tactical',
      color: 'border-red-500/50 hover:bg-red-950/40 text-red-300',
    },
    {
      id: 'rush_b',
      name: 'RUSH B DROP',
      desc: 'Sub-bass agressivo para rushar',
      icon: <Bomb className="w-5 h-5 text-fuchsia-400" />,
      category: 'hype',
      color: 'border-fuchsia-500/50 hover:bg-fuchsia-950/40 text-fuchsia-300',
    },
  ];

  const handlePlay = (id: string) => {
    triggerSfxById(id);
    onBroadcastSfx(id);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-xl p-6 rounded-2xl bg-slate-900 border border-cyan-500/40 shadow-[0_0_40px_rgba(0,240,255,0.2)]">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Zap className="w-6 h-6 text-cyan-400 animate-pulse" />
            <div>
              <h3 className="text-lg font-black tracking-wide text-white uppercase flex items-center gap-2">
                SOUNDBOARD TÁTICO
                <span className="text-[10px] px-2 py-0.5 rounded bg-cyan-950 text-cyan-400 border border-cyan-500/40">
                  LIVE SYNC
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Toque para tocar no seu fone e no fone de todo o esquadrão em tempo real.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
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
              className={`flex items-center gap-3.5 p-3.5 rounded-xl border bg-slate-950/80 transition-all text-left group active:scale-95 ${sound.color}`}
            >
              <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 group-hover:scale-110 transition-transform">
                {sound.icon}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-bold text-sm tracking-wide flex items-center justify-between">
                  <span className="truncate">{sound.name}</span>
                  <span className="text-[10px] opacity-70 uppercase font-mono">{sound.category}</span>
                </div>
                <div className="text-xs text-slate-400 truncate">{sound.desc}</div>
              </div>
            </button>
          ))}
        </div>

        {/* Footer info */}
        <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <span className="font-mono text-[11px]">Sintetizador Web Audio API • 0 latência</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-medium transition-colors"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
