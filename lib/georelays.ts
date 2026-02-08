/**
 * GeoRelay Directory — connects to geographically distributed Nostr relays
 *
 * bitchat.land uses ~430 relays from the permissionlesstech/georelays directory.
 * This module fetches that CSV, parses it, and provides functions to find
 * the closest relays to a given coordinate using the Haversine formula.
 */

const GEORELAYS_CSV_URL =
  "https://raw.githubusercontent.com/permissionlesstech/georelays/refs/heads/main/nostr_relays.csv";

export interface GeoRelay {
  url: string; // wss:// URL
  lat: number;
  lon: number;
}

let cachedRelays: GeoRelay[] | null = null;
let fetchPromise: Promise<GeoRelay[]> | null = null;

/**
 * Parse the CSV format: "Relay URL,Latitude,Longitude"
 * URLs in the CSV are bare hostnames (no wss:// prefix)
 */
function parseCSV(csv: string): GeoRelay[] {
  const lines = csv.trim().split("\n");
  const relays: GeoRelay[] = [];

  // Skip header row
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const parts = line.split(",");
    if (parts.length < 3) continue;

    const rawUrl = parts[0].trim();
    const lat = parseFloat(parts[1]);
    const lon = parseFloat(parts[2]);

    if (!rawUrl || isNaN(lat) || isNaN(lon)) continue;

    // Add wss:// prefix if not present
    const url = rawUrl.startsWith("wss://") || rawUrl.startsWith("ws://")
      ? rawUrl
      : `wss://${rawUrl}`;

    relays.push({ url, lat, lon });
  }

  return relays;
}

/**
 * Fetch and cache the georelays directory.
 * Returns cached result on subsequent calls.
 */
export async function fetchGeoRelays(): Promise<GeoRelay[]> {
  if (cachedRelays) return cachedRelays;

  // Deduplicate concurrent fetches
  if (fetchPromise) return fetchPromise;

  fetchPromise = (async () => {
    try {
      const response = await fetch(GEORELAYS_CSV_URL, {
        cache: "force-cache", // Cache aggressively — relay list changes rarely
      });

      if (!response.ok) {
        console.warn(`[GEORELAYS] Failed to fetch directory: ${response.status}`);
        return [];
      }

      const csv = await response.text();
      cachedRelays = parseCSV(csv);
      console.log(`[GEORELAYS] Loaded ${cachedRelays.length} relays from directory`);
      return cachedRelays;
    } catch (err) {
      console.warn("[GEORELAYS] Failed to fetch relay directory:", err);
      return [];
    } finally {
      fetchPromise = null;
    }
  })();

  return fetchPromise;
}

/**
 * Haversine distance in kilometers between two GPS points
 */
function haversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Find the N closest relays to a given latitude/longitude.
 * Returns relay URLs sorted by distance (closest first).
 */
export function closestRelays(
  relays: GeoRelay[],
  lat: number,
  lon: number,
  count: number = 20
): string[] {
  const withDistance = relays.map((r) => ({
    url: r.url,
    distance: haversineDistance(lat, lon, r.lat, r.lon),
  }));

  withDistance.sort((a, b) => a.distance - b.distance);

  return withDistance.slice(0, count).map((r) => r.url);
}

/**
 * Get a globally distributed subset of relays (spread across different regions).
 * Used for global discovery subscriptions.
 */
export function globallyDistributedRelays(
  relays: GeoRelay[],
  count: number = 30
): string[] {
  if (relays.length <= count) return relays.map((r) => r.url);

  // Divide the world into grid cells and pick one relay per cell
  const gridSize = 30; // degrees per cell
  const cells = new Map<string, GeoRelay[]>();

  for (const relay of relays) {
    const cellKey = `${Math.floor(relay.lat / gridSize)},${Math.floor(relay.lon / gridSize)}`;
    if (!cells.has(cellKey)) cells.set(cellKey, []);
    cells.get(cellKey)!.push(relay);
  }

  const selected: string[] = [];

  // Pick one relay from each cell (round-robin until we have enough)
  const cellEntries = Array.from(cells.values());
  let idx = 0;
  while (selected.length < count && idx < relays.length) {
    for (const cellRelays of cellEntries) {
      if (selected.length >= count) break;
      const relayIdx = Math.floor(idx / cellEntries.length);
      if (relayIdx < cellRelays.length) {
        const url = cellRelays[relayIdx].url;
        if (!selected.includes(url)) {
          selected.push(url);
        }
      }
    }
    idx += cellEntries.length;
  }

  return selected;
}

/**
 * Convenience: fetch the directory and return closest relays for a location.
 * Falls back to empty array if fetch fails.
 */
export async function getClosestRelays(
  lat: number,
  lon: number,
  count: number = 20
): Promise<string[]> {
  const relays = await fetchGeoRelays();
  if (relays.length === 0) return [];
  return closestRelays(relays, lat, lon, count);
}

/**
 * Convenience: fetch the directory and return globally distributed relays.
 */
export async function getGlobalRelays(count: number = 30): Promise<string[]> {
  const relays = await fetchGeoRelays();
  if (relays.length === 0) return [];
  return globallyDistributedRelays(relays, count);
}
