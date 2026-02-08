import { create } from "zustand";
import type {
  NostrKeypair,
  NostrRelay,
  NostrRelayStatus,
  NostrMessage,
  NostrDM,
  NostrChannel,
} from "@/types";

interface NostrState {
  // Identity
  keypair: NostrKeypair | null;

  // Connection
  relays: NostrRelay[];
  connectionStatus: "disconnected" | "connecting" | "connected";

  // Channel
  currentGeohash: string;
  currentChannelName: string;
  messages: NostrMessage[];

  // Discovered channels from relay
  discoveredChannels: Map<string, NostrChannel>;

  // DMs
  dms: NostrDM[];
  activeDMPubkey: string | null;

  // UI
  unreadCount: number;
  showDMs: boolean;

  // Geo-relay directory
  geoRelayCount: number; // Total relays in the directory

  // Actions
  setKeypair: (keypair: NostrKeypair) => void;
  clearKeypair: () => void;
  setRelays: (relays: NostrRelay[]) => void;
  updateRelayStatus: (url: string, status: NostrRelayStatus) => void;
  addRelay: (url: string) => void;
  removeRelay: (url: string) => void;
  setConnectionStatus: (
    status: "disconnected" | "connecting" | "connected"
  ) => void;
  setCurrentChannel: (geohash: string, name: string) => void;
  trackChannelActivity: (channelId: string, type: "geohash" | "standard", name: string, pubkey: string, timestamp: number) => void;
  addMessage: (message: NostrMessage) => void;
  setMessages: (messages: NostrMessage[]) => void;
  clearMessages: () => void;
  addDM: (dm: NostrDM) => void;
  setActiveDMPubkey: (pubkey: string | null) => void;
  incrementUnread: () => void;
  resetUnread: () => void;
  toggleDMs: () => void;
  setGeoRelayCount: (count: number) => void;
}

export const useNostrStore = create<NostrState>((set) => ({
  keypair: null,
  relays: [],
  connectionStatus: "disconnected",
  currentGeohash: "s000",
  currentChannelName: "Global",
  messages: [],
  discoveredChannels: new Map(),
  dms: [],
  activeDMPubkey: null,
  unreadCount: 0,
  showDMs: false,
  geoRelayCount: 0,

  setKeypair: (keypair) => set({ keypair }),
  clearKeypair: () => set({ keypair: null }),

  setRelays: (relays) => set({ relays }),
  updateRelayStatus: (url, status) =>
    set((state) => ({
      relays: state.relays.map((r) =>
        r.url === url ? { ...r, status } : r
      ),
    })),
  addRelay: (url) =>
    set((state) => ({
      relays: [...state.relays, { url, status: "disconnected" as const }],
    })),
  removeRelay: (url) =>
    set((state) => ({
      relays: state.relays.filter((r) => r.url !== url),
    })),
  setConnectionStatus: (connectionStatus) => set({ connectionStatus }),

  setCurrentChannel: (geohash, name) =>
    set({ currentGeohash: geohash, currentChannelName: name, messages: [] }),

  trackChannelActivity: (channelId, type, name, pubkey, timestamp) =>
    set((state) => {
      const channels = new Map(state.discoveredChannels);
      const existing = channels.get(channelId);
      if (existing) {
        existing.messageCount += 1;
        existing.lastActivity = Math.max(existing.lastActivity, timestamp);
        existing.participants.add(pubkey);
        channels.set(channelId, { ...existing });
      } else {
        channels.set(channelId, {
          id: channelId,
          type,
          name,
          messageCount: 1,
          lastActivity: timestamp,
          participants: new Set([pubkey]),
        });
      }
      return { discoveredChannels: channels };
    }),

  addMessage: (message) =>
    set((state) => {
      // Deduplicate by id
      if (state.messages.some((m) => m.id === message.id)) return state;
      return { messages: [...state.messages, message].slice(-500) };
    }),
  setMessages: (messages) => set({ messages }),
  clearMessages: () => set({ messages: [] }),

  addDM: (dm) =>
    set((state) => {
      if (state.dms.some((d) => d.id === dm.id)) return state;
      return { dms: [...state.dms, dm].slice(-200) };
    }),
  setActiveDMPubkey: (pubkey) => set({ activeDMPubkey: pubkey }),

  incrementUnread: () =>
    set((state) => ({ unreadCount: state.unreadCount + 1 })),
  resetUnread: () => set({ unreadCount: 0 }),
  toggleDMs: () => set((state) => ({ showDMs: !state.showDMs })),
  setGeoRelayCount: (count) => set({ geoRelayCount: count }),
}));
