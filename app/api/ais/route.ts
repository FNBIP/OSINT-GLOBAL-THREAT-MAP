import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * AIS Vessel Tracking — AISHub API
 *
 * Requires an AISHub username (free with data contribution registration).
 * Set AISHUB_USERNAME in .env.local
 *
 * API docs: https://www.aishub.net/api
 * Endpoint: https://data.aishub.net/ws.php
 *   - format=1 (human-readable)
 *   - output=json
 *   - compress=0
 *   - interval=5 (last 5 minutes)
 *
 * Without credentials, returns empty array with instructions.
 */

const AISHUB_USERNAME = process.env.AISHUB_USERNAME ?? "";
const AISHUB_BASE = "https://data.aishub.net/ws.php";

export interface VesselState {
  mmsi: string;
  name: string;
  latitude: number;
  longitude: number;
  sog: number;    // speed over ground (knots)
  cog: number;    // course over ground (degrees)
  heading: number;
  navstat: number; // navigational status (0=underway, 1=anchored, 5=moored, etc.)
  time: string;
}

// Nav status descriptions
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

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const latmin = searchParams.get("latmin") ?? "-90";
  const latmax = searchParams.get("latmax") ?? "90";
  const lonmin = searchParams.get("lonmin") ?? "-180";
  const lonmax = searchParams.get("lonmax") ?? "180";

  // If no AISHub credentials, return empty with a helpful message
  if (!AISHUB_USERNAME) {
    return NextResponse.json({
      vessels: [],
      total: 0,
      error: "AISHUB_USERNAME not set. Register at https://www.aishub.net to get a username.",
      updatedAt: new Date().toISOString(),
    });
  }

  try {
    const url = new URL(AISHUB_BASE);
    url.searchParams.set("username", AISHUB_USERNAME);
    url.searchParams.set("format", "1");      // human-readable fields
    url.searchParams.set("output", "json");
    url.searchParams.set("compress", "0");
    url.searchParams.set("latmin", latmin);
    url.searchParams.set("latmax", latmax);
    url.searchParams.set("lonmin", lonmin);
    url.searchParams.set("lonmax", lonmax);

    const res = await fetch(url.toString(), {
      headers: { "User-Agent": "OSINT-GlobalThreatMap/1.0" },
      // AISHub requires no more than 1 req/min — cache for 60s
      next: { revalidate: 60 },
    });

    if (!res.ok) {
      throw new Error(`AISHub returned ${res.status}`);
    }

    const raw = await res.json();

    // AISHub JSON format: [ { "ERROR": false, "USERNAME": "...", "FORMAT": 1 }, [ {...vessel}, ... ] ]
    // Index 0 is metadata, index 1 is the vessel array
    let vesselArray: Record<string, unknown>[] = [];
    if (Array.isArray(raw) && raw.length >= 2 && Array.isArray(raw[1])) {
      vesselArray = raw[1];
    } else if (Array.isArray(raw)) {
      vesselArray = raw.filter((v) => typeof v === "object" && v !== null && "MMSI" in v);
    }

    const vessels: VesselState[] = vesselArray
      .filter((v) => v.LONGITUDE != null && v.LATITUDE != null)
      .map((v) => ({
        mmsi: String(v.MMSI ?? ""),
        name: String(v.NAME ?? "").trim() || String(v.MMSI ?? ""),
        latitude: Number(v.LATITUDE),
        longitude: Number(v.LONGITUDE),
        sog: Number(v.SOG ?? 0),
        cog: Number(v.COG ?? 0),
        heading: Number(v.HEADING ?? 0),
        navstat: Number(v.NAVSTAT ?? 15),
        time: String(v.TIME ?? ""),
      }))
      .slice(0, 3000); // cap at 3000 vessels

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
