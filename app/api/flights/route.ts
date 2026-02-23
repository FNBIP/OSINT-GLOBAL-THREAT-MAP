import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// OpenSky Network public REST API — no auth required, rate-limited to ~10 req/min
// Returns live ADS-B state vectors for all aircraft currently tracked
const OPENSKY_URL = "https://opensky-network.org/api/states/all";

export interface AircraftState {
  icao24: string;       // ICAO 24-bit address (hex)
  callsign: string;     // Callsign (trimmed)
  origin_country: string;
  longitude: number | null;
  latitude: number | null;
  baro_altitude: number | null; // meters
  velocity: number | null;      // m/s
  true_track: number | null;    // degrees clockwise from north
  vertical_rate: number | null; // m/s
  on_ground: boolean;
}

export async function GET() {
  try {
    const res = await fetch(OPENSKY_URL, {
      headers: { "User-Agent": "OSINT-GlobalThreatMap/1.0" },
      // Cache 60s to avoid hammering the public API
      next: { revalidate: 60 },
    });

    if (!res.ok) {
      // OpenSky returns 429 when rate-limited
      if (res.status === 429) {
        return NextResponse.json(
          { error: "Rate limited by OpenSky. Try again in 60s.", aircraft: [] },
          { status: 429 }
        );
      }
      throw new Error(`OpenSky returned ${res.status}`);
    }

    const data = await res.json();

    // OpenSky format: { time: number, states: array[] }
    // Each state is an array of 17 fields:
    // [icao24, callsign, origin_country, time_position, last_contact,
    //  longitude, latitude, baro_altitude, on_ground, velocity,
    //  true_track, vertical_rate, sensors, geo_altitude, squawk, spi, position_source]
    const states: AircraftState[] = [];

    if (Array.isArray(data.states)) {
      for (const s of data.states) {
        const lon = s[5];
        const lat = s[6];
        // Skip aircraft with no position
        if (lon == null || lat == null) continue;
        // Skip aircraft on ground to reduce noise
        if (s[8] === true) continue;

        states.push({
          icao24: s[0] ?? "",
          callsign: (s[1] ?? "").trim(),
          origin_country: s[2] ?? "",
          longitude: lon,
          latitude: lat,
          baro_altitude: s[7],
          velocity: s[9],
          true_track: s[10],
          vertical_rate: s[11],
          on_ground: s[8] ?? false,
        });
      }
    }

    // Limit to 2000 aircraft to keep response manageable for the client
    const limited = states.slice(0, 2000);

    return NextResponse.json({
      aircraft: limited,
      total: states.length,
      updatedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error("[/api/flights]", err);
    return NextResponse.json(
      { error: "Failed to fetch flight data", aircraft: [] },
      { status: 500 }
    );
  }
}
