import { NextRequest, NextResponse } from 'next/server';
import { PeerInfo, RoomState, SignalingMessage } from '@/lib/types';

interface StoredRoom {
  cloudId?: string;
  state: RoomState;
  messages: SignalingMessage[];
  lastActive: Record<string, number>;
  lastSyncedAt: number;
}

const MASTER_REGISTRY_ID = 'ff808181a09d98f701a0eecb072f4527';
const API_BASE = 'https://api.restful-api.dev/objects';

declare global {
  var __vortex_rooms__: Map<string, StoredRoom> | undefined;
  var __vortex_room_ids__: Record<string, string> | undefined;
}

if (!global.__vortex_rooms__) {
  global.__vortex_rooms__ = new Map<string, StoredRoom>();
}
if (!global.__vortex_room_ids__) {
  global.__vortex_room_ids__ = {};
}

const rooms = global.__vortex_rooms__;
const roomCloudIds = global.__vortex_room_ids__;

async function fetchMasterRegistry(): Promise<Record<string, string>> {
  try {
    const res = await fetch(`${API_BASE}/${MASTER_REGISTRY_ID}`, {
      headers: { 'Content-Type': 'application/json' },
      cache: 'no-store',
    });
    if (res.ok) {
      const data = await res.json();
      return data.data?.rooms || {};
    }
  } catch {
    // fallback
  }
  return {};
}

async function updateMasterRegistry(newRooms: Record<string, string>) {
  try {
    await fetch(`${API_BASE}/${MASTER_REGISTRY_ID}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'vortex_master_registry_v1',
        data: { rooms: newRooms },
      }),
    });
  } catch {
    // ignore
  }
}

async function getOrCreateCloudRoom(roomId: string, initialName?: string): Promise<StoredRoom> {
  let localRoom = rooms.get(roomId);
  const now = Date.now();

  // If room is in memory and was synced recently (<1.5s ago), return it
  if (localRoom && now - localRoom.lastSyncedAt < 1500) {
    return localRoom;
  }

  // 1. Try to find cloud ID from memory or master registry
  let cId = roomCloudIds[roomId] || localRoom?.cloudId;
  if (!cId) {
    const master = await fetchMasterRegistry();
    cId = master[roomId];
    if (cId) {
      roomCloudIds[roomId] = cId;
    }
  }

  // 2. If cloud ID exists, fetch latest cloud state
  if (cId) {
    try {
      const res = await fetch(`${API_BASE}/${cId}`, {
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-store',
      });
      if (res.ok) {
        const cloudData = await res.json();
        const rData = cloudData.data;
        if (rData) {
          // Merge local and cloud
          if (!localRoom) {
            localRoom = {
              cloudId: cId,
              state: {
                id: roomId,
                name: rData.name || initialName || `SQUAD #${roomId}`,
                gameTag: rData.gameTag || 'COMPETITIVE',
                createdAt: rData.createdAt || now,
                peers: rData.peers || {},
              },
              messages: rData.messages || [],
              lastActive: rData.lastActive || {},
              lastSyncedAt: now,
            };
            rooms.set(roomId, localRoom);
          } else {
            // Merge peers and messages
            localRoom.state.peers = { ...rData.peers, ...localRoom.state.peers };
            const existingMsgIds = new Set(localRoom.messages.map((m) => m.id));
            (rData.messages || []).forEach((m: SignalingMessage) => {
              if (!existingMsgIds.has(m.id)) {
                localRoom!.messages.push(m);
                existingMsgIds.add(m.id);
              }
            });
            localRoom.lastSyncedAt = now;
          }
          return localRoom;
        }
      }
    } catch {
      // fallback to memory
    }
  }

  // 3. If no cloud object exists yet, create one
  if (!localRoom) {
    localRoom = {
      state: {
        id: roomId,
        name: initialName || `SQUAD #${roomId}`,
        gameTag: 'COMPETITIVE',
        createdAt: now,
        peers: {},
      },
      messages: [],
      lastActive: {},
      lastSyncedAt: now,
    };
    rooms.set(roomId, localRoom);
  }

  try {
    const createRes = await fetch(API_BASE, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: `vortex_room_${roomId}`,
        data: {
          name: localRoom.state.name,
          gameTag: localRoom.state.gameTag,
          createdAt: localRoom.state.createdAt,
          peers: localRoom.state.peers,
          messages: localRoom.messages.slice(-50),
          lastActive: localRoom.lastActive,
        },
      }),
    });
    if (createRes.ok) {
      const createdObj = await createRes.json();
      localRoom.cloudId = createdObj.id;
      roomCloudIds[roomId] = createdObj.id;

      // Update master index
      const master = await fetchMasterRegistry();
      master[roomId] = createdObj.id;
      updateMasterRegistry(master).catch(() => {});
    }
  } catch {
    // ignore
  }

  return localRoom;
}

// Background sync room state to cloud
function syncRoomToCloud(roomId: string) {
  const room = rooms.get(roomId);
  const cId = room?.cloudId || roomCloudIds[roomId];
  if (!room || !cId) return;

  fetch(`${API_BASE}/${cId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: `vortex_room_${roomId}`,
      data: {
        name: room.state.name,
        gameTag: room.state.gameTag,
        createdAt: room.state.createdAt,
        peers: room.state.peers,
        messages: room.messages.slice(-60),
        lastActive: room.lastActive,
      },
    }),
  }).catch(() => {});
}

function cleanStalePeers(room: StoredRoom, roomId: string) {
  const now = Date.now();
  const timeoutMs = 30000;

  for (const [peerId, lastSeen] of Object.entries(room.lastActive)) {
    if (now - lastSeen > timeoutMs && !room.state.peers[peerId]?.isAiBot) {
      delete room.state.peers[peerId];
      delete room.lastActive[peerId];
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

  const room = await getOrCreateCloudRoom(roomId);
  room.lastActive[peerId] = Date.now();
  cleanStalePeers(room, roomId);

  const newMessages = room.messages.filter((msg) => {
    if (msg.timestamp <= since) return false;
    if (msg.fromPeerId === peerId) return false;
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

    const room = await getOrCreateCloudRoom(roomId, payload?.roomName);
    const now = Date.now();
    room.lastActive[fromPeerId] = now;

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

    if (room.messages.length > 200) {
      room.messages = room.messages.slice(-100);
    }

    // Sync state to cloud in background
    syncRoomToCloud(roomId);

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
