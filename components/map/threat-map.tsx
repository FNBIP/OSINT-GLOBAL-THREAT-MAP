"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Map, {
  NavigationControl,
  GeolocateControl,
  ScaleControl,
  Source,
  Layer,
  Popup,
  type MapRef,
  type MapMouseEvent,
  type LayerProps,
} from "react-map-gl/mapbox";
import { useMapStore } from "@/stores/map-store";
import { useEventsStore } from "@/stores/events-store";
import { useAuthStore } from "@/stores/auth-store";
import { threatLevelColors } from "@/types";
import { EventPopup } from "./event-popup";
import { CountryConflictsModal } from "./country-conflicts-modal";
import { SignInModal } from "@/components/auth/sign-in-modal";
import { WorldviewHUD } from "./worldview-hud";
import { TrafficCamsPanel } from "@/components/panels/traffic-cams-panel";
import type { AircraftState } from "@/app/api/flights/route";
import type { SatellitePosition } from "@/app/api/satellites/route";
import type { VesselState } from "@/app/api/ais/route";

// ── Map skin styles ──────────────────────────────────────────────────────────
const MAP_STYLES: Record<string, string> = {
  eo:    "mapbox://styles/mapbox/dark-v11",                // EO — standard night map
  flir:  "mapbox://styles/mapbox/satellite-v9",            // FLIR — satellite imagery base
  crt:   "mapbox://styles/mapbox/satellite-v9",            // CRT — satellite base + scanlines
  nvg:   "mapbox://styles/mapbox/satellite-v9",            // NVG — satellite + green tint
  anime: "mapbox://styles/mapbox/streets-v12",             // Anime — colorful streets
  noir:  "mapbox://styles/mapbox/dark-v11",                // Noir — desaturated dark
  snow:  "mapbox://styles/mapbox/light-v11",               // Snow — bright/white
  ai:    "mapbox://styles/mapbox/satellite-streets-v12",   // AI — satellite+streets
};

const APP_MODE = process.env.NEXT_PUBLIC_APP_MODE || "self-hosted";

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

const clusterLayer: LayerProps = {
  id: "clusters",
  type: "circle",
  filter: ["has", "point_count"],
  paint: {
    "circle-color": [
      "step",
      ["get", "point_count"],
      "#3b82f6",
      10,
      "#eab308",
      30,
      "#f97316",
      100,
      "#ef4444",
    ],
    "circle-radius": ["step", ["get", "point_count"], 12, 10, 16, 30, 20, 100, 24],
    "circle-stroke-width": 2,
    "circle-stroke-color": "#1e293b",
    "circle-opacity": 0.85,
  },
};

const clusterCountLayer: LayerProps = {
  id: "cluster-count",
  type: "symbol",
  filter: ["has", "point_count"],
  layout: {
    "text-field": ["get", "point_count_abbreviated"],
    "text-font": ["DIN Pro Medium", "Arial Unicode MS Bold"],
    "text-size": 11,
  },
  paint: {
    "text-color": "#ffffff",
  },
};

const unclusteredPointLayer: LayerProps = {
  id: "unclustered-point",
  type: "circle",
  filter: ["!", ["has", "point_count"]],
  paint: {
    "circle-color": [
      "match",
      ["get", "threatLevel"],
      "critical",
      threatLevelColors.critical,
      "high",
      threatLevelColors.high,
      "medium",
      threatLevelColors.medium,
      "low",
      threatLevelColors.low,
      "info",
      threatLevelColors.info,
      "#3b82f6",
    ],
    "circle-radius": 8,
    "circle-stroke-width": 2,
    "circle-stroke-color": "#1e293b",
  },
};

const heatmapLayer: LayerProps = {
  id: "events-heat",
  type: "heatmap",
  maxzoom: 9,
  paint: {
    "heatmap-weight": [
      "interpolate",
      ["linear"],
      ["get", "severity"],
      0,
      0,
      5,
      1,
    ],
    "heatmap-intensity": ["interpolate", ["linear"], ["zoom"], 0, 1, 9, 3],
    "heatmap-color": [
      "interpolate",
      ["linear"],
      ["heatmap-density"],
      0,
      "rgba(0, 0, 0, 0)",
      0.2,
      "rgba(59, 130, 246, 0.5)",
      0.4,
      "rgba(234, 179, 8, 0.6)",
      0.6,
      "rgba(249, 115, 22, 0.7)",
      0.8,
      "rgba(239, 68, 68, 0.8)",
      1,
      "rgba(220, 38, 38, 0.9)",
    ],
    "heatmap-radius": ["interpolate", ["linear"], ["zoom"], 0, 2, 9, 20],
    "heatmap-opacity": 0.8,
  },
};

const entityLocationLayer: LayerProps = {
  id: "entity-locations",
  type: "circle",
  paint: {
    "circle-color": "#a855f7",
    "circle-radius": 10,
    "circle-stroke-width": 3,
    "circle-stroke-color": "#ffffff",
  },
};

const entityLocationLabelLayer: LayerProps = {
  id: "entity-location-labels",
  type: "symbol",
  layout: {
    "text-field": ["get", "placeName"],
    "text-font": ["DIN Pro Medium", "Arial Unicode MS Bold"],
    "text-size": 12,
    "text-offset": [0, 1.5],
    "text-anchor": "top",
  },
  paint: {
    "text-color": "#a855f7",
    "text-halo-color": "#1e293b",
    "text-halo-width": 1,
  },
};

const militaryBaseLayer: LayerProps = {
  id: "military-bases",
  type: "symbol",
  layout: {
    "icon-image": [
      "match",
      ["get", "type"],
      "usa", "us-national-park-11",
      "nato", "us-national-park-11",
      "us-national-park-11",
    ],
    "icon-size": 1.5,
    "icon-allow-overlap": true,
    "text-field": ["get", "baseName"],
    "text-font": ["DIN Pro Medium", "Arial Unicode MS Bold"],
    "text-size": 10,
    "text-offset": [0, 1.5],
    "text-anchor": "top",
    "text-optional": true,
  },
  paint: {
    "icon-color": [
      "match",
      ["get", "type"],
      "usa", "#22c55e",
      "nato", "#3b82f6",
      "#22c55e",
    ],
    "text-color": [
      "match",
      ["get", "type"],
      "usa", "#22c55e",
      "nato", "#3b82f6",
      "#22c55e",
    ],
    "text-halo-color": "#1e293b",
    "text-halo-width": 1,
  },
};

// Fallback circle layer for military bases (in case icons don't load)
const militaryBaseCircleLayer: LayerProps = {
  id: "military-bases-circle",
  type: "circle",
  paint: {
    "circle-color": [
      "match",
      ["get", "type"],
      "usa", "#22c55e",
      "nato", "#3b82f6",
      "#22c55e",
    ],
    "circle-radius": 8,
    "circle-stroke-width": 3,
    "circle-stroke-color": [
      "match",
      ["get", "type"],
      "usa", "#166534",
      "nato", "#1e40af",
      "#166534",
    ],
  },
};

const militaryBaseLabelLayer: LayerProps = {
  id: "military-bases-labels",
  type: "symbol",
  layout: {
    "text-field": ["get", "baseName"],
    "text-font": ["DIN Pro Medium", "Arial Unicode MS Bold"],
    "text-size": 10,
    "text-offset": [0, 1.2],
    "text-anchor": "top",
  },
  paint: {
    "text-color": [
      "match",
      ["get", "type"],
      "usa", "#22c55e",
      "nato", "#3b82f6",
      "#22c55e",
    ],
    "text-halo-color": "#1e293b",
    "text-halo-width": 1,
  },
};

// ── AIS / Vessel layer ───────────────────────────────────────────────────────
const vesselLayer: LayerProps = {
  id: "vessels-layer",
  type: "circle",
  paint: {
    "circle-color": [
      "match", ["get", "navstat"],
      0, "#00ccff",   // underway — cyan
      7, "#ff9900",   // fishing — orange
      1, "#888888",   // anchored — grey
      5, "#888888",   // moored — grey
      "#00ccff",
    ],
    "circle-radius": 3,
    "circle-stroke-width": 1,
    "circle-stroke-color": "#001133",
    "circle-opacity": 0.9,
  },
};

const vesselLabelLayer: LayerProps = {
  id: "vessels-labels",
  type: "symbol",
  layout: {
    "text-field": ["get", "name"],
    "text-font": ["DIN Pro Medium", "Arial Unicode MS Bold"],
    "text-size": 8,
    "text-offset": [0, 1.2],
    "text-anchor": "top",
    "text-optional": true,
  },
  paint: {
    "text-color": "#00ccff",
    "text-halo-color": "#000000",
    "text-halo-width": 1,
    "text-opacity": 0.7,
  },
};

// ── Flight layer ────────────────────────────────────────────────────────────
const flightLayer: LayerProps = {
  id: "flights-layer",
  type: "circle",
  paint: {
    "circle-color": "#00ffcc",
    "circle-radius": 3,
    "circle-stroke-width": 1,
    "circle-stroke-color": "#004433",
    "circle-opacity": 0.85,
  },
};

// NVG-specific: airplane glyphs (green ✈ icons)
const flightLayerNVG: LayerProps = {
  id: "flights-layer-nvg",
  type: "symbol",
  layout: {
    "text-field": "✈",
    "text-font": ["DIN Pro Medium", "Arial Unicode MS Bold"],
    "text-size": 10,
    "text-allow-overlap": true,
    "text-ignore-placement": true,
    "text-rotate": ["get", "track"],
    "text-rotation-alignment": "map",
  },
  paint: {
    "text-color": "#39ff14",
    "text-halo-color": "rgba(0,40,0,0.5)",
    "text-halo-width": 1,
    "text-opacity": 0.9,
  },
};

const flightLabelLayer: LayerProps = {
  id: "flights-labels",
  type: "symbol",
  layout: {
    "text-field": ["get", "callsign"],
    "text-font": ["DIN Pro Medium", "Arial Unicode MS Bold"],
    "text-size": 8,
    "text-offset": [0, 1.2],
    "text-anchor": "top",
    "text-optional": true,
  },
  paint: {
    "text-color": "#00ffcc",
    "text-halo-color": "#000000",
    "text-halo-width": 1,
    "text-opacity": 0.7,
  },
};

// ── Satellite layer ──────────────────────────────────────────────────────────
const satelliteLayer: LayerProps = {
  id: "satellites-layer",
  type: "circle",
  paint: {
    "circle-color": "#ff6600",
    "circle-radius": 4,
    "circle-stroke-width": 1,
    "circle-stroke-color": "#441100",
    "circle-opacity": 0.9,
  },
};

const satelliteLabelLayer: LayerProps = {
  id: "satellites-labels",
  type: "symbol",
  layout: {
    "text-field": ["get", "name"],
    "text-font": ["DIN Pro Medium", "Arial Unicode MS Bold"],
    "text-size": 8,
    "text-offset": [0, 1.4],
    "text-anchor": "top",
    "text-optional": true,
  },
  paint: {
    "text-color": "#ff9955",
    "text-halo-color": "#000000",
    "text-halo-width": 1,
    "text-opacity": 0.8,
  },
};

// ── Cables layer ─────────────────────────────────────────────────────────────
const cablesLineLayer: LayerProps = {
  id: "cables-layer",
  type: "line",
  paint: {
    "line-color": "#00ccff",
    "line-width": 1.5,
    "line-opacity": 0.7,
    "line-dasharray": [4, 2],
  },
};

const cablesLabelLayer: LayerProps = {
  id: "cables-labels",
  type: "symbol",
  layout: {
    "symbol-placement": "line",
    "text-field": ["get", "name"],
    "text-font": ["DIN Pro Medium", "Arial Unicode MS Bold"],
    "text-size": 9,
    "text-offset": [0, 0.8],
    "text-anchor": "center",
    "text-max-angle": 30,
  },
  paint: {
    "text-color": "#00ccff",
    "text-halo-color": "#000000",
    "text-halo-width": 1,
    "text-opacity": 0.6,
  },
};

// ── Pipelines layer ──────────────────────────────────────────────────────────
const pipelinesLineLayer: LayerProps = {
  id: "pipelines-layer",
  type: "line",
  paint: {
    "line-color": [
      "match", ["get", "status"],
      "damaged", "#ef4444",
      "planned", "#eab308",
      "suspended", "#888888",
      "#ff9900",
    ],
    "line-width": [
      "match", ["get", "type"],
      "oil", 2.5,
      "gas", 2,
      2,
    ],
    "line-opacity": [
      "match", ["get", "status"],
      "damaged", 0.6,
      "planned", 0.4,
      0.75,
    ],
  },
};

const pipelinesLabelLayer: LayerProps = {
  id: "pipelines-labels",
  type: "symbol",
  layout: {
    "symbol-placement": "line",
    "text-field": ["get", "name"],
    "text-font": ["DIN Pro Medium", "Arial Unicode MS Bold"],
    "text-size": 9,
    "text-offset": [0, 0.8],
    "text-anchor": "center",
    "text-max-angle": 30,
  },
  paint: {
    "text-color": "#ff9900",
    "text-halo-color": "#000000",
    "text-halo-width": 1,
    "text-opacity": 0.6,
  },
};

// ── Mapbox built-in traffic layers ──────────────────────────────────────────
// These reference Mapbox's own traffic tile source (no extra API needed)
const trafficFlowLayer: LayerProps = {
  id: "traffic-flow",
  type: "line",
  source: "mapbox-traffic",
  "source-layer": "traffic",
  paint: {
    "line-color": [
      "match", ["get", "congestion"],
      "low",    "#00cc44",
      "moderate","#ffcc00",
      "heavy",  "#ff6600",
      "severe", "#ff2200",
      "#00cc44",
    ],
    "line-width": ["interpolate", ["linear"], ["zoom"], 10, 1.5, 15, 4],
    "line-opacity": 0.85,
  },
};

function getSeverityValue(threatLevel: string): number {
  const values: Record<string, number> = {
    critical: 5,
    high: 4,
    medium: 3,
    low: 2,
    info: 1,
  };
  return values[threatLevel] || 2;
}

interface SelectedEntityLocation {
  longitude: number;
  latitude: number;
  placeName: string;
  entityName: string;
  country?: string;
}

interface SelectedMilitaryBase {
  longitude: number;
  latitude: number;
  baseName: string;
  country: string;
  type: "usa" | "nato";
}

interface SelectedVessel {
  longitude: number;
  latitude: number;
  name: string;
  mmsi: string;
  sog: number;
  cog: number;
  navstat: number;
}

interface SelectedFlight {
  longitude: number;
  latitude: number;
  callsign: string;
  icao24: string;
  country: string;
  altitude: number;
  velocity: number;
}

interface SelectedSatellite {
  longitude: number;
  latitude: number;
  name: string;
  alt: number;
}

interface SelectedCable {
  longitude: number;
  latitude: number;
  name: string;
  length_km: number;
  landing_points: string;
  rfs_year: number;
  owners: string;
  capacity: string;
}

interface SelectedPipeline {
  longitude: number;
  latitude: number;
  name: string;
  pipeType: string;
  length_km: number;
  capacity: string;
  operator: string;
  status: string;
}

export function ThreatMap() {
  const mapRef = useRef<MapRef>(null);
  const {
    viewport,
    setViewport,
    showHeatmap,
    showClusters,
    entityLocations,
    showMilitaryBases,
    militaryBases,
    setMilitaryBases,
    setMilitaryBasesLoading,
    layers,
    mapSkin,
    showPanoptic,
  } = useMapStore();
  const { filteredEvents, selectedEvent, selectEvent } = useEventsStore();
  const { isAuthenticated } = useAuthStore();
  const [selectedEntityLocation, setSelectedEntityLocation] = useState<SelectedEntityLocation | null>(null);
  const [selectedMilitaryBase, setSelectedMilitaryBase] = useState<SelectedMilitaryBase | null>(null);
  const [selectedVessel, setSelectedVessel] = useState<SelectedVessel | null>(null);
  const [selectedFlight, setSelectedFlight] = useState<SelectedFlight | null>(null);
  const [selectedSatellite, setSelectedSatellite] = useState<SelectedSatellite | null>(null);
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null);
  const [selectedCountryCode, setSelectedCountryCode] = useState<string | null>(null);
  const [showCCTVPanel, setShowCCTVPanel] = useState(false);
  const [isCountryLoading, setIsCountryLoading] = useState(false);
  const [blinkOpacity, setBlinkOpacity] = useState(0.4);
  const [showSignInModal, setShowSignInModal] = useState(false);

  // ── Flight, satellite & vessel data ─────────────────────────────────────────
  const [aircraft, setAircraft] = useState<AircraftState[]>([]);
  const [satellites, setSatellites] = useState<SatellitePosition[]>([]);
  const [vessels, setVessels] = useState<VesselState[]>([]);
  const [cablesGeoJSON, setCablesGeoJSON] = useState<GeoJSON.FeatureCollection | null>(null);
  const [pipelinesGeoJSON, setPipelinesGeoJSON] = useState<GeoJSON.FeatureCollection | null>(null);
  const [selectedCable, setSelectedCable] = useState<SelectedCable | null>(null);
  const [selectedPipeline, setSelectedPipeline] = useState<SelectedPipeline | null>(null);

  const requiresAuth = APP_MODE === "valyu";


  // Fetch military bases on mount
  useEffect(() => {
    const fetchMilitaryBases = async () => {
      setMilitaryBasesLoading(true);
      try {
        const response = await fetch("/api/military-bases");
        const data = await response.json();
        if (data.bases) {
          setMilitaryBases(data.bases);
        }
      } catch (error) {
        console.error("Error fetching military bases:", error);
      } finally {
        setMilitaryBasesLoading(false);
      }
    };

    fetchMilitaryBases();
  }, [setMilitaryBases, setMilitaryBasesLoading]);

  // Fetch live flights when layer is active
  useEffect(() => {
    if (!layers.flights) { setAircraft([]); return; }
    let cancelled = false;

    async function fetchFlights() {
      try {
        const res = await fetch("/api/flights");
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled) setAircraft(data.aircraft ?? []);
      } catch { /* silent */ }
    }

    fetchFlights();
    const interval = setInterval(fetchFlights, 60000); // refresh every 60s
    return () => { cancelled = true; clearInterval(interval); };
  }, [layers.flights]);

  // Fetch satellite positions when layer is active
  useEffect(() => {
    if (!layers.satellites) { setSatellites([]); return; }
    let cancelled = false;

    async function fetchSatellites() {
      try {
        const res = await fetch("/api/satellites");
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled) setSatellites(data.satellites ?? []);
      } catch { /* silent */ }
    }

    fetchSatellites();
    const interval = setInterval(fetchSatellites, 300000); // refresh every 5 min
    return () => { cancelled = true; clearInterval(interval); };
  }, [layers.satellites]);

  // Fetch AIS vessel positions when layer is active
  useEffect(() => {
    if (!layers.ais) { setVessels([]); return; }
    let cancelled = false;

    async function fetchVessels() {
      try {
        const res = await fetch("/api/ais");
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled) setVessels(data.vessels ?? []);
      } catch { /* silent */ }
    }

    fetchVessels();
    const interval = setInterval(fetchVessels, 60000); // refresh every 60s
    return () => { cancelled = true; clearInterval(interval); };
  }, [layers.ais]);

  // Fetch submarine cables when layer is active
  useEffect(() => {
    if (!layers.cables) { setCablesGeoJSON(null); return; }
    let cancelled = false;
    async function fetchCables() {
      try {
        const res = await fetch("/api/cables");
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled) setCablesGeoJSON(data);
      } catch { /* silent */ }
    }
    fetchCables();
    return () => { cancelled = true; };
  }, [layers.cables]);

  // Fetch pipelines when layer is active
  useEffect(() => {
    if (!layers.pipelines) { setPipelinesGeoJSON(null); return; }
    let cancelled = false;
    async function fetchPipelines() {
      try {
        const res = await fetch("/api/pipelines");
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled) setPipelinesGeoJSON(data);
      } catch { /* silent */ }
    }
    fetchPipelines();
    return () => { cancelled = true; };
  }, [layers.pipelines]);

  // Blinking effect for selected country while loading
  useEffect(() => {
    if (!selectedCountryCode || !isCountryLoading) {
      setBlinkOpacity(0.4);
      return;
    }

    const interval = setInterval(() => {
      setBlinkOpacity((prev) => (prev === 0.4 ? 0.15 : 0.4));
    }, 400);

    return () => clearInterval(interval);
  }, [selectedCountryCode, isCountryLoading]);

  const handleCountryLoadingChange = useCallback((loading: boolean) => {
    setIsCountryLoading(loading);
  }, []);

  const handleCountryModalClose = useCallback(() => {
    setSelectedCountry(null);
    setSelectedCountryCode(null);
    setIsCountryLoading(false);
  }, []);

  const geojsonData = useMemo(
    () => ({
      type: "FeatureCollection" as const,
      features: filteredEvents.map((event) => ({
        type: "Feature" as const,
        properties: {
          id: event.id,
          title: event.title,
          category: event.category,
          threatLevel: event.threatLevel,
          severity: getSeverityValue(event.threatLevel),
          timestamp: event.timestamp,
        },
        geometry: {
          type: "Point" as const,
          coordinates: [event.location.longitude, event.location.latitude],
        },
      })),
    }),
    [filteredEvents]
  );

  const entityLocationsData = useMemo(
    () => ({
      type: "FeatureCollection" as const,
      features: entityLocations.map((location, index) => ({
        type: "Feature" as const,
        properties: {
          id: `entity-loc-${index}`,
          placeName: location.placeName || location.country || "Unknown",
          entityName: location.entityName,
          country: location.country,
        },
        geometry: {
          type: "Point" as const,
          coordinates: [location.longitude, location.latitude],
        },
      })),
    }),
    [entityLocations]
  );

  const militaryBasesData = useMemo(
    () => ({
      type: "FeatureCollection" as const,
      features: militaryBases.map((base, index) => ({
        type: "Feature" as const,
        properties: {
          id: `military-base-${index}`,
          baseName: base.baseName,
          country: base.country,
          type: base.type,
        },
        geometry: {
          type: "Point" as const,
          coordinates: [base.longitude, base.latitude],
        },
      })),
    }),
    [militaryBases]
  );

  const vesselsData = useMemo(
    () => ({
      type: "FeatureCollection" as const,
      features: vessels
        .filter((v) => v.longitude != null && v.latitude != null)
        .map((v, i) => ({
          type: "Feature" as const,
          properties: {
            id: v.mmsi || `v-${i}`,
            name: v.name || v.mmsi,
            sog: v.sog,
            cog: v.cog,
            navstat: v.navstat,
          },
          geometry: {
            type: "Point" as const,
            coordinates: [v.longitude, v.latitude],
          },
        })),
    }),
    [vessels]
  );

  const flightsData = useMemo(
    () => ({
      type: "FeatureCollection" as const,
      features: aircraft
        .filter((a) => a.longitude != null && a.latitude != null)
        .map((a, i) => ({
          type: "Feature" as const,
          properties: {
            id: a.icao24 || `ac-${i}`,
            callsign: a.callsign || a.icao24,
            country: a.origin_country,
            altitude: a.baro_altitude ?? 0,
            velocity: a.velocity ?? 0,
            track: a.true_track ?? 0,
          },
          geometry: {
            type: "Point" as const,
            coordinates: [a.longitude!, a.latitude!],
          },
        })),
    }),
    [aircraft]
  );

  const satellitesData = useMemo(
    () => ({
      type: "FeatureCollection" as const,
      features: satellites.map((s, i) => ({
        type: "Feature" as const,
        properties: {
          id: `sat-${i}`,
          name: s.name,
          alt: s.alt,
        },
        geometry: {
          type: "Point" as const,
          coordinates: [s.lon, s.lat],
        },
      })),
    }),
    [satellites]
  );

  const handleMapClick = useCallback(
    async (event: MapMouseEvent) => {
      // If clicking on a known feature (event, cluster, entity), handle that
      if (event.features?.length) {
        const feature = event.features[0];
        const layerId = feature.layer?.id;

        if (layerId === "clusters" && mapRef.current) {
          const clusterId = feature.properties?.cluster_id;
          const source = mapRef.current.getSource("events") as mapboxgl.GeoJSONSource;

          source.getClusterExpansionZoom(clusterId, (err, zoom) => {
            if (err) return;

            mapRef.current?.easeTo({
              center: (feature.geometry as GeoJSON.Point).coordinates as [
                number,
                number,
              ],
              zoom: zoom || viewport.zoom + 2,
              duration: 500,
            });
          });
          return;
        } else if (layerId === "unclustered-point") {
          const eventId = feature.properties?.id;
          const clickedEvent = filteredEvents.find((e) => e.id === eventId);
          if (clickedEvent) {
            selectEvent(clickedEvent);
            setSelectedEntityLocation(null);
            setSelectedMilitaryBase(null);
          }
          return;
        } else if (layerId === "entity-locations") {
          const coords = (feature.geometry as GeoJSON.Point).coordinates;
          setSelectedEntityLocation({
            longitude: coords[0],
            latitude: coords[1],
            placeName: feature.properties?.placeName || "Unknown",
            entityName: feature.properties?.entityName || "Unknown",
            country: feature.properties?.country,
          });
          selectEvent(null);
          setSelectedMilitaryBase(null);
          return;
        } else if (layerId === "military-bases-circle") {
          const coords = (feature.geometry as GeoJSON.Point).coordinates;
          setSelectedMilitaryBase({
            longitude: coords[0],
            latitude: coords[1],
            baseName: feature.properties?.baseName || "Military Base",
            country: feature.properties?.country || "Unknown",
            type: feature.properties?.type || "usa",
          });
          selectEvent(null);
          setSelectedEntityLocation(null);
          return;
        } else if (layerId === "vessels-layer") {
          const coords = (feature.geometry as GeoJSON.Point).coordinates;
          setSelectedVessel({
            longitude: coords[0],
            latitude: coords[1],
            name: feature.properties?.name || "Unknown Vessel",
            mmsi: feature.properties?.id || "—",
            sog: feature.properties?.sog ?? 0,
            cog: feature.properties?.cog ?? 0,
            navstat: feature.properties?.navstat ?? -1,
          });
          selectEvent(null); setSelectedEntityLocation(null); setSelectedMilitaryBase(null);
          setSelectedFlight(null); setSelectedSatellite(null);
          return;
        } else if (layerId === "flights-layer" || layerId === "flights-layer-nvg") {
          const coords = (feature.geometry as GeoJSON.Point).coordinates;
          setSelectedFlight({
            longitude: coords[0],
            latitude: coords[1],
            callsign: feature.properties?.callsign || "Unknown",
            icao24: feature.properties?.id || "—",
            country: feature.properties?.country || "Unknown",
            altitude: feature.properties?.altitude ?? 0,
            velocity: feature.properties?.velocity ?? 0,
          });
          selectEvent(null); setSelectedEntityLocation(null); setSelectedMilitaryBase(null);
          setSelectedVessel(null); setSelectedSatellite(null);
          return;
        } else if (layerId === "satellites-layer") {
          const coords = (feature.geometry as GeoJSON.Point).coordinates;
          setSelectedSatellite({
            longitude: coords[0],
            latitude: coords[1],
            name: feature.properties?.name || "Unknown Satellite",
            alt: feature.properties?.alt ?? 0,
          });
          selectEvent(null); setSelectedEntityLocation(null); setSelectedMilitaryBase(null);
          setSelectedVessel(null); setSelectedFlight(null);
          return;
        } else if (layerId === "cables-layer") {
          const coords = event.lngLat;
          setSelectedCable({
            longitude: coords.lng,
            latitude: coords.lat,
            name: feature.properties?.name || "Unknown Cable",
            length_km: feature.properties?.length_km ?? 0,
            landing_points: feature.properties?.landing_points || "—",
            rfs_year: feature.properties?.rfs_year ?? 0,
            owners: feature.properties?.owners || "—",
            capacity: feature.properties?.capacity || "—",
          });
          selectEvent(null); setSelectedEntityLocation(null); setSelectedMilitaryBase(null);
          setSelectedVessel(null); setSelectedFlight(null); setSelectedSatellite(null);
          setSelectedPipeline(null);
          return;
        } else if (layerId === "pipelines-layer") {
          const coords = event.lngLat;
          setSelectedPipeline({
            longitude: coords.lng,
            latitude: coords.lat,
            name: feature.properties?.name || "Unknown Pipeline",
            pipeType: feature.properties?.type || "—",
            length_km: feature.properties?.length_km ?? 0,
            capacity: feature.properties?.capacity || "—",
            operator: feature.properties?.operator || "—",
            status: feature.properties?.status || "active",
          });
          selectEvent(null); setSelectedEntityLocation(null); setSelectedMilitaryBase(null);
          setSelectedVessel(null); setSelectedFlight(null); setSelectedSatellite(null);
          setSelectedCable(null);
          return;
        }
      }

      // If no feature was clicked, reverse geocode to get country
      selectEvent(null);
      setSelectedEntityLocation(null);
      setSelectedMilitaryBase(null);
      setSelectedVessel(null);
      setSelectedFlight(null);
      setSelectedSatellite(null);
      setSelectedCable(null);
      setSelectedPipeline(null);

      const { lng, lat } = event.lngLat;

      try {
        const response = await fetch(
          `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?types=country&access_token=${MAPBOX_TOKEN}`
        );
        const data = await response.json();

        if (data.features && data.features.length > 0) {
          const countryFeature = data.features[0];
          const countryName = countryFeature.place_name;
          // Get ISO 3166-1 alpha-2 country code from short_code property
          const countryCode = countryFeature.properties?.short_code?.toUpperCase() || null;

          // Always require sign-in for country clicks (answers about a place)
          if (requiresAuth && !isAuthenticated) {
            setShowSignInModal(true);
            return;
          }

          setSelectedCountry(countryName);
          setSelectedCountryCode(countryCode);
          setIsCountryLoading(true);
        }
      } catch (error) {
        console.error("Error reverse geocoding:", error);
      }
    },
    [filteredEvents, selectEvent, viewport.zoom, requiresAuth, isAuthenticated]
  );

  const handleMouseEnter = useCallback(() => {
    if (mapRef.current) {
      mapRef.current.getCanvas().style.cursor = "pointer";
    }
  }, []);

  const handleMouseLeave = useCallback(() => {
    if (mapRef.current) {
      mapRef.current.getCanvas().style.cursor = "";
    }
  }, []);

  if (!MAPBOX_TOKEN) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-card">
        <div className="text-center">
          <p className="text-lg font-semibold text-foreground">
            Mapbox Token Required
          </p>
          <p className="text-sm text-muted-foreground">
            Please add NEXT_PUBLIC_MAPBOX_TOKEN to your .env.local file
          </p>
        </div>
      </div>
    );
  }

  // CSS filter per skin — applied to the map wrapper inside the circle
  const skinFilter: Partial<Record<string, string>> = {
    flir: "sepia(1) saturate(4) hue-rotate(85deg) brightness(0.65) contrast(1.5)",
    nvg:  "saturate(0) brightness(1.3) contrast(1.4)",
    noir: "saturate(0) brightness(0.8) contrast(1.3)",
    snow: "saturate(0.15) brightness(1.4) contrast(0.85)",
  };

  // The lens circle — nearly full screen, offset left to make room for panels
  // Video shows circle takes ~70% of width, centered slightly right of the left panel
  const lensSize = "min(72vh, 72vw)";

  return (
    // ── Root: full black background ──────────────────────────────────────────
    <div style={{ position: "relative", width: "100%", height: "100%", background: "#000", overflow: "hidden" }}>

      {/* ── WorldviewHUD — classified intel overlay (always full-screen) ── */}
      <WorldviewHUD
        mapLat={viewport.latitude}
        mapLon={viewport.longitude}
        mapZoom={viewport.zoom}
      />

      {/* ── Panoptic overlay (full-screen) ── */}
      {showPanoptic && <PanopticOverlay />}

      {/* ── Circular lens container — map lives INSIDE here ── */}
      <div style={{
        position: "absolute",
        top: "50%",
        // Offset right to sit between the left panel (~280px) and right panel (~260px)
        left: "calc(50% + 10px)",
        transform: "translate(-50%, -50%)",
        width: lensSize,
        height: lensSize,
        borderRadius: "50%",
        overflow: "hidden",
        boxShadow: "0 0 0 1px rgba(255,255,255,0.1), 0 0 0 2px rgba(0,0,0,0.9), 0 0 60px rgba(0,0,0,0.5)",
        zIndex: 3,
      }}>

        {/* Map with skin filter applied */}
        <div style={{
          position: "absolute", inset: 0,
          filter: skinFilter[mapSkin] ?? undefined,
        }}>
          <Map
            ref={mapRef}
            {...viewport}
            onMove={(evt) => setViewport(evt.viewState)}
            mapStyle={MAP_STYLES[mapSkin] ?? MAP_STYLES.eo}
            mapboxAccessToken={MAPBOX_TOKEN}
            style={{ width: "100%", height: "100%" }}
            interactiveLayerIds={[
              ...(showClusters ? ["clusters"] : []),
              "unclustered-point",
              "entity-locations",
              "military-bases-circle",
              "vessels-layer",
              "flights-layer",
              "flights-layer-nvg",
              "satellites-layer",
              "cables-layer",
              "pipelines-layer",
            ]}
            onClick={handleMapClick}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            attributionControl={false}
            maxPitch={60}
          >

      {/* Country highlight layer */}
      {selectedCountryCode && (
        <Source
          id="country-boundaries"
          type="vector"
          url="mapbox://mapbox.country-boundaries-v1"
        >
          <Layer
            id="country-highlight"
            type="fill"
            source-layer="country_boundaries"
            filter={[
              "all",
              ["==", ["get", "iso_3166_1"], selectedCountryCode],
              ["==", ["get", "worldview"], "all"],
            ]}
            paint={{
              "fill-color": "#ef4444",
              "fill-opacity": blinkOpacity,
            }}
            beforeId="waterway-label"
          />
          <Layer
            id="country-highlight-outline"
            type="line"
            source-layer="country_boundaries"
            filter={[
              "all",
              ["==", ["get", "iso_3166_1"], selectedCountryCode],
              ["==", ["get", "worldview"], "all"],
            ]}
            paint={{
              "line-color": "#ef4444",
              "line-width": 2,
              "line-opacity": 0.8,
            }}
            beforeId="waterway-label"
          />
        </Source>
      )}

      <Source
        id="events"
        type="geojson"
        data={geojsonData}
        cluster={showClusters}
        clusterMaxZoom={14}
        clusterRadius={50}
      >
        {showHeatmap && <Layer {...heatmapLayer} />}
        {showClusters && <Layer {...clusterLayer} />}
        {showClusters && <Layer {...clusterCountLayer} />}
        <Layer {...unclusteredPointLayer} />
      </Source>

      {entityLocations.length > 0 && (
        <Source id="entity-locations" type="geojson" data={entityLocationsData}>
          <Layer {...entityLocationLayer} />
          <Layer {...entityLocationLabelLayer} />
        </Source>
      )}

      {/* Military Bases Layer */}
      {showMilitaryBases && militaryBases.length > 0 && (
        <Source id="military-bases" type="geojson" data={militaryBasesData}>
          <Layer {...militaryBaseCircleLayer} />
          <Layer {...militaryBaseLabelLayer} />
        </Source>
      )}

      {selectedEvent && (
        <Popup
          longitude={selectedEvent.location.longitude}
          latitude={selectedEvent.location.latitude}
          anchor="bottom"
          onClose={() => selectEvent(null)}
          closeButton={true}
          closeOnClick={false}
          className="threat-popup"
        >
          <EventPopup event={selectedEvent} />
        </Popup>
      )}

      {selectedEntityLocation && (
        <Popup
          longitude={selectedEntityLocation.longitude}
          latitude={selectedEntityLocation.latitude}
          anchor="bottom"
          onClose={() => setSelectedEntityLocation(null)}
          closeButton={true}
          closeOnClick={false}
          className="threat-popup"
        >
          <div className="min-w-[200px] p-2">
            <div className="mb-2 flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-purple-500/20">
                <svg
                  className="h-4 w-4 text-purple-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                  />
                </svg>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-foreground">
                  {selectedEntityLocation.entityName}
                </h3>
                <span className="text-xs text-purple-400">Organization</span>
              </div>
            </div>
            <div className="space-y-1 text-sm">
              <div className="flex items-start gap-2 text-muted-foreground">
                <svg
                  className="mt-0.5 h-3 w-3 shrink-0"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
                <span>{selectedEntityLocation.placeName}</span>
              </div>
              {selectedEntityLocation.country &&
               selectedEntityLocation.country !== selectedEntityLocation.placeName && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <svg
                    className="h-3 w-3 shrink-0"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <span>{selectedEntityLocation.country}</span>
                </div>
              )}
            </div>
          </div>
        </Popup>
      )}

      {selectedMilitaryBase && (
        <Popup
          longitude={selectedMilitaryBase.longitude}
          latitude={selectedMilitaryBase.latitude}
          anchor="bottom"
          onClose={() => setSelectedMilitaryBase(null)}
          closeButton={true}
          closeOnClick={false}
          className="threat-popup"
        >
          <div className="min-w-[220px] p-2">
            <div className="mb-2 flex items-center gap-2">
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-full ${
                  selectedMilitaryBase.type === "usa"
                    ? "bg-green-500/20"
                    : "bg-blue-500/20"
                }`}
              >
                <svg
                  className={`h-4 w-4 ${
                    selectedMilitaryBase.type === "usa"
                      ? "text-green-400"
                      : "text-blue-400"
                  }`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                  />
                </svg>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-foreground">
                  {selectedMilitaryBase.baseName}
                </h3>
                <span
                  className={`text-xs ${
                    selectedMilitaryBase.type === "usa"
                      ? "text-green-400"
                      : "text-blue-400"
                  }`}
                >
                  {selectedMilitaryBase.type === "usa" ? "US Military Base" : "NATO Base"}
                </span>
              </div>
            </div>
            <div className="space-y-1 text-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                <svg
                  className="h-3 w-3 shrink-0"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <span>{selectedMilitaryBase.country}</span>
              </div>
            </div>
          </div>
        </Popup>
      )}

      {/* ── Vessel popup ── */}
      {selectedVessel && (
        <Popup
          longitude={selectedVessel.longitude}
          latitude={selectedVessel.latitude}
          anchor="bottom"
          onClose={() => setSelectedVessel(null)}
          closeButton={true}
          closeOnClick={false}
          className="threat-popup"
        >
          <div className="min-w-[200px] p-2">
            <div className="mb-2 flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-cyan-500/20">
                <span className="text-cyan-400 text-sm">⚓</span>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-foreground">{selectedVessel.name}</h3>
                <span className="text-xs text-cyan-400">MMSI: {selectedVessel.mmsi}</span>
              </div>
            </div>
            <div className="space-y-1 text-xs text-muted-foreground">
              <div className="flex justify-between"><span>Speed</span><span className="text-foreground">{selectedVessel.sog.toFixed(1)} kn</span></div>
              <div className="flex justify-between"><span>Course</span><span className="text-foreground">{selectedVessel.cog.toFixed(1)}°</span></div>
              <div className="flex justify-between"><span>Nav Status</span><span className="text-foreground">{
                selectedVessel.navstat === 0 ? "Underway" :
                selectedVessel.navstat === 1 ? "Anchored" :
                selectedVessel.navstat === 5 ? "Moored" :
                selectedVessel.navstat === 7 ? "Fishing" :
                `Code ${selectedVessel.navstat}`
              }</span></div>
              <div className="flex justify-between"><span>Position</span><span className="text-foreground">{selectedVessel.latitude.toFixed(4)}°, {selectedVessel.longitude.toFixed(4)}°</span></div>
            </div>
          </div>
        </Popup>
      )}

      {/* ── Flight popup ── */}
      {selectedFlight && (
        <Popup
          longitude={selectedFlight.longitude}
          latitude={selectedFlight.latitude}
          anchor="bottom"
          onClose={() => setSelectedFlight(null)}
          closeButton={true}
          closeOnClick={false}
          className="threat-popup"
        >
          <div className="min-w-[200px] p-2">
            <div className="mb-2 flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500/20">
                <span className="text-emerald-400 text-sm">✈</span>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-foreground">{selectedFlight.callsign}</h3>
                <span className="text-xs text-emerald-400">{selectedFlight.country}</span>
              </div>
            </div>
            <div className="space-y-1 text-xs text-muted-foreground">
              <div className="flex justify-between"><span>ICAO24</span><span className="text-foreground">{selectedFlight.icao24}</span></div>
              <div className="flex justify-between"><span>Altitude</span><span className="text-foreground">{selectedFlight.altitude.toLocaleString()} m</span></div>
              <div className="flex justify-between"><span>Velocity</span><span className="text-foreground">{selectedFlight.velocity.toFixed(0)} m/s</span></div>
              <div className="flex justify-between"><span>Position</span><span className="text-foreground">{selectedFlight.latitude.toFixed(4)}°, {selectedFlight.longitude.toFixed(4)}°</span></div>
            </div>
          </div>
        </Popup>
      )}

      {/* ── Satellite popup ── */}
      {selectedSatellite && (
        <Popup
          longitude={selectedSatellite.longitude}
          latitude={selectedSatellite.latitude}
          anchor="bottom"
          onClose={() => setSelectedSatellite(null)}
          closeButton={true}
          closeOnClick={false}
          className="threat-popup"
        >
          <div className="min-w-[200px] p-2">
            <div className="mb-2 flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-orange-500/20">
                <span className="text-orange-400 text-sm">◉</span>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-foreground">{selectedSatellite.name}</h3>
                <span className="text-xs text-orange-400">Satellite</span>
              </div>
            </div>
            <div className="space-y-1 text-xs text-muted-foreground">
              <div className="flex justify-between"><span>Altitude</span><span className="text-foreground">{selectedSatellite.alt.toFixed(0)} km</span></div>
              <div className="flex justify-between"><span>Position</span><span className="text-foreground">{selectedSatellite.latitude.toFixed(4)}°, {selectedSatellite.longitude.toFixed(4)}°</span></div>
            </div>
          </div>
        </Popup>
      )}

      {/* AIS Vessel layer */}
      {layers.ais && vessels.length > 0 && (
        <Source id="vessels" type="geojson" data={vesselsData}>
          <Layer {...vesselLayer} />
          <Layer {...vesselLabelLayer} />
        </Source>
      )}

      {/* Flights layer — NVG shows airplane glyphs, others show dots */}
      {layers.flights && aircraft.length > 0 && mapSkin === "nvg" && (
        <Source id="flights" type="geojson" data={flightsData}>
          <Layer {...flightLayerNVG} />
        </Source>
      )}
      {layers.flights && aircraft.length > 0 && mapSkin !== "nvg" && (
        <Source id="flights" type="geojson" data={flightsData}>
          <Layer {...flightLayer} />
          <Layer {...flightLabelLayer} />
        </Source>
      )}

      {/* Satellites layer */}
      {layers.satellites && satellites.length > 0 && (
        <Source id="satellites" type="geojson" data={satellitesData}>
          <Layer {...satelliteLayer} />
          <Layer {...satelliteLabelLayer} />
        </Source>
      )}

      {/* Real-time road traffic layer (Mapbox built-in, no extra API) */}
      {layers.traffic && (
        <Source
          id="mapbox-traffic"
          type="vector"
          url="mapbox://mapbox.mapbox-traffic-v1"
        >
          <Layer {...trafficFlowLayer} />
        </Source>
      )}

      {/* Submarine cables layer */}
      {layers.cables && cablesGeoJSON && (
        <Source id="cables" type="geojson" data={cablesGeoJSON}>
          <Layer {...cablesLineLayer} />
          <Layer {...cablesLabelLayer} />
        </Source>
      )}

      {/* Pipelines layer */}
      {layers.pipelines && pipelinesGeoJSON && (
        <Source id="pipelines" type="geojson" data={pipelinesGeoJSON}>
          <Layer {...pipelinesLineLayer} />
          <Layer {...pipelinesLabelLayer} />
        </Source>
      )}

      {/* ── Cable popup ── */}
      {selectedCable && (
        <Popup
          longitude={selectedCable.longitude}
          latitude={selectedCable.latitude}
          anchor="bottom"
          onClose={() => setSelectedCable(null)}
          closeButton={true}
          closeOnClick={false}
          className="threat-popup"
        >
          <div className="min-w-[220px] p-2">
            <div className="mb-2 flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-cyan-500/20">
                <span className="text-cyan-400 text-sm">〰</span>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-foreground">{selectedCable.name}</h3>
                <span className="text-xs text-cyan-400">Submarine Cable</span>
              </div>
            </div>
            <div className="space-y-1 text-xs text-muted-foreground">
              <div className="flex justify-between"><span>Capacity</span><span className="text-foreground">{selectedCable.capacity}</span></div>
              <div className="flex justify-between"><span>Length</span><span className="text-foreground">{selectedCable.length_km.toLocaleString()} km</span></div>
              <div className="flex justify-between"><span>RFS Year</span><span className="text-foreground">{selectedCable.rfs_year}</span></div>
              <div className="flex justify-between"><span>Owners</span><span className="text-foreground text-right max-w-[140px] truncate">{selectedCable.owners}</span></div>
              <div className="pt-1 text-[10px] text-muted-foreground/60 leading-tight">{selectedCable.landing_points}</div>
            </div>
          </div>
        </Popup>
      )}

      {/* ── Pipeline popup ── */}
      {selectedPipeline && (
        <Popup
          longitude={selectedPipeline.longitude}
          latitude={selectedPipeline.latitude}
          anchor="bottom"
          onClose={() => setSelectedPipeline(null)}
          closeButton={true}
          closeOnClick={false}
          className="threat-popup"
        >
          <div className="min-w-[220px] p-2">
            <div className="mb-2 flex items-center gap-2">
              <div className={`flex h-8 w-8 items-center justify-center rounded-full ${
                selectedPipeline.status === "damaged" ? "bg-red-500/20" :
                selectedPipeline.status === "planned" ? "bg-yellow-500/20" :
                "bg-orange-500/20"
              }`}>
                <span className={`text-sm ${
                  selectedPipeline.status === "damaged" ? "text-red-400" :
                  selectedPipeline.status === "planned" ? "text-yellow-400" :
                  "text-orange-400"
                }`}>⬤</span>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-foreground">{selectedPipeline.name}</h3>
                <span className={`text-xs ${
                  selectedPipeline.status === "damaged" ? "text-red-400" :
                  selectedPipeline.status === "planned" ? "text-yellow-400" :
                  "text-orange-400"
                }`}>{selectedPipeline.pipeType.toUpperCase()} Pipeline — {selectedPipeline.status.toUpperCase()}</span>
              </div>
            </div>
            <div className="space-y-1 text-xs text-muted-foreground">
              <div className="flex justify-between"><span>Capacity</span><span className="text-foreground">{selectedPipeline.capacity}</span></div>
              <div className="flex justify-between"><span>Length</span><span className="text-foreground">{selectedPipeline.length_km.toLocaleString()} km</span></div>
              <div className="flex justify-between"><span>Operator</span><span className="text-foreground text-right max-w-[140px] truncate">{selectedPipeline.operator}</span></div>
            </div>
          </div>
        </Popup>
      )}

      <CountryConflictsModal
        country={selectedCountry}
        onClose={handleCountryModalClose}
        onLoadingChange={handleCountryLoadingChange}
      />

      <SignInModal open={showSignInModal} onOpenChange={setShowSignInModal} />
    </Map>
        </div>{/* end filter wrapper */}

        {/* ── Skin overlays — INSIDE the circle ── */}

        {/* CRT: heavy horizontal scanlines over satellite */}
        {mapSkin === "crt" && (
          <div style={{
            position: "absolute", inset: 0, zIndex: 4, pointerEvents: "none",
            backgroundImage: [
              "repeating-linear-gradient(0deg, rgba(0,0,0,0.45) 0px, rgba(0,0,0,0.45) 1px, transparent 1px, transparent 3px)",
              "repeating-linear-gradient(0deg, rgba(80,200,255,0.03) 0px, rgba(80,200,255,0.03) 2px, transparent 2px, transparent 4px)",
            ].join(", "),
          }} />
        )}
        {/* CRT: color aberration tint */}
        {mapSkin === "crt" && (
          <div style={{
            position: "absolute", inset: 0, zIndex: 5, pointerEvents: "none",
            background: "linear-gradient(180deg, rgba(20,10,40,0.18) 0%, rgba(0,20,60,0.12) 50%, rgba(10,0,30,0.18) 100%)",
            mixBlendMode: "multiply",
          }} />
        )}

        {/* NVG: green phosphor tint */}
        {mapSkin === "nvg" && (
          <div style={{
            position: "absolute", inset: 0, zIndex: 4, pointerEvents: "none",
            background: "rgba(20,70,5,0.5)",
            mixBlendMode: "screen",
          }} />
        )}
        {/* NVG: scanlines */}
        {mapSkin === "nvg" && (
          <div style={{
            position: "absolute", inset: 0, zIndex: 5, pointerEvents: "none",
            backgroundImage: "repeating-linear-gradient(0deg, rgba(0,0,0,0.3) 0px, rgba(0,0,0,0.3) 1px, transparent 1px, transparent 2px)",
          }} />
        )}

        {/* FLIR: thermal green tint */}
        {mapSkin === "flir" && (
          <div style={{
            position: "absolute", inset: 0, zIndex: 4, pointerEvents: "none",
            background: "rgba(0,25,5,0.3)",
            mixBlendMode: "multiply",
          }} />
        )}

        {/* Noir: dark desaturated haze */}
        {mapSkin === "noir" && (
          <div style={{
            position: "absolute", inset: 0, zIndex: 4, pointerEvents: "none",
            background: "rgba(5,2,0,0.25)",
          }} />
        )}

        {/* Snow: white haze */}
        {mapSkin === "snow" && (
          <div style={{
            position: "absolute", inset: 0, zIndex: 4, pointerEvents: "none",
            background: "rgba(220,240,255,0.1)",
          }} />
        )}

        {/* Inner lens vignette ring (darkens edges within the circle) */}
        <div style={{
          position: "absolute", inset: 0, zIndex: 6, pointerEvents: "none",
          borderRadius: "50%",
          background: "radial-gradient(ellipse at center, transparent 55%, rgba(0,0,0,0.5) 80%, rgba(0,0,0,0.85) 100%)",
        }} />

      </div>{/* end circular lens */}

      {/* ── Floating VEH / SAT labels in the black outer area ── */}
      <FloatingLabels satellites={satellites} vessels={vessels} />

      {/* ── Corner bracket decorations (outside the circle) ── */}
      {(["tl","tr","bl","br"] as const).map((corner) => (
        <div key={corner} style={{
          position: "absolute", zIndex: 9, pointerEvents: "none",
          ...(corner === "tl" ? { top: "8%", left: "30%" } :
              corner === "tr" ? { top: "8%", right: "2%" } :
              corner === "bl" ? { bottom: "10%", left: "30%" } :
                                { bottom: "10%", right: "2%" }),
          width: 14, height: 14,
          borderTop: corner.startsWith("t") ? "1px solid rgba(255,255,255,0.12)" : "none",
          borderBottom: corner.startsWith("b") ? "1px solid rgba(255,255,255,0.12)" : "none",
          borderLeft: corner.endsWith("l") ? "1px solid rgba(255,255,255,0.12)" : "none",
          borderRight: corner.endsWith("r") ? "1px solid rgba(255,255,255,0.12)" : "none",
        }} />
      ))}

      {/* ── CCTV Mesh panel (opens when layer toggled) ── */}
      {(layers.cctv || showCCTVPanel) && (
        <div style={{
          position: "absolute",
          bottom: 110, left: 278,
          zIndex: 30,
          width: 520,
          maxHeight: "55vh",
          overflow: "hidden auto",
        }}>
          <TrafficCamsPanel />
        </div>
      )}

    </div>
  );
}

// ── Floating VEH / SAT labels in the black border area ───────────────────────
function FloatingLabels({
  satellites,
  vessels,
}: {
  satellites: SatellitePosition[];
  vessels: VesselState[];
}) {
  const { mapSkin } = useMapStore();
  const color = mapSkin === "nvg" ? "#39ff14" : mapSkin === "crt" ? "#00ffcc" : "rgba(255,200,80,0.7)";

  // Generate stable random positions around the circle edge (outside it)
  const satLabels = satellites.slice(0, 18).map((s, i) => {
    const angle = (i / 18) * 2 * Math.PI - Math.PI / 2;
    const r = 50 + (i % 3) * 3; // 50–56% from center — just outside 72/2=36% radius
    const x = 50 + r * Math.cos(angle);
    const y = 50 + r * Math.sin(angle);
    return { label: s.name.slice(0, 10), x, y };
  });

  const vehLabels = vessels.slice(0, 8).map((v, i) => {
    const angle = ((i + 2) / 10) * 2 * Math.PI;
    const r = 47 + (i % 4) * 2;
    const x = 50 + r * Math.cos(angle);
    const y = 50 + r * Math.sin(angle);
    return { label: `VEH-${(v.mmsi || "").slice(-4) || String(1000 + i)}`, x, y };
  });

  return (
    <div style={{ position: "absolute", inset: 0, zIndex: 2, pointerEvents: "none" }}>
      {[...satLabels.map(l => ({ ...l, prefix: "SAT" })), ...vehLabels.map(l => ({ ...l, prefix: "VEH" }))].map((item, i) => {
        // Only show if outside the circle area (x or y far from center)
        const dx = item.x - 50, dy = item.y - 50;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 38) return null; // too close to center — inside circle
        return (
          <div key={i} style={{
            position: "absolute",
            left: `${item.x}%`, top: `${item.y}%`,
            transform: "translate(-50%, -50%)",
            fontSize: 7, fontFamily: "monospace", fontWeight: 600,
            color, letterSpacing: "0.5px",
            whiteSpace: "nowrap",
            opacity: 0.7,
          }}>
            {item.label}
          </div>
        );
      })}
    </div>
  );
}

// ── Panoptic Detection Overlay ────────────────────────────────────────────────
function PanopticOverlay() {
  const [scanY, setScanY] = useState(0);
  const [detections, setDetections] = useState<{ x: number; y: number; w: number; h: number; label: string }[]>([]);

  // Animated scan line
  useEffect(() => {
    const id = setInterval(() => {
      setScanY((y) => (y + 0.4) % 100);
    }, 16);
    return () => clearInterval(id);
  }, []);

  // Randomize detection boxes periodically
  useEffect(() => {
    function randomDetections() {
      const LABELS = ["VEHICLE", "AIRCRAFT", "VESSEL", "STRUCTURE", "PERSON", "UNKNOWN"];
      const count = 4 + Math.floor(Math.random() * 5);
      return Array.from({ length: count }, () => ({
        x: 5 + Math.random() * 80,
        y: 5 + Math.random() * 80,
        w: 4 + Math.random() * 12,
        h: 3 + Math.random() * 8,
        label: LABELS[Math.floor(Math.random() * LABELS.length)],
      }));
    }
    setDetections(randomDetections());
    const id = setInterval(() => setDetections(randomDetections()), 3000);
    return () => clearInterval(id);
  }, []);

  return (
    <div style={{
      position: "absolute", inset: 0, zIndex: 8, pointerEvents: "none",
      overflow: "hidden",
    }}>
      {/* Grid overlay */}
      <div style={{
        position: "absolute", inset: 0,
        backgroundImage: `
          linear-gradient(rgba(0,255,80,0.06) 1px, transparent 1px),
          linear-gradient(90deg, rgba(0,255,80,0.06) 1px, transparent 1px)
        `,
        backgroundSize: "60px 60px",
      }} />

      {/* Scan line */}
      <div style={{
        position: "absolute", left: 0, right: 0,
        top: `${scanY}%`,
        height: "2px",
        background: "linear-gradient(90deg, transparent, rgba(0,255,80,0.6), rgba(0,255,80,0.8), rgba(0,255,80,0.6), transparent)",
        boxShadow: "0 0 8px rgba(0,255,80,0.4)",
      }} />

      {/* Detection boxes */}
      {detections.map((d, i) => (
        <div key={i} style={{
          position: "absolute",
          left: `${d.x}%`, top: `${d.y}%`,
          width: `${d.w}%`, height: `${d.h}%`,
          border: "1px solid rgba(0,255,80,0.7)",
          boxShadow: "0 0 6px rgba(0,255,80,0.3) inset, 0 0 4px rgba(0,255,80,0.3)",
        }}>
          {/* Corner ticks */}
          <div style={{ position:"absolute", top:-1, left:-1, width:6, height:6, borderTop:"2px solid #00ff50", borderLeft:"2px solid #00ff50" }} />
          <div style={{ position:"absolute", top:-1, right:-1, width:6, height:6, borderTop:"2px solid #00ff50", borderRight:"2px solid #00ff50" }} />
          <div style={{ position:"absolute", bottom:-1, left:-1, width:6, height:6, borderBottom:"2px solid #00ff50", borderLeft:"2px solid #00ff50" }} />
          <div style={{ position:"absolute", bottom:-1, right:-1, width:6, height:6, borderBottom:"2px solid #00ff50", borderRight:"2px solid #00ff50" }} />
          <div style={{
            position: "absolute", top: -14, left: 0,
            fontSize: 7, fontFamily: "monospace", fontWeight: 700,
            color: "#00ff50", letterSpacing: "0.5px",
            whiteSpace: "nowrap",
          }}>
            {d.label} [{(80 + Math.random() * 19).toFixed(1)}%]
          </div>
        </div>
      ))}

      {/* HUD corners */}
      <div style={{ position:"absolute", top:8, left:8, fontSize:9, fontFamily:"monospace", color:"rgba(0,255,80,0.6)", letterSpacing:"0.8px" }}>
        PANOPTIC SCAN ACTIVE<br/>
        <span style={{ fontSize:7, opacity:0.5 }}>RES:1080p | MODE:WIDE | LAT:{scanY.toFixed(1)}°</span>
      </div>
      <div style={{ position:"absolute", top:8, right:8, fontSize:9, fontFamily:"monospace", color:"rgba(0,255,80,0.6)", letterSpacing:"0.8px", textAlign:"right" }}>
        {new Date().toISOString().slice(11,19)} UTC<br/>
        <span style={{ fontSize:7, opacity:0.5 }}>TARGETS: {detections.length} DETECTED</span>
      </div>
    </div>
  );
}
