import OpenAI from "openai";
import { zodResponseFormat } from "openai/helpers/zod";
import { z } from "zod";
import type { EventCategory, ThreatLevel, GeoLocation } from "@/types";
import { geocodeLocation, extractLocationsFromText } from "./geocoding";
import {
  classifyCategory as keywordClassifyCategory,
  classifyThreatLevel as keywordClassifyThreatLevel,
} from "./event-classifier";
import { getKnownLocationCountry } from "./geocoding";

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-4.1-nano";

const openai = OPENAI_API_KEY ? new OpenAI({ apiKey: OPENAI_API_KEY }) : null;

// Zod schema for structured event classification
const EventClassificationSchema = z.object({
  category: z.enum([
    "conflict",
    "protest",
    "disaster",
    "diplomatic",
    "economic",
    "terrorism",
    "cyber",
    "health",
    "environmental",
    "military",
    "crime",
    "piracy",
    "infrastructure",
    "commodities",
  ]).describe("The primary category of the event"),
  threatLevel: z.enum(["critical", "high", "medium", "low", "info"]).describe(
    "Severity level: critical (imminent danger, mass casualties), high (significant threat), medium (developing situation), low (minor/contained), info (routine update)"
  ),
  primaryLocation: z.string().describe(
    "The MOST SPECIFIC geographic location where the event PHYSICALLY OCCURRED or IS PHYSICALLY HAPPENING. This must be the place on the ground where the incident took place, NOT where it was discussed, reported, or reacted to. Examples: 'Kharkiv, Ukraine' not 'Ukraine', 'Gaza City' not 'Gaza Strip', 'Port of Hodeidah, Yemen' not 'Yemen'."
  ),
  city: z.string().nullable().describe(
    "The city or town where the event physically occurred, null if not identifiable"
  ),
  region: z.string().nullable().describe(
    "The state, province, or region where the event physically occurred, null if not identifiable"
  ),
  country: z.string().nullable().describe(
    "The country where the event is PHYSICALLY occurring. NOT the country discussing/reacting to it."
  ),
  locationConfidence: z.enum(["high", "medium", "low"]).describe(
    "How confident you are about the physical location: high = specific city/place clearly stated in the article as the event site, medium = country is clear but exact city is inferred or ambiguous, low = location is unclear, multiple countries mentioned, or event is about policy/diplomacy with no single physical site"
  ),
});

type EventClassification = z.infer<typeof EventClassificationSchema>;

export interface ClassificationResult {
  category: EventCategory;
  threatLevel: ThreatLevel;
  location: GeoLocation | null;
}

/**
 * Classify an event using OpenAI structured outputs
 * Extracts category, threat level, and location in a single API call
 */
async function classifyWithAI(
  title: string,
  content: string
): Promise<EventClassification | null> {
  if (!openai) return null;

  try {
    const completion = await openai.chat.completions.parse({
      model: OPENAI_MODEL,
      messages: [
        {
          role: "system",
          content: `You are an intelligence analyst classifying global events. Your PRIMARY job is to determine WHERE an event PHYSICALLY happened on the ground.

CRITICAL LOCATION RULES - READ CAREFULLY:
1. PHYSICAL LOCATION ONLY: Extract the place where the event PHYSICALLY occurred — where bombs fell, where protesters gathered, where the earthquake struck, where the ship was attacked.
2. IGNORE REACTION LOCATIONS: If "Biden discusses Ukraine at White House" → location is Ukraine (where the conflict is), NOT Washington DC (where it was discussed).
3. IGNORE REPORTER LOCATIONS: If "CNN reports from London on Gaza strikes" → location is Gaza, NOT London.
4. MULTI-COUNTRY ARTICLES: If an article mentions multiple countries, identify which one is the PRIMARY physical event site. "U.S. condemns Syria chemical attack" → Syria.
5. DIPLOMATIC/POLICY EVENTS: For summits and meetings, use the location of the meeting itself. "G7 summit in Hiroshima discusses Ukraine" → Hiroshima, Japan.
6. CYBER EVENTS: Use the location of the TARGET, not the attacker. "Russian hackers breach U.S. infrastructure" → United States.
7. CITY MUST MATCH COUNTRY: If you extract a city, it MUST actually be located in the country you extract. Kharkiv is in Ukraine, not Russia. Sderot is in Israel, not Palestine.

LOCATION SPECIFICITY:
- Always extract the most specific location mentioned (city > region > country)
- Include the city name even for well-known locations (e.g., "Mariupol, Ukraine" not just "Ukraine")
- For military/naval events, specify the base, port, or installation name
- For maritime events, include coordinates or nearby port/coast if mentioned
- Never use vague terms like "Middle East" or "Europe" when a specific country/city is mentioned

CONFIDENCE SCORING:
- high: Article clearly states a specific city/place as the physical event location
- medium: Country is clear but city is inferred, or article is somewhat ambiguous about exact location
- low: Location is genuinely unclear, event spans multiple countries equally, or it's a pure policy/diplomatic piece with no clear physical site

Categories:
- conflict: armed conflicts, wars, military clashes
- protest: demonstrations, civil unrest, riots
- disaster: natural disasters, earthquakes, floods, hurricanes, wildfires
- diplomatic: international relations, treaties, sanctions
- economic: financial markets, trade, economic crises
- terrorism: terror attacks, bombings, extremist violence
- cyber: cyberattacks, data breaches, hacking
- health: disease outbreaks, pandemics, public health emergencies
- environmental: climate events, pollution, environmental damage
- military: military exercises, deployments, defense activities
- crime: murders, kidnappings, drug trafficking, shootings, organized crime
- piracy: maritime piracy, shipping attacks, hijacking at sea
- infrastructure: water reservoir levels, power grid, utilities, dams
- commodities: grocery prices, food supply, commodity shortages

For threat level:
- critical: imminent danger, mass casualties, nuclear/WMD threats
- high: significant active threats, major incidents, escalating situations
- medium: developing situations, moderate concern, ongoing tensions
- low: minor incidents, contained events, localized issues
- info: routine updates, announcements, analysis pieces`,
        },
        {
          role: "user",
          content: `Headline: ${title}\n\nContent: ${content.slice(0, 1500)}`,
        },
      ],
      response_format: zodResponseFormat(EventClassificationSchema, "event_classification"),
      max_tokens: 250,
      temperature: 0,
    });

    const message = completion.choices[0]?.message;
    if (message?.parsed) {
      return message.parsed;
    }

    return null;
  } catch (error) {
    console.error("AI classification error:", error);
    return null;
  }
}

/**
 * Classify an event - uses AI if available, falls back to keyword matching
 * Returns category, threat level, and geocoded location
 */
export async function classifyEvent(
  title: string,
  content: string
): Promise<ClassificationResult> {
  const fullText = `${title} ${content}`;

  // Try AI classification first
  const aiResult = await classifyWithAI(title, content);

  if (aiResult) {
    // Check confidence — if low, don't try to force a location
    if (aiResult.locationConfidence === "low") {
      // For low-confidence locations, only proceed if we have a specific city
      if (!aiResult.city) {
        return {
          category: aiResult.category as EventCategory,
          threatLevel: aiResult.threatLevel as ThreatLevel,
          location: null, // Drop it rather than guess wrong
        };
      }
    }

    // Validate city/country consistency
    let correctedCountry = aiResult.country;
    if (aiResult.city && aiResult.country) {
      const knownCountry = getKnownLocationCountry(aiResult.city);
      if (knownCountry && knownCountry.toLowerCase() !== aiResult.country.toLowerCase()) {
        console.warn(
          `Correcting country for "${aiResult.city}": "${aiResult.country}" → "${knownCountry}"`
        );
        correctedCountry = knownCountry;
      }
    }

    // Geocode with cascading specificity
    let location: GeoLocation | null = null;

    // Try most specific first: city + region + corrected country
    if (aiResult.city && correctedCountry) {
      const cityQuery = aiResult.region
        ? `${aiResult.city}, ${aiResult.region}, ${correctedCountry}`
        : `${aiResult.city}, ${correctedCountry}`;
      location = await geocodeLocation(cityQuery);
    }

    // Try the primary location string
    if (!location && aiResult.primaryLocation) {
      location = await geocodeLocation(aiResult.primaryLocation);
    }

    // Try region + corrected country
    if (!location && aiResult.region && correctedCountry) {
      location = await geocodeLocation(`${aiResult.region}, ${correctedCountry}`);
    }

    // Last resort: just country — but ONLY if confidence is not low
    // Country-level pins are imprecise; better to show nothing than a misleading center-of-country dot
    if (!location && correctedCountry && aiResult.locationConfidence !== "low") {
      location = await geocodeLocation(correctedCountry);
      // Mark country-level fallbacks as medium confidence at best
      if (location && aiResult.locationConfidence === "high") {
        location = { ...location, confidence: "medium" };
      }
    }

    // Attach confidence to the location
    if (location) {
      location = { ...location, confidence: aiResult.locationConfidence };
    }

    return {
      category: aiResult.category as EventCategory,
      threatLevel: aiResult.threatLevel as ThreatLevel,
      location,
    };
  }

  // Fall back to keyword-based classification
  const category = keywordClassifyCategory(fullText);
  const threatLevel = keywordClassifyThreatLevel(fullText);

  // Fall back to regex-based location extraction with ranking
  const locationCandidates = extractLocationsFromText(fullText);
  let location: GeoLocation | null = null;

  if (locationCandidates.length > 0) {
    console.log(`[GEO] Regex candidates for "${title.slice(0, 60)}": [${locationCandidates.slice(0, 5).join(", ")}]`);
  }

  // First pass: try candidates that are in KNOWN_LOCATIONS (reliable)
  for (const candidate of locationCandidates) {
    const knownCountry = getKnownLocationCountry(candidate);
    if (knownCountry) {
      location = await geocodeLocation(candidate);
      if (location) {
        console.log(`[GEO] → Known location "${candidate}" → ${location.placeName}, ${location.country}`);
        location = { ...location, confidence: "medium" };
        break;
      }
    }
  }

  // Second pass: only if no known location matched, try Mapbox for unknown candidates
  if (!location) {
    for (const candidate of locationCandidates) {
      if (getKnownLocationCountry(candidate)) continue; // already tried
      location = await geocodeLocation(candidate);
      if (location) {
        console.log(`[GEO] → Mapbox resolved "${candidate}" to ${location.placeName}, ${location.country}`);
        // Mapbox-only results are less reliable
        location = { ...location, confidence: "low" };
        break;
      }
    }
  }

  return {
    category,
    threatLevel,
    location,
  };
}

/**
 * Check if AI classification is available
 */
export function isAIClassificationEnabled(): boolean {
  return !!openai;
}
