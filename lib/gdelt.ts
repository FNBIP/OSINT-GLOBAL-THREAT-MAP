/**
 * GDELT API Client
 * Fetches real-time global events from the GDELT Project
 * Free, no API key, no rate limits, updates every 15 minutes
 * https://blog.gdeltproject.org/gdelt-doc-2-0-api-discovering-the-patterns-of-our-global-world/
 */

import type { ThreatEvent, GeoLocation, EventCategory, ThreatLevel } from "@/types";
import { geocodeLocation, extractLocationsFromText, getKnownLocationCountry } from "./geocoding";
import { classifyCategory, classifyThreatLevel } from "./event-classifier";
import { generateEventId } from "./utils";

// GDELT DOC 2.0 API base
const GDELT_API_BASE = "https://api.gdeltproject.org/api/v2/doc/doc";

interface GdeltArticle {
  url: string;
  url_mobile?: string;
  title: string;
  seendate: string;
  socialimage?: string;
  domain: string;
  language: string;
  sourcecountry: string;
}

interface GdeltResponse {
  articles?: GdeltArticle[];
}

// GDELT DOC 2.0 queries for global coverage
// Rules: OR terms MUST be in parentheses, multi-word phrases in quotes,
// implicit AND between groups, specific terms to avoid false positives
const GDELT_QUERIES = [
  // Global conflict & security — specific terms avoid false positives like "heart attack"
  '(airstrike OR shelling OR "missile strike" OR bombing OR "military offensive")',
  '("armed conflict" OR "troops killed" OR "soldiers killed" OR "ceasefire" OR "war crimes")',
  '(protest OR riot OR unrest OR "civil unrest" OR demonstration)',
  '(terrorism OR "terrorist attack" OR extremist OR militant OR insurgent)',
  '("cyber attack" OR "data breach" OR ransomware OR "hacking")',
  // Natural disasters
  '(earthquake OR tsunami OR volcano OR hurricane OR cyclone OR typhoon OR "tropical storm")',
  '(wildfire OR flooding OR "flash flood" OR drought OR landslide)',
  // Regional conflict coverage — use OR between terms, not AND
  '(Ukraine OR Gaza OR Sudan OR Yemen OR Syria OR Congo) (killed OR strike OR bombing OR offensive)',
  '"Africa" AND (conflict OR violence OR "armed group" OR attack)',
  '"Latin America" AND (cartel OR protest OR "gang violence" OR crime)',
  '"Asia" AND (military OR "territorial dispute" OR missile OR "naval" OR tension)',
];

/**
 * Convert GDELT sourcecountry to a geocoding hint
 * GDELT sourcecountry is the country where the news org is based,
 * NOT necessarily where the event happened — but it's a useful fallback
 */
function parseGdeltDate(seendate: string): string {
  // Format: "20260208T173000Z" → ISO 8601
  try {
    const year = seendate.slice(0, 4);
    const month = seendate.slice(4, 6);
    const day = seendate.slice(6, 8);
    const hour = seendate.slice(9, 11);
    const minute = seendate.slice(11, 13);
    const second = seendate.slice(13, 15);
    return `${year}-${month}-${day}T${hour}:${minute}:${second}Z`;
  } catch {
    return new Date().toISOString();
  }
}

/**
 * Classify and geocode a GDELT article into a ThreatEvent
 */
async function processGdeltArticle(article: GdeltArticle): Promise<ThreatEvent | null> {
  const title = article.title.trim();
  if (!title || title.length < 10) return null;

  // Skip non-English articles for now (title might not parse well)
  // GDELT returns multilingual results even with English queries
  if (article.language !== "English" && !article.title.match(/^[a-zA-Z0-9\s,.:;'"!?()-]+$/)) {
    return null;
  }

  // Classify the event
  const category = classifyCategory(title);
  const threatLevel = classifyThreatLevel(title);

  // Extract location from title
  const locationCandidates = extractLocationsFromText(title);
  let location: GeoLocation | null = null;

  // First pass: known locations
  for (const candidate of locationCandidates) {
    if (getKnownLocationCountry(candidate)) {
      location = await geocodeLocation(candidate);
      if (location) {
        location = { ...location, confidence: "medium" };
        break;
      }
    }
  }

  // Second pass: Mapbox for unknowns
  if (!location) {
    for (const candidate of locationCandidates) {
      if (getKnownLocationCountry(candidate)) continue;
      location = await geocodeLocation(candidate);
      if (location) {
        location = { ...location, confidence: "low" };
        break;
      }
    }
  }

  // Last resort: try sourcecountry as location hint
  if (!location && article.sourcecountry) {
    location = await geocodeLocation(article.sourcecountry);
    if (location) {
      location = { ...location, confidence: "low" };
    }
  }

  if (!location) return null;

  return {
    id: generateEventId(),
    title,
    summary: title, // GDELT articles only have titles, no content snippets
    category,
    threatLevel,
    location,
    timestamp: parseGdeltDate(article.seendate),
    source: `gdelt:${article.domain}`,
    sourceUrl: article.url,
    entities: [],
    keywords: [],
  };
}

/**
 * Fetch events from GDELT for a single query
 */
async function fetchGdeltQuery(query: string, maxRecords: number = 10): Promise<GdeltArticle[]> {
  try {
    const params = new URLSearchParams({
      query: `${query} sourcelang:english`,
      mode: "artlist",
      format: "json",
      maxrecords: String(maxRecords),
      sort: "datedesc",
      timespan: "12h", // Last 12 hours — conflict articles need wider window
    });

    const response = await fetch(`${GDELT_API_BASE}?${params}`, {
      signal: AbortSignal.timeout(10000), // 10s timeout
    });

    if (!response.ok) return [];

    // GDELT returns 200 even for errors, with plain text body
    // Check content-type or try parsing defensively
    const text = await response.text();
    if (!text.startsWith("{") && !text.startsWith("[")) {
      console.warn(`[GDELT] Non-JSON response for "${query}": ${text.slice(0, 100)}`);
      return [];
    }

    const data: GdeltResponse = JSON.parse(text);
    return data.articles || [];
  } catch (error) {
    console.error(`[GDELT] Error fetching "${query}":`, error);
    return [];
  }
}

/**
 * Fetch and process events from GDELT across all query categories
 * Returns deduplicated, geocoded ThreatEvents
 */
export async function fetchGdeltEvents(): Promise<ThreatEvent[]> {
  console.log("[GDELT] Fetching events...");

  // Fetch all queries in parallel
  const articleArrays = await Promise.all(
    GDELT_QUERIES.map((q) => fetchGdeltQuery(q, 8))
  );

  const allArticles = articleArrays.flat();

  // Deduplicate by URL
  const seenUrls = new Set<string>();
  const uniqueArticles = allArticles.filter((article) => {
    const normalizedUrl = article.url.split("?")[0].replace(/\/$/, "").toLowerCase();
    if (seenUrls.has(normalizedUrl)) return false;
    seenUrls.add(normalizedUrl);
    return true;
  });

  console.log(`[GDELT] Processing ${uniqueArticles.length} unique articles...`);

  // Process in parallel (geocoding + classification)
  const events = await Promise.all(
    uniqueArticles.slice(0, 50).map((article) => processGdeltArticle(article))
  );

  const validEvents = events.filter((e): e is ThreatEvent => e !== null);
  console.log(`[GDELT] Got ${validEvents.length} geocoded events`);

  return validEvents;
}
