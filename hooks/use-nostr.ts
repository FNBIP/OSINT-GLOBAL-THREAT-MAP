"use client";

import { useEffect, useRef, useCallback } from "react";
import { useNostrStore } from "@/stores/nostr-store";
import { useMapStore } from "@/stores/map-store";
import {
  generateNostrKeypair,
  saveKeypair,
  loadKeypair,
  destroyPool,
  subscribeToChannel,
  subscribeToDMs,
  subscribeToGlobalChannels,
  subscribeToStoredGeohashNotes,
  publishChannelMessage,
  publishDM as publishNostrDM,
  decryptDM,
  DEFAULT_RELAYS,
  type NostrSubscription,
} from "@/lib/nostr";
import {
  fetchGeoRelays,
  closestRelays,
  globallyDistributedRelays,
  type GeoRelay,
} from "@/lib/georelays";
import { encodeGeohash, geohashToLabel } from "@/lib/geohash";
import type { NostrMessage, NostrDM } from "@/types";

const GEOHASH_PRECISION = 4;

// Number of closest geo-relays to connect for channel subscriptions
const GEO_RELAYS_PER_CHANNEL = 25;
// Number of globally distributed relays for discovery
const GLOBAL_DISCOVERY_RELAYS = 40;

/**
 * Merge geo-relays with core relays, deduplicating
 */
function mergeRelays(core: string[], geo: string[]): string[] {
  const seen = new Set<string>();
  const merged: string[] = [];
  for (const url of [...core, ...geo]) {
    const normalized = url.toLowerCase().replace(/\/$/, "");
    if (!seen.has(normalized)) {
      seen.add(normalized);
      merged.push(url);
    }
  }
  return merged;
}

export function useNostr() {
  const channelSubRef = useRef<NostrSubscription | null>(null);
  const dmSubRef = useRef<NostrSubscription | null>(null);
  const discoverySubRef = useRef<NostrSubscription | null>(null);
  const stdChannelSubRef = useRef<NostrSubscription | null>(null);
  const initializedRef = useRef(false);
  const connectedRef = useRef(false);

  // Store relay URLs as refs to avoid dependency loops
  const relayUrlsRef = useRef<string[]>(DEFAULT_RELAYS);
  const geoRelaysCacheRef = useRef<GeoRelay[]>([]);
  const discoveryRelaysRef = useRef<string[]>([]);

  const keypair = useNostrStore((s) => s.keypair);
  const setKeypair = useNostrStore((s) => s.setKeypair);
  const setRelays = useNostrStore((s) => s.setRelays);
  const setConnectionStatus = useNostrStore((s) => s.setConnectionStatus);
  const connectionStatus = useNostrStore((s) => s.connectionStatus);
  const currentGeohash = useNostrStore((s) => s.currentGeohash);
  const setCurrentChannel = useNostrStore((s) => s.setCurrentChannel);
  const addMessage = useNostrStore((s) => s.addMessage);
  const addDM = useNostrStore((s) => s.addDM);
  const incrementUnread = useNostrStore((s) => s.incrementUnread);
  const trackChannelActivity = useNostrStore((s) => s.trackChannelActivity);
  const setGeoRelayCount = useNostrStore((s) => s.setGeoRelayCount);

  const viewport = useMapStore((s) => s.viewport);

  // --- Initialize keypair, fetch geo-relays, setup discovery ---
  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    // Generate or load keypair
    let kp = loadKeypair();
    if (!kp) {
      kp = generateNostrKeypair();
      saveKeypair(kp.privateKey);
    }
    setKeypair(kp);

    // Initialize with default relays (will expand with geo-relays)
    setRelays(
      DEFAULT_RELAYS.map((url) => ({ url, status: "connecting" as const }))
    );
    setConnectionStatus("connecting");

    // Fetch the geo-relay directory in the background
    fetchGeoRelays().then((geoRelays) => {
      geoRelaysCacheRef.current = geoRelays;
      if (geoRelays.length > 0) {
        console.log(
          `[NOSTR] Loaded ${geoRelays.length} geo-distributed relays`
        );
        setGeoRelayCount(geoRelays.length);

        // Compute globally distributed relays for discovery
        const globalRelays = globallyDistributedRelays(
          geoRelays,
          GLOBAL_DISCOVERY_RELAYS
        );
        discoveryRelaysRef.current = mergeRelays(DEFAULT_RELAYS, globalRelays);
        console.log(
          `[NOSTR] Discovery subscription using ${discoveryRelaysRef.current.length} relays`
        );
      }
    });

    return () => {
      destroyPool();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // --- Track map viewport → update geohash channel ---
  useEffect(() => {
    const newGeohash = encodeGeohash(
      viewport.latitude,
      viewport.longitude,
      GEOHASH_PRECISION
    );

    if (newGeohash !== currentGeohash) {
      const label = geohashToLabel(newGeohash);
      setCurrentChannel(newGeohash, label);

      // Compute closest geo-relays for this location
      if (geoRelaysCacheRef.current.length > 0) {
        const nearest = closestRelays(
          geoRelaysCacheRef.current,
          viewport.latitude,
          viewport.longitude,
          GEO_RELAYS_PER_CHANNEL
        );
        relayUrlsRef.current = mergeRelays(DEFAULT_RELAYS, nearest);
        console.log(
          `[NOSTR] Channel "${newGeohash}" using ${relayUrlsRef.current.length} relays (${nearest.length} geo + ${DEFAULT_RELAYS.length} core)`
        );
      }
    }
  }, [viewport.latitude, viewport.longitude]); // eslint-disable-line react-hooks/exhaustive-deps

  // --- Global channel discovery subscription ---
  // Uses globally distributed relays to discover active channels everywhere
  useEffect(() => {
    if (!keypair) return;

    // Close previous discovery subscriptions
    if (discoverySubRef.current) {
      discoverySubRef.current.close();
      discoverySubRef.current = null;
    }
    if (stdChannelSubRef.current) {
      stdChannelSubRef.current.close();
      stdChannelSubRef.current = null;
    }

    // Use discovery relays if available, otherwise fall back to core relays
    const discRelays =
      discoveryRelaysRef.current.length > 0
        ? discoveryRelaysRef.current
        : relayUrlsRef.current;

    // Discover geohash channels (kind 20000)
    discoverySubRef.current = subscribeToGlobalChannels(
      discRelays,
      (event) => {
        // Extract the shortest geohash tag (precision 2 = region level)
        const geohashTags = event.tags
          .filter((t) => t[0] === "g" && t[1])
          .map((t) => t[1])
          .sort((a, b) => a.length - b.length);

        if (geohashTags.length > 0) {
          // Track at precision 2 (region) for the room list
          const regionHash =
            geohashTags[0].length >= 2
              ? geohashTags[0].slice(0, 2)
              : geohashTags[0];
          const label = geohashToLabel(regionHash.padEnd(4, "0"));
          trackChannelActivity(
            regionHash,
            "geohash",
            label,
            event.pubkey,
            event.created_at
          );

          // Also track at precision 4 (city level) if available
          const cityHash = geohashTags.find((h) => h.length >= 4);
          if (cityHash) {
            const ch = cityHash.slice(0, 4);
            const cityLabel = geohashToLabel(ch);
            trackChannelActivity(
              ch,
              "geohash",
              cityLabel,
              event.pubkey,
              event.created_at
            );
          }
        }
      }
    );

    // Also discover kind 1 notes with geohash tags (stored by relays)
    stdChannelSubRef.current = subscribeToStoredGeohashNotes(
      discRelays,
      (event) => {
        const geohashTags = event.tags
          .filter((t) => t[0] === "g" && t[1])
          .map((t) => t[1])
          .sort((a, b) => a.length - b.length);

        if (geohashTags.length > 0) {
          const regionHash =
            geohashTags[0].length >= 2
              ? geohashTags[0].slice(0, 2)
              : geohashTags[0];
          const label = geohashToLabel(regionHash.padEnd(4, "0"));
          trackChannelActivity(
            regionHash,
            "geohash",
            label,
            event.pubkey,
            event.created_at
          );
        }
      }
    );

    return () => {
      discoverySubRef.current?.close();
      discoverySubRef.current = null;
      stdChannelSubRef.current?.close();
      stdChannelSubRef.current = null;
    };
  }, [keypair]); // eslint-disable-line react-hooks/exhaustive-deps

  // --- Subscribe to channel messages when geohash or keypair changes ---
  useEffect(() => {
    if (!keypair) return;

    // Close previous channel subscription
    if (channelSubRef.current) {
      channelSubRef.current.close();
      channelSubRef.current = null;
    }

    channelSubRef.current = subscribeToChannel(
      relayUrlsRef.current,
      currentGeohash,
      (event) => {
        // BitChat protocol: extract #g geohash, #n nickname, #e event reference
        const geohashTag = event.tags.find((t: string[]) => t[0] === "g");
        const nicknameTag = event.tags.find((t: string[]) => t[0] === "n");
        const eventRefTag = event.tags.find(
          (t: string[]) => t[0] === "e" && t[3] === "mention"
        );

        const msg: NostrMessage = {
          id: event.id,
          pubkey: event.pubkey,
          content: event.content,
          created_at: event.created_at,
          channel: geohashTag?.[1] || currentGeohash,
          kind: event.kind,
          nickname: nicknameTag?.[1] || undefined,
          eventRef: eventRefTag?.[1],
        };

        addMessage(msg);
        incrementUnread();
      }
    );

    // Mark as connected after WebSocket connections are established
    if (!connectedRef.current) {
      const connectTimer = setTimeout(() => {
        connectedRef.current = true;
        useNostrStore.getState().setConnectionStatus("connected");
        // Show core relays as connected in the UI
        useNostrStore.getState().setRelays(
          DEFAULT_RELAYS.map((url) => ({
            url,
            status: "connected" as const,
          }))
        );
      }, 3000);

      return () => {
        clearTimeout(connectTimer);
        channelSubRef.current?.close();
        channelSubRef.current = null;
      };
    }

    return () => {
      channelSubRef.current?.close();
      channelSubRef.current = null;
    };
  }, [currentGeohash, keypair]); // eslint-disable-line react-hooks/exhaustive-deps

  // --- Subscribe to DMs ---
  useEffect(() => {
    if (!keypair) return;

    if (dmSubRef.current) {
      dmSubRef.current.close();
      dmSubRef.current = null;
    }

    const myPubkey = keypair.publicKey;
    const myPrivkey = keypair.privateKey;

    // DMs use core relays only (they use #p tag which is well-supported)
    dmSubRef.current = subscribeToDMs(
      DEFAULT_RELAYS,
      myPubkey,
      async (event) => {
        try {
          const plaintext = await decryptDM(
            myPrivkey,
            event.pubkey,
            event.content
          );

          const dm: NostrDM = {
            id: event.id,
            pubkey: event.pubkey,
            recipientPubkey: myPubkey,
            content: plaintext,
            created_at: event.created_at,
            isMine: false,
          };

          addDM(dm);
          incrementUnread();
        } catch (err) {
          console.error("[NOSTR] Failed to decrypt DM:", err);
        }
      }
    );

    return () => {
      dmSubRef.current?.close();
      dmSubRef.current = null;
    };
  }, [keypair]); // eslint-disable-line react-hooks/exhaustive-deps

  // --- Send channel message ---
  const sendMessage = useCallback(
    async (content: string, eventRef?: string) => {
      if (!keypair) return;

      // Generate a nickname from pubkey (like BitChat does as fallback)
      const nickname = `anon${keypair.publicKey.slice(-4)}`;

      try {
        await publishChannelMessage(
          keypair.privateKey,
          relayUrlsRef.current,
          currentGeohash,
          content,
          nickname,
          eventRef
        );

        // Optimistically add own message
        const msg: NostrMessage = {
          id: `local_${Date.now()}`,
          pubkey: keypair.publicKey,
          content,
          created_at: Math.floor(Date.now() / 1000),
          channel: currentGeohash,
          kind: 20000,
          nickname,
          eventRef,
        };
        addMessage(msg);
      } catch (err) {
        console.error("[NOSTR] Failed to send message:", err);
      }
    },
    [keypair, currentGeohash, addMessage]
  );

  // --- Send DM ---
  const sendDM = useCallback(
    async (recipientPubkey: string, content: string) => {
      if (!keypair) return;

      try {
        await publishNostrDM(
          keypair.privateKey,
          DEFAULT_RELAYS,
          recipientPubkey,
          content
        );

        const dm: NostrDM = {
          id: `local_dm_${Date.now()}`,
          pubkey: keypair.publicKey,
          recipientPubkey,
          content,
          created_at: Math.floor(Date.now() / 1000),
          isMine: true,
        };
        addDM(dm);
      } catch (err) {
        console.error("[NOSTR] Failed to send DM:", err);
      }
    },
    [keypair, addDM]
  );

  return {
    sendMessage,
    sendDM,
    isConnected: connectionStatus === "connected",
    publicKey: keypair?.publicKey || null,
  };
}
