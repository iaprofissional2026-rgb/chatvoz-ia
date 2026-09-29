import { NextRequest, NextResponse } from 'next/server';
import { PeerInfo, RoomState, SignalingMessage } from '@/lib/types';

interface StoredRoom {
  state: RoomState;
  messages: SignalingMessage[];
  lastActive: Record<string, number>;
}

// In-memory signaling store
declare global {
  var __vortex_rooms__: Map<string, StoredRoom> | undefined;
}

if (!global.__vortex_rooms__) {
  global.__vortex_rooms__ = new Map<string, StoredRoom>();
}

const rooms = global.__vortex_rooms__;

function cleanStalePeers(roomId: string) {
  const room = rooms.get(roomId);
  if (!room) return;
  const now = Date.now();
  const timeoutMs = 25000; // 25 seconds of silence = disconnected

  for (const [peerId, lastSeen] of Object.entries(room.lastActive)) {
    if (now - lastSeen > timeoutMs && !room.state.peers[peerId]?.isAiBot) {
      delete room.state.peers[peerId];
      delete room.lastActive[peerId];
      // broadcast leave message
      room.messages.push({
        id: `leave_${peerId}_${now}`,
        roomId,
        fromPeerId: peerId,
        type: 'leave',
        payload: { peerId },
        timestamp: now,
      });
    }
  }

  // Keep messages list bounded
  if (room.messages.length > 200) {
    room.messages = room.messages.slice(-100);
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const roomId = searchParams.get('roomId')?.toUpperCase().trim();
  const peerId = searchParams.get('peerId');
  const since = parseInt(searchParams.get('since') || '0', 10);

  if (!roomId || !peerId) {
    return NextResponse.json({ error: 'Missing roomId or peerId' }, { status: 400 });
  }

  const room = rooms.get(roomId);
  if (!room) {
    return NextResponse.json({
      roomExists: false,
      peers: {},
      messages: [],
      serverTime: Date.now(),
    });
  }

  // Update heartbeat
  room.lastActive[peerId] = Date.now();
  cleanStalePeers(roomId);

  // Filter messages for this peer or broadcast (toPeerId undefined), sent after 'since'
  const newMessages = room.messages.filter((msg) => {
    if (msg.timestamp <= since) return false;
    if (msg.fromPeerId === peerId) return false; // don't return own messages
    return !msg.toPeerId || msg.toPeerId === peerId;
  });

  return NextResponse.json({
    roomExists: true,
    room: room.state,
    peers: room.state.peers,
    messages: newMessages,
    serverTime: Date.now(),
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { roomId: rawRoomId, fromPeerId, toPeerId, type, payload } = body;
    const roomId = rawRoomId?.toUpperCase().trim();

    if (!roomId || !fromPeerId || !type) {
      return NextResponse.json({ error: 'Invalid signaling payload' }, { status: 400 });
    }

    let room = rooms.get(roomId);
    const now = Date.now();

    if (!room) {
      room = {
        state: {
          id: roomId,
          name: payload?.roomName || `SQUAD #${roomId}`,
          gameTag: payload?.gameTag || 'COMPETITIVE',
          createdAt: now,
          peers: {},
        },
        messages: [],
        lastActive: {},
      };
      rooms.set(roomId, room);
    }

    room.lastActive[fromPeerId] = now;

    // Handle peer lifecycle
    if (type === 'join') {
      const peerInfo: PeerInfo = {
        id: fromPeerId,
        name: payload?.name || `Player_${fromPeerId.slice(-4)}`,
        avatarSeed: payload?.avatarSeed || fromPeerId,
        isMuted: !!payload?.isMuted,
        isDeafened: !!payload?.isDeafened,
        isSpeaking: false,
        audioLevel: 0,
        pingMs: 20,
        joinedAt: now,
        isAiBot: !!payload?.isAiBot,
      };
      room.state.peers[fromPeerId] = peerInfo;
    } else if (type === 'leave') {
      delete room.state.peers[fromPeerId];
      delete room.lastActive[fromPeerId];
    } else if (type === 'presence-update') {
      if (room.state.peers[fromPeerId]) {
        room.state.peers[fromPeerId] = {
          ...room.state.peers[fromPeerId],
          ...payload,
        };
      }
    }

    // Create message record
    const message: SignalingMessage = {
      id: `${type}_${fromPeerId}_${now}_${Math.random().toString(36).slice(2, 6)}`,
      roomId,
      fromPeerId,
      toPeerId,
      type,
      payload,
      timestamp: now,
    };

    room.messages.push(message);

    // Keep memory clean
    if (room.messages.length > 200) {
      room.messages = room.messages.slice(-100);
    }

    return NextResponse.json({
      success: true,
      messageId: message.id,
      peers: room.state.peers,
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}
