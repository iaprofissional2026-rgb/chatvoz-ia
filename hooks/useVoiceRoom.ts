'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { PeerInfo, RoomState, ChatMessage, SignalingMessage } from '@/lib/types';
import {
  getAudioContext,
  playJoinSound,
  playLeaveSound,
  playUiClick,
  triggerSfxById,
} from '@/lib/soundEffects';

interface UseVoiceRoomOptions {
  roomId: string;
  userName: string;
}

const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
  ],
};

export function useVoiceRoom({ roomId, userName }: UseVoiceRoomOptions) {
  // Local user ID & info
  const [peerId] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const stored = sessionStorage.getItem('vortex_peer_id');
      if (stored) return stored;
      const gen = `p_${Math.random().toString(36).substring(2, 9)}`;
      sessionStorage.setItem('vortex_peer_id', gen);
      return gen;
    }
    return `p_${Math.random().toString(36).substring(2, 9)}`;
  });

  const [connected, setConnected] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isDeafened, setIsDeafened] = useState(false);
  const [isPttMode, setIsPttMode] = useState(false);
  const [isPttActive, setIsPttActive] = useState(false);
  const [noiseGateThreshold, setNoiseGateThreshold] = useState(15);
  const [audioLevel, setAudioLevel] = useState(0);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [peers, setPeers] = useState<Record<string, PeerInfo>>({});
  const [peerVolumes, setPeerVolumes] = useState<Record<string, number>>({});
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [micPermissionError, setMicPermissionError] = useState<string | null>(null);
  const [audioDevices, setAudioDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');

  // Refs for WebRTC and Audio Engine
  const localStreamRef = useRef<MediaStream | null>(null);
  const peerConnectionsRef = useRef<Record<string, RTCPeerConnection>>({});
  const remoteAudiosRef = useRef<Record<string, HTMLAudioElement>>({});
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const lastSyncTimestampRef = useRef<number>(0);
  const pollingTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Enumerate audio input devices
  const updateAudioDevices = useCallback(async () => {
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.enumerateDevices) return;
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const inputs = devices.filter((d) => d.kind === 'audioinput');
      setAudioDevices(inputs);
      if (inputs.length > 0 && !selectedDeviceId) {
        setSelectedDeviceId(inputs[0].deviceId);
      }
    } catch {
      // ignore
    }
  }, [selectedDeviceId]);

  // Request Microphone and setup Audio Analyser
  const initMicrophone = useCallback(async (deviceId?: string) => {
    try {
      setMicPermissionError(null);
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((t) => t.stop());
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          ...(deviceId ? { deviceId: { exact: deviceId } } : {}),
        },
        video: false,
      });

      localStreamRef.current = stream;

      // Update tracks in existing peer connections
      const audioTrack = stream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !isMuted && (!isPttMode || isPttActive);

        Object.values(peerConnectionsRef.current).forEach((pc) => {
          const senders = pc.getSenders();
          const sender = senders.find((s) => s.track?.kind === 'audio');
          if (sender) {
            sender.replaceTrack(audioTrack).catch(() => {});
          } else {
            pc.addTrack(audioTrack, stream);
          }
        });
      }

      // Setup Web Audio Analyser
      const audioCtx = getAudioContext();
      if (audioCtx) {
        if (audioCtx.state === 'suspended') {
          audioCtx.resume().catch(() => {});
        }
        const source = audioCtx.createMediaStreamSource(stream);
        const analyser = audioCtx.createAnalyser();
        analyser.fftSize = 256;
        source.connect(analyser);
        analyserRef.current = analyser;
      }

      await updateAudioDevices();
    } catch (err: unknown) {
      console.warn('Microphone access denied or error:', err);
      const msg = err instanceof Error ? err.message : 'Permissão de microfone negada.';
      setMicPermissionError(msg);
    }
  }, [isMuted, isPttMode, isPttActive, updateAudioDevices]);

  // Send message via signaling API
  const sendSignaling = useCallback(
    async (type: string, payload: any = {}, toPeerId?: string) => {
      try {
        await fetch('/api/signaling', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            roomId,
            fromPeerId: peerId,
            toPeerId,
            type,
            payload,
          }),
        });
      } catch (err) {
        console.error('Signaling error:', err);
      }
    },
    [roomId, peerId]
  );

  // Setup Peer Connection for remote peer
  const getOrCreatePeerConnection = useCallback(
    (remotePeerId: string): RTCPeerConnection => {
      if (peerConnectionsRef.current[remotePeerId]) {
        return peerConnectionsRef.current[remotePeerId];
      }

      const pc = new RTCPeerConnection(ICE_SERVERS);
      peerConnectionsRef.current[remotePeerId] = pc;

      // Add local audio tracks if ready
      if (localStreamRef.current) {
        localStreamRef.current.getAudioTracks().forEach((track) => {
          pc.addTrack(track, localStreamRef.current!);
        });
      }

      // Handle ICE Candidates
      pc.onicecandidate = (event) => {
        if (event.candidate) {
          sendSignaling('ice-candidate', { candidate: event.candidate }, remotePeerId);
        }
      };

      // Handle incoming remote audio stream
      pc.ontrack = (event) => {
        let audioEl = remoteAudiosRef.current[remotePeerId];
        if (!audioEl) {
          audioEl = new Audio();
          audioEl.autoplay = true;
          remoteAudiosRef.current[remotePeerId] = audioEl;
        }
        audioEl.srcObject = event.streams[0];
        // Apply individual volume
        const vol = peerVolumes[remotePeerId] ?? 1.0;
        audioEl.volume = isDeafened ? 0 : Math.min(1, vol);
        audioEl.play().catch(() => {});
      };

      pc.onconnectionstatechange = () => {
        if (pc.connectionState === 'failed' || pc.connectionState === 'closed') {
          pc.close();
          delete peerConnectionsRef.current[remotePeerId];
        }
      };

      return pc;
    },
    [sendSignaling, isDeafened, peerVolumes]
  );

  // Poll signaling messages
  const pollSignaling = useCallback(async () => {
    if (!roomId || !peerId) return;

    try {
      const res = await fetch(
        `/api/signaling?roomId=${encodeURIComponent(roomId)}&peerId=${encodeURIComponent(
          peerId
        )}&since=${lastSyncTimestampRef.current}`
      );
      if (!res.ok) return;

      const data = await res.json();
      if (!data.roomExists) return;

      lastSyncTimestampRef.current = data.serverTime;
      setPeers(data.peers || {});

      // Process new incoming signaling messages
      const msgs: SignalingMessage[] = data.messages || [];
      for (const msg of msgs) {
        const fromId = msg.fromPeerId;

        if (msg.type === 'offer') {
          const pc = getOrCreatePeerConnection(fromId);
          await pc.setRemoteDescription(new RTCSessionDescription(msg.payload.offer));
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          sendSignaling('answer', { answer }, fromId);
        } else if (msg.type === 'answer') {
          const pc = peerConnectionsRef.current[fromId];
          if (pc && pc.signalingState !== 'stable') {
            await pc.setRemoteDescription(new RTCSessionDescription(msg.payload.answer));
          }
        } else if (msg.type === 'ice-candidate') {
          const pc = peerConnectionsRef.current[fromId];
          if (pc && msg.payload.candidate) {
            try {
              await pc.addIceCandidate(new RTCIceCandidate(msg.payload.candidate));
            } catch {
              // ignore duplicate candidate
            }
          }
        } else if (msg.type === 'chat-message') {
          setMessages((prev) => [...prev, msg.payload]);
        } else if (msg.type === 'sfx-trigger') {
          triggerSfxById(msg.payload.sfxId);
        } else if (msg.type === 'join') {
          playJoinSound();
          // Initiate offer to the new joiner if our peerId is lexicographically smaller to prevent offer collision
          if (peerId < fromId) {
            const pc = getOrCreatePeerConnection(fromId);
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);
            sendSignaling('offer', { offer }, fromId);
          }
        } else if (msg.type === 'leave') {
          playLeaveSound();
          if (peerConnectionsRef.current[fromId]) {
            peerConnectionsRef.current[fromId].close();
            delete peerConnectionsRef.current[fromId];
          }
          if (remoteAudiosRef.current[fromId]) {
            remoteAudiosRef.current[fromId].srcObject = null;
            delete remoteAudiosRef.current[fromId];
          }
        }
      }
    } catch {
      // ignore transient network hiccups
    }
  }, [roomId, peerId, getOrCreatePeerConnection, sendSignaling]);

  // Connect to room on mount or room change
  useEffect(() => {
    let isMounted = true;

    async function startRoom() {
      await initMicrophone(selectedDeviceId);
      await sendSignaling('join', {
        name: userName,
        avatarSeed: peerId,
        isMuted: false,
        isDeafened: false,
      });

      if (isMounted) {
        setConnected(true);
        playJoinSound();
      }

      // Initial signaling poll
      pollSignaling();

      // Setup continuous interval
      pollingTimerRef.current = setInterval(pollSignaling, 1200);
    }

    startRoom();

    return () => {
      isMounted = false;
      if (pollingTimerRef.current) clearInterval(pollingTimerRef.current);
      sendSignaling('leave');

      // Cleanup local tracks
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((t) => t.stop());
      }
      // Cleanup peer connections
      Object.values(peerConnectionsRef.current).forEach((pc) => pc.close());
      peerConnectionsRef.current = {};
      Object.values(remoteAudiosRef.current).forEach((a) => {
        a.srcObject = null;
      });
      remoteAudiosRef.current = {};
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [roomId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Audio level analysis loop
  useEffect(() => {
    const dataArray = new Uint8Array(128);

    const checkLevel = () => {
      if (analyserRef.current && !isMuted && (!isPttMode || isPttActive)) {
        analyserRef.current.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i];
        }
        const avg = sum / dataArray.length;
        const normalized = Math.min(100, Math.round((avg / 128) * 100));
        setAudioLevel(normalized);

        const speakingNow = normalized > noiseGateThreshold;
        setIsSpeaking(speakingNow);
      } else {
        setAudioLevel(0);
        setIsSpeaking(false);
      }
      animFrameRef.current = requestAnimationFrame(checkLevel);
    };

    animFrameRef.current = requestAnimationFrame(checkLevel);

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [isMuted, isPttMode, isPttActive, noiseGateThreshold]);

  // Sync mute state with audio tracks and remote peers
  const toggleMute = useCallback(() => {
    setIsMuted((prev) => {
      const next = !prev;
      playUiClick(next);

      if (localStreamRef.current) {
        localStreamRef.current.getAudioTracks().forEach((t) => {
          t.enabled = !next && (!isPttMode || isPttActive);
        });
      }

      sendSignaling('presence-update', {
        isMuted: next,
        isSpeaking: false,
        audioLevel: 0,
      });

      return next;
    });
  }, [isPttMode, isPttActive, sendSignaling]);

  // Sync deafen state
  const toggleDeafen = useCallback(() => {
    setIsDeafened((prev) => {
      const next = !prev;
      playUiClick(next);

      // Deafen also mutes mic
      if (next && !isMuted) {
        toggleMute();
      }

      // Mute all remote audio elements
      Object.values(remoteAudiosRef.current).forEach((audio) => {
        audio.muted = next;
      });

      sendSignaling('presence-update', {
        isDeafened: next,
      });

      return next;
    });
  }, [isMuted, toggleMute, sendSignaling]);

  // Handle remote peer volume adjustment
  const setPeerVolume = useCallback(
    (remotePeerId: string, vol: number) => {
      setPeerVolumes((prev) => ({ ...prev, [remotePeerId]: vol }));
      const audioEl = remoteAudiosRef.current[remotePeerId];
      if (audioEl) {
        audioEl.volume = isDeafened ? 0 : Math.min(1, Math.max(0, vol));
      }
    },
    [isDeafened]
  );

  // Send tactical chat message
  const sendMessage = useCallback(
    (text: string, quickCallout: boolean = false, isAi: boolean = false) => {
      const chatMsg: ChatMessage = {
        id: `chat_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        senderId: isAi ? 'apex-9' : peerId,
        senderName: isAi ? 'APEX-9 // AI COACH' : userName,
        avatarSeed: isAi ? 'ai_apex' : peerId,
        text,
        timestamp: Date.now(),
        quickCallout,
        isAi,
      };

      setMessages((prev) => [...prev, chatMsg]);
      sendSignaling('chat-message', chatMsg);
    },
    [peerId, userName, sendSignaling]
  );

  // Broadcast soundboard SFX
  const broadcastSfx = useCallback(
    (sfxId: string) => {
      sendSignaling('sfx-trigger', { sfxId });
    },
    [sendSignaling]
  );

  // Push to talk listeners (Space key)
  useEffect(() => {
    if (!isPttMode) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !e.repeat && document.activeElement?.tagName !== 'INPUT') {
        e.preventDefault();
        setIsPttActive(true);
        if (localStreamRef.current && !isMuted) {
          localStreamRef.current.getAudioTracks().forEach((t) => (t.enabled = true));
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        setIsPttActive(false);
        if (localStreamRef.current) {
          localStreamRef.current.getAudioTracks().forEach((t) => (t.enabled = false));
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [isPttMode, isMuted]);

  // Global hotkeys (M for mute, D for deafen)
  useEffect(() => {
    const handleHotkeys = (e: KeyboardEvent) => {
      if (document.activeElement?.tagName === 'INPUT') return;
      if (e.key === 'm' || e.key === 'M') {
        e.preventDefault();
        toggleMute();
      } else if (e.key === 'd' || e.key === 'D') {
        e.preventDefault();
        toggleDeafen();
      }
    };

    window.addEventListener('keydown', handleHotkeys);
    return () => window.removeEventListener('keydown', handleHotkeys);
  }, [toggleMute, toggleDeafen]);

  return {
    peerId,
    connected,
    isMuted,
    isDeafened,
    isPttMode,
    isPttActive,
    noiseGateThreshold,
    audioLevel,
    isSpeaking,
    peers,
    peerVolumes,
    messages,
    micPermissionError,
    audioDevices,
    selectedDeviceId,
    toggleMute,
    toggleDeafen,
    setIsPttMode,
    setNoiseGateThreshold,
    setPeerVolume,
    sendMessage,
    broadcastSfx,
    initMicrophone,
    setSelectedDeviceId,
  };
}
