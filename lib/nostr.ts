import {
  generateSecretKey,
  getPublicKey,
  finalizeEvent,
} from "nostr-tools/pure";
import { SimplePool } from "nostr-tools/pool";
import type { Filter } from "nostr-tools/filter";
import * as nip04 from "nostr-tools/nip04";
import { bytesToHex, hexToBytes } from "nostr-tools/utils";
import type { NostrKeypair } from "@/types";

// --- Constants ---
const NOSTR_STORAGE_KEY = "osint_nostr_keypair";
const GEOHASH_EVENT_KIND = 20000; // BitChat: ephemeral geohash channel message
const STANDARD_CHANNEL_KIND = 23333; // BitChat: standard channel message
const DM_EVENT_KIND = 4; // NIP-04: encrypted DM

// BitChat protocol event kinds
export const BITCHAT_KINDS = [1, GEOHASH_EVENT_KIND, STANDARD_CHANNEL_KIND] as const;

// All 5 relays used by working BitChat implementations
// (bitchat-world-view, WEBitchat, bitchat.land)
export const DEFAULT_RELAYS = [
  "wss://relay.damus.io",
  "wss://nos.lol",
  "wss://relay.primal.net",
  "wss://offchain.pub",
  "wss://nostr21.com",
];

// --- Key Management ---

export function generateNostrKeypair(): NostrKeypair {
  const sk = generateSecretKey();
  const pk = getPublicKey(sk);
  return { privateKey: sk, publicKey: pk };
}

export function saveKeypair(sk: Uint8Array): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(NOSTR_STORAGE_KEY, bytesToHex(sk));
}

export function loadKeypair(): NostrKeypair | null {
  if (typeof window === "undefined") return null;
  try {
    const hex = localStorage.getItem(NOSTR_STORAGE_KEY);
    if (!hex) return null;
    const sk = hexToBytes(hex);
    const pk = getPublicKey(sk);
    return { privateKey: sk, publicKey: pk };
  } catch {
    return null;
  }
}

export function exportKeypairHex(sk: Uint8Array): string {
  return bytesToHex(sk);
}

export function importKeypairHex(
  hex: string
): NostrKeypair {
  const sk = hexToBytes(hex);
  const pk = getPublicKey(sk);
  return { privateKey: sk, publicKey: pk };
}

// --- Geohash helpers ---

// BitChat uses multiple geohash precision levels as #g tags
// so messages are discoverable at region, country, and city scale
export function getGeohashTags(geohash: string): string[][] {
  const tags: string[][] = [];
  // Add hierarchical geohash tags (precision 2, 3, 4, and full)
  for (let i = 2; i <= geohash.length; i++) {
    tags.push(["g", geohash.slice(0, i)]);
  }
  return tags;
}

// --- Pool Management ---

let pool: SimplePool | null = null;
// Track all relay URLs we've connected to, so we can close them all
const connectedRelayUrls = new Set<string>();

export function getPool(): SimplePool {
  if (!pool) {
    pool = new SimplePool();
  }
  return pool;
}

/** Track relay URLs that we're subscribing to */
export function trackRelays(urls: string[]): void {
  for (const url of urls) {
    connectedRelayUrls.add(url);
  }
}

export function destroyPool(): void {
  if (pool) {
    // Close ALL relay connections, not just DEFAULT_RELAYS
    const allUrls = Array.from(connectedRelayUrls);
    if (allUrls.length > 0) {
      pool.close(allUrls);
    }
    connectedRelayUrls.clear();
    pool = null;
  }
}

// --- Publishing ---

export async function publishChannelMessage(
  sk: Uint8Array,
  relays: string[],
  geohash: string,
  content: string,
  nickname?: string,
  eventRef?: string
): Promise<void> {
  const p = getPool();
  trackRelays(relays);

  // BitChat protocol: kind 20000 with #g geohash tags + #n nickname + #client tag
  const tags: string[][] = getGeohashTags(geohash);
  if (nickname) {
    tags.push(["n", nickname]);
  }
  tags.push(["client", "osint-threat-map"]);
  if (eventRef) {
    tags.push(["e", eventRef, "", "mention"]);
  }

  const signedEvent = finalizeEvent(
    {
      kind: GEOHASH_EVENT_KIND,
      created_at: Math.floor(Date.now() / 1000),
      tags,
      content,
    },
    sk
  );

  await Promise.allSettled(p.publish(relays, signedEvent));
}

export async function publishDM(
  sk: Uint8Array,
  relays: string[],
  recipientPubkey: string,
  plaintext: string
): Promise<void> {
  const p = getPool();
  trackRelays(relays);
  const encrypted = await nip04.encrypt(sk, recipientPubkey, plaintext);

  const signedEvent = finalizeEvent(
    {
      kind: DM_EVENT_KIND,
      created_at: Math.floor(Date.now() / 1000),
      tags: [["p", recipientPubkey]],
      content: encrypted,
    },
    sk
  );

  await Promise.allSettled(p.publish(relays, signedEvent));
}

// --- Subscriptions ---

export interface NostrSubscription {
  close: () => void;
}

/**
 * Subscribe to channel messages for a specific geohash.
 *
 * CRITICAL: Working BitChat viewers (bitchat-world-view, WEBitchat) do NOT
 * use #g tag filtering at the relay level for kind 20000 events. Many relays
 * don't support tag indexing for ephemeral events, so they return 0 results.
 *
 * Instead, we subscribe to ALL kind 20000 events globally and filter
 * client-side by checking the #g tags on received events.
 */
export function subscribeToChannel(
  relays: string[],
  geohash: string,
  onMessage: (event: {
    id: string;
    pubkey: string;
    content: string;
    created_at: number;
    kind: number;
    tags: string[][];
  }) => void
): NostrSubscription {
  const p = getPool();
  trackRelays(relays);

  // Target geohash prefixes for client-side matching
  const regionHash = geohash.slice(0, 2);

  // Client-side filter: check if an event's #g tags match our geohash region
  const matchesGeohash = (tags: string[][]) => {
    for (const tag of tags) {
      if (tag[0] === "g" && tag[1]) {
        // Match if the event's geohash starts with our region (precision 2)
        if (tag[1].startsWith(regionHash) || regionHash.startsWith(tag[1])) {
          return true;
        }
      }
    }
    return false;
  };

  const filteredHandler = (event: {
    id: string;
    pubkey: string;
    content: string;
    created_at: number;
    kind: number;
    tags: string[][];
  }) => {
    if (matchesGeohash(event.tags)) {
      onMessage(event);
    }
  };

  const subs: Array<{ close: () => void }> = [];

  // Kind 20000 (ephemeral) — NO #g filter at relay level!
  // Fetch ALL kind 20000 events, filter client-side.
  // This is exactly how bitchat-world-view and WEBitchat work.
  const ephemeralFilter: Filter = {
    kinds: [GEOHASH_EVENT_KIND],
    limit: 500,
  };
  subs.push(
    p.subscribeMany(relays, ephemeralFilter, { onevent: filteredHandler })
  );

  // Kind 1 + 23333 (stored) — these support tag filtering on relays
  const storedFilter: Filter = {
    kinds: [1, STANDARD_CHANNEL_KIND],
    "#g": [regionHash],
    since: Math.floor(Date.now() / 1000) - 86400,
    limit: 200,
  };
  subs.push(
    p.subscribeMany(relays, storedFilter, { onevent: onMessage })
  );

  return {
    close: () => subs.forEach((s) => s.close()),
  };
}

export function subscribeToDMs(
  relays: string[],
  myPubkey: string,
  onMessage: (event: {
    id: string;
    pubkey: string;
    content: string;
    created_at: number;
    kind: number;
    tags: string[][];
  }) => void,
  since?: number
): NostrSubscription {
  const p = getPool();
  trackRelays(relays);

  const filter: Filter = {
    kinds: [DM_EVENT_KIND],
    "#p": [myPubkey],
    since: since || Math.floor(Date.now() / 1000) - 86400,
  };

  const sub = p.subscribeMany(relays, filter, {
    onevent: onMessage,
  });

  return { close: () => sub.close() };
}

// --- Channel Discovery ---
// Subscribe to ALL geohash channels globally to discover active rooms
// This mirrors how bitchat.land populates its channel list from relay data

export type NostrEventCallback = (event: {
  id: string;
  pubkey: string;
  content: string;
  created_at: number;
  kind: number;
  tags: string[][];
}) => void;

/**
 * Global discovery subscription — fetch ALL kind 20000 + 23333 events
 * with NO tag filter, exactly like working BitChat viewers do.
 */
export function subscribeToGlobalChannels(
  relays: string[],
  onEvent: NostrEventCallback
): NostrSubscription {
  const p = getPool();
  trackRelays(relays);
  const subs: Array<{ close: () => void }> = [];

  // Kind 20000 (ephemeral) — NO tag filter, stream everything live
  const ephemeralFilter: Filter = {
    kinds: [GEOHASH_EVENT_KIND],
    limit: 1000,
  };
  subs.push(p.subscribeMany(relays, ephemeralFilter, { onevent: onEvent }));

  // Kind 23333 (standard channels, stored by relays)
  const standardFilter: Filter = {
    kinds: [STANDARD_CHANNEL_KIND],
    since: Math.floor(Date.now() / 1000) - 86400,
    limit: 500,
  };
  subs.push(p.subscribeMany(relays, standardFilter, { onevent: onEvent }));

  return { close: () => subs.forEach((s) => s.close()) };
}

export function subscribeToStoredGeohashNotes(
  relays: string[],
  onEvent: NostrEventCallback
): NostrSubscription {
  const p = getPool();
  trackRelays(relays);

  // Subscribe to kind 1 (persistent text notes) that have #g geohash tags
  // Unlike kind 20000 (ephemeral), kind 1 IS stored by relays,
  // so we can use `since` to discover historical channel activity
  const filter: Filter = {
    kinds: [1],
    since: Math.floor(Date.now() / 1000) - 86400, // last 24h
    limit: 500,
  };

  const sub = p.subscribeMany(relays, filter, {
    onevent: (event) => {
      // Only forward events that have geohash tags
      const hasGeohash = event.tags.some((t: string[]) => t[0] === "g");
      if (hasGeohash) {
        onEvent(event);
      }
    },
  });

  return { close: () => sub.close() };
}

// --- NIP-04 Decryption ---

export async function decryptDM(
  sk: Uint8Array,
  senderPubkey: string,
  ciphertext: string
): Promise<string> {
  return nip04.decrypt(sk, senderPubkey, ciphertext);
}
