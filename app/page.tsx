'use client';

import React, { useState, useEffect } from 'react';
import { useVoiceRoom } from '@/hooks/useVoiceRoom';
import { GamerLogo } from '@/components/GamerLogo';
import { PeerCard } from '@/components/PeerCard';
import { SoundboardModal } from '@/components/SoundboardModal';
import { TacticalChat } from '@/components/TacticalChat';
import { SettingsModal } from '@/components/SettingsModal';
import { AiCoachDrawer } from '@/components/AiCoachDrawer';
import { AudioVisualizer } from '@/components/AudioVisualizer';
import {
  Mic,
  MicOff,
  Headphones,
  Settings,
  Zap,
  Bot,
  LogOut,
  Copy,
  Check,
  Share2,
  Users,
  Shield,
  Volume2,
  Radio,
  Gamepad2,
  AlertCircle,
  Sparkles,
} from 'lucide-react';

const POPULAR_GAMES = [
  { name: 'CS2', color: 'from-amber-500 to-orange-600' },
  { name: 'Valorant', color: 'from-rose-500 to-red-600' },
  { name: 'Warzone', color: 'from-emerald-500 to-teal-700' },
  { name: 'Fortnite', color: 'from-blue-500 to-indigo-600' },
  { name: 'LoL', color: 'from-cyan-500 to-blue-600' },
  { name: 'Free Fire', color: 'from-yellow-500 to-amber-600' },
];

export default function VortexCommsApp() {
  // Navigation / Room State
  const [roomId, setRoomId] = useState(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      return params.get('room')?.toUpperCase() || '';
    }
    return '';
  });
  const [inRoom, setInRoom] = useState(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      return Boolean(params.get('room'));
    }
    return false;
  });
  const [joinInputCode, setJoinInputCode] = useState('');
  const [selectedGame, setSelectedGame] = useState('Valorant');
  const [copiedLink, setCopiedLink] = useState(false);
  const [selfJoinedAt] = useState(1700000000000);

  // User Identity
  const [userName, setUserName] = useState(() => {
    if (typeof window !== 'undefined') {
      return (
        localStorage.getItem('vortex_username') ||
        `Gamer_${Math.floor(1000 + Math.random() * 9000)}`
      );
    }
    return 'Gamer_777';
  });

  // Modal controls
  const [showSoundboard, setShowSoundboard] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showAiCoach, setShowAiCoach] = useState(false);
  const [showChatMobile, setShowChatMobile] = useState(false);

  const handleUpdateUserName = (newName: string) => {
    setUserName(newName);
    if (typeof window !== 'undefined') {
      localStorage.setItem('vortex_username', newName);
    }
  };

  // Create new random squad room
  const handleCreateRoom = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 5; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setRoomId(code);
    setInRoom(true);
    if (typeof window !== 'undefined') {
      const newUrl = `${window.location.pathname}?room=${code}`;
      window.history.pushState({}, '', newUrl);
    }
  };

  // Join existing squad room
  const handleJoinRoom = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = joinInputCode.trim().toUpperCase();
    if (!clean) return;
    setRoomId(clean);
    setInRoom(true);
    if (typeof window !== 'undefined') {
      const newUrl = `${window.location.pathname}?room=${clean}`;
      window.history.pushState({}, '', newUrl);
    }
  };

  // Leave current room
  const handleLeaveRoom = () => {
    setInRoom(false);
    setRoomId('');
    if (typeof window !== 'undefined') {
      window.history.pushState({}, '', window.location.pathname);
    }
  };

  // Copy share invite link
  const handleCopyLink = () => {
    if (typeof window !== 'undefined') {
      const shareUrl = `${window.location.origin}${window.location.pathname}?room=${roomId}`;
      navigator.clipboard.writeText(shareUrl).then(() => {
        setCopiedLink(true);
        setTimeout(() => setCopiedLink(false), 2500);
      });
    }
  };

  // WebRTC Voice Room Hook
  const voice = useVoiceRoom({
    roomId: inRoom ? roomId : '',
    userName,
  });

  // Calculate squad members list
  const peerList = Object.values(voice.peers);
  const squadNames = [userName, ...peerList.map((p) => p.name)];

  return (
    <main className="min-h-screen flex flex-col justify-between text-slate-100 bg-[#06080d] selection:bg-cyan-500 selection:text-black">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-40 w-full border-b border-cyan-500/20 bg-slate-950/90 backdrop-blur-xl px-4 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <GamerLogo size="md" glow={true} />

          {/* If In Room: Show Squad Header stats */}
          {inRoom && (
            <div className="flex items-center gap-2 sm:gap-3">
              {/* Room Code Badge */}
              <div className="flex items-center bg-slate-900 border border-cyan-500/40 rounded-xl px-2.5 py-1.5 shadow-sm">
                <span className="text-[10px] uppercase font-mono text-slate-400 mr-2 hidden sm:inline">
                  SALA:
                </span>
                <span className="font-mono font-black text-sm text-cyan-400 tracking-widest mr-2">
                  #{roomId}
                </span>
                <button
                  onClick={handleCopyLink}
                  className="p-1 rounded bg-slate-800 hover:bg-cyan-500/20 text-slate-300 hover:text-cyan-300 transition-colors"
                  title="Copiar Link de Convite"
                >
                  {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>

              {/* Game Tag */}
              <span className="hidden md:flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-slate-300">
                <Gamepad2 className="w-3.5 h-3.5 text-fuchsia-400" />
                {selectedGame}
              </span>

              {/* Squad count and slot */}
              <span className="flex items-center gap-1.5 text-xs font-mono px-2.5 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-emerald-400">
                <Users className="w-3.5 h-3.5" />
                <span>{peerList.length + 1} ONLINE</span>
                <span className="text-[10px] text-cyan-400 font-bold bg-cyan-950 px-1 rounded border border-cyan-800 hidden sm:inline">
                  SLOT #{voice.slotIndex + 1}
                </span>
              </span>
            </div>
          )}

          {/* Quick Header Actions */}
          <div className="flex items-center gap-2">
            {inRoom && (
              <button
                onClick={voice.handleUnlockAudio}
                className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-emerald-400 transition-colors hidden sm:flex items-center gap-1.5 text-xs font-mono"
                title="Desbloquear / Testar Saída de Som"
              >
                <Volume2 className="w-3.5 h-3.5 text-emerald-400" />
                <span className="hidden md:inline">Som OK</span>
              </button>
            )}

            <button
              onClick={() => setShowSettings(true)}
              className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-cyan-400 transition-colors"
              title="Configurações de Áudio e Perfil"
            >
              <Settings className="w-4 h-4" />
            </button>

            {inRoom && (
              <button
                onClick={handleLeaveRoom}
                className="px-3 py-1.5 rounded-xl bg-rose-950/80 hover:bg-rose-900 border border-rose-500/50 text-rose-300 text-xs font-bold transition-colors flex items-center gap-1.5"
                title="Desconectar da Sala"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Sair da Sala</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Mic Permission Alert if denied */}
      {voice.micPermissionError && (
        <div className="max-w-4xl mx-auto w-full px-4 mt-4">
          <div className="p-3.5 rounded-xl bg-rose-950/90 border border-rose-500/80 text-rose-200 text-xs flex items-center gap-2.5 shadow-lg">
            <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
            <div className="flex-1">
              <span className="font-bold">Aviso de Microfone:</span> {voice.micPermissionError}.
              Por favor, clique no ícone de cadeado no topo da barra do navegador e permita o microfone para que seus amigos te escutem.
            </div>
            <button
              onClick={() => voice.initMicrophone()}
              className="px-3 py-1 bg-rose-800 hover:bg-rose-700 text-white rounded font-bold text-xs shrink-0"
            >
              Tentar Novamente
            </button>
          </div>
        </div>
      )}

      {/* Autoplay Audio Blocked Warning Banner */}
      {voice.audioBlocked && (
        <div className="max-w-4xl mx-auto w-full px-4 mt-4 animate-bounce">
          <div className="p-3.5 rounded-xl bg-amber-950/95 border-2 border-amber-400 text-amber-200 text-xs flex flex-wrap items-center justify-between gap-3 shadow-[0_0_20px_rgba(251,191,36,0.5)]">
            <div className="flex items-center gap-2.5">
              <Volume2 className="w-5 h-5 text-amber-300 shrink-0" />
              <div>
                <span className="font-black text-amber-100 uppercase">ÁUDIO BLOQUEADO PELO NAVEGADOR:</span>{' '}
                Clique no botão ao lado para desbloquear a saída de som e escutar seus amigos na chamada.
              </div>
            </div>
            <button
              onClick={voice.handleUnlockAudio}
              className="px-4 py-2 bg-amber-400 hover:bg-amber-300 text-slate-950 font-black rounded-lg text-xs uppercase shadow-md transition-all active:scale-95"
            >
              🔊 ATIVAR SOM DO SQUAD
            </button>
          </div>
        </div>
      )}

      {/* MAIN VIEW: LANDING PRE-ROOM OR ACTIVE SQUAD ROOM */}
      {!inRoom ? (
        /* LANDING VIEW */
        <div className="flex-1 max-w-6xl mx-auto w-full px-4 py-8 flex flex-col justify-center">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            {/* Left Column: Aggressive Gamer Headline & Quick Join */}
            <div className="lg:col-span-7 space-y-6">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950/80 border border-cyan-500/40 text-cyan-300 text-xs font-mono">
                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
                WEBRTC P2P ULTRA-LOW LATENCY // VOZ GAMER
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black uppercase tracking-tight text-white leading-none">
                COMUNICAÇÃO{' '}
                <span className="bg-gradient-to-r from-cyan-400 via-fuchsia-400 to-pink-500 bg-clip-text text-transparent italic">
                  SEM DELAY
                </span>{' '}
                PRO SEU ESQUADRÃO.
              </h1>

              <p className="text-slate-300 text-sm sm:text-base leading-relaxed max-w-xl">
                Crie sua call de voz com link privado para jogar com os amigos no PC ou Celular.
                Áudio direto peer-to-peer, visualizador neon de fala, soundboard sincronizado e
                o bot tático de IA APEX-9.
              </p>

              {/* Game quick selector */}
              <div>
                <label className="block text-xs font-mono uppercase text-slate-400 mb-2 flex items-center gap-1.5">
                  <Gamepad2 className="w-3.5 h-3.5 text-cyan-400" />
                  Qual jogo vocês vão jogar hoje?
                </label>
                <div className="flex flex-wrap gap-2">
                  {POPULAR_GAMES.map((game) => (
                    <button
                      key={game.name}
                      type="button"
                      onClick={() => setSelectedGame(game.name)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                        selectedGame === game.name
                          ? 'bg-cyan-500 text-slate-950 shadow-[0_0_12px_rgba(0,240,255,0.6)] scale-105'
                          : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
                      }`}
                    >
                      {game.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Action Buttons: Create Room & Join */}
              <div className="pt-2 flex flex-col sm:flex-row gap-4">
                <button
                  onClick={handleCreateRoom}
                  className="flex-1 py-4 px-6 rounded-2xl bg-gradient-to-r from-cyan-500 via-blue-600 to-fuchsia-600 hover:from-cyan-400 hover:to-fuchsia-500 text-slate-950 font-black tracking-wider uppercase text-sm sm:text-base shadow-[0_0_25px_rgba(0,240,255,0.4)] transition-all hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2"
                >
                  <Zap className="w-5 h-5 text-slate-950" />
                  CRIAR SALA DE VOZ PRIVADA
                </button>
              </div>

              {/* Join with existing code form */}
              <form onSubmit={handleJoinRoom} className="flex gap-2 max-w-md pt-1">
                <input
                  type="text"
                  value={joinInputCode}
                  onChange={(e) => setJoinInputCode(e.target.value)}
                  placeholder="DIGITE O CÓDIGO DA SALA (EX: ALPHA)"
                  maxLength={10}
                  className="flex-1 px-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-xs sm:text-sm font-mono uppercase text-white placeholder-slate-600 focus:outline-none focus:border-cyan-400"
                />
                <button
                  type="submit"
                  disabled={!joinInputCode.trim()}
                  className="px-5 py-3 rounded-xl bg-slate-800 hover:bg-cyan-500 hover:text-slate-950 text-white font-bold text-xs sm:text-sm uppercase transition-all disabled:opacity-40"
                >
                  Entrar
                </button>
              </form>

              {/* Testing Tip for multi-tab */}
              <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800/80 text-slate-400 text-xs flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-cyan-400 shrink-0" />
                <span>
                  <strong>Dica de Teste:</strong> Você pode abrir essa mesma página em{' '}
                  <span className="text-cyan-300 font-semibold">duas abas diferentes</span> ou no celular para
                  testar a transmissão de voz em tempo real!
                </span>
              </div>
            </div>

            {/* Right Column: Tactical Mic HUD & Gamer Profile Preview */}
            <div className="lg:col-span-5">
              <div className="relative p-6 rounded-2xl bg-gradient-to-b from-slate-900 to-slate-950 border border-cyan-500/30 shadow-[0_0_40px_rgba(0,240,255,0.15)] space-y-5">
                {/* Decorative top badge */}
                <div className="flex items-center justify-between text-xs pb-3 border-b border-slate-800">
                  <div className="flex items-center gap-2 font-mono text-cyan-400">
                    <Radio className="w-3.5 h-3.5 animate-pulse" />
                    <span>AUDIO COCKPIT // TEST</span>
                  </div>
                  <span className="text-[10px] font-mono text-slate-500">READY TO DROP</span>
                </div>

                {/* Nickname input */}
                <div>
                  <label className="block text-xs font-mono uppercase text-slate-400 mb-1.5">
                    Seu Nickname no Jogo
                  </label>
                  <input
                    type="text"
                    value={userName}
                    onChange={(e) => handleUpdateUserName(e.target.value)}
                    maxLength={20}
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-sm font-bold text-white focus:outline-none focus:border-cyan-400 shadow-inner"
                  />
                </div>

                {/* Live Mic Wave & Level */}
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
                  <div className="flex items-center justify-between text-xs text-slate-300">
                    <span className="flex items-center gap-1.5 font-bold">
                      <Volume2 className="w-4 h-4 text-emerald-400" />
                      Sensibilidade do seu Microfone
                    </span>
                    <span className="font-mono text-xs text-emerald-400 font-bold">
                      {voice.audioLevel}% RMS
                    </span>
                  </div>

                  <div className="bg-slate-900 p-3 rounded-lg border border-slate-800">
                    <AudioVisualizer
                      audioLevel={voice.audioLevel}
                      isSpeaking={voice.isSpeaking}
                      isMuted={voice.isMuted}
                      barsCount={28}
                      height={32}
                      colorScheme="lime"
                    />
                  </div>

                  <p className="text-[11px] text-slate-400 leading-snug">
                    Fale algo no microfone para ver as ondas verdes reagirem em tempo real.
                  </p>
                </div>

                {/* Feature Pills */}
                <div className="grid grid-cols-2 gap-2 text-xs font-mono text-slate-300">
                  <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 flex items-center gap-2">
                    <Shield className="w-4 h-4 text-cyan-400" />
                    <span>WebRTC P2P</span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 flex items-center gap-2">
                    <Zap className="w-4 h-4 text-fuchsia-400" />
                    <span>Soundboard SFX</span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 flex items-center gap-2">
                    <Bot className="w-4 h-4 text-amber-400" />
                    <span>AI Coach Gemini</span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 flex items-center gap-2">
                    <Users className="w-4 h-4 text-emerald-400" />
                    <span>Crossplay PC/Mobile</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* ACTIVE SQUAD ROOM VIEW */
        <div className="flex-1 max-w-7xl mx-auto w-full px-4 py-5 flex flex-col gap-4">
          {/* Room Top Subheader / Invite bar */}
          <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-cyan-500/30 flex flex-wrap items-center justify-between gap-3 shadow-md">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-cyan-950/90 text-cyan-400 border border-cyan-500/40">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-sm font-black tracking-wide text-white uppercase flex items-center gap-2">
                  ESQUADRÃO #{roomId}
                  <span className="text-[10px] font-mono text-cyan-400 bg-cyan-950 px-2 py-0.5 rounded border border-cyan-500/30">
                    {selectedGame}
                  </span>
                </h2>
                <p className="text-xs text-slate-400">
                  Compartilhe o código ou link com seus amigos para eles entrarem no canal de voz.
                </p>
              </div>
            </div>

            {/* Invite Button with Copy */}
            <div className="flex items-center gap-2">
              <button
                onClick={handleCopyLink}
                className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold text-xs tracking-wider uppercase transition-all shadow-[0_0_15px_rgba(0,240,255,0.3)] flex items-center gap-2 active:scale-95"
              >
                {copiedLink ? (
                  <>
                    <Check className="w-4 h-4 text-white" />
                    <span>LINK COPIADO!</span>
                  </>
                ) : (
                  <>
                    <Share2 className="w-4 h-4" />
                    <span>CONVIDAR AMIGOS</span>
                  </>
                )}
              </button>

              <button
                onClick={() => setShowChatMobile(!showChatMobile)}
                className="lg:hidden px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 text-xs font-bold"
              >
                Chat ({voice.messages.length})
              </button>
            </div>
          </div>

          {/* Main Voice Room Content: Peers Grid + Tactical Chat */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 flex-1">
            {/* Squad Members Grid (left 8 cols on desktop) */}
            <div className="lg:col-span-8 flex flex-col gap-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5">
                {/* Self Player Card */}
                <PeerCard
                  peer={{
                    id: voice.peerId,
                    name: `${userName} (Você)`,
                    avatarSeed: voice.peerId,
                    isMuted: voice.isMuted,
                    isDeafened: voice.isDeafened,
                    isSpeaking: voice.isSpeaking,
                    audioLevel: voice.audioLevel,
                    pingMs: 14,
                    joinedAt: selfJoinedAt,
                  }}
                  isSelf={true}
                  volume={1.0}
                />

                {/* Remote Squadmates */}
                {peerList.map((peer) => (
                  <PeerCard
                    key={peer.id}
                    peer={peer}
                    isSelf={false}
                    volume={voice.peerVolumes[peer.id] ?? 1.0}
                    stream={voice.remoteStreams[peer.id]}
                    onVolumeChange={(vol) => voice.setPeerVolume(peer.id, vol)}
                    onPoke={() => voice.broadcastSfx('airhorn')}
                    onAudioError={voice.handleUnlockAudio}
                  />
                ))}

                {/* Empty Slot Card (+ Convidar Amigo) */}
                <div
                  onClick={handleCopyLink}
                  className="flex flex-col items-center justify-center p-6 rounded-xl border border-dashed border-slate-800 hover:border-cyan-500/50 hover:bg-slate-900/40 text-slate-500 hover:text-cyan-300 transition-all cursor-pointer group min-h-[220px]"
                >
                  <div className="w-14 h-14 rounded-full border border-dashed border-slate-700 group-hover:border-cyan-400 flex items-center justify-center mb-2 group-hover:scale-105 transition-transform">
                    <Share2 className="w-6 h-6" />
                  </div>
                  <span className="font-bold text-xs uppercase tracking-wider">
                    + Convidar Squadmate
                  </span>
                  <span className="text-[10px] text-slate-500 mt-1">
                    Clique para copiar link direto
                  </span>
                </div>
              </div>

              {/* Push-to-Talk Indicator banner if PTT enabled */}
              {voice.isPttMode && (
                <div className="p-3 rounded-xl bg-slate-950 border border-cyan-500/40 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <Radio className="w-4 h-4 text-cyan-400 animate-pulse" />
                    <span>
                      Modo Push-To-Talk ativo: Segure <strong>ESPAÇO</strong> no teclado para falar.
                    </span>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      voice.isPttActive
                        ? 'bg-emerald-500 text-black shadow-[0_0_10px_rgba(57,255,20,0.8)]'
                        : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {voice.isPttActive ? 'TRANSMITINDO' : 'EM ESPERA'}
                  </span>
                </div>
              )}
            </div>

            {/* Tactical Chat & Pings (right 4 cols on desktop) */}
            <div
              className={`lg:col-span-4 ${
                showChatMobile ? 'block' : 'hidden lg:block'
              } h-[440px] lg:h-auto`}
            >
              <TacticalChat
                messages={voice.messages}
                onSendMessage={voice.sendMessage}
                currentUserId={voice.peerId}
              />
            </div>
          </div>
        </div>
      )}

      {/* BOTTOM CONTROLS DECK (Only when in room) */}
      {inRoom && (
        <div className="sticky bottom-0 z-40 w-full border-t border-slate-800/80 bg-slate-950/95 backdrop-blur-xl py-3 px-4 shadow-2xl">
          <div className="max-w-4xl mx-auto flex items-center justify-between gap-3">
            {/* Left side: Hotkey hints */}
            <div className="hidden md:flex items-center gap-3 text-[11px] font-mono text-slate-500">
              <span>
                [<strong className="text-slate-300">M</strong>] Mute
              </span>
              <span>
                [<strong className="text-slate-300">D</strong>] Deafen
              </span>
              <span>
                [<strong className="text-slate-300">Space</strong>] PTT
              </span>
            </div>

            {/* Center: BIG GAMER CONTROLS */}
            <div className="flex items-center justify-center gap-2 sm:gap-4 flex-1">
              {/* MUTE / UNMUTE BUTTON (Huge Gamer Button) */}
              <button
                onClick={voice.toggleMute}
                className={`relative px-4 sm:px-6 py-3 rounded-2xl font-black text-xs sm:text-sm tracking-wider uppercase transition-all active:scale-95 flex items-center gap-2 ${
                  voice.isMuted
                    ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-[0_0_20px_rgba(244,63,94,0.6)] border border-rose-400'
                    : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-[0_0_20px_rgba(16,185,129,0.5)] border border-emerald-400'
                }`}
                title="Ativar/Desativar Microfone (M)"
              >
                {voice.isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5 animate-pulse" />}
                <span>{voice.isMuted ? 'MUTADO' : 'MICROFONE'}</span>
              </button>

              {/* DEAFEN BUTTON (Ensurdecer) */}
              <button
                onClick={voice.toggleDeafen}
                className={`p-3 rounded-2xl font-bold transition-all active:scale-95 border ${
                  voice.isDeafened
                    ? 'bg-amber-600 border-amber-400 text-white shadow-[0_0_20px_rgba(217,119,6,0.6)]'
                    : 'bg-slate-900 border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white'
                }`}
                title="Ensurdecer / Mudo Geral (D)"
              >
                <Headphones className="w-5 h-5" />
              </button>

              {/* SOUNDBOARD BUTTON */}
              <button
                onClick={() => setShowSoundboard(true)}
                className="px-3.5 py-3 rounded-2xl bg-slate-900 hover:bg-slate-850 border border-cyan-500/40 hover:border-cyan-400 text-cyan-300 font-bold text-xs sm:text-sm transition-all active:scale-95 shadow-[0_0_15px_rgba(0,240,255,0.2)] flex items-center gap-1.5"
                title="Abrir Soundboard com Efeitos Sonoros"
              >
                <Zap className="w-4 h-4 text-cyan-400" />
                <span className="hidden sm:inline">SOUNDBOARD</span>
              </button>

              {/* AI SQUAD COACH BUTTON */}
              <button
                onClick={() => setShowAiCoach(true)}
                className="px-3.5 py-3 rounded-2xl bg-gradient-to-r from-fuchsia-950 to-purple-950 hover:from-fuchsia-900 hover:to-purple-900 border border-fuchsia-500/50 text-fuchsia-300 font-bold text-xs sm:text-sm transition-all active:scale-95 shadow-[0_0_15px_rgba(255,0,127,0.3)] flex items-center gap-1.5"
                title="Chamar Bot Tático Gemini AI"
              >
                <Bot className="w-4 h-4 text-fuchsia-400" />
                <span className="hidden sm:inline">AI COACH</span>
              </button>
            </div>

            {/* Right side: Settings gear */}
            <div className="flex items-center">
              <button
                onClick={() => setShowSettings(true)}
                className="p-3 rounded-2xl bg-slate-900 border border-slate-800 hover:border-cyan-400 text-slate-300 hover:text-cyan-400 transition-colors"
                title="Configurações de Áudio e Perfil"
              >
                <Settings className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FOOTER */}
      <footer className="w-full border-t border-slate-900 py-3 px-4 text-center text-[11px] font-mono text-slate-600">
        VORTEX COMMS • WEBRTC AUDIO PARTY CHAT • PEER-TO-PEER MESH • GEMINI AI TACTICAL BOT
      </footer>

      {/* MODALS */}
      <SoundboardModal
        isOpen={showSoundboard}
        onClose={() => setShowSoundboard(false)}
        onBroadcastSfx={voice.broadcastSfx}
      />

      <SettingsModal
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        userName={userName}
        onUpdateUserName={handleUpdateUserName}
        isPttMode={voice.isPttMode}
        onTogglePttMode={voice.setIsPttMode}
        noiseGateThreshold={voice.noiseGateThreshold}
        onUpdateThreshold={voice.setNoiseGateThreshold}
        currentAudioLevel={voice.audioLevel}
        isMicActive={!voice.isMuted}
        audioDevices={voice.audioDevices}
        selectedDeviceId={voice.selectedDeviceId}
        onSelectDevice={voice.setSelectedDeviceId}
        testLoopback={voice.testLoopback}
        onToggleLoopback={voice.toggleTestLoopback}
      />

      <AiCoachDrawer
        isOpen={showAiCoach}
        onClose={() => setShowAiCoach(false)}
        squadMembers={squadNames}
        onBroadcastCoachMessage={(msg) => voice.sendMessage(msg, false, true)}
      />
    </main>
  );
}
