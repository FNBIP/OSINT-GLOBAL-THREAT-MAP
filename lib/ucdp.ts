/**
 * UCDP (Uppsala Conflict Data Program) API Client
 * Free, no API key, structured conflict data since 1946
 * https://ucdp.uu.se/apidocs/
 */

const UCDP_API_BASE = "https://ucdpapi.pcr.uu.se/api";
const UCDP_VERSION = "25.1";

// Gleditsch-Ward country codes used by UCDP
const COUNTRY_GW_CODES: Record<string, number> = {
  "united states": 2, "usa": 2, "us": 2,
  "haiti": 41,
  "mexico": 70,
  "colombia": 100,
  "venezuela": 101,
  "peru": 135,
  "brazil": 140,
  "argentina": 160,
  "chile": 155,
  "united kingdom": 200, "uk": 200,
  "ireland": 205,
  "netherlands": 210,
  "belgium": 211,
  "france": 220,
  "spain": 230,
  "portugal": 235,
  "germany": 255,
  "poland": 290,
  "austria": 305,
  "hungary": 310,
  "czech republic": 316, "czechia": 316,
  "italy": 325,
  "albania": 339,
  "serbia": 340,
  "croatia": 344,
  "bosnia": 346, "bosnia and herzegovina": 346,
  "kosovo": 347,
  "greece": 350,
  "cyprus": 352,
  "bulgaria": 355,
  "romania": 360,
  "russia": 365,
  "ukraine": 369,
  "belarus": 370,
  "armenia": 371,
  "georgia": 372,
  "azerbaijan": 373,
  "finland": 375,
  "sweden": 380,
  "norway": 385,
  "denmark": 390,
  "iceland": 395,
  "mali": 432,
  "senegal": 433,
  "benin": 434,
  "mauritania": 435,
  "niger": 436,
  "ivory coast": 437, "cote d'ivoire": 437,
  "guinea": 438,
  "burkina faso": 439,
  "liberia": 450,
  "sierra leone": 451,
  "ghana": 452,
  "togo": 461,
  "cameroon": 471,
  "nigeria": 475,
  "central african republic": 482,
  "chad": 483,
  "congo": 484, "republic of congo": 484,
  "dr congo": 490, "democratic republic of congo": 490, "drc": 490,
  "uganda": 500,
  "kenya": 501,
  "tanzania": 510,
  "rwanda": 517,
  "burundi": 516,
  "somalia": 520,
  "djibouti": 522,
  "ethiopia": 530,
  "eritrea": 531,
  "angola": 540,
  "mozambique": 541,
  "zambia": 551,
  "zimbabwe": 552,
  "south africa": 560,
  "madagascar": 580,
  "morocco": 600,
  "algeria": 615,
  "tunisia": 616,
  "libya": 620,
  "sudan": 625,
  "south sudan": 626,
  "iran": 630,
  "turkey": 640, "türkiye": 640,
  "iraq": 645,
  "egypt": 651,
  "syria": 652,
  "lebanon": 660,
  "jordan": 663,
  "israel": 666,
  "palestine": 666,
  "saudi arabia": 670,
  "yemen": 678,
  "kuwait": 690,
  "bahrain": 692,
  "qatar": 694,
  "united arab emirates": 696, "uae": 696,
  "oman": 698,
  "afghanistan": 700,
  "tajikistan": 702,
  "uzbekistan": 704,
  "kazakhstan": 705,
  "china": 710,
  "taiwan": 713,
  "north korea": 731,
  "south korea": 732,
  "japan": 740,
  "india": 750,
  "pakistan": 770,
  "bangladesh": 771,
  "sri lanka": 780,
  "nepal": 790,
  "myanmar": 775, "burma": 775,
  "thailand": 800,
  "cambodia": 811,
  "vietnam": 816,
  "malaysia": 820,
  "philippines": 840,
  "indonesia": 850,
  "australia": 900,
  "new zealand": 920,
};

function getCountryCode(country: string): number | null {
  const lower = country.toLowerCase().trim();
  return COUNTRY_GW_CODES[lower] ?? null;
}

// --- Types ---

interface UcdpConflict {
  conflict_id: number;
  location: string;
  side_a: string;
  side_b: string;
  incompatibility: number; // 1=territory, 2=government, 3=both
  territory_name: string;
  intensity_level: number; // 1=minor (25-999 deaths), 2=war (1000+)
  type_of_conflict: number; // 1=extrasystemic, 2=interstate, 3=intrastate, 4=internationalized intrastate
  start_date: string;
  start_date2: string;
  ep_end: number; // 0=ongoing, 1=ended
  ep_end_date: string;
  year: number;
  side_a_2nd: string;
  side_b_2nd: string;
}

interface UcdpGeoEvent {
  id: number;
  conflict_name: string;
  dyad_name: string;
  side_a: string;
  side_b: string;
  type_of_violence: number; // 1=state-based, 2=non-state, 3=one-sided
  date_start: string;
  date_end: string;
  year: number;
  deaths_a: number;
  deaths_b: number;
  deaths_civilians: number;
  deaths_unknown: number;
  best: number; // best estimate total
  high: number;
  low: number;
  where_description: string;
  latitude: number;
  longitude: number;
  country: string;
  region: string;
  source_headline: string;
  source_article: string;
}

interface UcdpResponse<T> {
  TotalCount: number;
  TotalPages: number;
  Result: T[];
}

// --- API calls ---
// IMPORTANT: UCDP API returns ALL numeric fields as strings.
// We must parse them to numbers for correct comparisons.

function parseConflict(raw: Record<string, unknown>): UcdpConflict {
  return {
    conflict_id: Number(raw.conflict_id) || 0,
    location: String(raw.location || ""),
    side_a: String(raw.side_a || ""),
    side_b: String(raw.side_b || ""),
    incompatibility: Number(raw.incompatibility) || 0,
    territory_name: String(raw.territory_name || ""),
    intensity_level: Number(raw.intensity_level) || 0,
    type_of_conflict: Number(raw.type_of_conflict) || 0,
    start_date: String(raw.start_date || ""),
    start_date2: String(raw.start_date2 || ""),
    ep_end: Number(raw.ep_end) || 0,
    ep_end_date: String(raw.ep_end_date || ""),
    year: Number(raw.year) || 0,
    side_a_2nd: String(raw.side_a_2nd || ""),
    side_b_2nd: String(raw.side_b_2nd || ""),
  };
}

function parseGeoEvent(raw: Record<string, unknown>): UcdpGeoEvent {
  return {
    id: Number(raw.id) || 0,
    conflict_name: String(raw.conflict_name || ""),
    dyad_name: String(raw.dyad_name || ""),
    side_a: String(raw.side_a || ""),
    side_b: String(raw.side_b || ""),
    type_of_violence: Number(raw.type_of_violence) || 0,
    date_start: String(raw.date_start || ""),
    date_end: String(raw.date_end || ""),
    year: Number(raw.year) || 0,
    deaths_a: Number(raw.deaths_a) || 0,
    deaths_b: Number(raw.deaths_b) || 0,
    deaths_civilians: Number(raw.deaths_civilians) || 0,
    deaths_unknown: Number(raw.deaths_unknown) || 0,
    best: Number(raw.best) || 0,
    high: Number(raw.high) || 0,
    low: Number(raw.low) || 0,
    where_description: String(raw.where_description || ""),
    latitude: Number(raw.latitude) || 0,
    longitude: Number(raw.longitude) || 0,
    country: String(raw.country || ""),
    region: String(raw.region || ""),
    source_headline: String(raw.source_headline || ""),
    source_article: String(raw.source_article || ""),
  };
}

async function fetchUcdpConflicts(gwCode: number): Promise<UcdpConflict[]> {
  const url = `${UCDP_API_BASE}/ucdpprioconflict/${UCDP_VERSION}?pagesize=100&Country=${gwCode}`;
  const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
  if (!res.ok) throw new Error(`UCDP API error: ${res.status}`);
  const data = await res.json();
  const results: Record<string, unknown>[] = data.Result || [];
  return results.map(parseConflict);
}

async function fetchUcdpRecentEvents(gwCode: number, startDate: string): Promise<UcdpGeoEvent[]> {
  const url = `${UCDP_API_BASE}/gedevents/${UCDP_VERSION}?pagesize=50&Country=${gwCode}&StartDate=${startDate}`;
  const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
  if (!res.ok) throw new Error(`UCDP API error: ${res.status}`);
  const data = await res.json();
  const results: Record<string, unknown>[] = data.Result || [];
  return results.map(parseGeoEvent);
}

// --- Formatting ---

function conflictTypeName(type: number): string {
  switch (type) {
    case 1: return "Extrasystemic";
    case 2: return "Interstate";
    case 3: return "Intrastate";
    case 4: return "Internationalized Intrastate";
    default: return "Armed Conflict";
  }
}

function violenceTypeName(type: number): string {
  switch (type) {
    case 1: return "State-based conflict";
    case 2: return "Non-state conflict";
    case 3: return "One-sided violence";
    default: return "Violence";
  }
}

function intensityLabel(level: number): string {
  return level === 2 ? "⚔️ War (1,000+ battle deaths/year)" : "⚠️ Minor conflict (25-999 deaths/year)";
}

function formatConflictsToMarkdown(
  country: string,
  conflicts: UcdpConflict[],
  recentEvents: UcdpGeoEvent[],
  mode: "current" | "past"
): string {
  if (mode === "current") {
    return formatCurrentConflicts(country, conflicts, recentEvents);
  }
  return formatHistoricalConflicts(country, conflicts);
}

function formatCurrentConflicts(
  country: string,
  conflicts: UcdpConflict[],
  recentEvents: UcdpGeoEvent[]
): string {
  // Get most recent year for each conflict
  const conflictMap = new Map<number, UcdpConflict>();
  for (const c of conflicts) {
    const existing = conflictMap.get(c.conflict_id);
    if (!existing || c.year > existing.year) {
      conflictMap.set(c.conflict_id, c);
    }
  }

  // Active conflicts = last observation year >= 2020 AND not ended
  const active = Array.from(conflictMap.values())
    .filter((c) => c.year >= 2020 && c.ep_end === 0)
    .sort((a, b) => b.year - a.year);

  // Recent ended = ended after 2015
  const recentEnded = Array.from(conflictMap.values())
    .filter((c) => c.ep_end === 1 && c.year >= 2015)
    .sort((a, b) => b.year - a.year);

  let md = "";

  if (active.length === 0 && recentEnded.length === 0) {
    md += `No active or recently ended armed conflicts recorded for ${country} in the UCDP database (2020-present).\n\n`;
    md += `*Note: UCDP tracks conflicts with 25+ battle-related deaths per year. Lower-level tensions may not be listed.*\n`;
    return md;
  }

  if (active.length > 0) {
    md += `### 🔴 Active Conflicts\n\n`;
    for (const c of active) {
      md += `**${c.side_a} vs. ${c.side_b}**\n`;
      md += `- Type: ${conflictTypeName(c.type_of_conflict)}\n`;
      md += `- Intensity: ${intensityLabel(c.intensity_level)}\n`;
      md += `- Dispute over: ${c.incompatibility === 1 ? `Territory (${c.territory_name || "unspecified"})` : c.incompatibility === 2 ? "Government" : "Territory & Government"}\n`;
      md += `- Started: ${c.start_date || "Unknown"}\n`;
      if (c.side_a_2nd) md += `- Allies (Side A): ${c.side_a_2nd}\n`;
      if (c.side_b_2nd) md += `- Allies (Side B): ${c.side_b_2nd}\n`;
      md += `- Last recorded year: ${c.year}\n\n`;
    }
  }

  if (recentEnded.length > 0) {
    md += `### 🟡 Recently Ended Conflicts (since 2015)\n\n`;
    for (const c of recentEnded) {
      md += `**${c.side_a} vs. ${c.side_b}** — ended ${c.ep_end_date || c.year}\n`;
      md += `- Type: ${conflictTypeName(c.type_of_conflict)}\n`;
      md += `- Dispute: ${c.incompatibility === 1 ? `Territory (${c.territory_name || "unspecified"})` : "Government"}\n\n`;
    }
  }

  // Add recent events summary
  if (recentEvents.length > 0) {
    const totalDeaths = recentEvents.reduce((sum, e) => sum + (e.best || 0), 0);
    const civilianDeaths = recentEvents.reduce((sum, e) => sum + (e.deaths_civilians || 0), 0);

    md += `### 📊 Recent Incident Data\n\n`;
    md += `**${recentEvents.length} recorded incidents** with an estimated **${totalDeaths.toLocaleString()} fatalities** (${civilianDeaths.toLocaleString()} civilian).\n\n`;

    // Show top 5 most recent/deadliest
    const topEvents = [...recentEvents]
      .sort((a, b) => b.best - a.best)
      .slice(0, 5);

    md += `| Date | Location | Type | Deaths |\n`;
    md += `|------|----------|------|--------|\n`;
    for (const e of topEvents) {
      const date = e.date_start?.split("T")[0] || e.year.toString();
      md += `| ${date} | ${e.where_description || e.country} | ${violenceTypeName(e.type_of_violence)} | ${e.best} |\n`;
    }
    md += `\n`;
  }

  md += `\n*Source: Uppsala Conflict Data Program (UCDP) — ucdp.uu.se*\n`;
  return md;
}

function formatHistoricalConflicts(
  country: string,
  conflicts: UcdpConflict[]
): string {
  // Group by conflict_id, get full timeline
  const conflictMap = new Map<number, UcdpConflict[]>();
  for (const c of conflicts) {
    const arr = conflictMap.get(c.conflict_id) || [];
    arr.push(c);
    conflictMap.set(c.conflict_id, arr);
  }

  if (conflictMap.size === 0) {
    return `No armed conflicts recorded for ${country} in the UCDP database (1946-present).\n\n*The UCDP tracks conflicts with at least 25 battle-related deaths per year.*\n`;
  }

  let md = `### Historical Armed Conflicts\n\n`;
  md += `${country} has been involved in **${conflictMap.size} recorded armed conflicts** since 1946.\n\n`;

  // Sort conflicts by earliest year
  const sorted = Array.from(conflictMap.entries()).sort((a, b) => {
    const minA = Math.min(...a[1].map((c) => c.year));
    const minB = Math.min(...b[1].map((c) => c.year));
    return minB - minA; // Most recent first
  });

  for (const [, records] of sorted) {
    const years = records.map((r) => r.year).sort();
    const first = records[0];
    const latest = records.reduce((a, b) => (a.year > b.year ? a : b));

    const yearRange = years.length === 1
      ? `${years[0]}`
      : `${years[0]}–${years[years.length - 1]}`;

    const maxIntensity = Math.max(...records.map((r) => r.intensity_level));
    const status = latest.ep_end === 0 ? "🔴 Ongoing" : "✅ Ended";

    md += `**${first.side_a} vs. ${first.side_b}** (${yearRange})\n`;
    md += `- ${status} · ${conflictTypeName(first.type_of_conflict)}\n`;
    md += `- Peak intensity: ${maxIntensity === 2 ? "War (1,000+ deaths/year)" : "Minor armed conflict"}\n`;
    md += `- Dispute: ${first.incompatibility === 1 ? `Territory${first.territory_name ? ` (${first.territory_name})` : ""}` : first.incompatibility === 2 ? "Government" : "Territory & Government"}\n`;
    md += `- Active years: ${years.length} (${yearRange})\n`;
    if (first.side_a_2nd || first.side_b_2nd) {
      if (first.side_a_2nd) md += `- External support (Side A): ${first.side_a_2nd}\n`;
      if (first.side_b_2nd) md += `- External support (Side B): ${first.side_b_2nd}\n`;
    }
    md += `\n`;
  }

  md += `*Source: Uppsala Conflict Data Program (UCDP) — ucdp.uu.se*\n`;
  return md;
}

// --- Public API ---

export type ConflictStreamChunk = {
  type: "current_content" | "current_sources" | "past_content" | "past_sources" | "done" | "error";
  content?: string;
  sources?: Array<{ title: string; url: string }>;
  error?: string;
};

export async function* streamCountryConflictsUCDP(
  country: string
): AsyncGenerator<ConflictStreamChunk> {
  const gwCode = getCountryCode(country);

  if (!gwCode) {
    // If we don't have a GW code, try searching by name in UCDP
    yield {
      type: "error",
      error: `Country "${country}" not found in the UCDP database. Try using the common English name.`,
    };
    return;
  }

  try {
    // Fetch conflicts and recent events in parallel
    const twoYearsAgo = new Date();
    twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);
    const startDate = twoYearsAgo.toISOString().split("T")[0];

    const [conflicts, recentEvents] = await Promise.all([
      fetchUcdpConflicts(gwCode),
      fetchUcdpRecentEvents(gwCode, startDate),
    ]);

    // Stream current conflicts
    const currentMd = formatConflictsToMarkdown(country, conflicts, recentEvents, "current");
    yield { type: "current_content", content: currentMd };
    yield {
      type: "current_sources",
      sources: [
        { title: "UCDP Conflict Encyclopedia", url: "https://ucdp.uu.se/encyclopedia" },
        { title: `UCDP Country Page: ${country}`, url: `https://ucdp.uu.se/country/${gwCode}` },
        { title: "UCDP API Documentation", url: "https://ucdp.uu.se/apidocs/" },
      ],
    };

    // Stream historical conflicts
    const pastMd = formatConflictsToMarkdown(country, conflicts, [], "past");
    yield { type: "past_content", content: pastMd };
    yield {
      type: "past_sources",
      sources: [
        { title: "UCDP/PRIO Armed Conflict Dataset", url: "https://ucdp.uu.se/downloads/" },
        { title: `UCDP Country: ${country}`, url: `https://ucdp.uu.se/country/${gwCode}` },
      ],
    };

    yield { type: "done" };
  } catch (error) {
    yield {
      type: "error",
      error: error instanceof Error ? error.message : "Failed to fetch conflict data from UCDP",
    };
  }
}

export async function getCountryConflictsUCDP(country: string) {
  const gwCode = getCountryCode(country);

  if (!gwCode) {
    return {
      past: { answer: `Country "${country}" not found in the UCDP database.`, sources: [] },
      current: { answer: `Country "${country}" not found in the UCDP database.`, sources: [] },
    };
  }

  const twoYearsAgo = new Date();
  twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);
  const startDate = twoYearsAgo.toISOString().split("T")[0];

  const [conflicts, recentEvents] = await Promise.all([
    fetchUcdpConflicts(gwCode),
    fetchUcdpRecentEvents(gwCode, startDate),
  ]);

  return {
    current: {
      answer: formatConflictsToMarkdown(country, conflicts, recentEvents, "current"),
      sources: [
        { title: "UCDP Conflict Encyclopedia", url: "https://ucdp.uu.se/encyclopedia" },
        { title: `UCDP Country: ${country}`, url: `https://ucdp.uu.se/country/${gwCode}` },
      ],
    },
    past: {
      answer: formatConflictsToMarkdown(country, conflicts, [], "past"),
      sources: [
        { title: "UCDP/PRIO Armed Conflict Dataset", url: "https://ucdp.uu.se/downloads/" },
        { title: `UCDP Country: ${country}`, url: `https://ucdp.uu.se/country/${gwCode}` },
      ],
    },
  };
}
