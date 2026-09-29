'use client';

import React, { useState, useRef, useEffect } from 'react';
import { ChatMessage } from '@/lib/types';
import { Send, MessageSquare, ShieldAlert, Sparkles, Bot } from 'lucide-react';

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
    <div className="flex flex-col h-full bg-black/90 rounded-2xl border border-red-950/70 backdrop-blur-md overflow-hidden shadow-2xl">
      {/* Header */}
      <div className="px-4 py-3 border-b border-red-950/60 bg-zinc-950/80 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-red-500" />
          <h3 className="font-bold text-xs tracking-wider uppercase text-zinc-200">
            COMMS TEXT & PINGS
          </h3>
        </div>
        <span className="text-[10px] font-mono text-red-400 bg-red-950/80 px-2 py-0.5 rounded border border-red-500/30">
          {messages.length} MSGS
        </span>
      </div>

      {/* Quick Tactical Callout Buttons */}
      <div className="p-2 border-b border-red-950/50 bg-zinc-950/60">
        <div className="text-[10px] uppercase font-mono text-zinc-400 mb-1.5 px-1 flex items-center gap-1">
          <Sparkles className="w-2.5 h-2.5 text-red-400" />
          Calls Rápidas de 1-Click:
        </div>
        <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {QUICK_CALLS.map((qc, idx) => (
            <button
              key={idx}
              onClick={() => handleQuickCall(qc.text)}
              className="whitespace-nowrap px-2 py-1 rounded bg-zinc-900/90 hover:bg-red-950/80 border border-red-950 hover:border-red-500 text-[11px] font-semibold text-zinc-200 transition-all active:scale-95 shadow-sm"
            >
              {qc.label}
            </button>
          ))}
        </div>
      </div>

      {/* Message List */}
      <div className="flex-1 p-3 overflow-y-auto space-y-2.5 min-h-[180px] max-h-[360px]">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-4 text-zinc-600 text-xs">
            <ShieldAlert className="w-6 h-6 mb-2 text-zinc-700" />
            <p>Nenhuma mensagem ainda.</p>
            <p className="text-[10px] text-zinc-600 mt-1">
              Use o chat para coordenar jogadas ou mandar pings rápidos.
            </p>
          </div>
        ) : (
          messages.map((msg) => {
            const isSelf = msg.senderId === currentUserId;

            if (msg.isSystem) {
              return (
                <div key={msg.id} className="text-center my-1">
                  <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-mono bg-zinc-900 text-zinc-400 border border-zinc-800">
                    {msg.text}
                  </span>
                </div>
              );
            }

            if (msg.isAi) {
              return (
                <div
                  key={msg.id}
                  className="p-2.5 rounded-xl bg-gradient-to-r from-red-950/80 to-zinc-950 border border-red-600/40 shadow-sm"
                >
                  <div className="flex items-center gap-1.5 text-[11px] font-bold text-red-400 mb-1">
                    <Bot className="w-3.5 h-3.5 text-red-500" />
                    <span>APEX-9 TACTICAL AI</span>
                    <span className="text-[9px] font-mono text-red-500/70 ml-auto">
                      {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className="text-xs text-red-100 font-medium leading-relaxed">
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
                  <span className="text-[10px] font-bold text-zinc-400">
                    {isSelf ? 'Você' : msg.senderName}
                  </span>
                  <span className="text-[9px] font-mono text-zinc-600">
                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <div
                  className={`px-3 py-1.5 rounded-xl text-xs max-w-[85%] leading-relaxed ${
                    msg.quickCallout
                      ? 'bg-red-950/90 border border-red-500 text-red-200 font-bold shadow-[0_0_12px_rgba(255,0,55,0.3)]'
                      : isSelf
                      ? 'bg-gradient-to-r from-red-600 to-rose-700 text-white shadow-md'
                      : 'bg-zinc-900 text-zinc-200 border border-zinc-800'
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
      <form onSubmit={handleSubmit} className="p-2 border-t border-red-950/60 bg-zinc-950/90 flex gap-2">
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="Mandar mensagem ou call..."
          className="flex-1 px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500"
        />
        <button
          type="submit"
          disabled={!inputText.trim()}
          className="p-2 rounded-xl bg-red-600 hover:bg-red-500 disabled:opacity-40 disabled:hover:bg-red-600 text-white font-bold transition-all shadow-[0_0_10px_rgba(255,0,55,0.4)]"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
}
