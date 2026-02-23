import { NextResponse } from "next/server";
import { searchEvents } from "@/lib/valyu";
import { isSelfHostedMode } from "@/lib/app-mode";
import { classifyEvent, isAIClassificationEnabled } from "@/lib/ai-classifier";
import { generateEventId } from "@/lib/utils";
import { extractKeywords, extractEntities } from "@/lib/event-classifier";
import { fetchGdeltEvents } from "@/lib/gdelt";
import { fetchEonetEvents } from "@/lib/eonet";
import type { ThreatEvent } from "@/types";

export const dynamic = "force-dynamic";

// Valyu search queries — now with regional coverage
const THREAT_QUERIES = [
  // Global threat categories
  "breaking news conflict military",
  "geopolitical crisis tensions",
  "protest demonstration unrest",
  "natural disaster emergency",
  "earthquake tsunami volcano eruption",
  "hurricane typhoon cyclone storm",
  "terrorism attack security",
  "cyber attack breach",
  "diplomatic summit sanctions",
  "shipping attack piracy maritime",
  "kidnapping cartel violence crime",
  "missile strike airstrike bombing",
  // Region-specific queries for better global coverage
  "Africa conflict crisis violence attack",
  "Latin America protest cartel crime unrest",
  "Southeast Asia disaster typhoon earthquake",
  "Central Asia conflict militant attack",
  "Pacific islands cyclone earthquake disaster",
  "India Pakistan conflict border crisis",
  "China Taiwan tensions military",
];

// Clean boilerplate from content
function cleanContent(text: string): string {
  return text
    .replace(/skip to (?:main |primary )?content/gi, "")
    .replace(/keyboard shortcuts?/gi, "")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/\s{2,}/g, " ")
    .trim();
}

// Filter out non-news sources and generic pages
const BLOCKED_DOMAINS = [
  "wikipedia.org",
  "brighteon.com",
  "fortinet.com",
  "cisa.gov",
];

const GENERIC_TITLE_PATTERNS = [
  /\| topic$/i,
  /\| homeland security$/i,
  /\| fortinet$/i,
  /^natural disasters$/i,
  /^countering terrorism$/i,
  /^maritime piracy:/i,
  /^assessment of global/i,
  /^recent cyber attacks in \d{4}/i,
];

// Validate location is real and geographically sensible
function isValidLocation(location: {
  latitude?: number;
  longitude?: number;
  placeName?: string;
  country?: string;
  confidence?: string;
}): boolean {
  const name = location.placeName || location.country || "";

  // Basic name checks
  if (name.length < 2) return false;
  if (name.toLowerCase() === "routes") return false;
  if (/^[a-z\s]+$/i.test(name) && name.length < 3) return false;
  if (["unknown", "global", "worldwide", "n/a"].includes(name.toLowerCase())) return false;

  // Validate coordinates are within valid ranges
  if (location.latitude !== undefined && location.longitude !== undefined) {
    if (location.latitude < -90 || location.latitude > 90) return false;
    if (location.longitude < -180 || location.longitude > 180) return false;
    // Null Island check — (0, 0) is almost never a valid event location
    if (location.latitude === 0 && location.longitude === 0) return false;
  }

  return true;
}

// Threat level priority for sorting
const THREAT_LEVEL_PRIORITY: Record<string, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
  info: 4,
};

/**
 * Calculate a freshness bonus for sorting.
 * Events from the last hour get a big boost, last 6 hours a moderate boost.
 */
function getFreshnessBonus(timestamp: string): number {
  const ageMs = Date.now() - new Date(timestamp).getTime();
  const ageHours = ageMs / (1000 * 60 * 60);

  if (ageHours < 1) return -3;    // Last hour: boost by 3 priority levels
  if (ageHours < 6) return -2;    // Last 6 hours: boost by 2
  if (ageHours < 24) return -1;   // Last day: boost by 1
  return 0;                        // Older: no boost
}

async function processSearchResults(
  results: Array<{ title: string; url: string; content: string; publishedDate?: string; source?: string }>
): Promise<ThreatEvent[]> {
  // Pre-filter results before processing
  const filteredResults = results.filter((result) => {
    // Skip blocked domains
    const url = result.url.toLowerCase();
    if (BLOCKED_DOMAINS.some((domain) => url.includes(domain))) {
      return false;
    }
    // Skip generic informational pages
    const title = result.title;
    if (GENERIC_TITLE_PATTERNS.some((pattern) => pattern.test(title))) {
      return false;
    }
    return true;
  });

  // Deduplicate by URL before processing (faster than after)
  const seenUrls = new Set<string>();
  const uniqueResults = filteredResults.filter((result) => {
    // Normalize URL (remove query params, trailing slashes)
    const normalizedUrl = result.url.split("?")[0].replace(/\/$/, "").toLowerCase();
    if (seenUrls.has(normalizedUrl)) return false;
    seenUrls.add(normalizedUrl);
    return true;
  });

  const eventsWithLocations = await Promise.all(
    uniqueResults.map(async (result) => {
      const cleanedTitle = cleanContent(result.title);
      const cleanedContent = cleanContent(result.content);
      const fullText = `${cleanedTitle} ${cleanedContent}`;

      // Use AI classification (falls back to keywords if OpenAI not available)
      const classification = await classifyEvent(cleanedTitle, cleanedContent);

      // Skip events without valid locations
      if (!classification.location || !isValidLocation(classification.location)) {
        return null;
      }

      const event: ThreatEvent = {
        id: generateEventId(),
        title: cleanedTitle,
        summary: cleanedContent.slice(0, 500),
        category: classification.category,
        threatLevel: classification.threatLevel,
        location: classification.location,
        timestamp: result.publishedDate || new Date().toISOString(),
        source: result.source || "valyu",
        sourceUrl: result.url,
        entities: extractEntities(fullText),
        keywords: extractKeywords(fullText),
        rawContent: cleanedContent,
      };

      return event;
    })
  );

  return eventsWithLocations.filter(
    (event): event is ThreatEvent => event !== null
  );
}

/**
 * Merge events from all sources, deduplicate, and sort
 */
function mergeAndSortEvents(allEvents: ThreatEvent[]): ThreatEvent[] {
  // Deduplicate by title similarity (case-insensitive, first 50 chars)
  const seen = new Set<string>();
  const unique = allEvents.filter((event) => {
    const key = event.title.toLowerCase().slice(0, 50);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  // Also deduplicate by URL
  const seenUrls = new Set<string>();
  const deduped = unique.filter((event) => {
    if (!event.sourceUrl) return true;
    const normalizedUrl = event.sourceUrl.split("?")[0].replace(/\/$/, "").toLowerCase();
    if (seenUrls.has(normalizedUrl)) return false;
    seenUrls.add(normalizedUrl);
    return true;
  });

  // Sort by: threat level (with freshness bonus) → then by date
  return deduped.sort((a, b) => {
    const priorityA = (THREAT_LEVEL_PRIORITY[a.threatLevel] ?? 5) + getFreshnessBonus(a.timestamp);
    const priorityB = (THREAT_LEVEL_PRIORITY[b.threatLevel] ?? 5) + getFreshnessBonus(b.timestamp);
    if (priorityA !== priorityB) {
      return priorityA - priorityB;
    }
    const dateA = new Date(a.timestamp).getTime();
    const dateB = new Date(b.timestamp).getTime();
    return dateB - dateA;
  });
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q");
  const accessToken = searchParams.get("accessToken");

  // In valyu mode, require authentication
  const selfHosted = isSelfHostedMode();
  if (!selfHosted && !accessToken) {
    return NextResponse.json(
      { error: "Authentication required", requiresReauth: true },
      { status: 401 }
    );
  }

  try {
    const searchQueries = query ? [query] : THREAT_QUERIES;
    const tokenToUse = selfHosted ? undefined : accessToken;

    type ValyuResult = Awaited<ReturnType<typeof searchEvents>>;

    // Wrap Valyu in a hard 8s timeout — if it's slow, fall back to free sources
    const valyuTimeout = new Promise<ValyuResult[]>((_, reject) =>
      setTimeout(() => reject(new Error("Valyu timeout")), 8000)
    );

    // Fetch from ALL sources in parallel
    const [valyuResults, gdeltEvents, eonetEvents] = await Promise.all([
      // Valyu (with timeout, limit to 6 queries in self-hosted)
      Promise.race([
        Promise.all(
          searchQueries.slice(0, 6).map((q) => searchEvents(q, { maxResults: 10, accessToken: tokenToUse || undefined }))
        ),
        valyuTimeout,
      ]).catch((err) => {
        console.warn("[VALYU] Skipped:", err.message);
        return [] as ValyuResult[];
      }),
      // GDELT (free, no auth)
      fetchGdeltEvents().catch((err) => {
        console.error("[GDELT] Failed:", err);
        return [] as ThreatEvent[];
      }),
      // EONET (free, no auth)
      fetchEonetEvents().catch((err) => {
        console.error("[EONET] Failed:", err);
        return [] as ThreatEvent[];
      }),
    ]);

    // Check Valyu auth issues
    const requiresReauth = valyuResults.some((r) => r.requiresReauth);
    if (requiresReauth) {
      // Still return GDELT + EONET even if Valyu auth fails
      const fallbackEvents = mergeAndSortEvents([...gdeltEvents, ...eonetEvents]);
      if (fallbackEvents.length > 0) {
        return NextResponse.json({
          events: fallbackEvents,
          count: fallbackEvents.length,
          timestamp: new Date().toISOString(),
          sources: { valyu: 0, gdelt: gdeltEvents.length, eonet: eonetEvents.length },
        });
      }
      return NextResponse.json(
        { error: "auth_error", message: "Session expired.", requiresReauth: true },
        { status: 401 }
      );
    }

    const requiresCredits = valyuResults.some((r) => r.requiresCredits);
    if (requiresCredits) {
      // Still return GDELT + EONET even if Valyu has no credits
      const fallbackEvents = mergeAndSortEvents([...gdeltEvents, ...eonetEvents]);
      if (fallbackEvents.length > 0) {
        return NextResponse.json({
          events: fallbackEvents,
          count: fallbackEvents.length,
          timestamp: new Date().toISOString(),
          sources: { valyu: 0, gdelt: gdeltEvents.length, eonet: eonetEvents.length },
        });
      }
      return NextResponse.json(
        { error: "Insufficient credits", message: "Please top up credits" },
        { status: 402 }
      );
    }

    // Process Valyu results
    const allValyuResults = valyuResults.flatMap((r) => r.results);
    const valyuEvents = await processSearchResults(allValyuResults);

    // Merge all sources
    const allEvents = mergeAndSortEvents([...valyuEvents, ...gdeltEvents, ...eonetEvents]);

    console.log(`[EVENTS] Total: ${allEvents.length} (Valyu: ${valyuEvents.length}, GDELT: ${gdeltEvents.length}, EONET: ${eonetEvents.length})`);

    return NextResponse.json({
      events: allEvents,
      count: allEvents.length,
      timestamp: new Date().toISOString(),
      sources: { valyu: valyuEvents.length, gdelt: gdeltEvents.length, eonet: eonetEvents.length },
    });
  } catch (error) {
    console.error("Error fetching events:", error);
    return NextResponse.json(
      { error: "Failed to fetch events" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { queries, accessToken } = body;

    const selfHosted = isSelfHostedMode();

    // In valyu mode, require authentication
    if (!selfHosted && !accessToken) {
      return NextResponse.json(
        { error: "Authentication required", requiresReauth: true },
        { status: 401 }
      );
    }

    const tokenToUse = selfHosted ? undefined : accessToken;

    const searchQueries = queries && Array.isArray(queries) && queries.length > 0
      ? queries.slice(0, 12)
      : THREAT_QUERIES;

    type ValyuResult2 = Awaited<ReturnType<typeof searchEvents>>;

    // Fetch from ALL sources in parallel (Valyu with 8s timeout)
    const valyuTimeout2 = new Promise<ValyuResult2[]>((_, reject) =>
      setTimeout(() => reject(new Error("Valyu timeout")), 8000)
    );

    const [valyuResults, gdeltEvents, eonetEvents] = await Promise.all([
      // Valyu (with timeout, limit queries)
      Promise.race([
        Promise.all(
          searchQueries.slice(0, 6).map((query: string) =>
            searchEvents(query, { maxResults: 10, accessToken: tokenToUse })
          )
        ),
        valyuTimeout2,
      ]).catch((err) => {
        console.warn("[VALYU] Skipped:", err.message);
        return [] as ValyuResult2[];
      }),
      // GDELT (free, no auth)
      fetchGdeltEvents().catch((err) => {
        console.error("[GDELT] Failed:", err);
        return [] as ThreatEvent[];
      }),
      // EONET (free, no auth)
      fetchEonetEvents().catch((err) => {
        console.error("[EONET] Failed:", err);
        return [] as ThreatEvent[];
      }),
    ]);

    // Check Valyu auth
    const requiresReauth = valyuResults.some((r) => r.requiresReauth);
    if (requiresReauth) {
      const fallbackEvents = mergeAndSortEvents([...gdeltEvents, ...eonetEvents]);
      if (fallbackEvents.length > 0) {
        return NextResponse.json({
          events: fallbackEvents,
          count: fallbackEvents.length,
          timestamp: new Date().toISOString(),
          sources: { valyu: 0, gdelt: gdeltEvents.length, eonet: eonetEvents.length },
        });
      }
      return NextResponse.json(
        { error: "auth_error", message: "Session expired.", requiresReauth: true },
        { status: 401 }
      );
    }

    const requiresCredits = valyuResults.some((r) => r.requiresCredits);
    if (requiresCredits) {
      const fallbackEvents = mergeAndSortEvents([...gdeltEvents, ...eonetEvents]);
      if (fallbackEvents.length > 0) {
        return NextResponse.json({
          events: fallbackEvents,
          count: fallbackEvents.length,
          timestamp: new Date().toISOString(),
          sources: { valyu: 0, gdelt: gdeltEvents.length, eonet: eonetEvents.length },
        });
      }
      return NextResponse.json(
        { error: "Insufficient credits", message: "Please top up credits" },
        { status: 402 }
      );
    }

    // Process Valyu results
    const allValyuResults = valyuResults.flatMap((r) => r.results);
    const valyuEvents = await processSearchResults(allValyuResults);

    // Merge all sources
    const allEvents = mergeAndSortEvents([...valyuEvents, ...gdeltEvents, ...eonetEvents]);

    console.log(`[EVENTS] Total: ${allEvents.length} (Valyu: ${valyuEvents.length}, GDELT: ${gdeltEvents.length}, EONET: ${eonetEvents.length})`);

    return NextResponse.json({
      events: allEvents,
      count: allEvents.length,
      timestamp: new Date().toISOString(),
      sources: { valyu: valyuEvents.length, gdelt: gdeltEvents.length, eonet: eonetEvents.length },
    });
  } catch (error) {
    console.error("Error fetching events:", error);
    return NextResponse.json(
      { error: "Failed to fetch events" },
      { status: 500 }
    );
  }
}
