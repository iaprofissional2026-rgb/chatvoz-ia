export interface PeerInfo {
  id: string;
  name: string;
  avatarSeed: string;
  isMuted: boolean;
  isDeafened: boolean;
  isSpeaking: boolean;
  audioLevel: number; // 0 to 100
  pingMs: number;
  joinedAt: number;
  isAiBot?: boolean;
  hasAudio?: boolean;
  slotIndex?: number;
}

export interface RoomState {
  id: string;
  name: string;
  gameTag: string;
  createdAt: number;
  peers: Record<string, PeerInfo>;
}

export type SignalingMessageType =
  | 'join'
  | 'leave'
  | 'presence-update'
  | 'offer'
  | 'answer'
  | 'ice-candidate'
  | 'chat-message'
  | 'sfx-trigger';

export interface SignalingMessage {
  id: string;
  roomId: string;
  fromPeerId: string;
  toPeerId?: string; // undefined means broadcast to all in room
  type: SignalingMessageType;
  payload: any;
  timestamp: number;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  avatarSeed: string;
  text: string;
  timestamp: number;
  isSystem?: boolean;
  isAi?: boolean;
  quickCallout?: boolean;
}

export interface SoundEffectDefinition {
  id: string;
  name: string;
  icon: string;
  category: 'hype' | 'tactical' | 'meme';
  color: string;
}
