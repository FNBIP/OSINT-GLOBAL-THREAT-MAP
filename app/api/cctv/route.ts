import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * CCTV Camera Image Proxy
 *
 * Proxies live traffic-camera JPEG snapshots from government DOT / transport
 * agencies around the world, avoiding browser CORS restrictions.
 *
 * Sources (all free, no API key):
 * ┌──────────────┬──────────────────────────────────┐
 * │ London       │ TfL JamCams — S3 JPEG, 900+ cams │
 * │ Los Angeles  │ Caltrans D7 — JPEG snapshots      │
 * │ Singapore    │ data.gov.sg — dynamic JPEG API    │
 * │ Hong Kong    │ data.one.gov.hk — JPEG            │
 * └──────────────┴──────────────────────────────────┘
 *
 * GET /api/cctv?id=london-tower-bridge   → proxied JPEG
 * GET /api/cctv?list=true                → camera catalog JSON
 */

export interface CctvCamera {
  id: string;
  label: string;
  city: string;
  country: string;
  camCode: string;
  imageUrl: string;             // direct JPEG URL (static)
  dynamicApi?: string;          // API to fetch dynamic URL from
  dynamicParser?: string;       // parser type (e.g. "singapore")
  lat: number;
  lon: number;
}

// ── Camera catalog — all URLs verified working 2026-02-23 ─────────────────────
const CAMERAS: CctvCamera[] = [
  // ── London (TfL JamCams — direct S3 JPEG, no auth, refreshes ~30s) ─────────
  { id: "london-tower-bridge",   label: "London — Tower Bridge",               city: "London",        country: "GB", camCode: "CAM-01", imageUrl: "https://s3-eu-west-1.amazonaws.com/jamcams.tfl.gov.uk/00001.09606.jpg",  lat: 51.5055, lon: -0.0754 },
  { id: "london-trafalgar",      label: "London — Trafalgar Square",           city: "London",        country: "GB", camCode: "CAM-02", imageUrl: "https://s3-eu-west-1.amazonaws.com/jamcams.tfl.gov.uk/00001.03601.jpg",  lat: 51.5080, lon: -0.1281 },
  { id: "london-westminster",    label: "London — Westminster Bridge",         city: "London",        country: "GB", camCode: "CAM-03", imageUrl: "https://s3-eu-west-1.amazonaws.com/jamcams.tfl.gov.uk/00001.02258.jpg",  lat: 51.5007, lon: -0.1220 },
  { id: "london-park-lane",      label: "London — Park Lane / Hyde Park",      city: "London",        country: "GB", camCode: "CAM-04", imageUrl: "https://s3-eu-west-1.amazonaws.com/jamcams.tfl.gov.uk/00001.04245.jpg",  lat: 51.5074, lon: -0.1552 },
  { id: "london-a40-westway",    label: "London — A40 Westway",               city: "London",        country: "GB", camCode: "CAM-05", imageUrl: "https://s3-eu-west-1.amazonaws.com/jamcams.tfl.gov.uk/00002.00607.jpg",  lat: 51.5197, lon: -0.2108 },

  // ── Singapore extra (data.gov.sg — more cameras for coverage) ────────────────
  { id: "singapore-sle-1006",       label: "Singapore — SLE Mandai",            city: "Singapore", country: "SG", camCode: "CAM-06", imageUrl: "", dynamicApi: "https://api.data.gov.sg/v1/transport/traffic-images", dynamicParser: "singapore:1006", lat: 1.3988, lon: 103.7737 },
  { id: "singapore-bke-1003",       label: "Singapore — BKE Dairy Farm",        city: "Singapore", country: "SG", camCode: "CAM-07", imageUrl: "", dynamicApi: "https://api.data.gov.sg/v1/transport/traffic-images", dynamicParser: "singapore:1003", lat: 1.3240, lon: 103.8729 },

  // ── Los Angeles (Caltrans D7 — direct JPEG, no auth) ───────────────────────
  { id: "la-i110-cypress",          label: "Los Angeles — I-110 Cypress Park",   city: "Los Angeles", country: "US", camCode: "CAM-09", imageUrl: "https://cwwp2.dot.ca.gov/data/d7/cctv/image/i110196avenue26offramp/i110196avenue26offramp.jpg", lat: 34.0837, lon: -118.2215 },
  { id: "la-i5-slauson",            label: "Los Angeles — I-5 @ Slauson",        city: "Los Angeles", country: "US", camCode: "CAM-10", imageUrl: "https://cwwp2.dot.ca.gov/data/d7/cctv/image/i52slausonave/i52slausonave.jpg", lat: 33.9786, lon: -118.1279 },
  { id: "la-i5-south-i10",          label: "Los Angeles — I-5 South of I-10",    city: "Los Angeles", country: "US", camCode: "CAM-11", imageUrl: "https://cwwp2.dot.ca.gov/data/d7/cctv/image/i517southofi10/i517southofi10.jpg", lat: 34.0537, lon: -118.2139 },

  // ── Singapore (data.gov.sg — dynamic API, no auth, 90 cameras) ─────────────
  { id: "singapore-ecp-1001",       label: "Singapore — ECP Benjamin Sheares",   city: "Singapore", country: "SG", camCode: "CAM-12", imageUrl: "", dynamicApi: "https://api.data.gov.sg/v1/transport/traffic-images", dynamicParser: "singapore:1001", lat: 1.2953, lon: 103.8711 },
  { id: "singapore-cte-1004",       label: "Singapore — CTE Moulmein",           city: "Singapore", country: "SG", camCode: "CAM-13", imageUrl: "", dynamicApi: "https://api.data.gov.sg/v1/transport/traffic-images", dynamicParser: "singapore:1004", lat: 1.3196, lon: 103.8543 },
  { id: "singapore-pie-1005",       label: "Singapore — PIE Clementi",           city: "Singapore", country: "SG", camCode: "CAM-14", imageUrl: "", dynamicApi: "https://api.data.gov.sg/v1/transport/traffic-images", dynamicParser: "singapore:1005", lat: 1.3303, lon: 103.7704 },

  // ── Hong Kong (data.one.gov.hk — direct JPEG, no auth, 987 cameras) ────────
  { id: "hk-tsing-yi",              label: "Hong Kong — Tsing Yi Bridge",        city: "Hong Kong", country: "HK", camCode: "CAM-15", imageUrl: "https://tdcctv.data.one.gov.hk/H201F.JPG",  lat: 22.3484, lon: 114.1049 },
  { id: "hk-tuen-mun",              label: "Hong Kong — Tuen Mun Road",          city: "Hong Kong", country: "HK", camCode: "CAM-16", imageUrl: "https://tdcctv.data.one.gov.hk/H401F.JPG",  lat: 22.3862, lon: 114.0544 },
  { id: "hk-kwai-chung",            label: "Hong Kong — Kwai Chung Expressway",  city: "Hong Kong", country: "HK", camCode: "CAM-17", imageUrl: "https://tdcctv.data.one.gov.hk/K502F.JPG",  lat: 22.3584, lon: 114.1319 },
  { id: "hk-tai-po",                label: "Hong Kong — Tai Po Road",            city: "Hong Kong", country: "HK", camCode: "CAM-18", imageUrl: "https://tdcctv.data.one.gov.hk/TC101F.JPG", lat: 22.4483, lon: 114.1690 },
];

// ── Singapore dynamic URL resolver ────────────────────────────────────────────
// Singapore images change every 20s, so we fetch the API and pick the cam.
const sgCache: { url: Map<string, string>; ts: number } = { url: new Map(), ts: 0 };
const SG_CACHE_TTL = 15_000;

async function resolveSingaporeImage(camId: string): Promise<string | null> {
  if (Date.now() - sgCache.ts < SG_CACHE_TTL && sgCache.url.has(camId)) {
    return sgCache.url.get(camId)!;
  }

  try {
    const res = await fetch("https://api.data.gov.sg/v1/transport/traffic-images", {
      signal: AbortSignal.timeout(5000),
    });
    const data = await res.json();
    const cams = data?.items?.[0]?.cameras ?? [];
    sgCache.url.clear();
    for (const c of cams) {
      sgCache.url.set(String(c.camera_id), c.image);
    }
    sgCache.ts = Date.now();
    return sgCache.url.get(camId) ?? null;
  } catch {
    return sgCache.url.get(camId) ?? null;
  }
}

// ── Main handler ──────────────────────────────────────────────────────────────
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  // Camera list
  if (searchParams.get("list") === "true") {
    return NextResponse.json({
      cameras: CAMERAS.map(({ imageUrl, dynamicApi, dynamicParser, ...rest }) => rest),
      total: CAMERAS.length,
    });
  }

  // Proxy a specific camera
  const camId = searchParams.get("id");
  if (!camId) {
    return NextResponse.json({ error: "Missing ?id= parameter" }, { status: 400 });
  }

  const cam = CAMERAS.find((c) => c.id === camId);
  if (!cam) {
    return NextResponse.json({ error: `Camera '${camId}' not found` }, { status: 404 });
  }

  try {
    // Resolve the actual image URL
    let url = cam.imageUrl;

    if (cam.dynamicParser?.startsWith("singapore:")) {
      const sgCamId = cam.dynamicParser.split(":")[1];
      const resolved = await resolveSingaporeImage(sgCamId);
      if (!resolved) {
        return NextResponse.json({ error: "Singapore cam not available" }, { status: 502 });
      }
      url = resolved;
    }

    if (!url) {
      return NextResponse.json({ error: "No image URL for this camera" }, { status: 502 });
    }

    const res = await fetch(url, {
      headers: {
        "User-Agent": "OSINT-GlobalThreatMap/1.0",
        "Accept": "image/jpeg,image/png,image/gif,image/*,*/*",
      },
      signal: AbortSignal.timeout(8000),
    });

    if (!res.ok) {
      return NextResponse.json({ error: `Upstream ${res.status}` }, { status: 502 });
    }

    const contentType = res.headers.get("content-type") || "image/jpeg";
    const imageBuffer = await res.arrayBuffer();

    return new NextResponse(imageBuffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=10",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (err) {
    console.error(`[/api/cctv] ${camId}:`, err);
    return NextResponse.json({ error: "Failed to fetch camera image" }, { status: 502 });
  }
}
