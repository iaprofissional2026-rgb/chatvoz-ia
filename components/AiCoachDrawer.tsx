'use client';

import React, { useState } from 'react';
import { Bot, Sparkles, Trophy, Flame, Volume2, X, Send, Shield } from 'lucide-react';

interface AiCoachDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  squadMembers: string[];
  onBroadcastCoachMessage: (text: string) => void;
}

const SUPPORTED_GAMES = [
  'Counter-Strike 2 (CS2)',
  'Valorant',
  'Call of Duty: Warzone',
  'Fortnite',
  'League of Legends',
  'Free Fire',
  'Rainbow Six Siege',
  'Apex Legends',
  'Overwatch 2',
  'Geral / Custom Game',
];

export function AiCoachDrawer({
  isOpen,
  onClose,
  squadMembers,
  onBroadcastCoachMessage,
}: AiCoachDrawerProps) {
  const [selectedGame, setSelectedGame] = useState(SUPPORTED_GAMES[0]);
  const [customQuestion, setCustomQuestion] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [lastResponse, setLastResponse] = useState<string | null>(null);

  if (!isOpen) return null;

  const speakText = (text: string) => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'pt-BR';
      utterance.pitch = 0.95;
      utterance.rate = 1.1; // Fast tactical speech
      window.speechSynthesis.speak(utterance);
    }
  };

  const handleAction = async (action: 'callout' | 'hype' | 'gg' | 'custom') => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/gemini/coach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          game: selectedGame,
          prompt: action === 'custom' ? customQuestion : undefined,
          squadNames: squadMembers,
        }),
      });

      const data = await res.json();
      const text = data.text || '🔥 Call limpa squad! Reagrupem e mantenham a calma!';
      setLastResponse(text);
      onBroadcastCoachMessage(text);
      speakText(text);
      if (action === 'custom') setCustomQuestion('');
    } catch {
      const fallback = '⚡ APEX-9: "Foco no objetivo! Vamos jogar pelo round!"';
      setLastResponse(fallback);
      onBroadcastCoachMessage(fallback);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-lg p-6 rounded-2xl bg-slate-900 border border-fuchsia-500/40 shadow-[0_0_40px_rgba(255,0,127,0.2)]">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-fuchsia-950/80 border border-fuchsia-500/60 shadow-[0_0_15px_rgba(255,0,127,0.4)]">
              <Bot className="w-6 h-6 text-fuchsia-400 animate-pulse" />
            </div>
            <div>
              <h3 className="text-base font-black tracking-wide text-white uppercase flex items-center gap-2">
                APEX-9 // AI SQUAD COACH
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-fuchsia-950 text-fuchsia-400 border border-fuchsia-500/40">
                  GEMINI 2.5
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Assistente tático em tempo real para animar o squad e passar calls
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

        <div className="my-5 space-y-4 max-h-[60vh] overflow-y-auto pr-1">
          {/* Game Selector */}
          <div>
            <label className="block text-xs font-mono uppercase text-slate-300 mb-1.5 flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-fuchsia-400" />
              Jogo do Esquadrão
            </label>
            <select
              value={selectedGame}
              onChange={(e) => setSelectedGame(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none focus:border-fuchsia-400 font-semibold"
            >
              {SUPPORTED_GAMES.map((game) => (
                <option key={game} value={game}>
                  {game}
                </option>
              ))}
            </select>
          </div>

          {/* Quick Action Buttons */}
          <div>
            <div className="text-xs font-mono uppercase text-slate-400 mb-2">
              Comandos Rápidos do Coach (com Voz e Chat):
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <button
                onClick={() => handleAction('callout')}
                disabled={isLoading}
                className="p-3 rounded-xl bg-slate-950 border border-cyan-500/50 hover:bg-cyan-950/40 text-cyan-300 text-left transition-all active:scale-95 disabled:opacity-50"
              >
                <div className="flex items-center gap-1.5 font-bold text-xs mb-1">
                  <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                  Call Tática
                </div>
                <div className="text-[10px] text-slate-400">Estratégia agressiva de round</div>
              </button>

              <button
                onClick={() => handleAction('hype')}
                disabled={isLoading}
                className="p-3 rounded-xl bg-slate-950 border border-amber-500/50 hover:bg-amber-950/40 text-amber-300 text-left transition-all active:scale-95 disabled:opacity-50"
              >
                <div className="flex items-center gap-1.5 font-bold text-xs mb-1">
                  <Flame className="w-3.5 h-3.5 text-amber-400" />
                  Hype Squad
                </div>
                <div className="text-[10px] text-slate-400">Levantar a moral pro clutch</div>
              </button>

              <button
                onClick={() => handleAction('gg')}
                disabled={isLoading}
                className="p-3 rounded-xl bg-slate-950 border border-emerald-500/50 hover:bg-emerald-950/40 text-emerald-300 text-left transition-all active:scale-95 disabled:opacity-50"
              >
                <div className="flex items-center gap-1.5 font-bold text-xs mb-1">
                  <Trophy className="w-3.5 h-3.5 text-emerald-400" />
                  Discurso GG
                </div>
                <div className="text-[10px] text-slate-400">Comemorar round ganho</div>
              </button>
            </div>
          </div>

          {/* Custom Question input */}
          <div className="pt-2">
            <label className="block text-xs font-mono uppercase text-slate-400 mb-1.5">
              Ou faça uma pergunta tática customizada:
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={customQuestion}
                onChange={(e) => setCustomQuestion(e.target.value)}
                placeholder="Ex: Como counterar a estratégia deles no bomb A?"
                className="flex-1 px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none focus:border-fuchsia-400"
              />
              <button
                onClick={() => handleAction('custom')}
                disabled={isLoading || !customQuestion.trim()}
                className="px-3 py-2 rounded-xl bg-fuchsia-600 hover:bg-fuchsia-500 disabled:opacity-40 text-white font-bold text-xs transition-all flex items-center gap-1"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Response Box */}
          {isLoading && (
            <div className="p-4 rounded-xl bg-slate-950/80 border border-fuchsia-500/30 flex items-center justify-center gap-2 text-xs font-mono text-fuchsia-300 animate-pulse">
              <Bot className="w-4 h-4 animate-spin" />
              APEX-9 PROCESSANDO CALL TÁTICA...
            </div>
          )}

          {lastResponse && !isLoading && (
            <div className="p-3.5 rounded-xl bg-gradient-to-br from-fuchsia-950/50 to-slate-950 border border-fuchsia-500/40 shadow-md">
              <div className="flex items-center justify-between text-[11px] font-bold text-fuchsia-300 mb-1">
                <span className="flex items-center gap-1">
                  <Bot className="w-3.5 h-3.5" /> ÚLTIMA TRANSMISSÃO DO APEX-9:
                </span>
                <button
                  onClick={() => speakText(lastResponse)}
                  className="flex items-center gap-1 text-[10px] text-cyan-400 hover:underline"
                >
                  <Volume2 className="w-3 h-3" /> Repetir Voz
                </button>
              </div>
              <p className="text-xs text-slate-200 leading-relaxed font-medium">
                {lastResponse}
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <span className="text-[10px] font-mono">Conectado ao Gemini 2.5 Flash</span>
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
