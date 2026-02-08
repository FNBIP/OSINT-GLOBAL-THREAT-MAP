/**
 * NASA EONET API Client
 * Fetches real-time natural disaster events with precise coordinates
 * Free, no API key needed, no rate limits
 * https://eonet.gsfc.nasa.gov/docs/v3
 */

import type { ThreatEvent, GeoLocation, EventCategory, ThreatLevel } from "@/types";
import { generateEventId } from "./utils";

const EONET_API_BASE = "https://eonet.gsfc.nasa.gov/api/v3/events";

interface EonetGeometry {
  magnitudeValue: number | null;
  magnitudeUnit: string | null;
  date: string;
  type: string;
  coordinates: [number, number]; // [longitude, latitude]
}

interface EonetSource {
  id: string;
  url: string;
}

interface EonetCategory {
  id: string;
  title: string;
}

interface EonetEvent {
  id: string;
  title: string;
  description: string | null;
  link: string;
  closed: string | null;
  categories: EonetCategory[];
  sources: EonetSource[];
  geometry: EonetGeometry[];
}

interface EonetResponse {
  title: string;
  description: string;
  link: string;
  events: EonetEvent[];
}

/**
 * Map EONET category to our EventCategory
 */
function mapEonetCategory(categories: EonetCategory[]): EventCategory {
  const catId = categories[0]?.id || "";

  switch (catId) {
    case "wildfires":
      return "environmental";
    case "volcanoes":
      return "disaster";
    case "earthquakes":
      return "disaster";
    case "floods":
      return "disaster";
    case "severeStorms":
      return "disaster";
    case "drought":
      return "environmental";
    case "dustHaze":
      return "environmental";
    case "landslides":
      return "disaster";
    case "seaLakeIce":
      return "environmental";
    case "snow":
      return "environmental";
    case "tempExtremes":
      return "environmental";
    case "waterColor":
      return "environmental";
    default:
      return "disaster";
  }
}

/**
 * Determine threat level based on EONET event magnitude and type
 */
function determineEonetThreatLevel(event: EonetEvent): ThreatLevel {
  const catId = event.categories[0]?.id || "";
  const latestGeo = event.geometry[event.geometry.length - 1];
  const magnitude = latestGeo?.magnitudeValue;

  // Volcanoes and earthquakes are generally higher threat
  if (catId === "volcanoes") return "high";
  if (catId === "earthquakes") {
    if (magnitude && magnitude >= 6) return "critical";
    if (magnitude && magnitude >= 5) return "high";
    return "medium";
  }

  // Severe storms — check wind speed (kts)
  if (catId === "severeStorms") {
    if (magnitude && magnitude >= 100) return "critical";
    if (magnitude && magnitude >= 64) return "high";
    return "medium";
  }

  // Wildfires — check acreage
  if (catId === "wildfires") {
    if (magnitude && magnitude >= 50000) return "high";
    if (magnitude && magnitude >= 10000) return "medium";
    return "low";
  }

  // Floods
  if (catId === "floods") return "medium";

  return "medium";
}

/**
 * Reverse-geocode coordinates to get a place name
 * Uses Mapbox reverse geocoding for EONET events since they only have coordinates
 */
async function reverseGeocode(
  lat: number,
  lng: number
): Promise<{ placeName: string; country: string } | null> {
  const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
  if (!MAPBOX_TOKEN) return null;

  try {
    const response = await fetch(
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${MAPBOX_TOKEN}&limit=1&types=place,region,country`
    );

    if (!response.ok) return null;

    const data = await response.json();
    if (!data.features || data.features.length === 0) return null;

    const feature = data.features[0];
    let country = "";

    if (feature.context) {
      const countryCtx = feature.context.find((c: { id: string }) =>
        c.id.startsWith("country")
      );
      if (countryCtx) country = countryCtx.text;
    }

    if (!country && feature.place_type?.includes("country")) {
      country = feature.text;
    }

    return {
      placeName: feature.text || "Unknown",
      country: country || "Unknown",
    };
  } catch {
    return null;
  }
}

/**
 * Convert an EONET event to our ThreatEvent format
 */
async function processEonetEvent(event: EonetEvent): Promise<ThreatEvent | null> {
  // Use the most recent geometry point
  const latestGeo = event.geometry[event.geometry.length - 1];
  if (!latestGeo || !latestGeo.coordinates) return null;

  const [longitude, latitude] = latestGeo.coordinates;

  // Validate coordinates
  if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) return null;
  if (latitude === 0 && longitude === 0) return null;

  // Reverse geocode to get place name
  const placeInfo = await reverseGeocode(latitude, longitude);

  const location: GeoLocation = {
    latitude,
    longitude,
    placeName: placeInfo?.placeName || event.title,
    country: placeInfo?.country,
    confidence: "high", // EONET coordinates are precise scientific data
  };

  const category = mapEonetCategory(event.categories);
  const threatLevel = determineEonetThreatLevel(event);

  // Build a summary with magnitude info
  let summary = event.title;
  if (latestGeo.magnitudeValue && latestGeo.magnitudeUnit) {
    summary += ` (${latestGeo.magnitudeValue} ${latestGeo.magnitudeUnit})`;
  }
  if (event.description) {
    summary += `. ${event.description}`;
  }

  return {
    id: generateEventId(),
    title: event.title,
    summary,
    category,
    threatLevel,
    location,
    timestamp: latestGeo.date || new Date().toISOString(),
    source: `eonet:${event.sources[0]?.id || "NASA"}`,
    sourceUrl: event.sources[0]?.url || event.link,
    entities: [],
    keywords: event.categories.map((c) => c.title),
  };
}

/**
 * Fetch and process events from NASA EONET
 * Returns geocoded ThreatEvents for active natural disasters
 */
export async function fetchEonetEvents(): Promise<ThreatEvent[]> {
  console.log("[EONET] Fetching natural disaster events...");

  try {
    const response = await fetch(
      `${EONET_API_BASE}?status=open&limit=30`,
      { signal: AbortSignal.timeout(15000) } // 15s timeout
    );

    if (!response.ok) {
      console.error(`[EONET] API error: ${response.status}`);
      return [];
    }

    const data: EonetResponse = await response.json();
    const eonetEvents = data.events || [];

    console.log(`[EONET] Processing ${eonetEvents.length} active natural events...`);

    // Process in parallel — limit reverse geocoding to avoid too many Mapbox calls
    const events = await Promise.all(
      eonetEvents.slice(0, 25).map((event) => processEonetEvent(event))
    );

    const validEvents = events.filter((e): e is ThreatEvent => e !== null);
    console.log(`[EONET] Got ${validEvents.length} natural disaster events`);

    return validEvents;
  } catch (error) {
    console.error("[EONET] Error fetching events:", error);
    return [];
  }
}
