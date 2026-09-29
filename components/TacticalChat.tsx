'use client';

import React, { useState, useRef, useEffect } from 'react';
import { ChatMessage } from '@/lib/types';
import { Send, MessageSquare, ShieldAlert, Sparkles, VolumeX, Bot } from 'lucide-react';

interface TacticalChatProps {
  messages: ChatMessage[];
  onSendMessage: (text: string, isQuickCallout?: boolean) => void;
  currentUserId: string;
}

const QUICK_CALLS = [
  { label: '🚨 INIMIGO AQUI!', text: '🚨 INIMIGO SPOTTED! Atenção nas costas!' },
  { label: '⚡ RUSH AGORA!', text: '⚡ BORA RUSHAR! Todos juntos!' },
  { label: '🤫 SEGURA CALL / CLUTCH', text: '🤫 SILÊNCIO NA CALL! Deixa o clutch!' },
  { label: '🏆 GG WP!', text: '🏆 GG WP! Que partidaça rapaziada!' },
  { label: '🎯 DROP ARMA', text: '🎯 Alguém dropa arma pra mim?' },
  { label: '🛡️ RECUA / REAGRUPA', text: '🛡️ Recua e reagrupa! Não abre pixel!' },
];

export function TacticalChat({ messages, onSendMessage, currentUserId }: TacticalChatProps) {
  const [inputText, setInputText] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    onSendMessage(inputText.trim());
    setInputText('');
  };

  const handleQuickCall = (callText: string) => {
    onSendMessage(callText, true);
  };

  return (
    <div className="flex flex-col h-full bg-slate-900/90 rounded-2xl border border-slate-800 backdrop-blur-md overflow-hidden shadow-xl">
      {/* Header */}
      <div className="px-4 py-3 border-b border-slate-800 bg-slate-950/60 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-cyan-400" />
          <h3 className="font-bold text-xs tracking-wider uppercase text-slate-200">
            COMMS TEXT & PINGS
          </h3>
        </div>
        <span className="text-[10px] font-mono text-cyan-400 bg-cyan-950/80 px-2 py-0.5 rounded border border-cyan-500/30">
          {messages.length} MSGS
        </span>
      </div>

      {/* Quick Tactical Callout Buttons */}
      <div className="p-2 border-b border-slate-800/80 bg-slate-950/40">
        <div className="text-[10px] uppercase font-mono text-slate-400 mb-1.5 px-1 flex items-center gap-1">
          <Sparkles className="w-2.5 h-2.5 text-amber-400" />
          Calls Rápidas de 1-Click:
        </div>
        <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {QUICK_CALLS.map((qc, idx) => (
            <button
              key={idx}
              onClick={() => handleQuickCall(qc.text)}
              className="whitespace-nowrap px-2 py-1 rounded bg-slate-800/90 hover:bg-cyan-900/60 border border-slate-700/60 hover:border-cyan-500 text-[11px] font-semibold text-slate-200 transition-all active:scale-95 shadow-sm"
            >
              {qc.label}
            </button>
          ))}
        </div>
      </div>

      {/* Message List */}
      <div className="flex-1 p-3 overflow-y-auto space-y-2.5 min-h-[180px] max-h-[360px]">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-4 text-slate-500 text-xs">
            <ShieldAlert className="w-6 h-6 mb-2 text-slate-600" />
            <p>Nenhuma mensagem ainda.</p>
            <p className="text-[10px] text-slate-600 mt-1">
              Use o chat para coordenar jogadas ou mandar pings rápidos.
            </p>
          </div>
        ) : (
          messages.map((msg) => {
            const isSelf = msg.senderId === currentUserId;

            if (msg.isSystem) {
              return (
                <div key={msg.id} className="text-center my-1">
                  <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-mono bg-slate-800 text-slate-400 border border-slate-700">
                    {msg.text}
                  </span>
                </div>
              );
            }

            if (msg.isAi) {
              return (
                <div
                  key={msg.id}
                  className="p-2.5 rounded-xl bg-gradient-to-r from-fuchsia-950/60 to-purple-950/40 border border-fuchsia-500/40 shadow-sm"
                >
                  <div className="flex items-center gap-1.5 text-[11px] font-bold text-fuchsia-300 mb-1">
                    <Bot className="w-3.5 h-3.5 text-fuchsia-400" />
                    <span>APEX-9 TACTICAL AI</span>
                    <span className="text-[9px] font-mono text-fuchsia-400/70 ml-auto">
                      {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className="text-xs text-fuchsia-100 font-medium leading-relaxed">
                    {msg.text}
                  </p>
                </div>
              );
            }

            return (
              <div
                key={msg.id}
                className={`flex flex-col ${isSelf ? 'items-end' : 'items-start'}`}
              >
                <div className="flex items-center gap-1.5 mb-0.5 px-1">
                  <span className="text-[10px] font-bold text-slate-400">
                    {isSelf ? 'Você' : msg.senderName}
                  </span>
                  <span className="text-[9px] font-mono text-slate-500">
                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <div
                  className={`px-3 py-1.5 rounded-xl text-xs max-w-[85%] leading-relaxed ${
                    msg.quickCallout
                      ? 'bg-amber-950/80 border border-amber-500/60 text-amber-200 font-bold shadow-[0_0_10px_rgba(255,183,0,0.2)]'
                      : isSelf
                      ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-md'
                      : 'bg-slate-800 text-slate-200 border border-slate-700/80'
                  }`}
                >
                  {msg.text}
                </div>
              </div>
            );
          })
        )}
        <div ref={chatEndRef} />
      </div>

      {/* Input Form */}
      <form onSubmit={handleSubmit} className="p-2 border-t border-slate-800 bg-slate-950/70 flex gap-2">
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="Mandar mensagem ou call..."
          className="flex-1 px-3 py-2 rounded-xl bg-slate-900 border border-slate-700/80 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400"
        />
        <button
          type="submit"
          disabled={!inputText.trim()}
          className="p-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 disabled:opacity-40 disabled:hover:bg-cyan-500 text-slate-950 font-bold transition-all"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
}
