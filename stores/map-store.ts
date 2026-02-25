import { create } from "zustand";
import type { MapViewport, GeoLocation } from "@/types";

interface EntityLocationMarker extends GeoLocation {
  entityName: string;
}

export interface MilitaryBaseMarker {
  country: string;
  baseName: string;
  latitude: number;
  longitude: number;
  type: "usa" | "nato";
}

// Worldmonitor-style map layers (matching their fullLayers list)
export interface MapLayers {
  conflicts:   boolean;
  hotspots:    boolean;
  sanctions:   boolean;
  protests:    boolean;
  bases:       boolean;
  nuclear:     boolean;
  cables:      boolean;
  pipelines:   boolean;
  outages:     boolean;
  ais:         boolean;
  flights:     boolean;
  satellites:  boolean;
  natural:     boolean;
  weather:     boolean;
  economic:    boolean;
  waterways:   boolean;
  traffic:     boolean;  // Mapbox real-time road traffic
  cctv:        boolean;  // CCTV / traffic camera feeds
}

export const LAYER_LABELS: Record<keyof MapLayers, string> = {
  conflicts:   "Conflicts",
  hotspots:    "Hotspots",
  sanctions:   "Sanctions",
  protests:    "Protests",
  bases:       "Mil. Bases",
  nuclear:     "Nuclear",
  cables:      "Cables",
  pipelines:   "Pipelines",
  outages:     "Outages",
  ais:         "AIS / Ships",
  flights:     "Flights",
  satellites:  "Satellites",
  natural:     "Natural",
  weather:     "Weather",
  economic:    "Economic",
  waterways:   "Waterways",
  traffic:     "Traffic",
  cctv:        "CCTV Mesh",
};

const DEFAULT_LAYERS: MapLayers = {
  conflicts:   true,
  hotspots:    true,
  sanctions:   true,
  protests:    false,
  bases:       true,
  nuclear:     true,
  cables:      true,
  pipelines:   true,
  outages:     true,
  ais:         false,
  flights:     false,
  satellites:  false,
  natural:     true,
  weather:     true,
  economic:    true,
  waterways:   true,
  traffic:     false,
  cctv:        false,
};

export type MapSkin = "eo" | "flir" | "crt" | "nvg" | "anime" | "noir" | "snow" | "ai";

interface MapState {
  viewport: MapViewport;
  showHeatmap: boolean;
  showClusters: boolean;
  showWatchboxes: boolean;
  showMilitaryBases: boolean;
  isDrawingWatchbox: boolean;
  activeWatchboxId: string | null;
  isAutoPlaying: boolean;
  entityLocations: EntityLocationMarker[];
  militaryBases: MilitaryBaseMarker[];
  militaryBasesLoading: boolean;
  layers: MapLayers;
  mapSkin: MapSkin;
  showPanoptic: boolean;

  setViewport: (viewport: Partial<MapViewport>) => void;
  flyTo: (longitude: number, latitude: number, zoom?: number) => void;
  toggleHeatmap: () => void;
  toggleClusters: () => void;
  toggleWatchboxes: () => void;
  toggleMilitaryBases: () => void;
  toggleLayer: (layer: keyof MapLayers) => void;
  startDrawingWatchbox: () => void;
  stopDrawingWatchbox: () => void;
  setActiveWatchbox: (id: string | null) => void;
  startAutoPlay: () => void;
  stopAutoPlay: () => void;
  setEntityLocations: (entityName: string, locations: GeoLocation[]) => void;
  clearEntityLocations: () => void;
  setMilitaryBases: (bases: MilitaryBaseMarker[]) => void;
  setMilitaryBasesLoading: (loading: boolean) => void;
  setMapSkin: (skin: MapSkin) => void;
  togglePanoptic: () => void;
}

const DEFAULT_VIEWPORT: MapViewport = {
  longitude: 0,
  latitude: 20,
  zoom: 2,
  bearing: 0,
  pitch: 0,
};

export const useMapStore = create<MapState>((set) => ({
  viewport: DEFAULT_VIEWPORT,
  showHeatmap: false,
  showClusters: true,
  showWatchboxes: true,
  showMilitaryBases: true,
  isDrawingWatchbox: false,
  activeWatchboxId: null,
  isAutoPlaying: false,
  entityLocations: [],
  militaryBases: [],
  militaryBasesLoading: false,
  layers: DEFAULT_LAYERS,
  mapSkin: "eo",
  showPanoptic: false,

  setViewport: (viewport) =>
    set((state) => ({
      viewport: { ...state.viewport, ...viewport },
    })),

  flyTo: (longitude, latitude, zoom = 13) =>
    set((state) => ({
      viewport: {
        ...state.viewport,
        longitude,
        latitude,
        zoom,
        pitch: zoom > 10 ? 45 : 0,   // tilt into 3D view when zoomed in
        bearing: 0,
      },
    })),

  toggleHeatmap: () =>
    set((state) => ({
      showHeatmap: !state.showHeatmap,
    })),

  toggleClusters: () =>
    set((state) => ({
      showClusters: !state.showClusters,
    })),

  toggleWatchboxes: () =>
    set((state) => ({
      showWatchboxes: !state.showWatchboxes,
    })),

  toggleMilitaryBases: () =>
    set((state) => ({
      showMilitaryBases: !state.showMilitaryBases,
      layers: { ...state.layers, bases: !state.showMilitaryBases },
    })),

  toggleLayer: (layer) =>
    set((state) => {
      const next = !state.layers[layer];
      // Keep showMilitaryBases in sync with the bases layer
      return {
        layers: { ...state.layers, [layer]: next },
        ...(layer === "bases" ? { showMilitaryBases: next } : {}),
      };
    }),

  startDrawingWatchbox: () => set({ isDrawingWatchbox: true }),

  stopDrawingWatchbox: () => set({ isDrawingWatchbox: false }),

  setActiveWatchbox: (id) => set({ activeWatchboxId: id }),

  startAutoPlay: () => set({ isAutoPlaying: true }),

  stopAutoPlay: () => set({ isAutoPlaying: false }),

  setEntityLocations: (entityName, locations) =>
    set({
      entityLocations: locations.map((loc) => ({
        ...loc,
        entityName,
      })),
    }),

  clearEntityLocations: () => set({ entityLocations: [] }),

  setMilitaryBases: (bases) => set({ militaryBases: bases }),

  setMilitaryBasesLoading: (loading) => set({ militaryBasesLoading: loading }),

  setMapSkin: (skin) => set({ mapSkin: skin }),

  togglePanoptic: () => set((state) => ({ showPanoptic: !state.showPanoptic })),
}));
