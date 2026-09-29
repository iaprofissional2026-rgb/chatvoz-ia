'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { PeerInfo, ChatMessage, SignalingMessage } from '@/lib/types';
import {
  getAudioContext,
  unlockAudioContext,
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
    { urls: 'stun:stun.services.mozilla.com' },
    { urls: 'stun:global.stun.twilio.com:3478' },
  ],
};

export function useVoiceRoom({ roomId, userName }: UseVoiceRoomOptions) {
  // Stable peer ID generated immediately (never empty)
  const [peerId] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      let id = sessionStorage.getItem('vortex_peer_id');
      if (!id) {
        id = `p_${Math.random().toString(36).substring(2, 8)}`;
        sessionStorage.setItem('vortex_peer_id', id);
      }
      return id;
    }
    return `p_${Math.random().toString(36).substring(2, 8)}`;
  });

  const [connected, setConnected] = useState(false);
  const [hasMicPermission, setHasMicPermission] = useState(false);
  const [isMicInitializing, setIsMicInitializing] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isDeafened, setIsDeafened] = useState(false);
  const [isPttMode, setIsPttMode] = useState(false);
  const [isPttActive, setIsPttActive] = useState(false);
  const [noiseGateThreshold, setNoiseGateThreshold] = useState(8);
  const [audioLevel, setAudioLevel] = useState(0);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [testLoopback, setTestLoopback] = useState(false);
  const [audioBlocked, setAudioBlocked] = useState(false);

  const [peers, setPeers] = useState<Record<string, PeerInfo>>({});
  const [remoteStreams, setRemoteStreams] = useState<Record<string, MediaStream>>({});
  const [peerVolumes, setPeerVolumes] = useState<Record<string, number>>({});
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [micPermissionError, setMicPermissionError] = useState<string | null>(null);
  const [audioDevices, setAudioDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');

  // WebRTC internal refs
  const localStreamRef = useRef<MediaStream | null>(null);
  const localAnalyserRef = useRef<AnalyserNode | null>(null);
  const localSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const peerConnectionsRef = useRef<Record<string, RTCPeerConnection>>({});
  const remoteGainNodesRef = useRef<Record<string, GainNode>>({});
  const remoteAnalysersRef = useRef<Record<string, AnalyserNode>>({});
  const iceCandidatesQueueRef = useRef<Record<string, RTCIceCandidateInit[]>>({});
  const loopbackGainRef = useRef<GainNode | null>(null);
  const broadcastChannelRef = useRef<BroadcastChannel | null>(null);
  const lastSyncTimestampRef = useRef<number>(0);
  const pollingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const animFrameRef = useRef<number | null>(null);

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

  // Unlock audio globally
  const handleUnlockAudio = useCallback(async () => {
    await unlockAudioContext();
    setAudioBlocked(false);
  }, []);

  // Request Microphone and setup Audio Analyser (works on landing page and in room)
  const initMicrophone = useCallback(
    async (deviceId?: string): Promise<MediaStream | null> => {
      if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
        setMicPermissionError('Navegador não suporta captura de microfone WebRTC.');
        return null;
      }

      setIsMicInitializing(true);
      setMicPermissionError(null);

      try {
        await unlockAudioContext();

        // Build robust media constraints
        const targetDeviceId = deviceId || selectedDeviceId;
        const audioConstraints: MediaTrackConstraints = {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        };
        if (targetDeviceId && targetDeviceId.trim()) {
          audioConstraints.deviceId = { ideal: targetDeviceId };
        }

        let stream: MediaStream;
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            audio: audioConstraints,
            video: false,
          });
        } catch (constraintErr: unknown) {
          console.warn('Advanced audio constraints failed, trying basic audio: true', constraintErr);
          // Fallback to basic audio
          stream = await navigator.mediaDevices.getUserMedia({
            audio: true,
            video: false,
          });
        }

        localStreamRef.current = stream;
        setHasMicPermission(true);

        // Apply initial mute state
        const audioTrack = stream.getAudioTracks()[0];
        if (audioTrack) {
          audioTrack.enabled = !isMuted && (!isPttMode || isPttActive);
        }

        // Attach track to all existing RTCPeerConnections
        Object.values(peerConnectionsRef.current).forEach((pc) => {
          if (audioTrack) {
            const senders = pc.getSenders();
            const sender = senders.find((s) => s.track?.kind === 'audio');
            if (sender) {
              sender.replaceTrack(audioTrack).catch(() => {});
            } else {
              try {
                pc.addTrack(audioTrack, stream);
              } catch {
                // ignore
              }
            }
          }
        });

        // Setup Web Audio Analyser
        const audioCtx = getAudioContext();
        if (audioCtx) {
          if (audioCtx.state === 'suspended') {
            audioCtx.resume().catch(() => {});
          }

          // Disconnect old nodes if present
          if (localSourceRef.current) {
            try {
              localSourceRef.current.disconnect();
            } catch {
              // ignore
            }
          }

          const source = audioCtx.createMediaStreamSource(stream);
          const analyser = audioCtx.createAnalyser();
          analyser.fftSize = 256;
          analyser.smoothingTimeConstant = 0.4;
          source.connect(analyser);

          localSourceRef.current = source;
          localAnalyserRef.current = analyser;

          // Loopback Gain Node (Self-test)
          const loopGain = audioCtx.createGain();
          loopGain.gain.value = testLoopback ? 0.75 : 0;
          source.connect(loopGain);
          loopGain.connect(audioCtx.destination);
          loopbackGainRef.current = loopGain;
        }

        await updateAudioDevices();
        return stream;
      } catch (err: unknown) {
        console.warn('Microphone permission error:', err);
        setHasMicPermission(false);

        let userMsg = 'Permissão de microfone negada.';
        if (err instanceof Error) {
          if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
            userMsg =
              'O navegador bloqueou o microfone. Clique no ícone de cadeado (ao lado do endereço do site) e mude Microfone para Permitir.';
          } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
            userMsg = 'Nenhum microfone encontrado conectado no seu dispositivo.';
          } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
            userMsg =
              'O microfone está ocupado por outro aplicativo (Discord, Zoom ou jogo). Feche o outro app e tente novamente.';
          } else {
            userMsg = err.message;
          }
        }
        setMicPermissionError(userMsg);
        return null;
      } finally {
        setIsMicInitializing(false);
      }
    },
    [selectedDeviceId, isMuted, isPttMode, isPttActive, testLoopback, updateAudioDevices]
  );

  // Auto-request mic on first user interaction or mount if supported
  useEffect(() => {
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) return;

    // Check if permission was already granted previously
    if (navigator.permissions && navigator.permissions.query) {
      navigator.permissions
        .query({ name: 'microphone' as PermissionName })
        .then((perm) => {
          if (perm.state === 'granted') {
            initMicrophone();
          }
        })
        .catch(() => {});
    }
  }, [initMicrophone]);

  // Toggle loopback self-test
  const toggleTestLoopback = useCallback((enabled: boolean) => {
    setTestLoopback(enabled);
    if (loopbackGainRef.current) {
      loopbackGainRef.current.gain.value = enabled ? 0.75 : 0;
    }
  }, []);

  // Send signaling message via both BroadcastChannel and API route
  const sendSignaling = useCallback(
    async (type: string, payload: any = {}, toPeerId?: string) => {
      const msg: SignalingMessage = {
        id: `${type}_${peerId}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        roomId,
        fromPeerId: peerId,
        toPeerId,
        type: type as any,
        payload,
        timestamp: Date.now(),
      };

      // 1. Send via local BroadcastChannel (instant for tabs on same machine)
      if (broadcastChannelRef.current) {
        try {
          broadcastChannelRef.current.postMessage(msg);
        } catch {
          // ignore
        }
      }

      // 2. Send via Next.js API (relays across Vercel)
      try {
        fetch('/api/signaling', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            roomId,
            fromPeerId: peerId,
            toPeerId,
            type,
            payload,
          }),
        }).catch(() => {});
      } catch {
        // ignore
      }
    },
    [roomId, peerId]
  );

  // Setup Web Audio routing for remote stream
  const routeRemoteAudio = useCallback(
    (remId: string, stream: MediaStream) => {
      setRemoteStreams((prev) => ({ ...prev, [remId]: stream }));

      const audioCtx = getAudioContext();
      if (!audioCtx) return;

      if (audioCtx.state === 'suspended') {
        audioCtx.resume().catch(() => setAudioBlocked(true));
      }

      try {
        if (remoteGainNodesRef.current[remId]) return;

        const source = audioCtx.createMediaStreamSource(stream);
        const gainNode = audioCtx.createGain();
        const initialVol = peerVolumes[remId] ?? 1.0;
        gainNode.gain.value = isDeafened ? 0 : initialVol;

        const analyser = audioCtx.createAnalyser();
        analyser.fftSize = 128;

        source.connect(analyser);
        analyser.connect(gainNode);
        gainNode.connect(audioCtx.destination);

        remoteGainNodesRef.current[remId] = gainNode;
        remoteAnalysersRef.current[remId] = analyser;
      } catch (err) {
        console.warn('Audio routing error:', err);
      }
    },
    [isDeafened, peerVolumes]
  );

  // Create or get RTCPeerConnection for a remote peer
  const getOrCreatePeerConnection = useCallback(
    (remId: string): RTCPeerConnection => {
      if (peerConnectionsRef.current[remId]) {
        return peerConnectionsRef.current[remId];
      }

      const pc = new RTCPeerConnection(ICE_SERVERS);
      peerConnectionsRef.current[remId] = pc;

      // Always add audio transceiver so SDP offer/answer includes audio channels
      try {
        pc.addTransceiver('audio', { direction: 'sendrecv' });
      } catch {
        // ignore
      }

      // Add local audio track if ready
      if (localStreamRef.current) {
        localStreamRef.current.getAudioTracks().forEach((track) => {
          try {
            pc.addTrack(track, localStreamRef.current!);
          } catch {
            // ignore
          }
        });
      }

      // Handle ICE candidates
      pc.onicecandidate = (event) => {
        if (event.candidate) {
          sendSignaling('ice-candidate', { candidate: event.candidate }, remId);
        }
      };

      // Handle incoming remote audio stream
      pc.ontrack = (event) => {
        if (event.streams && event.streams[0]) {
          routeRemoteAudio(remId, event.streams[0]);
          playJoinSound();
        }
      };

      pc.onconnectionstatechange = () => {
        if (pc.connectionState === 'failed' || pc.connectionState === 'closed') {
          pc.close();
          delete peerConnectionsRef.current[remId];
          delete remoteGainNodesRef.current[remId];
          delete remoteAnalysersRef.current[remId];
          setRemoteStreams((prev) => {
            const next = { ...prev };
            delete next[remId];
            return next;
          });
        }
      };

      return pc;
    },
    [sendSignaling, routeRemoteAudio]
  );

  // Handle incoming signaling message (from API or BroadcastChannel)
  const handleIncomingMessage = useCallback(
    async (msg: SignalingMessage) => {
      if (!msg || msg.fromPeerId === peerId) return;
      if (msg.toPeerId && msg.toPeerId !== peerId) return;

      const fromId = msg.fromPeerId;

      if (msg.type === 'join') {
        playJoinSound();
        setPeers((prev) => ({
          ...prev,
          [fromId]: {
            id: fromId,
            name: msg.payload?.name || `Squadmate_${fromId.slice(-4)}`,
            avatarSeed: msg.payload?.avatarSeed || fromId,
            isMuted: !!msg.payload?.isMuted,
            isDeafened: !!msg.payload?.isDeafened,
            isSpeaking: false,
            audioLevel: 0,
            pingMs: 16,
            joinedAt: Date.now(),
          },
        }));

        // Send offer if our ID is lexicographically smaller to prevent collision
        if (peerId < fromId) {
          const pc = getOrCreatePeerConnection(fromId);
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          sendSignaling('offer', { offer }, fromId);
        }
      } else if (msg.type === 'offer') {
        const pc = getOrCreatePeerConnection(fromId);
        await pc.setRemoteDescription(new RTCSessionDescription(msg.payload.offer));

        // Flush buffered ICE candidates
        const queued = iceCandidatesQueueRef.current[fromId] || [];
        for (const cand of queued) {
          try {
            await pc.addIceCandidate(new RTCIceCandidate(cand));
          } catch {
            // ignore
          }
        }
        delete iceCandidatesQueueRef.current[fromId];

        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        sendSignaling('answer', { answer }, fromId);
      } else if (msg.type === 'answer') {
        const pc = peerConnectionsRef.current[fromId];
        if (pc && pc.signalingState !== 'stable') {
          await pc.setRemoteDescription(new RTCSessionDescription(msg.payload.answer));

          // Flush queued candidates
          const queued = iceCandidatesQueueRef.current[fromId] || [];
          for (const cand of queued) {
            try {
              await pc.addIceCandidate(new RTCIceCandidate(cand));
            } catch {
              // ignore
            }
          }
          delete iceCandidatesQueueRef.current[fromId];
        }
      } else if (msg.type === 'ice-candidate') {
        const pc = peerConnectionsRef.current[fromId];
        if (pc && msg.payload.candidate) {
          if (pc.remoteDescription) {
            try {
              await pc.addIceCandidate(new RTCIceCandidate(msg.payload.candidate));
            } catch {
              // ignore
            }
          } else {
            // Buffer candidate
            iceCandidatesQueueRef.current[fromId] = iceCandidatesQueueRef.current[fromId] || [];
            iceCandidatesQueueRef.current[fromId].push(msg.payload.candidate);
          }
        }
      } else if (msg.type === 'presence-update') {
        const payload = msg.payload;
        setPeers((prev) => {
          if (!prev[fromId]) return prev;
          return {
            ...prev,
            [fromId]: {
              ...prev[fromId],
              ...payload,
            },
          };
        });
      } else if (msg.type === 'chat-message') {
        setMessages((prev) => [...prev, msg.payload]);
      } else if (msg.type === 'sfx-trigger') {
        triggerSfxById(msg.payload.sfxId);
      } else if (msg.type === 'leave') {
        playLeaveSound();
        if (peerConnectionsRef.current[fromId]) {
          peerConnectionsRef.current[fromId].close();
          delete peerConnectionsRef.current[fromId];
        }
        delete remoteGainNodesRef.current[fromId];
        delete remoteAnalysersRef.current[fromId];
        setPeers((prev) => {
          const next = { ...prev };
          delete next[fromId];
          return next;
        });
        setRemoteStreams((prev) => {
          const next = { ...prev };
          delete next[fromId];
          return next;
        });
      }
    },
    [peerId, getOrCreatePeerConnection, sendSignaling]
  );

  // Poll signaling API
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

      // Update peer list from server
      if (data.peers) {
        setPeers((prev) => {
          const updated = { ...prev };
          Object.entries(data.peers).forEach(([id, p]: [string, any]) => {
            if (id !== peerId) {
              updated[id] = { ...updated[id], ...p };
            }
          });
          return updated;
        });
      }

      // Process new signaling messages
      const msgs: SignalingMessage[] = data.messages || [];
      for (const msg of msgs) {
        await handleIncomingMessage(msg);
      }
    } catch {
      // ignore
    }
  }, [roomId, peerId, handleIncomingMessage]);

  // Main Room Lifecycle
  useEffect(() => {
    if (!roomId) return;

    let isMounted = true;
    const cleanRoom = roomId.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');

    // 1. Setup local BroadcastChannel
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      const bc = new BroadcastChannel(`vortex_bcast_${cleanRoom}`);
      broadcastChannelRef.current = bc;
      bc.onmessage = (e) => {
        handleIncomingMessage(e.data);
      };
    }

    async function startVoiceRoom() {
      // Make sure mic is initialized
      await initMicrophone(selectedDeviceId);
      if (!isMounted) return;

      setConnected(true);
      playJoinSound();

      // Announce join
      await sendSignaling('join', {
        name: userName,
        avatarSeed: peerId,
        isMuted: false,
        isDeafened: false,
      });

      // Start signaling poll
      pollSignaling();
      pollingTimerRef.current = setInterval(pollSignaling, 1000);
    }

    startVoiceRoom();

    return () => {
      isMounted = false;
      if (pollingTimerRef.current) clearInterval(pollingTimerRef.current);

      sendSignaling('leave', { peerId });

      if (broadcastChannelRef.current) {
        broadcastChannelRef.current.close();
        broadcastChannelRef.current = null;
      }

      Object.values(peerConnectionsRef.current).forEach((pc) => pc.close());
      peerConnectionsRef.current = {};
      remoteGainNodesRef.current = {};
      remoteAnalysersRef.current = {};
    };
  }, [roomId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Continuous Audio Meter Animation Loop (RMS Time-Domain Calculation)
  useEffect(() => {
    const timeDomainBuffer = new Uint8Array(256);
    const freqDataBuffer = new Uint8Array(64);

    const checkAudioLevels = () => {
      // 1. Measure Local Mic Level via RMS in Time Domain
      if (localAnalyserRef.current && !isMuted && (!isPttMode || isPttActive)) {
        localAnalyserRef.current.getByteTimeDomainData(timeDomainBuffer);

        let sumSquares = 0;
        for (let i = 0; i < timeDomainBuffer.length; i++) {
          const sample = (timeDomainBuffer[i] - 128) / 128;
          sumSquares += sample * sample;
        }
        const rms = Math.sqrt(sumSquares / timeDomainBuffer.length);
        // Map RMS cleanly to 0-100%
        const norm = Math.min(100, Math.round(rms * 320));
        setAudioLevel(norm);

        const speaking = norm > noiseGateThreshold;
        setIsSpeaking(speaking);
      } else {
        setAudioLevel(0);
        setIsSpeaking(false);
      }

      // 2. Measure Remote Peers Levels
      Object.entries(remoteAnalysersRef.current).forEach(([rId, analyser]) => {
        analyser.getByteFrequencyData(freqDataBuffer);
        let sum = 0;
        for (let i = 0; i < freqDataBuffer.length; i++) {
          sum += freqDataBuffer[i];
        }
        const avg = sum / freqDataBuffer.length;
        const norm = Math.min(100, Math.round((avg / 128) * 100));
        const isSpk = norm > 10;

        setPeers((prev) => {
          if (!prev[rId] || prev[rId].audioLevel === norm) return prev;
          return {
            ...prev,
            [rId]: {
              ...prev[rId],
              audioLevel: norm,
              isSpeaking: isSpk,
            },
          };
        });
      });

      animFrameRef.current = requestAnimationFrame(checkAudioLevels);
    };

    animFrameRef.current = requestAnimationFrame(checkAudioLevels);

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [isMuted, isPttMode, isPttActive, noiseGateThreshold, hasMicPermission]);

  // Toggle Mute
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

  // Toggle Deafen
  const toggleDeafen = useCallback(() => {
    setIsDeafened((prev) => {
      const next = !prev;
      playUiClick(next);

      if (next && !isMuted) {
        toggleMute();
      }

      Object.entries(remoteGainNodesRef.current).forEach(([rId, gainNode]) => {
        const vol = peerVolumes[rId] ?? 1.0;
        gainNode.gain.value = next ? 0 : vol;
      });

      sendSignaling('presence-update', {
        isDeafened: next,
      });

      return next;
    });
  }, [isMuted, toggleMute, peerVolumes, sendSignaling]);

  // Volume adjustment per peer
  const setPeerVolume = useCallback(
    (remId: string, vol: number) => {
      setPeerVolumes((prev) => ({ ...prev, [remId]: vol }));
      const gainNode = remoteGainNodesRef.current[remId];
      if (gainNode) {
        gainNode.gain.value = isDeafened ? 0 : Math.min(1.5, Math.max(0, vol));
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
    hasMicPermission,
    isMicInitializing,
    isMuted,
    isDeafened,
    isPttMode,
    isPttActive,
    noiseGateThreshold,
    audioLevel,
    isSpeaking,
    peers,
    remoteStreams,
    peerVolumes,
    messages,
    micPermissionError,
    audioDevices,
    selectedDeviceId,
    testLoopback,
    audioBlocked,
    toggleMute,
    toggleDeafen,
    setIsPttMode,
    setNoiseGateThreshold,
    setPeerVolume,
    sendMessage,
    broadcastSfx,
    initMicrophone,
    setSelectedDeviceId,
    toggleTestLoopback,
    handleUnlockAudio,
  };
}
