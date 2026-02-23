import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * Satellite Tracking — tle.ivanstanojevic.me TLE API
 *
 * Free, no auth, no rate limit abuse needed.
 * Returns top 100 most popular tracked satellites with current positions
 * propagated from TLE data using a simplified SGP4 algorithm.
 *
 * API: https://tle.ivanstanojevic.me/api/tle/?sort=popularity&page-size=100
 */

const TLE_API = "https://tle.ivanstanojevic.me/api/tle/?sort=popularity&page-size=100&format=json";

// Parse TLE epoch to Unix ms
function tleEpochToMs(tle1: string): number {
  const epochStr = tle1.slice(18, 32).trim();
  const year2 = parseInt(epochStr.slice(0, 2), 10);
  const year = year2 >= 57 ? 1900 + year2 : 2000 + year2;
  const doy = parseFloat(epochStr.slice(2));
  const d = new Date(year, 0, 1);
  d.setTime(d.getTime() + (doy - 1) * 86400000);
  return d.getTime();
}

// Simplified SGP4 position propagation (for display purposes)
function propagateSimple(
  tle1: string,
  tle2: string,
  nowMs: number
): { lat: number; lon: number; alt: number } | null {
  try {
    const mm   = parseFloat(tle2.slice(52, 63));  // mean motion rev/day
    const inc  = parseFloat(tle2.slice(8, 16));   // inclination deg
    const raan = parseFloat(tle2.slice(17, 25));  // RAAN deg
    const ecc  = parseFloat("0." + tle2.slice(26, 33).trim()); // eccentricity
    const argp = parseFloat(tle2.slice(34, 42));  // argument of perigee deg
    const ma0  = parseFloat(tle2.slice(43, 51));  // mean anomaly deg

    if (isNaN(mm) || isNaN(inc) || isNaN(raan)) return null;

    const epochMs = tleEpochToMs(tle1);
    const dtSec   = (nowMs - epochMs) / 1000;

    const omega = (mm * 2 * Math.PI) / 86400; // rad/s
    const ma    = ((ma0 * Math.PI) / 180 + omega * dtSec) % (2 * Math.PI);

    // Approximate true anomaly (small eccentricity)
    const ta    = ma + 2 * ecc * Math.sin(ma);
    const argpR = argp * (Math.PI / 180);
    const incR  = inc  * (Math.PI / 180);
    const raanR = raan * (Math.PI / 180);
    const u     = argpR + ta;

    // ECI unit vector
    const x = Math.cos(raanR) * Math.cos(u) - Math.sin(raanR) * Math.sin(u) * Math.cos(incR);
    const y = Math.sin(raanR) * Math.cos(u) + Math.cos(raanR) * Math.sin(u) * Math.cos(incR);
    const z = Math.sin(incR) * Math.sin(u);

    // Greenwich Sidereal Time
    const J2000 = 2451545.0;
    const jd    = 2440587.5 + nowMs / 86400000;
    const gst   = ((280.46061837 + 360.98564736629 * (jd - J2000)) % 360) * (Math.PI / 180);

    // Rotate ECI → ECEF
    const xe =  x * Math.cos(-gst) - y * Math.sin(-gst);
    const ye =  x * Math.sin(-gst) + y * Math.cos(-gst);
    const ze =  z;

    // Geodetic coordinates
    const lat = Math.atan2(ze, Math.sqrt(xe * xe + ye * ye)) * (180 / Math.PI);
    const lon = Math.atan2(ye, xe) * (180 / Math.PI);

    // Altitude from mean motion
    const MU  = 3.986004418e14; // m^3/s^2
    const n   = (mm * 2 * Math.PI) / 86400;
    const a   = Math.cbrt(MU / (n * n));
    const RE  = 6371000;
    const alt = Math.round((a - RE) / 1000); // km

    return {
      lat: Math.round(lat * 100) / 100,
      lon: Math.round(lon * 100) / 100,
      alt,
    };
  } catch {
    return null;
  }
}

export interface SatellitePosition {
  name: string;
  lat: number;
  lon: number;
  alt: number; // km
}

export async function GET() {
  try {
    const res = await fetch(TLE_API, {
      headers: { "User-Agent": "OSINT-GlobalThreatMap/1.0" },
      next: { revalidate: 300 }, // 5 min cache
    });

    if (!res.ok) {
      throw new Error(`TLE API returned ${res.status}`);
    }

    const data = await res.json();
    const members: { name: string; line1: string; line2: string }[] =
      Array.isArray(data.member) ? data.member : [];

    const nowMs = Date.now();
    const positions: SatellitePosition[] = [];

    for (const sat of members) {
      if (!sat.line1 || !sat.line2) continue;
      const pos = propagateSimple(sat.line1, sat.line2, nowMs);
      if (!pos) continue;
      positions.push({ name: sat.name?.trim() ?? "Unknown", ...pos });
    }

    return NextResponse.json({
      satellites: positions,
      total: positions.length,
      updatedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error("[/api/satellites]", err);
    return NextResponse.json(
      { error: "Failed to fetch satellite data", satellites: [] },
      { status: 500 }
    );
  }
}
