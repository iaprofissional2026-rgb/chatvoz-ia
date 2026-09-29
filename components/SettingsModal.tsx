'use client';

import React, { useState, useEffect } from 'react';
import { X, Mic, Sliders, Volume2, ShieldCheck, User, Radio } from 'lucide-react';
import { AudioVisualizer } from './AudioVisualizer';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  userName: string;
  onUpdateUserName: (name: string) => void;
  isPttMode: boolean;
  onTogglePttMode: (enabled: boolean) => void;
  noiseGateThreshold: number;
  onUpdateThreshold: (val: number) => void;
  currentAudioLevel: number;
  isMicActive: boolean;
  audioDevices: MediaDeviceInfo[];
  selectedDeviceId: string;
  onSelectDevice: (deviceId: string) => void;
  testLoopback?: boolean;
  onToggleLoopback?: (enabled: boolean) => void;
}

export function SettingsModal({
  isOpen,
  onClose,
  userName,
  onUpdateUserName,
  isPttMode,
  onTogglePttMode,
  noiseGateThreshold,
  onUpdateThreshold,
  currentAudioLevel,
  isMicActive,
  audioDevices,
  selectedDeviceId,
  onSelectDevice,
  testLoopback = false,
  onToggleLoopback,
}: SettingsModalProps) {
  const [tempName, setTempName] = useState(userName);

  if (!isOpen) return null;

  const handleSave = () => {
    if (tempName.trim()) {
      onUpdateUserName(tempName.trim());
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-lg p-6 rounded-2xl bg-slate-900 border border-cyan-500/40 shadow-[0_0_40px_rgba(0,240,255,0.2)]">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Sliders className="w-5 h-5 text-cyan-400" />
            <h3 className="text-lg font-black tracking-wide text-white uppercase">
              CONFIGURAÇÕES DE ÁUDIO & PERFIL
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-5 my-5 max-h-[65vh] overflow-y-auto pr-1">
          {/* Gamer Nickname */}
          <div>
            <label className="block text-xs font-mono uppercase text-slate-300 mb-1.5 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-cyan-400" />
              Seu Nickname Gamer
            </label>
            <input
              type="text"
              value={tempName}
              onChange={(e) => setTempName(e.target.value)}
              maxLength={20}
              placeholder="Ex: Ghost_Rider, CyberWolf"
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-sm text-white focus:outline-none focus:border-cyan-400 font-bold"
            />
          </div>

          {/* Microphone device selector */}
          <div>
            <label className="block text-xs font-mono uppercase text-slate-300 mb-1.5 flex items-center gap-1.5">
              <Mic className="w-3.5 h-3.5 text-cyan-400" />
              Dispositivo de Entrada (Microfone)
            </label>
            <select
              value={selectedDeviceId}
              onChange={(e) => onSelectDevice(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none focus:border-cyan-400"
            >
              {audioDevices.length > 0 ? (
                audioDevices.map((dev, idx) => (
                  <option key={dev.deviceId || idx} value={dev.deviceId}>
                    {dev.label || `Microfone ${idx + 1}`}
                  </option>
                ))
              ) : (
                <option value="">Microfone Padrão do Sistema</option>
              )}
            </select>
          </div>

          {/* Live Mic Test Meter */}
          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
            <div className="flex items-center justify-between text-xs text-slate-300 mb-2">
              <span className="flex items-center gap-1.5 font-bold">
                <Volume2 className="w-3.5 h-3.5 text-emerald-400" />
                Teste do Microfone em Tempo Real
              </span>
              <span className="font-mono text-[10px] text-emerald-400 font-bold">
                {currentAudioLevel}% RMS
              </span>
            </div>

            {/* Visualizer bars */}
            <div className="bg-slate-900/90 p-2.5 rounded-lg border border-slate-800/80 mb-2">
              <AudioVisualizer
                audioLevel={currentAudioLevel}
                isSpeaking={currentAudioLevel > noiseGateThreshold}
                isMuted={!isMicActive}
                barsCount={24}
                height={26}
                colorScheme="lime"
              />
            </div>

            {/* Threshold slider */}
            <div className="mt-3">
              <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                <span>Sensibilidade do Mic (Noise Gate)</span>
                <span className="font-mono text-cyan-400">{noiseGateThreshold}%</span>
              </div>
              <input
                type="range"
                min="5"
                max="60"
                value={noiseGateThreshold}
                onChange={(e) => onUpdateThreshold(parseInt(e.target.value, 10))}
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
              />
              <p className="text-[10px] text-slate-500 mt-1">
                Sons abaixo dessa linha não ativam seu microfone (corta barulhos de teclado e respiração).
              </p>
            </div>

            {/* Loopback Test Button */}
            {onToggleLoopback && (
              <div className="mt-3 pt-3 border-t border-slate-800 flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-slate-200">Ouvir Retorno Próprio (Loopback)</div>
                  <div className="text-[10px] text-slate-400">Escute a si mesmo no fone para testar se o som sai</div>
                </div>
                <button
                  type="button"
                  onClick={() => onToggleLoopback(!testLoopback)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    testLoopback
                      ? 'bg-emerald-500 text-slate-950 shadow-[0_0_10px_rgba(57,255,20,0.6)]'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  {testLoopback ? 'DESATIVAR RETORNO' : 'OUVIR MEU RETORNO'}
                </button>
              </div>
            )}
          </div>

          {/* Transmission Mode */}
          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
            <div className="text-xs font-bold text-slate-300 uppercase flex items-center gap-1.5">
              <Radio className="w-3.5 h-3.5 text-cyan-400" />
              Modo de Transmissão
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => onTogglePttMode(false)}
                className={`p-2.5 rounded-xl border text-left transition-all ${
                  !isPttMode
                    ? 'border-cyan-400 bg-cyan-950/40 text-cyan-300 font-bold'
                    : 'border-slate-800 bg-slate-900 text-slate-400'
                }`}
              >
                <div className="text-xs font-bold">Voz Contínua (VAD)</div>
                <div className="text-[10px] opacity-75">Ativa automaticamente ao falar</div>
              </button>

              <button
                type="button"
                onClick={() => onTogglePttMode(true)}
                className={`p-2.5 rounded-xl border text-left transition-all ${
                  isPttMode
                    ? 'border-cyan-400 bg-cyan-950/40 text-cyan-300 font-bold'
                    : 'border-slate-800 bg-slate-900 text-slate-400'
                }`}
              >
                <div className="text-xs font-bold">Push-To-Talk (PTT)</div>
                <div className="text-[10px] opacity-75">Segure ESPAÇO para falar</div>
              </button>
            </div>
          </div>

          {/* WebRTC Audio Hardware enhancements */}
          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between text-xs text-slate-400">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <div>
                <div className="font-semibold text-slate-200">Cancelamento de Eco & Ruído</div>
                <div className="text-[10px] text-slate-500">Hardware WebRTC ativado automaticamente</div>
              </div>
            </div>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-500/40">
              ATIVO
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="pt-3 border-t border-slate-800 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs text-white font-semibold transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            className="px-5 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-xs text-slate-950 font-black tracking-wider uppercase transition-all shadow-[0_0_15px_rgba(0,240,255,0.4)]"
          >
            Salvar Configurações
          </button>
        </div>
      </div>
    </div>
  );
}
