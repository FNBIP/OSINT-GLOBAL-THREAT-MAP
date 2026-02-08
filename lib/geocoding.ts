import type { GeoLocation } from "@/types";
import OpenAI from "openai";

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

// Use the cheapest model available - gpt-4.1-nano at $0.02/1M input, $0.15/1M output
const OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-4.1-nano";

// Initialize OpenAI client only if API key is available
const openai = OPENAI_API_KEY ? new OpenAI({ apiKey: OPENAI_API_KEY }) : null;

// Blacklist of words that are often incorrectly extracted as locations
const LOCATION_BLACKLIST = new Set([
  // Common non-location words that get falsely matched
  "National",
  "International",
  "Global",
  "Federal",
  "State",
  "Regional",
  "Local",
  "Central",
  "Western",
  "Eastern",
  "Northern",
  "Southern",
  "United",
  "Democratic",
  "Republic",
  "People",
  "Supreme",
  "Royal",
  "Imperial",
  // Organizations and titles
  "President",
  "Minister",
  "Secretary",
  "Director",
  "General",
  "Admiral",
  "Colonel",
  "Major",
  "Captain",
  "Chief",
  "Head",
  "Leader",
  "Chairman",
  "CEO",
  "DOJ",
  "FBI",
  "CIA",
  "NSA",
  "NATO",
  "OPEC",
  "ASEAN",
  "WHO",
  "IMF",
  // Common false positives from news
  "Breaking",
  "Update",
  "Alert",
  "Report",
  "Analysis",
  "Opinion",
  "Editorial",
  "Exclusive",
  "Live",
  "Watch",
  "Video",
  "Photo",
  "Image",
  // Days and time
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
  // Religious/cultural
  "Church",
  "Mosque",
  "Temple",
  "Synagogue",
  "Cathedral",
  "Chapel",
  // Generic descriptors
  "First",
  "Second",
  "Third",
  "Last",
  "New",
  "Old",
  "Great",
  "Big",
  "Small",
  "High",
  "Low",
  "Top",
  "Bottom",
  // Common false positives from Mapbox geocoding
  "Cyber",
  "Security",
  "South",
  "North",
  "East",
  "West",
  "Border",
  "Apps",
  "The",
  "This",
  "That",
  "Which",
  "Where",
  "When",
  "What",
  "How",
  "Who",
  "Why",
  "Also",
  "More",
  "Most",
  "Some",
  "Many",
  "Much",
  "Very",
  "Just",
  "Only",
  "Still",
  "Even",
  "Back",
  "Down",
  "Over",
  "After",
  "Before",
  "Between",
  "About",
  "Against",
  "Through",
  "During",
  "Without",
  "Within",
  "Along",
  "Following",
  "Around",
  "Since",
  "Among",
]);

// Improved regex patterns for location extraction
const LOCATION_PATTERNS = [
  // City, State/Country format (e.g., "Minneapolis, Minnesota" or "Paris, France")
  /\b([A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+)?),\s+([A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+)?)\b/g,
  // Location after prepositions with stricter matching
  /\b(?:in|at|near|from|across|throughout)\s+([A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+){0,2})\b/g,
  // "X city" or "X region" patterns
  /\b([A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+)?)\s+(?:city|region|province|state|county|district|territory|area)\b/gi,
  // "[Location] attack/bombing/explosion/protest" patterns
  /\b([A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+)?)\s+(?:attack|bombing|explosion|protest|riot|uprising|conflict|war|battle|siege)\b/gi,
  // "attack/bombing/explosion in [Location]" patterns
  /\b(?:attack|bombing|explosion|protest|riot|uprising|conflict|clashes?|fighting|violence)\s+(?:in|at|near)\s+([A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+)?)\b/gi,
  // Government/military patterns
  /\b([A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+)?)\s+(?:government|military|forces|officials|authorities|troops|army|navy|police)\b/gi,
  // "The [Location] [noun]" pattern for country references
  /\bthe\s+([A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+)?)\s+(?:government|president|prime\s+minister|administration|military|army)\b/gi,
];

// In-memory cache for geocoding results (avoids repeated Mapbox API calls)
const geocodeCache = new Map<string, GeoLocation | null>();

// Extended known locations with more cities and regions
const KNOWN_LOCATIONS: Record<
  string,
  { lat: number; lng: number; country: string }
> = {
  // Major conflict zones
  Ukraine: { lat: 48.3794, lng: 31.1656, country: "Ukraine" },
  Kyiv: { lat: 50.4501, lng: 30.5234, country: "Ukraine" },
  Kharkiv: { lat: 49.9935, lng: 36.2304, country: "Ukraine" },
  Mariupol: { lat: 47.0951, lng: 37.5497, country: "Ukraine" },
  Odesa: { lat: 46.4825, lng: 30.7233, country: "Ukraine" },
  Crimea: { lat: 44.9521, lng: 34.1024, country: "Ukraine" },
  Donbas: { lat: 48.0159, lng: 37.8028, country: "Ukraine" },
  Moscow: { lat: 55.7558, lng: 37.6173, country: "Russia" },
  Russia: { lat: 61.524, lng: 105.3188, country: "Russia" },
  "St. Petersburg": { lat: 59.9311, lng: 30.3609, country: "Russia" },

  // Middle East
  Gaza: { lat: 31.3547, lng: 34.3088, country: "Palestine" },
  "West Bank": { lat: 31.9474, lng: 35.2272, country: "Palestine" },
  Israel: { lat: 31.0461, lng: 34.8516, country: "Israel" },
  Jerusalem: { lat: 31.7683, lng: 35.2137, country: "Israel" },
  "Tel Aviv": { lat: 32.0853, lng: 34.7818, country: "Israel" },
  Tehran: { lat: 35.6892, lng: 51.389, country: "Iran" },
  Iran: { lat: 32.4279, lng: 53.688, country: "Iran" },
  Syria: { lat: 34.8021, lng: 38.9968, country: "Syria" },
  Damascus: { lat: 33.5138, lng: 36.2765, country: "Syria" },
  Aleppo: { lat: 36.2021, lng: 37.1343, country: "Syria" },
  Yemen: { lat: 15.5527, lng: 48.5164, country: "Yemen" },
  Sanaa: { lat: 15.3694, lng: 44.191, country: "Yemen" },
  Iraq: { lat: 33.2232, lng: 43.6793, country: "Iraq" },
  Baghdad: { lat: 33.3152, lng: 44.3661, country: "Iraq" },
  Lebanon: { lat: 33.8547, lng: 35.8623, country: "Lebanon" },
  Beirut: { lat: 33.8938, lng: 35.5018, country: "Lebanon" },
  Jordan: { lat: 30.5852, lng: 36.2384, country: "Jordan" },
  Amman: { lat: 31.9454, lng: 35.9284, country: "Jordan" },
  "Saudi Arabia": { lat: 23.8859, lng: 45.0792, country: "Saudi Arabia" },
  Riyadh: { lat: 24.7136, lng: 46.6753, country: "Saudi Arabia" },

  // Asia
  Beijing: { lat: 39.9042, lng: 116.4074, country: "China" },
  China: { lat: 35.8617, lng: 104.1954, country: "China" },
  Shanghai: { lat: 31.2304, lng: 121.4737, country: "China" },
  "Hong Kong": { lat: 22.3193, lng: 114.1694, country: "China" },
  Taiwan: { lat: 23.6978, lng: 120.9605, country: "Taiwan" },
  Taipei: { lat: 25.033, lng: 121.5654, country: "Taiwan" },
  "North Korea": { lat: 40.3399, lng: 127.5101, country: "North Korea" },
  Pyongyang: { lat: 39.0392, lng: 125.7625, country: "North Korea" },
  "South Korea": { lat: 35.9078, lng: 127.7669, country: "South Korea" },
  Seoul: { lat: 37.5665, lng: 126.978, country: "South Korea" },
  Japan: { lat: 36.2048, lng: 138.2529, country: "Japan" },
  Tokyo: { lat: 35.6762, lng: 139.6503, country: "Japan" },
  India: { lat: 20.5937, lng: 78.9629, country: "India" },
  "New Delhi": { lat: 28.6139, lng: 77.209, country: "India" },
  Mumbai: { lat: 19.076, lng: 72.8777, country: "India" },
  Pakistan: { lat: 30.3753, lng: 69.3451, country: "Pakistan" },
  Islamabad: { lat: 33.6844, lng: 73.0479, country: "Pakistan" },
  Afghanistan: { lat: 33.9391, lng: 67.71, country: "Afghanistan" },
  Kabul: { lat: 34.5553, lng: 69.2075, country: "Afghanistan" },
  Myanmar: { lat: 21.9162, lng: 95.956, country: "Myanmar" },
  Philippines: { lat: 12.8797, lng: 121.774, country: "Philippines" },
  Manila: { lat: 14.5995, lng: 120.9842, country: "Philippines" },

  // Africa
  Sudan: { lat: 12.8628, lng: 30.2176, country: "Sudan" },
  Khartoum: { lat: 15.5007, lng: 32.5599, country: "Sudan" },
  Ethiopia: { lat: 9.145, lng: 40.4897, country: "Ethiopia" },
  "Addis Ababa": { lat: 8.9806, lng: 38.7578, country: "Ethiopia" },
  Somalia: { lat: 5.1521, lng: 46.1996, country: "Somalia" },
  Mogadishu: { lat: 2.0469, lng: 45.3182, country: "Somalia" },
  Nigeria: { lat: 9.082, lng: 8.6753, country: "Nigeria" },
  Lagos: { lat: 6.5244, lng: 3.3792, country: "Nigeria" },
  "South Africa": { lat: -30.5595, lng: 22.9375, country: "South Africa" },
  Johannesburg: { lat: -26.2041, lng: 28.0473, country: "South Africa" },
  Egypt: { lat: 26.8206, lng: 30.8025, country: "Egypt" },
  Cairo: { lat: 30.0444, lng: 31.2357, country: "Egypt" },
  Libya: { lat: 26.3351, lng: 17.2283, country: "Libya" },
  Tripoli: { lat: 32.8872, lng: 13.1913, country: "Libya" },
  Tunisia: { lat: 33.8869, lng: 9.5375, country: "Tunisia" },
  Morocco: { lat: 31.7917, lng: -7.0926, country: "Morocco" },
  Algeria: { lat: 28.0339, lng: 1.6596, country: "Algeria" },
  Kenya: { lat: -0.0236, lng: 37.9062, country: "Kenya" },
  Nairobi: { lat: -1.2921, lng: 36.8219, country: "Kenya" },
  "Democratic Republic of Congo": { lat: -4.0383, lng: 21.7587, country: "DRC" },
  DRC: { lat: -4.0383, lng: 21.7587, country: "DRC" },
  Congo: { lat: -4.0383, lng: 21.7587, country: "DRC" },

  // Americas
  "United States": { lat: 37.0902, lng: -95.7129, country: "United States" },
  USA: { lat: 37.0902, lng: -95.7129, country: "United States" },
  Washington: { lat: 38.9072, lng: -77.0369, country: "United States" },
  "Washington DC": { lat: 38.9072, lng: -77.0369, country: "United States" },
  "New York": { lat: 40.7128, lng: -74.006, country: "United States" },
  "Los Angeles": { lat: 34.0522, lng: -118.2437, country: "United States" },
  Chicago: { lat: 41.8781, lng: -87.6298, country: "United States" },
  Houston: { lat: 29.7604, lng: -95.3698, country: "United States" },
  Miami: { lat: 25.7617, lng: -80.1918, country: "United States" },
  Minneapolis: { lat: 44.9778, lng: -93.265, country: "United States" },
  Minnesota: { lat: 46.7296, lng: -94.6859, country: "United States" },
  Texas: { lat: 31.9686, lng: -99.9018, country: "United States" },
  California: { lat: 36.7783, lng: -119.4179, country: "United States" },
  Florida: { lat: 27.6648, lng: -81.5158, country: "United States" },
  Georgia: { lat: 32.1656, lng: -82.9001, country: "United States" },
  Ohio: { lat: 40.4173, lng: -82.9071, country: "United States" },
  Michigan: { lat: 44.3148, lng: -85.6024, country: "United States" },
  Illinois: { lat: 40.6331, lng: -89.3985, country: "United States" },
  Pennsylvania: { lat: 41.2033, lng: -77.1945, country: "United States" },
  "New Jersey": { lat: 40.0583, lng: -74.4057, country: "United States" },
  Virginia: { lat: 37.4316, lng: -78.6569, country: "United States" },
  Oregon: { lat: 43.8041, lng: -120.5542, country: "United States" },
  Colorado: { lat: 39.5501, lng: -105.7821, country: "United States" },
  Arizona: { lat: 34.0489, lng: -111.0937, country: "United States" },
  Venezuela: { lat: 6.4238, lng: -66.5897, country: "Venezuela" },
  Caracas: { lat: 10.4806, lng: -66.9036, country: "Venezuela" },
  Brazil: { lat: -14.235, lng: -51.9253, country: "Brazil" },
  "Sao Paulo": { lat: -23.5505, lng: -46.6333, country: "Brazil" },
  Mexico: { lat: 23.6345, lng: -102.5528, country: "Mexico" },
  "Mexico City": { lat: 19.4326, lng: -99.1332, country: "Mexico" },
  Colombia: { lat: 4.5709, lng: -74.2973, country: "Colombia" },
  Bogota: { lat: 4.711, lng: -74.0721, country: "Colombia" },
  Argentina: { lat: -38.4161, lng: -63.6167, country: "Argentina" },
  "Buenos Aires": { lat: -34.6037, lng: -58.3816, country: "Argentina" },
  Chile: { lat: -35.6751, lng: -71.543, country: "Chile" },
  Santiago: { lat: -33.4489, lng: -70.6693, country: "Chile" },
  Peru: { lat: -9.19, lng: -75.0152, country: "Peru" },
  Lima: { lat: -12.0464, lng: -77.0428, country: "Peru" },
  Canada: { lat: 56.1304, lng: -106.3468, country: "Canada" },
  Ottawa: { lat: 45.4215, lng: -75.6972, country: "Canada" },
  Toronto: { lat: 43.6532, lng: -79.3832, country: "Canada" },

  // Europe
  "United Kingdom": { lat: 55.3781, lng: -3.436, country: "United Kingdom" },
  UK: { lat: 55.3781, lng: -3.436, country: "United Kingdom" },
  Britain: { lat: 55.3781, lng: -3.436, country: "United Kingdom" },
  London: { lat: 51.5074, lng: -0.1278, country: "United Kingdom" },
  France: { lat: 46.2276, lng: 2.2137, country: "France" },
  Paris: { lat: 48.8566, lng: 2.3522, country: "France" },
  Germany: { lat: 51.1657, lng: 10.4515, country: "Germany" },
  Berlin: { lat: 52.52, lng: 13.405, country: "Germany" },
  Italy: { lat: 41.8719, lng: 12.5674, country: "Italy" },
  Rome: { lat: 41.9028, lng: 12.4964, country: "Italy" },
  Spain: { lat: 40.4637, lng: -3.7492, country: "Spain" },
  Madrid: { lat: 40.4168, lng: -3.7038, country: "Spain" },
  Poland: { lat: 51.9194, lng: 19.1451, country: "Poland" },
  Warsaw: { lat: 52.2297, lng: 21.0122, country: "Poland" },
  Turkey: { lat: 38.9637, lng: 35.2433, country: "Turkey" },
  Ankara: { lat: 39.9334, lng: 32.8597, country: "Turkey" },
  Istanbul: { lat: 41.0082, lng: 28.9784, country: "Turkey" },
  Greece: { lat: 39.0742, lng: 21.8243, country: "Greece" },
  Athens: { lat: 37.9838, lng: 23.7275, country: "Greece" },
  Serbia: { lat: 44.0165, lng: 21.0059, country: "Serbia" },
  Belgrade: { lat: 44.7866, lng: 20.4489, country: "Serbia" },
  Kosovo: { lat: 42.6026, lng: 20.903, country: "Kosovo" },
  Pristina: { lat: 42.6629, lng: 21.1655, country: "Kosovo" },
  Belarus: { lat: 53.7098, lng: 27.9534, country: "Belarus" },
  Minsk: { lat: 53.9006, lng: 27.559, country: "Belarus" },

  // Oceania
  Australia: { lat: -25.2744, lng: 133.7751, country: "Australia" },
  Sydney: { lat: -33.8688, lng: 151.2093, country: "Australia" },
  Melbourne: { lat: -37.8136, lng: 144.9631, country: "Australia" },
  "New Zealand": { lat: -40.9006, lng: 174.886, country: "New Zealand" },
  Wellington: { lat: -41.2865, lng: 174.7762, country: "New Zealand" },
};

/**
 * Extract potential location names from text using improved regex patterns.
 * Returns locations ranked by relevance:
 * 1. Locations after action words ("attack in X", "bombing in X") — most likely the event site
 * 2. Locations after prepositions ("in X", "at X", "near X")
 * 3. Known locations found in text
 * 4. Other regex matches
 */
export function extractLocationsFromText(text: string): string[] {
  // Track locations with a priority score (lower = higher priority)
  const locationScores = new Map<string, number>();

  function addCandidate(name: string, priority: number) {
    if (!name || name.length < 3) return;
    if (LOCATION_BLACKLIST.has(name)) return;
    if (name.length <= 4 && name === name.toUpperCase()) return; // skip acronyms
    const existing = locationScores.get(name);
    if (existing === undefined || priority < existing) {
      locationScores.set(name, priority);
    }
  }

  // Priority 1: Locations after action/event words (most likely the physical event site)
  // "attack in Gaza", "bombing in Kharkiv", "explosion in Beirut"
  const actionPattern = /\b(?:attack|bombing|explosion|protest|riot|uprising|conflict|clashes?|fighting|violence|strikes?|shelling|assault)\s+(?:in|at|near|on)\s+([A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+){0,2})\b/gi;
  let match;
  while ((match = actionPattern.exec(text)) !== null) {
    addCandidate(match[1]?.trim(), 1);
  }

  // Priority 2: "[Location] attack/bombing" pattern
  const locationActionPattern = /\b([A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+)?)\s+(?:attack|bombing|explosion|protest|riot|uprising|conflict|war|battle|siege|strikes?|shelling)\b/gi;
  while ((match = locationActionPattern.exec(text)) !== null) {
    addCandidate(match[1]?.trim(), 2);
  }

  // Priority 3: Locations after prepositions (often indicate the event site)
  const prepPattern = /\b(?:in|at|near|from|across|throughout)\s+([A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+){0,2})\b/g;
  while ((match = prepPattern.exec(text)) !== null) {
    addCandidate(match[1]?.trim(), 3);
  }

  // Priority 4: Known locations found anywhere in text
  Object.keys(KNOWN_LOCATIONS).forEach((location) => {
    const regex = new RegExp(`\\b${location.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i");
    if (regex.test(text)) {
      addCandidate(location, 4);
    }
  });

  // Priority 5: City, State/Country format
  const cityStatePattern = /\b([A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+)?),\s+([A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+)?)\b/g;
  while ((match = cityStatePattern.exec(text)) !== null) {
    addCandidate(match[1]?.trim(), 5);
  }

  // Priority 6: Other patterns (government/military references — these may not be the event site)
  const govPattern = /\b([A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+)?)\s+(?:government|military|forces|officials|authorities|troops|army|navy|police)\b/gi;
  while ((match = govPattern.exec(text)) !== null) {
    addCandidate(match[1]?.trim(), 6);
  }

  // Sort by priority score, then return
  const sorted = Array.from(locationScores.entries())
    .sort((a, b) => a[1] - b[1])
    .map(([name]) => name);

  return sorted;
}

/**
 * Use OpenAI to extract the most relevant location from text
 * Returns null if OpenAI is not configured or fails
 */
async function extractLocationWithAI(
  title: string,
  regexCandidates: string[]
): Promise<string | null> {
  if (!openai) {
    return null;
  }

  const candidatesText =
    regexCandidates.length > 0
      ? `\nPotential locations found: ${regexCandidates.join(", ")}`
      : "";

  try {
    const response = await openai.chat.completions.create({
      model: OPENAI_MODEL,
      messages: [
        {
          role: "system",
          content: `You are a location extraction assistant. Given a news headline and optional location candidates, identify the PRIMARY geographic location where the event PHYSICALLY happened on the ground.

RULES:
- Extract WHERE the event occurred, NOT where it was discussed or reported from.
- "Biden discusses Ukraine at White House" → "Ukraine" (the conflict location), NOT "Washington"
- "U.S. condemns Syria attack" → "Syria" (where the attack happened)
- If multiple locations are candidates, pick the one where the physical event took place.
- Be as specific as possible: prefer "Kharkiv, Ukraine" over just "Ukraine".
- Respond with ONLY the location name, nothing else.
- If no clear physical location can be determined, respond with "UNKNOWN".`,
        },
        {
          role: "user",
          content: `Headline: "${title}"${candidatesText}\n\nWhere did this event physically happen?`,
        },
      ],
      max_tokens: 50,
      temperature: 0,
    });

    const result = response.choices[0]?.message?.content?.trim();

    if (result && result !== "UNKNOWN" && result.length > 1) {
      return result;
    }

    return null;
  } catch (error) {
    console.error("OpenAI location extraction error:", error);
    return null;
  }
}

/**
 * Look up what country a city/place belongs to in KNOWN_LOCATIONS.
 * Used by ai-classifier.ts for city/country consistency validation.
 */
export function getKnownLocationCountry(name: string): string | null {
  const trimmed = name.trim();
  const direct = KNOWN_LOCATIONS[trimmed];
  if (direct) return direct.country;

  const knownKey = Object.keys(KNOWN_LOCATIONS).find(
    (key) => key.toLowerCase() === trimmed.toLowerCase()
  );
  if (knownKey) return KNOWN_LOCATIONS[knownKey].country;

  return null;
}

/**
 * Look up a place name in KNOWN_LOCATIONS (case-insensitive)
 */
function lookupKnownLocation(name: string): GeoLocation | null {
  const trimmed = name.trim();
  const direct = KNOWN_LOCATIONS[trimmed];
  if (direct) {
    return {
      latitude: direct.lat,
      longitude: direct.lng,
      placeName: trimmed,
      country: direct.country,
    };
  }

  const knownKey = Object.keys(KNOWN_LOCATIONS).find(
    (key) => key.toLowerCase() === trimmed.toLowerCase()
  );
  if (knownKey) {
    const loc = KNOWN_LOCATIONS[knownKey];
    return {
      latitude: loc.lat,
      longitude: loc.lng,
      placeName: knownKey,
      country: loc.country,
    };
  }

  return null;
}

/**
 * Geocode a location name to coordinates.
 * Handles compound queries like "Kyiv, Kyiv Oblast, Ukraine" by trying each
 * comma-separated component against KNOWN_LOCATIONS before hitting Mapbox.
 * Results are cached in-memory to avoid duplicate API calls.
 */
export async function geocodeLocation(
  placeName: string
): Promise<GeoLocation | null> {
  // Check cache first
  if (geocodeCache.has(placeName)) {
    return geocodeCache.get(placeName)!;
  }

  // Try exact match against known locations
  const exactMatch = lookupKnownLocation(placeName);
  if (exactMatch) {
    geocodeCache.set(placeName, exactMatch);
    return exactMatch;
  }

  // For compound queries like "Kyiv, Kyiv Oblast, Ukraine",
  // try each component against known locations (most specific first)
  if (placeName.includes(",")) {
    const parts = placeName.split(",").map((p) => p.trim());
    for (const part of parts) {
      const match = lookupKnownLocation(part);
      if (match) {
        geocodeCache.set(placeName, match);
        return match;
      }
    }
  }

  // Fall back to Mapbox geocoding
  if (!MAPBOX_TOKEN) {
    console.warn("Mapbox token not available for geocoding");
    geocodeCache.set(placeName, null);
    return null;
  }

  try {
    // Request multiple results to pick the best match for ambiguous place names
    const response = await fetch(
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(placeName)}.json?access_token=${MAPBOX_TOKEN}&limit=3&types=place,region,country`
    );

    if (!response.ok) {
      throw new Error(`Geocoding failed: ${response.statusText}`);
    }

    const data = await response.json();

    if (data.features && data.features.length > 0) {
      // Pick the best feature: prefer place > region > country type
      // and prefer results with higher relevance scores
      let bestFeature = data.features[0];

      // If the query contains a comma (e.g. "Kharkiv, Ukraine"), try to match
      // the country part against the results to pick the right one
      if (placeName.includes(",")) {
        const parts = placeName.split(",").map((p: string) => p.trim().toLowerCase());
        const countryHint = parts[parts.length - 1];

        for (const feature of data.features) {
          const featureCountry = feature.context?.find((c: { id: string }) =>
            c.id.startsWith("country")
          )?.text?.toLowerCase();
          const featureText = feature.text?.toLowerCase();

          if (featureCountry === countryHint || featureText === countryHint) {
            bestFeature = feature;
            break;
          }
        }
      }

      const [longitude, latitude] = bestFeature.center;

      let country: string | undefined;
      if (bestFeature.context) {
        const countryContext = bestFeature.context.find((c: { id: string }) =>
          c.id.startsWith("country")
        );
        if (countryContext) {
          country = countryContext.text;
        }
      }

      // If the feature itself is a country
      if (!country && bestFeature.place_type?.includes("country")) {
        country = bestFeature.text;
      }

      const result: GeoLocation = {
        latitude,
        longitude,
        placeName: bestFeature.text || placeName,
        country,
        region: bestFeature.region,
      };
      geocodeCache.set(placeName, result);
      return result;
    }

    geocodeCache.set(placeName, null);
    return null;
  } catch (error) {
    console.error("Geocoding error:", error);
    return null;
  }
}

/**
 * Extract and geocode locations from text
 * Uses AI enhancement if OpenAI is configured, otherwise falls back to regex-only
 */
export async function geocodeLocationsFromText(
  text: string,
  title?: string,
  maxLocations = 3
): Promise<GeoLocation[]> {
  // Extract candidates using improved regex
  const regexCandidates = extractLocationsFromText(text);

  let primaryLocation: string | null = null;

  // If OpenAI is configured and we have a title, use AI to get the best location
  if (openai && title) {
    primaryLocation = await extractLocationWithAI(title, regexCandidates);
  }

  // Build final list of location names to geocode
  const locationNames: string[] = [];

  if (primaryLocation) {
    locationNames.push(primaryLocation);
  }

  // Add regex candidates that aren't already in the list
  for (const candidate of regexCandidates) {
    if (
      !locationNames.some(
        (loc) => loc.toLowerCase() === candidate.toLowerCase()
      )
    ) {
      locationNames.push(candidate);
    }
    if (locationNames.length >= maxLocations) break;
  }

  // Geocode each location
  const locations: GeoLocation[] = [];
  for (const name of locationNames.slice(0, maxLocations)) {
    const location = await geocodeLocation(name);
    if (location) {
      locations.push(location);
    }
  }

  return locations;
}

/**
 * Check if AI-enhanced location extraction is available
 */
export function isAILocationExtractionEnabled(): boolean {
  return !!openai;
}
