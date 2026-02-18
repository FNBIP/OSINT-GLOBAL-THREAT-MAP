"use client";

/**
 * Map Layer Toggles
 *
 * Matches worldmonitor's layer toggle pill strip exactly:
 * - Horizontal scrollable row of pill buttons anchored to bottom-left of the map
 * - Active layer = blue highlight, inactive = dim
 * - Same layer order as worldmonitor's fullLayers list
 */

import { useMapStore, LAYER_LABELS } from "@/stores/map-store";
import type { MapLayers } from "@/stores/map-store";

// Same order as worldmonitor's fullLayers array
const LAYER_ORDER: (keyof MapLayers)[] = [
  "conflicts",
  "hotspots",
  "sanctions",
  "protests",
  "bases",
  "nuclear",
  "cables",
  "pipelines",
  "outages",
  "ais",
  "flights",
  "natural",
  "weather",
  "economic",
  "waterways",
];

export function MapControls() {
  const layers = useMapStore((s) => s.layers);
  const toggleLayer = useMapStore((s) => s.toggleLayer);

  return (
    <div
      style={{
        position: "absolute",
        bottom: "28px",
        left: "10px",
        right: "10px",
        zIndex: 10,
        display: "flex",
        alignItems: "center",
        gap: "4px",
        overflowX: "auto",
        scrollbarWidth: "none",
        paddingBottom: "2px",
      }}
    >
      {LAYER_ORDER.map((layer) => {
        const active = layers[layer];
        return (
          <button
            key={layer}
            onClick={() => toggleLayer(layer)}
            title={LAYER_LABELS[layer]}
            style={{
              flexShrink: 0,
              fontSize: "10px",
              fontWeight: 600,
              padding: "4px 9px",
              borderRadius: "4px",
              cursor: "pointer",
              whiteSpace: "nowrap",
              letterSpacing: "0.3px",
              transition: "all 0.15s ease",
              background: active
                ? "rgba(0,170,255,0.2)"
                : "rgba(10,10,10,0.75)",
              color: active ? "#00aaff" : "rgba(255,255,255,0.4)",
              border: `1px solid ${active ? "rgba(0,170,255,0.45)" : "rgba(255,255,255,0.1)"}`,
              backdropFilter: "blur(6px)",
              WebkitBackdropFilter: "blur(6px)",
            }}
            onMouseEnter={(e) => {
              if (!active) {
                e.currentTarget.style.color = "rgba(255,255,255,0.75)";
                e.currentTarget.style.borderColor = "rgba(255,255,255,0.25)";
              }
            }}
            onMouseLeave={(e) => {
              if (!active) {
                e.currentTarget.style.color = "rgba(255,255,255,0.4)";
                e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)";
              }
            }}
          >
            {LAYER_LABELS[layer]}
          </button>
        );
      })}

      <style>{`
        div::-webkit-scrollbar { display: none; }
      `}</style>
    </div>
  );
}
