"use client";

/**
 * Map Layer Toggles + Skin Selector + Panoptic Toggle
 *
 * Top row: EO | FLIR | CRT skin selector + PANOPTIC button
 * Bottom row: Layer pill strip (worldmonitor style)
 */

import type { CSSProperties } from "react";
import { useMapStore, LAYER_LABELS } from "@/stores/map-store";
import type { MapLayers, MapSkin } from "@/stores/map-store";

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

const SKIN_OPTIONS: { id: MapSkin; label: string; color: string }[] = [
  { id: "eo",   label: "EO",   color: "#00aaff" },
  { id: "flir", label: "FLIR", color: "#00ff88" },
  { id: "crt",  label: "CRT",  color: "#00ff50" },
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
  const layers       = useMapStore((s) => s.layers);
  const toggleLayer  = useMapStore((s) => s.toggleLayer);
  const mapSkin      = useMapStore((s) => s.mapSkin);
  const setMapSkin   = useMapStore((s) => s.setMapSkin);
  const showPanoptic = useMapStore((s) => s.showPanoptic);
  const togglePanoptic = useMapStore((s) => s.togglePanoptic);

  return (
    <div style={{
      position: "absolute",
      bottom: "28px",
      left: "10px",
      right: "10px",
      zIndex: 10,
      display: "flex",
      flexDirection: "column",
      gap: "5px",
    }}>
      {/* ── Skin selector + Panoptic ── */}
      <div style={{ display: "flex", gap: "4px", alignItems: "center" }}>
        <span style={{ fontSize: 9, fontWeight: 700, color: "rgba(255,255,255,0.3)", letterSpacing: "0.5px", marginRight: 2 }}>SENSOR</span>
        {SKIN_OPTIONS.map((s) => {
          const active = mapSkin === s.id;
          return (
            <button
              key={s.id}
              onClick={() => setMapSkin(s.id)}
              style={{
                ...pillBase,
                background: active ? `${s.color}22` : "rgba(10,10,10,0.75)",
                color: active ? s.color : "rgba(255,255,255,0.4)",
                border: `1px solid ${active ? `${s.color}66` : "rgba(255,255,255,0.1)"}`,
                fontFamily: s.id === "crt" ? "monospace" : undefined,
              }}
            >
              {s.label}
            </button>
          );
        })}

        {/* Divider */}
        <div style={{ width: 1, height: 16, background: "rgba(255,255,255,0.1)", margin: "0 2px" }} />

        {/* Panoptic toggle */}
        <button
          onClick={togglePanoptic}
          title="Panoptic detection overlay"
          style={{
            ...pillBase,
            background: showPanoptic ? "rgba(0,255,80,0.15)" : "rgba(10,10,10,0.75)",
            color: showPanoptic ? "#00ff50" : "rgba(255,255,255,0.4)",
            border: `1px solid ${showPanoptic ? "rgba(0,255,80,0.5)" : "rgba(255,255,255,0.1)"}`,
            fontFamily: "monospace",
          }}
        >
          {showPanoptic ? "◉ PANOPTIC" : "◎ PANOPTIC"}
        </button>
      </div>

      {/* ── Layer pill strip ── */}
      <div style={{
        display: "flex",
        alignItems: "center",
        gap: "4px",
        overflowX: "auto",
        scrollbarWidth: "none",
        paddingBottom: "2px",
      }}>
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
