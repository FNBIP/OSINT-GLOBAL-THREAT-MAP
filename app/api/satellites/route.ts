import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// Celestrak GP data in JSON format — no auth required
// Groups available: stations, active, visual, 1999-025 (ISS debris), etc.
// We fetch the "visual" group (brightest visible sats) and "stations" (ISS + CSS)
const CELESTRAK_GROUPS = [
  { name: "stations", url: "https://celestrak.org/SOCRATES/query.php?catalog=stations&GROUP=stations&FORMAT=json" },
  { name: "active",   url: "https://celestrak.org/SOCRATES/query.php?catalog=active&GROUP=active&FORMAT=json" },
];

// Use the simpler GP data endpoint
const CELESTRAK_BASE = "https://celestrak.org/SOCRATES/query.php";

// Celestrak GP data endpoint (JSON format, no auth needed)
// Returns objects with OBJECT_NAME, TLE_LINE1, TLE_LINE2
async function fetchGroup(group: string) {
  const url = `https://celestrak.org/SOCRATES/query.php?GROUP=${group}&FORMAT=json`;
  const res = await fetch(url, {
    next: { revalidate: 300 }, // 5 min cache — TLEs don't change that fast
    headers: { "User-Agent": "OSINT-GlobalThreatMap/1.0" },
  });
  if (!res.ok) throw new Error(`Celestrak ${group}: ${res.status}`);
  return res.json();
}

// Parse TLE line 1 to extract epoch in Unix ms
function tleEpochToMs(tle1: string): number {
  // Field: columns 19-32, format YYDDD.DDDDDDDD
  const epochStr = tle1.slice(18, 32).trim();
  const year2 = parseInt(epochStr.slice(0, 2), 10);
  const year = year2 >= 57 ? 1900 + year2 : 2000 + year2;
  const doy = parseFloat(epochStr.slice(2));
  const d = new Date(year, 0, 1);
  d.setTime(d.getTime() + (doy - 1) * 86400000);
  return d.getTime();
}

// Propagate a satellite to current time using a simplified SGP4-lite approach
// For display purposes we use a simplified circular orbit approximation
// (real SGP4 requires satellite.js which we'd import client-side)
function propagateSimple(tle1: string, tle2: string, nowMs: number): { lat: number; lon: number; alt: number } | null {
  try {
    // Extract mean motion (rev/day) from TLE line 2 cols 53-63
    const mm = parseFloat(tle2.slice(52, 63));
    // Extract inclination (deg) from TLE line 2 cols 9-16
    const inc = parseFloat(tle2.slice(8, 16));
    // Extract RAAN (deg) from TLE line 2 cols 18-25
    const raan = parseFloat(tle2.slice(17, 25));
    // Extract mean anomaly (deg) from TLE line 2 cols 44-51
    const ma0 = parseFloat(tle2.slice(43, 51));
    // Extract eccentricity from TLE line 2 cols 27-33 (implied 0.)
    const ecc = parseFloat("0." + tle2.slice(26, 33).trim());

    if (isNaN(mm) || isNaN(inc) || isNaN(raan)) return null;

    // Epoch
    const epochMs = tleEpochToMs(tle1);
    const dtSec = (nowMs - epochMs) / 1000;

    // Angular velocity rad/s
    const omega = (mm * 2 * Math.PI) / 86400;
    // Current mean anomaly
    const ma = ((ma0 * Math.PI) / 180 + omega * dtSec) % (2 * Math.PI);

    // Approximate true anomaly for small eccentricity
    const ta = ma + 2 * ecc * Math.sin(ma);

    // Argument of perigee from TLE line 2 cols 35-42
    const argp = parseFloat(tle2.slice(34, 42)) * (Math.PI / 180);
    const incR = inc * (Math.PI / 180);
    const raanR = raan * (Math.PI / 180);

    // Position in orbital plane
    const u = argp + ta;
    // Cartesian in ECI frame
    const x = Math.cos(raanR) * Math.cos(u) - Math.sin(raanR) * Math.sin(u) * Math.cos(incR);
    const y = Math.sin(raanR) * Math.cos(u) + Math.cos(raanR) * Math.sin(u) * Math.cos(incR);
    const z = Math.sin(incR) * Math.sin(u);

    // Greenwich sidereal time approximation
    const J2000 = 2451545.0;
    const jd = 2440587.5 + nowMs / 86400000;
    const gst = ((280.46061837 + 360.98564736629 * (jd - J2000)) % 360) * (Math.PI / 180);

    // Rotate ECI to ECEF
    const xe = x * Math.cos(-gst) - y * Math.sin(-gst);
    const ye = x * Math.sin(-gst) + y * Math.cos(-gst);
    const ze = z;

    // Convert to geodetic
    const lat = Math.atan2(ze, Math.sqrt(xe * xe + ye * ye)) * (180 / Math.PI);
    const lon = Math.atan2(ye, xe) * (180 / Math.PI);

    // Altitude: semi-major axis from mean motion
    const MU = 3.986004418e14; // m^3/s^2
    const n = (mm * 2 * Math.PI) / 86400; // rad/s
    const a = Math.cbrt(MU / (n * n)); // meters
    const RE = 6371000; // m
    const alt = Math.round((a - RE) / 1000); // km

    return { lat: Math.round(lat * 100) / 100, lon: Math.round(lon * 100) / 100, alt };
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
    // Fetch ISS + brightest visual satellites
    const [stations, visual] = await Promise.allSettled([
      fetch("https://celestrak.org/SOCRATES/query.php?GROUP=stations&FORMAT=json", {
        next: { revalidate: 300 },
        headers: { "User-Agent": "OSINT-GlobalThreatMap/1.0" },
      }).then((r) => (r.ok ? r.json() : [])),
      fetch("https://celestrak.org/SOCRATES/query.php?GROUP=visual&FORMAT=json", {
        next: { revalidate: 300 },
        headers: { "User-Agent": "OSINT-GlobalThreatMap/1.0" },
      }).then((r) => (r.ok ? r.json() : [])),
    ]);

    const raw: { OBJECT_NAME: string; TLE_LINE1: string; TLE_LINE2: string }[] = [
      ...(stations.status === "fulfilled" && Array.isArray(stations.value) ? stations.value : []),
      ...(visual.status === "fulfilled" && Array.isArray(visual.value) ? visual.value : []),
    ];

    if (raw.length === 0) {
      // Fallback: try the simpler GP endpoint
      const r = await fetch("https://celestrak.org/SOCRATES/query.php?GROUP=stations&FORMAT=json", {
        next: { revalidate: 300 },
      });
      if (r.ok) {
        const d = await r.json();
        if (Array.isArray(d)) raw.push(...d);
      }
    }

    const nowMs = Date.now();
    const positions: SatellitePosition[] = [];

    for (const sat of raw.slice(0, 500)) {
      if (!sat.TLE_LINE1 || !sat.TLE_LINE2) continue;
      const pos = propagateSimple(sat.TLE_LINE1, sat.TLE_LINE2, nowMs);
      if (!pos) continue;
      positions.push({ name: sat.OBJECT_NAME?.trim() ?? "Unknown", ...pos });
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
