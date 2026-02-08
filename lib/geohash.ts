// Geohash encoding/decoding utilities
// Precision 4 ≈ 39km x 19.5km cells (city/metro level)

const BASE32 = "0123456789bcdefghjkmnpqrstuvwxyz";

export function encodeGeohash(
  latitude: number,
  longitude: number,
  precision: number = 4
): string {
  const latRange: [number, number] = [-90, 90];
  const lonRange: [number, number] = [-180, 180];
  let hash = "";
  let bit = 0;
  let ch = 0;
  let isLon = true;

  while (hash.length < precision) {
    const range = isLon ? lonRange : latRange;
    const mid = (range[0] + range[1]) / 2;
    const val = isLon ? longitude : latitude;

    if (val >= mid) {
      ch |= 1 << (4 - bit);
      range[0] = mid;
    } else {
      range[1] = mid;
    }

    isLon = !isLon;
    bit++;

    if (bit === 5) {
      hash += BASE32[ch];
      bit = 0;
      ch = 0;
    }
  }

  return hash;
}

export function decodeGeohash(hash: string): {
  latitude: number;
  longitude: number;
} {
  const latRange: [number, number] = [-90, 90];
  const lonRange: [number, number] = [-180, 180];
  let isLon = true;

  for (const char of hash) {
    const idx = BASE32.indexOf(char);
    for (let bit = 4; bit >= 0; bit--) {
      const range = isLon ? lonRange : latRange;
      const mid = (range[0] + range[1]) / 2;
      if ((idx >> bit) & 1) {
        range[0] = mid;
      } else {
        range[1] = mid;
      }
      isLon = !isLon;
    }
  }

  return {
    latitude: (latRange[0] + latRange[1]) / 2,
    longitude: (lonRange[0] + lonRange[1]) / 2,
  };
}

// Approximate region labels based on coordinates
const REGION_LABELS: Array<{
  latMin: number;
  latMax: number;
  lonMin: number;
  lonMax: number;
  name: string;
}> = [
  { latMin: 25, latMax: 50, lonMin: -130, lonMax: -60, name: "North America" },
  { latMin: -55, latMax: 25, lonMin: -130, lonMax: -30, name: "Latin America" },
  { latMin: 35, latMax: 72, lonMin: -25, lonMax: 40, name: "Europe" },
  { latMin: -35, latMax: 35, lonMin: -25, lonMax: 55, name: "Africa" },
  { latMin: 15, latMax: 55, lonMin: 40, lonMax: 75, name: "Middle East / Central Asia" },
  { latMin: 15, latMax: 55, lonMin: 75, lonMax: 145, name: "East Asia" },
  { latMin: -15, latMax: 15, lonMin: 90, lonMax: 145, name: "Southeast Asia" },
  { latMin: -50, latMax: -10, lonMin: 110, lonMax: 180, name: "Oceania" },
  { latMin: 50, latMax: 80, lonMin: 40, lonMax: 180, name: "Russia / Siberia" },
  { latMin: 5, latMax: 35, lonMin: 65, lonMax: 90, name: "South Asia" },
];

export function geohashToLabel(geohash: string): string {
  const { latitude, longitude } = decodeGeohash(geohash);

  for (const region of REGION_LABELS) {
    if (
      latitude >= region.latMin &&
      latitude <= region.latMax &&
      longitude >= region.lonMin &&
      longitude <= region.lonMax
    ) {
      return region.name;
    }
  }

  return "Global";
}
