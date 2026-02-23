import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * AIS Vessel Tracking — aisstream.io
 *
 * Free global AIS data via WebSocket. No hardware required.
 * Sign up at https://aisstream.io (GitHub login) to get a free API key.
 * Set AISSTREAM_API_KEY in .env
 *
 * Strategy: Open a WebSocket from the server, collect messages for up to
 * COLLECT_MS milliseconds, then close and return as a normal JSON REST
 * response. The frontend stays the same (no WebSocket changes needed).
 *
 * Rate: aisstream.io free tier delivers ~100–500 msg/sec globally.
 * We cap at MAX_VESSELS after collecting for COLLECT_MS.
 */

const AISSTREAM_API_KEY = process.env.AISSTREAM_API_KEY ?? "";
const COLLECT_MS  = 4000;   // collect for 4 seconds
const MAX_VESSELS = 2000;   // cap response size

export interface VesselState {
  mmsi: string;
  name: string;
  latitude: number;
  longitude: number;
  sog: number;     // speed over ground (knots)
  cog: number;     // course over ground (degrees)
  heading: number;
  navstat: number; // navigational status (0=underway, 1=anchored, 5=moored, etc.)
  time: string;
}

export const NAV_STATUS: Record<number, string> = {
  0: "Underway",
  1: "Anchored",
  2: "Not under command",
  3: "Restricted maneuverability",
  4: "Constrained by draught",
  5: "Moored",
  6: "Aground",
  7: "Fishing",
  8: "Sailing",
  15: "Unknown",
};

// ── aisstream message types we care about ─────────────────────────────────────
interface AisstreamPositionReport {
  Latitude:          number;
  Longitude:         number;
  Sog:               number;
  Cog:               number;
  TrueHeading:       number;
  NavigationalStatus: number;
}

interface AisstreamMetadata {
  MMSI:      number;
  ShipName:  string;
  TimeUtc:   string;
}

interface AisstreamMessage {
  MessageType: string;
  Message?: {
    PositionReport?: AisstreamPositionReport;
    StandardClassBPositionReport?: AisstreamPositionReport;
    ExtendedClassBPositionReport?: AisstreamPositionReport;
  };
  MetaData?: AisstreamMetadata;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  // Optional bounding box (defaults to global)
  const latmin = parseFloat(searchParams.get("latmin") ?? "-90");
  const latmax = parseFloat(searchParams.get("latmax") ?? "90");
  const lonmin = parseFloat(searchParams.get("lonmin") ?? "-180");
  const lonmax = parseFloat(searchParams.get("lonmax") ?? "180");

  if (!AISSTREAM_API_KEY) {
    return NextResponse.json({
      vessels: [],
      total: 0,
      error: "AISSTREAM_API_KEY not set. Get a free key at https://aisstream.io",
      updatedAt: new Date().toISOString(),
    });
  }

  try {
    const vessels = await collectVessels({ latmin, latmax, lonmin, lonmax });
    return NextResponse.json({
      vessels,
      total: vessels.length,
      updatedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error("[/api/ais]", err);
    return NextResponse.json(
      { error: "Failed to fetch AIS data", vessels: [], total: 0 },
      { status: 500 }
    );
  }
}

// ── WebSocket collector ────────────────────────────────────────────────────────
function collectVessels(bbox: {
  latmin: number; latmax: number; lonmin: number; lonmax: number;
}): Promise<VesselState[]> {
  return new Promise((resolve, reject) => {
    // Node.js 18+ has WebSocket support natively in some environments,
    // but Next.js edge/Node may need the ws package. We use the global
    // WebSocket if available, otherwise dynamic import ws.
    const seen = new Map<string, VesselState>();
    let done = false;
    let ws: WebSocket | null = null;

    const finish = () => {
      if (done) return;
      done = true;
      try { ws?.close(); } catch { /* ignore */ }
      resolve(Array.from(seen.values()).slice(0, MAX_VESSELS));
    };

    // Timeout: resolve after COLLECT_MS regardless
    const timer = setTimeout(finish, COLLECT_MS);

    try {
      // Use the global WebSocket (available in Node 22+ / Next.js 15+)
      // or fall back to the ws package if needed.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const WS: typeof WebSocket = (globalThis as any).WebSocket;
      if (!WS) {
        clearTimeout(timer);
        reject(new Error("WebSocket not available in this runtime"));
        return;
      }

      ws = new WS("wss://stream.aisstream.io/v0/stream");

      ws.onopen = () => {
        ws!.send(JSON.stringify({
          APIKey: AISSTREAM_API_KEY,
          BoundingBoxes: [
            [[bbox.latmin, bbox.lonmin], [bbox.latmax, bbox.lonmax]],
          ],
          FilterMessageTypes: [
            "PositionReport",
            "StandardClassBPositionReport",
            "ExtendedClassBPositionReport",
          ],
        }));
      };

      ws.onmessage = (event) => {
        if (done) return;
        try {
          const msg: AisstreamMessage = JSON.parse(
            typeof event.data === "string" ? event.data : String(event.data)
          );

          const pos =
            msg.Message?.PositionReport ??
            msg.Message?.StandardClassBPositionReport ??
            msg.Message?.ExtendedClassBPositionReport;

          const meta = msg.MetaData;
          if (!pos || !meta) return;

          const { Latitude: lat, Longitude: lon } = pos;
          if (lat == null || lon == null) return;
          if (lat === 0 && lon === 0) return; // default/invalid position

          const mmsi = String(meta.MMSI ?? "");
          if (!mmsi) return;

          seen.set(mmsi, {
            mmsi,
            name: (meta.ShipName ?? "").trim() || mmsi,
            latitude:  lat,
            longitude: lon,
            sog:     pos.Sog ?? 0,
            cog:     pos.Cog ?? 0,
            heading: pos.TrueHeading ?? 0,
            navstat: pos.NavigationalStatus ?? 15,
            time:    meta.TimeUtc ?? new Date().toISOString(),
          });

          // Once we have enough, stop collecting
          if (seen.size >= MAX_VESSELS) {
            clearTimeout(timer);
            finish();
          }
        } catch { /* ignore parse errors */ }
      };

      ws.onerror = (err) => {
        clearTimeout(timer);
        if (!done) {
          done = true;
          reject(new Error(`aisstream WebSocket error: ${String(err)}`));
        }
      };

      ws.onclose = () => {
        clearTimeout(timer);
        finish();
      };
    } catch (err) {
      clearTimeout(timer);
      reject(err);
    }
  });
}
