'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { PeerInfo, ChatMessage } from '@/lib/types';
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

const MAX_SLOTS = 8;

const ICE_CONFIG = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun.services.mozilla.com' },
    { urls: 'stun:global.stun.twilio.com:3478' },
  ],
};

export function useVoiceRoom({ roomId, userName }: UseVoiceRoomOptions) {
  const [connected, setConnected] = useState(false);
  const [peerId, setPeerId] = useState<string>('');
  const [slotIndex, setSlotIndex] = useState<number>(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isDeafened, setIsDeafened] = useState(false);
  const [isPttMode, setIsPttMode] = useState(false);
  const [isPttActive, setIsPttActive] = useState(false);
  const [noiseGateThreshold, setNoiseGateThreshold] = useState(15);
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
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'error'>('connecting');

  // Internal references
  const peerInstanceRef = useRef<any>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const dataConnsRef = useRef<Record<string, any>>({});
  const mediaCallsRef = useRef<Record<string, any>>({});
  const remoteGainNodesRef = useRef<Record<string, GainNode>>({});
  const remoteAnalysersRef = useRef<Record<string, AnalyserNode>>({});
  const loopbackGainRef = useRef<GainNode | null>(null);
  const broadcastChannelRef = useRef<BroadcastChannel | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const heartbeatTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Update audio input devices
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

  // Request Microphone and setup Audio Analyser
  const initMicrophone = useCallback(
    async (deviceId?: string): Promise<MediaStream | null> => {
      try {
        setMicPermissionError(null);
        await unlockAudioContext();

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

        // Apply mute state
        const audioTrack = stream.getAudioTracks()[0];
        if (audioTrack) {
          audioTrack.enabled = !isMuted && (!isPttMode || isPttActive);
        }

        // Replace track in existing outgoing calls
        Object.values(mediaCallsRef.current).forEach((call) => {
          if (call.peerConnection && audioTrack) {
            const senders = call.peerConnection.getSenders();
            const sender = senders.find((s: any) => s.track?.kind === 'audio');
            if (sender) {
              sender.replaceTrack(audioTrack).catch(() => {});
            }
          }
        });

        // Setup Web Audio Analyser
        const audioCtx = getAudioContext();
        if (audioCtx) {
          if (audioCtx.state === 'suspended') {
            audioCtx.resume().catch(() => {});
          }
          const source = audioCtx.createMediaStreamSource(stream);

          // Loopback Gain Node
          const loopGain = audioCtx.createGain();
          loopGain.gain.value = testLoopback ? 0.8 : 0;
          source.connect(loopGain);
          loopGain.connect(audioCtx.destination);
          loopbackGainRef.current = loopGain;
        }

        await updateAudioDevices();
        return stream;
      } catch (err: unknown) {
        console.warn('Microphone error:', err);
        const msg = err instanceof Error ? err.message : 'Permissão de microfone negada.';
        setMicPermissionError(msg);
        return null;
      }
    },
    [isMuted, isPttMode, isPttActive, testLoopback, updateAudioDevices]
  );

  // Toggle loopback self-test
  const toggleTestLoopback = useCallback((enabled: boolean) => {
    setTestLoopback(enabled);
    if (loopbackGainRef.current) {
      loopbackGainRef.current.gain.value = enabled ? 0.8 : 0;
    }
  }, []);

  // Broadcast data payload to all connected peers
  const broadcastData = useCallback((type: string, payload: any) => {
    const message = { type, payload, timestamp: Date.now() };

    // Send via DataConnections
    Object.values(dataConnsRef.current).forEach((conn) => {
      if (conn && conn.open) {
        try {
          conn.send(message);
        } catch {
          // ignore
        }
      }
    });

    // Send via local BroadcastChannel
    if (broadcastChannelRef.current) {
      try {
        broadcastChannelRef.current.postMessage(message);
      } catch {
        // ignore
      }
    }
  }, []);

  // Setup incoming stream audio routing
  const attachRemoteStream = useCallback(
    (remotePeerId: string, stream: MediaStream) => {
      setRemoteStreams((prev) => ({ ...prev, [remotePeerId]: stream }));

      const audioCtx = getAudioContext();
      if (!audioCtx) return;

      if (audioCtx.state === 'suspended') {
        audioCtx.resume().catch(() => setAudioBlocked(true));
      }

      try {
        // Check if already routed
        if (remoteGainNodesRef.current[remotePeerId]) {
          return;
        }

        const source = audioCtx.createMediaStreamSource(stream);
        const gainNode = audioCtx.createGain();
        const initialVol = peerVolumes[remotePeerId] ?? 1.0;
        gainNode.gain.value = isDeafened ? 0 : initialVol;

        const analyser = audioCtx.createAnalyser();
        analyser.fftSize = 128;

        source.connect(analyser);
        analyser.connect(gainNode);
        gainNode.connect(audioCtx.destination);

        remoteGainNodesRef.current[remotePeerId] = gainNode;
        remoteAnalysersRef.current[remotePeerId] = analyser;
      } catch (err) {
        console.warn('Audio routing error:', err);
      }
    },
    [isDeafened, peerVolumes]
  );

  // Handle incoming data message from remote peer
  const handleDataMessage = useCallback(
    (data: any, fromPeerId?: string) => {
      if (!data || !data.type) return;

      if (data.type === 'announce') {
        const info: PeerInfo = data.payload;
        setPeers((prev) => ({
          ...prev,
          [info.id]: {
            ...prev[info.id],
            ...info,
          },
        }));
      } else if (data.type === 'presence') {
        const { id, isMuted, isSpeaking, audioLevel } = data.payload;
        if (id) {
          setPeers((prev) => {
            if (!prev[id]) return prev;
            return {
              ...prev,
              [id]: {
                ...prev[id],
                isMuted: isMuted ?? prev[id].isMuted,
                isSpeaking: isSpeaking ?? prev[id].isSpeaking,
                audioLevel: audioLevel ?? prev[id].audioLevel,
              },
            };
          });
        }
      } else if (data.type === 'chat') {
        setMessages((prev) => [...prev, data.payload]);
      } else if (data.type === 'sfx') {
        triggerSfxById(data.payload.sfxId);
      } else if (data.type === 'leave') {
        const id = data.payload.id || fromPeerId;
        if (id) {
          playLeaveSound();
          setPeers((prev) => {
            const next = { ...prev };
            delete next[id];
            return next;
          });
          setRemoteStreams((prev) => {
            const next = { ...prev };
            delete next[id];
            return next;
          });
        }
      }
    },
    []
  );

  // Setup DataConnection listeners
  const setupDataConnection = useCallback(
    (conn: any) => {
      const remoteId = conn.peer;
      dataConnsRef.current[remoteId] = conn;

      conn.on('open', () => {
        // Send initial announcement
        conn.send({
          type: 'announce',
          payload: {
            id: peerInstanceRef.current?.id || '',
            name: userName,
            avatarSeed: peerInstanceRef.current?.id || '',
            isMuted,
            isDeafened,
            isSpeaking: false,
            audioLevel: 0,
            pingMs: 20,
            joinedAt: Date.now(),
          },
        });
      });

      conn.on('data', (data: any) => {
        handleDataMessage(data, remoteId);
      });

      conn.on('close', () => {
        delete dataConnsRef.current[remoteId];
        setPeers((prev) => {
          const next = { ...prev };
          delete next[remoteId];
          return next;
        });
      });

      conn.on('error', () => {
        delete dataConnsRef.current[remoteId];
      });
    },
    [userName, isMuted, isDeafened, handleDataMessage]
  );

  // Setup outgoing call to a specific slot
  const callSlot = useCallback(
    (targetPeerId: string, stream: MediaStream) => {
      const peer = peerInstanceRef.current;
      if (!peer || targetPeerId === peer.id || mediaCallsRef.current[targetPeerId]) {
        return;
      }

      try {
        // Open DataConnection
        if (!dataConnsRef.current[targetPeerId]) {
          const conn = peer.connect(targetPeerId, {
            metadata: { name: userName },
            reliable: true,
          });
          setupDataConnection(conn);
        }

        // Call remote peer with audio stream
        const call = peer.call(targetPeerId, stream, {
          metadata: { name: userName },
        });

        mediaCallsRef.current[targetPeerId] = call;

        call.on('stream', (remStream: MediaStream) => {
          playJoinSound();
          attachRemoteStream(targetPeerId, remStream);
          setPeers((prev) => ({
            ...prev,
            [targetPeerId]: {
              id: targetPeerId,
              name: call.metadata?.name || `Squadmate_${targetPeerId.slice(-4)}`,
              avatarSeed: targetPeerId,
              isMuted: false,
              isDeafened: false,
              isSpeaking: false,
              audioLevel: 0,
              pingMs: 18,
              joinedAt: Date.now(),
              hasAudio: true,
            },
          }));
        });

        call.on('close', () => {
          delete mediaCallsRef.current[targetPeerId];
          delete remoteGainNodesRef.current[targetPeerId];
          delete remoteAnalysersRef.current[targetPeerId];
          setRemoteStreams((prev) => {
            const next = { ...prev };
            delete next[targetPeerId];
            return next;
          });
        });

        call.on('error', () => {
          delete mediaCallsRef.current[targetPeerId];
        });
      } catch (err) {
        console.warn('Call error to', targetPeerId, err);
      }
    },
    [userName, setupDataConnection, attachRemoteStream]
  );

  // Connect to room using PeerJS and deterministic slots
  useEffect(() => {
    if (!roomId) return;

    let isMounted = true;
    const cleanRoom = roomId.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');

    // Setup local BroadcastChannel for instant local tab discovery
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      const bc = new BroadcastChannel(`vortex_bcast_${cleanRoom}`);
      broadcastChannelRef.current = bc;
      bc.onmessage = (e) => {
        handleDataMessage(e.data);
      };
    }

    async function initializeVoiceEngine() {
      setConnectionStatus('connecting');
      const stream = await initMicrophone(selectedDeviceId);
      if (!isMounted) return;

      // Dynamically import PeerJS (100% safe in Next.js App Router)
      const { default: Peer } = await import('peerjs');

      // Attempt to bind slot s0, s1, s2... up to s7
      let currentSlot = 0;
      let activePeer: any = null;

      const tryBindSlot = (slot: number) => {
        if (!isMounted) return;
        const targetId = `vortex_${cleanRoom}_s${slot}`;

        const peer = new Peer(targetId, {
          debug: 1,
          config: ICE_CONFIG,
        });

        peer.on('open', (assignedId) => {
          if (!isMounted) {
            peer.destroy();
            return;
          }
          activePeer = peer;
          peerInstanceRef.current = peer;
          setPeerId(assignedId);
          setSlotIndex(slot);
          setConnected(true);
          setConnectionStatus('connected');
          playJoinSound();

          // Listen for incoming calls
          peer.on('call', (call) => {
            const remId = call.peer;
            mediaCallsRef.current[remId] = call;

            // Always answer with local audio stream
            const outStream = localStreamRef.current || stream || new MediaStream();
            call.answer(outStream);

            call.on('stream', (remStream: MediaStream) => {
              attachRemoteStream(remId, remStream);
              setPeers((prev) => ({
                ...prev,
                [remId]: {
                  id: remId,
                  name: call.metadata?.name || `Squadmate_${remId.slice(-4)}`,
                  avatarSeed: remId,
                  isMuted: false,
                  isDeafened: false,
                  isSpeaking: false,
                  audioLevel: 0,
                  pingMs: 16,
                  joinedAt: Date.now(),
                  hasAudio: true,
                },
              }));
            });

            call.on('close', () => {
              delete mediaCallsRef.current[remId];
              delete remoteGainNodesRef.current[remId];
              delete remoteAnalysersRef.current[remId];
              setRemoteStreams((prev) => {
                const next = { ...prev };
                delete next[remId];
                return next;
              });
            });
          });

          // Listen for incoming data connections
          peer.on('connection', (conn) => {
            setupDataConnection(conn);
          });

          // Now call all other possible slots in room (0..MAX_SLOTS)
          for (let s = 0; s < MAX_SLOTS; s++) {
            if (s !== slot) {
              const otherSlotId = `vortex_${cleanRoom}_s${s}`;
              if (stream) {
                callSlot(otherSlotId, stream);
              }
            }
          }

          // Broadcast announcement locally
          broadcastData('announce', {
            id: assignedId,
            name: userName,
            avatarSeed: assignedId,
            isMuted,
            isDeafened,
            isSpeaking: false,
            audioLevel: 0,
            pingMs: 14,
            joinedAt: Date.now(),
          });
        });

        peer.on('error', (err: any) => {
          // If ID is already taken by another squadmate in this room, try next slot!
          if (err.type === 'unavailable-id') {
            peer.destroy();
            if (slot + 1 < MAX_SLOTS) {
              currentSlot = slot + 1;
              tryBindSlot(currentSlot);
            } else {
              setConnectionStatus('error');
              console.warn('All 8 room slots are occupied');
            }
          } else {
            console.warn('PeerJS error:', err);
          }
        });
      };

      tryBindSlot(currentSlot);

      // Periodic presence heartbeat and slot reconnection
      heartbeatTimerRef.current = setInterval(() => {
        if (!peerInstanceRef.current || peerInstanceRef.current.destroyed) return;

        // Try calling any missing slots
        if (localStreamRef.current) {
          for (let s = 0; s < MAX_SLOTS; s++) {
            if (s !== currentSlot) {
              const targetId = `vortex_${cleanRoom}_s${s}`;
              if (!mediaCallsRef.current[targetId]) {
                callSlot(targetId, localStreamRef.current);
              }
            }
          }
        }
      }, 5000);
    }

    initializeVoiceEngine();

    return () => {
      isMounted = false;
      if (heartbeatTimerRef.current) clearInterval(heartbeatTimerRef.current);

      // Send leave message
      broadcastData('leave', { id: peerInstanceRef.current?.id || '' });

      if (broadcastChannelRef.current) {
        broadcastChannelRef.current.close();
        broadcastChannelRef.current = null;
      }

      // Cleanup calls and conns
      Object.values(mediaCallsRef.current).forEach((call: any) => call.close?.());
      mediaCallsRef.current = {};
      Object.values(dataConnsRef.current).forEach((conn: any) => conn.close?.());
      dataConnsRef.current = {};

      if (peerInstanceRef.current) {
        peerInstanceRef.current.destroy();
        peerInstanceRef.current = null;
      }

      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((t) => t.stop());
        localStreamRef.current = null;
      }
    };
  }, [roomId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Continuous Audio Level Analysis loop (Local & Remote peers)
  useEffect(() => {
    const dataArray = new Uint8Array(64);
    const audioCtx = getAudioContext();

    const checkLevels = () => {
      // 1. Check Local Mic Level
      if (localStreamRef.current && !isMuted && (!isPttMode || isPttActive)) {
        const audioTrack = localStreamRef.current.getAudioTracks()[0];
        if (audioTrack && audioTrack.enabled) {
          // Approximate RMS from Web Audio or random jitter when unmuted
          let norm = 0;
          if (audioCtx && audioCtx.state === 'running') {
            // Analyser calculation
            const analyser = audioCtx.createAnalyser();
            analyser.fftSize = 64;
            // Level is alive
          }
        }
      }

      // 2. Measure Remote Peers Analysers
      Object.entries(remoteAnalysersRef.current).forEach(([rId, analyser]) => {
        analyser.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i];
        }
        const avg = sum / dataArray.length;
        const norm = Math.min(100, Math.round((avg / 128) * 100));
        const isSpk = norm > 14;

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

      animFrameRef.current = requestAnimationFrame(checkLevels);
    };

    animFrameRef.current = requestAnimationFrame(checkLevels);

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [isMuted, isPttMode, isPttActive]);

  // Audio level meter loop for local user
  useEffect(() => {
    const audioCtx = getAudioContext();
    if (!audioCtx) return;

    let analyserNode: AnalyserNode | null = null;
    let sourceNode: MediaStreamAudioSourceNode | null = null;
    const freqData = new Uint8Array(32);

    if (localStreamRef.current) {
      try {
        sourceNode = audioCtx.createMediaStreamSource(localStreamRef.current);
        analyserNode = audioCtx.createAnalyser();
        analyserNode.fftSize = 64;
        sourceNode.connect(analyserNode);
      } catch {
        // ignore
      }
    }

    let interval = setInterval(() => {
      if (analyserNode && !isMuted && (!isPttMode || isPttActive)) {
        analyserNode.getByteFrequencyData(freqData);
        let sum = 0;
        for (let i = 0; i < freqData.length; i++) {
          sum += freqData[i];
        }
        const avg = sum / freqData.length;
        const norm = Math.min(100, Math.round((avg / 128) * 100));
        setAudioLevel(norm);
        const speaking = norm > noiseGateThreshold;
        setIsSpeaking(speaking);

        // Broadcast presence when speaking state changes
        broadcastData('presence', {
          id: peerInstanceRef.current?.id || '',
          isSpeaking: speaking,
          audioLevel: norm,
        });
      } else {
        setAudioLevel(0);
        setIsSpeaking(false);
      }
    }, 100);

    return () => {
      clearInterval(interval);
      if (sourceNode && analyserNode) {
        try {
          sourceNode.disconnect();
        } catch {
          // ignore
        }
      }
    };
  }, [isMuted, isPttMode, isPttActive, noiseGateThreshold, broadcastData]);

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

      broadcastData('presence', {
        id: peerInstanceRef.current?.id || '',
        isMuted: next,
        isSpeaking: false,
        audioLevel: 0,
      });

      return next;
    });
  }, [isPttMode, isPttActive, broadcastData]);

  // Toggle Deafen
  const toggleDeafen = useCallback(() => {
    setIsDeafened((prev) => {
      const next = !prev;
      playUiClick(next);

      if (next && !isMuted) {
        toggleMute();
      }

      // Mute/unmute all remote gain nodes
      Object.entries(remoteGainNodesRef.current).forEach(([rId, gainNode]) => {
        const vol = peerVolumes[rId] ?? 1.0;
        gainNode.gain.value = next ? 0 : vol;
      });

      broadcastData('presence', {
        id: peerInstanceRef.current?.id || '',
        isDeafened: next,
      });

      return next;
    });
  }, [isMuted, toggleMute, peerVolumes, broadcastData]);

  // Individual Remote Peer Volume Adjustment
  const setPeerVolume = useCallback(
    (remotePeerId: string, vol: number) => {
      setPeerVolumes((prev) => ({ ...prev, [remotePeerId]: vol }));
      const gainNode = remoteGainNodesRef.current[remotePeerId];
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
        senderId: isAi ? 'apex-9' : peerInstanceRef.current?.id || 'self',
        senderName: isAi ? 'APEX-9 // AI COACH' : userName,
        avatarSeed: isAi ? 'ai_apex' : peerInstanceRef.current?.id || 'self',
        text,
        timestamp: Date.now(),
        quickCallout,
        isAi,
      };

      setMessages((prev) => [...prev, chatMsg]);
      broadcastData('chat', chatMsg);
    },
    [userName, broadcastData]
  );

  // Broadcast soundboard SFX
  const broadcastSfx = useCallback(
    (sfxId: string) => {
      broadcastData('sfx', { sfxId });
    },
    [broadcastData]
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
    slotIndex,
    connected,
    connectionStatus,
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
