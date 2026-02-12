/**
 * Entity Extraction
 *
 * Extracts countries, leaders, organizations from news headlines
 * Makes them clickable for map navigation and entity search
 */

export type EntityType = "country" | "leader" | "organization" | "location";

export interface Entity {
  text: string;
  type: EntityType;
  startIndex: number;
  endIndex: number;
  countryCode?: string; // ISO code for countries
  coordinates?: [number, number]; // [lng, lat] for locations
}

// Country names and their ISO codes
const COUNTRIES: Record<string, string> = {
  // Major powers
  "united states": "USA",
  "us": "USA",
  "usa": "USA",
  "america": "USA",
  "american": "USA",
  "china": "CHN",
  "chinese": "CHN",
  "russia": "RUS",
  "russian": "RUS",
  "india": "IND",
  "indian": "IND",
  "japan": "JPN",
  "japanese": "JPN",
  "germany": "DEU",
  "german": "DEU",
  "france": "FRA",
  "french": "FRA",
  "uk": "GBR",
  "britain": "GBR",
  "british": "GBR",
  "united kingdom": "GBR",

  // Middle East
  "israel": "ISR",
  "israeli": "ISR",
  "iran": "IRN",
  "iranian": "IRN",
  "saudi arabia": "SAU",
  "saudi": "SAU",
  "turkey": "TUR",
  "turkish": "TUR",
  "egypt": "EGY",
  "egyptian": "EGY",
  "syria": "SYR",
  "syrian": "SYR",
  "iraq": "IRQ",
  "iraqi": "IRQ",
  "yemen": "YEM",
  "yemeni": "YEM",
  "lebanon": "LBN",
  "lebanese": "LBN",
  "jordan": "JOR",
  "uae": "ARE",
  "qatar": "QAT",

  // Europe
  "ukraine": "UKR",
  "ukrainian": "UKR",
  "poland": "POL",
  "polish": "POL",
  "spain": "ESP",
  "spanish": "ESP",
  "italy": "ITA",
  "italian": "ITA",
  "netherlands": "NLD",
  "dutch": "NLD",
  "belgium": "BEL",
  "sweden": "SWE",
  "norway": "NOR",
  "finland": "FIN",
  "greece": "GRC",

  // Asia-Pacific
  "south korea": "KOR",
  "korean": "KOR",
  "north korea": "PRK",
  "taiwan": "TWN",
  "taiwanese": "TWN",
  "vietnam": "VNM",
  "vietnamese": "VNM",
  "thailand": "THA",
  "philippines": "PHL",
  "indonesia": "IDN",
  "malaysia": "MYS",
  "singapore": "SGP",
  "australia": "AUS",
  "australian": "AUS",
  "new zealand": "NZL",
  "pakistan": "PAK",
  "bangladesh": "BGD",

  // Americas
  "canada": "CAN",
  "canadian": "CAN",
  "mexico": "MEX",
  "mexican": "MEX",
  "brazil": "BRA",
  "brazilian": "BRA",
  "argentina": "ARG",
  "chile": "CHL",
  "colombia": "COL",
  "venezuela": "VEN",
  "cuba": "CUB",

  // Africa
  "south africa": "ZAF",
  "nigeria": "NGA",
  "ethiopia": "ETH",
  "kenya": "KEN",
  "morocco": "MAR",
  "algeria": "DZA",
  "sudan": "SDN",
  "congo": "COD",
  "somalia": "SOM",
};

// World leaders (simplified list - can be expanded)
const LEADERS: string[] = [
  "biden",
  "trump",
  "xi jinping",
  "putin",
  "modi",
  "macron",
  "scholz",
  "sunak",
  "netanyahu",
  "erdogan",
  "zelensky",
  "khamenei",
  "mbs",
  "kim jong un",
];

// Major organizations
const ORGANIZATIONS: string[] = [
  "nato",
  "un",
  "united nations",
  "eu",
  "european union",
  "pentagon",
  "state department",
  "kremlin",
  "white house",
  "congress",
  "senate",
  "house",
  "imf",
  "world bank",
  "who",
  "idf",
  "hamas",
  "hezbollah",
  "taliban",
  "isis",
  "al-qaeda",
];

/**
 * Extract entities from text
 */
export function extractEntities(text: string): Entity[] {
  const entities: Entity[] = [];
  const lowerText = text.toLowerCase();

  // Extract countries (longest matches first to avoid conflicts)
  const countryEntries = Object.entries(COUNTRIES).sort(
    (a, b) => b[0].length - a[0].length
  );

  for (const [name, code] of countryEntries) {
    const regex = new RegExp(`\\b${name}\\b`, "gi");
    let match: RegExpExecArray | null;

    while ((match = regex.exec(text)) !== null) {
      // Check if this position is already covered by another entity
      const matchIndex = match.index;
      const matchText = match[0];
      const overlaps = entities.some(
        (e) => matchIndex >= e.startIndex && matchIndex < e.endIndex
      );

      if (!overlaps) {
        entities.push({
          text: matchText,
          type: "country",
          startIndex: matchIndex,
          endIndex: matchIndex + matchText.length,
          countryCode: code,
        });
      }
    }
  }

  // Extract leaders
  for (const leader of LEADERS) {
    const regex = new RegExp(`\\b${leader}\\b`, "gi");
    let match: RegExpExecArray | null;

    while ((match = regex.exec(text)) !== null) {
      const matchIndex = match.index;
      const matchText = match[0];
      const overlaps = entities.some(
        (e) => matchIndex >= e.startIndex && matchIndex < e.endIndex
      );

      if (!overlaps) {
        entities.push({
          text: matchText,
          type: "leader",
          startIndex: matchIndex,
          endIndex: matchIndex + matchText.length,
        });
      }
    }
  }

  // Extract organizations
  for (const org of ORGANIZATIONS) {
    const regex = new RegExp(`\\b${org}\\b`, "gi");
    let match: RegExpExecArray | null;

    while ((match = regex.exec(text)) !== null) {
      const matchIndex = match.index;
      const matchText = match[0];
      const overlaps = entities.some(
        (e) => matchIndex >= e.startIndex && matchIndex < e.endIndex
      );

      if (!overlaps) {
        entities.push({
          text: matchText,
          type: "organization",
          startIndex: matchIndex,
          endIndex: matchIndex + matchText.length,
        });
      }
    }
  }

  // Sort by start index
  return entities.sort((a, b) => a.startIndex - b.startIndex);
}

/**
 * Split text into segments with entity annotations
 */
export interface TextSegment {
  text: string;
  entity?: Entity;
}

export function segmentTextWithEntities(text: string, entities: Entity[]): TextSegment[] {
  if (entities.length === 0) {
    return [{ text }];
  }

  const segments: TextSegment[] = [];
  let lastIndex = 0;

  for (const entity of entities) {
    // Add text before entity
    if (entity.startIndex > lastIndex) {
      segments.push({
        text: text.slice(lastIndex, entity.startIndex),
      });
    }

    // Add entity
    segments.push({
      text: entity.text,
      entity,
    });

    lastIndex = entity.endIndex;
  }

  // Add remaining text
  if (lastIndex < text.length) {
    segments.push({
      text: text.slice(lastIndex),
    });
  }

  return segments;
}
