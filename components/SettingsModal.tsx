'use client';

import React, { useState } from 'react';
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-lg p-6 rounded-2xl bg-zinc-950 border border-red-600/40 shadow-[0_0_50px_rgba(255,0,55,0.25)]">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-red-950/70">
          <div className="flex items-center gap-2">
            <Sliders className="w-5 h-5 text-red-500" />
            <h3 className="text-lg font-black tracking-wide text-white uppercase">
              CONFIGURAÇÕES DE ÁUDIO & PERFIL
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-900 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-5 my-5 max-h-[65vh] overflow-y-auto pr-1">
          {/* Gamer Nickname */}
          <div>
            <label className="block text-xs font-mono uppercase text-zinc-300 mb-1.5 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-red-500" />
              Seu Nickname Gamer
            </label>
            <input
              type="text"
              value={tempName}
              onChange={(e) => setTempName(e.target.value)}
              maxLength={20}
              placeholder="Ex: Red_Reaper, BloodWolf"
              className="w-full px-3 py-2 rounded-xl bg-black border border-zinc-800 text-sm text-white focus:outline-none focus:border-red-500 font-bold"
            />
          </div>

          {/* Microphone device selector */}
          <div>
            <label className="block text-xs font-mono uppercase text-zinc-300 mb-1.5 flex items-center gap-1.5">
              <Mic className="w-3.5 h-3.5 text-red-500" />
              Dispositivo de Entrada (Microfone)
            </label>
            <select
              value={selectedDeviceId}
              onChange={(e) => onSelectDevice(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-black border border-zinc-800 text-xs text-white focus:outline-none focus:border-red-500"
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
          <div className="p-3.5 rounded-xl bg-black border border-red-950/80">
            <div className="flex items-center justify-between text-xs text-zinc-300 mb-2">
              <span className="flex items-center gap-1.5 font-bold">
                <Volume2 className="w-3.5 h-3.5 text-red-500" />
                Teste do Microfone em Tempo Real
              </span>
              <span className="font-mono text-[10px] text-red-400 font-bold">
                {currentAudioLevel}% RMS
              </span>
            </div>

            {/* Visualizer bars in Red */}
            <div className="bg-zinc-950 p-2.5 rounded-lg border border-zinc-900 mb-2">
              <AudioVisualizer
                audioLevel={currentAudioLevel}
                isSpeaking={currentAudioLevel > noiseGateThreshold}
                isMuted={!isMicActive}
                barsCount={24}
                height={26}
                colorScheme="red"
              />
            </div>

            {/* Threshold slider */}
            <div className="mt-3">
              <div className="flex justify-between text-[11px] text-zinc-400 mb-1">
                <span>Sensibilidade do Mic (Noise Gate)</span>
                <span className="font-mono text-red-400">{noiseGateThreshold}%</span>
              </div>
              <input
                type="range"
                min="5"
                max="60"
                value={noiseGateThreshold}
                onChange={(e) => onUpdateThreshold(parseInt(e.target.value, 10))}
                className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-red-500"
              />
              <p className="text-[10px] text-zinc-500 mt-1">
                Sons abaixo dessa linha não ativam seu microfone (corta barulhos de teclado e respiração).
              </p>
            </div>

            {/* Loopback Test Button */}
            {onToggleLoopback && (
              <div className="mt-3 pt-3 border-t border-zinc-800 flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-zinc-200">Ouvir Retorno Próprio (Loopback)</div>
                  <div className="text-[10px] text-zinc-400">Escute a si mesmo no fone para testar se o som sai</div>
                </div>
                <button
                  type="button"
                  onClick={() => onToggleLoopback(!testLoopback)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    testLoopback
                      ? 'bg-red-600 text-white shadow-[0_0_12px_rgba(255,0,55,0.6)]'
                      : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
                  }`}
                >
                  {testLoopback ? 'DESATIVAR RETORNO' : 'OUVIR MEU RETORNO'}
                </button>
              </div>
            )}
          </div>

          {/* Transmission Mode */}
          <div className="p-3.5 rounded-xl bg-black border border-red-950/80 space-y-3">
            <div className="text-xs font-bold text-zinc-300 uppercase flex items-center gap-1.5">
              <Radio className="w-3.5 h-3.5 text-red-500" />
              Modo de Transmissão
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => onTogglePttMode(false)}
                className={`p-2.5 rounded-xl border text-left transition-all ${
                  !isPttMode
                    ? 'border-red-500 bg-red-950/50 text-red-300 font-bold'
                    : 'border-zinc-800 bg-zinc-900 text-zinc-400'
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
                    ? 'border-red-500 bg-red-950/50 text-red-300 font-bold'
                    : 'border-zinc-800 bg-zinc-900 text-zinc-400'
                }`}
              >
                <div className="text-xs font-bold">Push-To-Talk (PTT)</div>
                <div className="text-[10px] opacity-75">Segure ESPAÇO para falar</div>
              </button>
            </div>
          </div>

          {/* WebRTC Audio Hardware enhancements */}
          <div className="p-3 rounded-xl bg-black border border-red-950/80 flex items-center justify-between text-xs text-zinc-400">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-red-500" />
              <div>
                <div className="font-semibold text-zinc-200">Cancelamento de Eco & Ruído</div>
                <div className="text-[10px] text-zinc-500">Hardware WebRTC ativado automaticamente</div>
              </div>
            </div>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-950 text-red-400 border border-red-500/40">
              ATIVO
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="pt-3 border-t border-red-950/70 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-xs text-white font-semibold transition-colors border border-zinc-800"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            className="px-5 py-2 rounded-xl bg-gradient-to-r from-red-600 via-rose-600 to-red-700 hover:from-red-500 hover:to-rose-500 text-xs text-white font-black tracking-wider uppercase transition-all shadow-[0_0_20px_rgba(255,0,55,0.4)]"
          >
            Salvar Configurações
          </button>
        </div>
      </div>
    </div>
  );
}
