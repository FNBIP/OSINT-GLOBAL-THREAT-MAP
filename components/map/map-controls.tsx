"use client";

/**
 * Map Layer Toggles — pill strip (worldmonitor style)
 *
 * The skin selector, PANOPTIC toggle, and city bar have been moved
 * to the WorldviewHUD component for the WORLDVIEW-style classified UI.
 */

import type { CSSProperties } from "react";
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
  "satellites",
  "natural",
  "weather",
  "economic",
  "waterways",
];

const pillBase: CSSProperties = {
  flexShrink: 0,
  fontSize: "10px",
  fontWeight: 600,
  padding: "4px 9px",
  borderRadius: "4px",
  cursor: "pointer",
  whiteSpace: "nowrap",
  letterSpacing: "0.3px",
  transition: "all 0.15s ease",
  backdropFilter: "blur(6px)",
  WebkitBackdropFilter: "blur(6px)",
};

export function MapControls() {
  const layers      = useMapStore((s) => s.layers);
  const toggleLayer = useMapStore((s) => s.toggleLayer);

  return (
    <div style={{
      position: "absolute",
      bottom: "52px",
      left: "280px",    // clear the left-side WorldviewHUD panel (270px + gap)
      right: "10px",
      zIndex: 10,
      display: "flex",
      flexDirection: "column",
      gap: "5px",
    }}>
      {/* ── Layer pill strip ── */}
      <div style={{
        display: "flex",
        alignItems: "center",
        gap: "4px",
        overflowX: "auto",
        scrollbarWidth: "none",
        paddingBottom: "2px",
      }}>
        <span style={{ fontSize: 9, fontWeight: 700, color: "rgba(255,255,255,0.3)", letterSpacing: "0.5px", marginRight: 2, flexShrink: 0 }}>
          LAYERS
        </span>
        {LAYER_ORDER.map((layer) => {
          const active = layers[layer];
          return (
            <button
              key={layer}
              onClick={() => toggleLayer(layer)}
              title={LAYER_LABELS[layer]}
              style={{
                ...pillBase,
                background: active ? "rgba(0,170,255,0.2)" : "rgba(10,10,10,0.75)",
                color: active ? "#00aaff" : "rgba(255,255,255,0.4)",
                border: `1px solid ${active ? "rgba(0,170,255,0.45)" : "rgba(255,255,255,0.1)"}`,
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
        <style>{`div::-webkit-scrollbar { display: none; }`}</style>
      </div>
    </div>
  );
}
