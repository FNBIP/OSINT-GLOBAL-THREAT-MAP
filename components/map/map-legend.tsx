"use client";

/**
 * Map Legend — worldmonitor style
 * Shows threat level colors, layer icons, and cluster legend.
 * Anchored to bottom-right of the map.
 */

import { useState } from "react";
import { useMapStore, LAYER_LABELS } from "@/stores/map-store";

const THREAT_LEVELS = [
  { label: "Critical", color: "#dc2626" },
  { label: "High",     color: "#ef4444" },
  { label: "Medium",   color: "#eab308" },
  { label: "Low",      color: "#3b82f6" },
  { label: "Info",     color: "#6b7280" },
];

const LAYER_COLORS: Record<string, string> = {
  conflicts:  "#ef4444",
  hotspots:   "#f97316",
  sanctions:  "#eab308",
  protests:   "#a78bfa",
  bases:      "#22c55e",
  nuclear:    "#00ffcc",
  cables:     "#a855f7",
  pipelines:  "#facc15",
  outages:    "#fb923c",
  ais:        "#38bdf8",
  flights:    "#94a3b8",
  natural:    "#4ade80",
  weather:    "#60a5fa",
  economic:   "#34d399",
  waterways:  "#22d3ee",
};

export function MapLegend() {
  const [open, setOpen] = useState(true);
  const layers = useMapStore((s) => s.layers);

  // Only show active layers in legend
  const activeLayers = (Object.keys(layers) as (keyof typeof layers)[]).filter(
    (k) => layers[k]
  );

  return (
    <div
      style={{
        position: "absolute",
        bottom: "60px",
        right: "10px",
        zIndex: 10,
        minWidth: 160,
        maxWidth: 200,
      }}
    >
      {/* Toggle button */}
      <button
        onClick={() => setOpen((v) => !v)}
        style={{
          marginBottom: 4,
          float: "right",
          fontSize: 9,
          padding: "2px 8px",
          borderRadius: 3,
          background: "rgba(10,10,10,0.85)",
          color: "rgba(255,255,255,0.5)",
          border: "1px solid rgba(255,255,255,0.12)",
          cursor: "pointer",
          backdropFilter: "blur(6px)",
          letterSpacing: "0.4px",
          fontWeight: 600,
        }}
      >
        {open ? "▾ LEGEND" : "▸ LEGEND"}
      </button>

      {open && (
        <div
          style={{
            clear: "both",
            background: "rgba(8,8,8,0.88)",
            border: "1px solid rgba(255,255,255,0.09)",
            borderRadius: 4,
            padding: "10px 12px",
            backdropFilter: "blur(8px)",
            WebkitBackdropFilter: "blur(8px)",
          }}
        >
          {/* Threat Levels */}
          <div style={{ marginBottom: 8 }}>
            <div style={{
              fontSize: 8, fontWeight: 700, letterSpacing: "0.8px",
              color: "rgba(255,255,255,0.35)", textTransform: "uppercase",
              marginBottom: 5,
            }}>
              Threat Level
            </div>
            {THREAT_LEVELS.map((t) => (
              <div key={t.label} style={{
                display: "flex", alignItems: "center", gap: 7, marginBottom: 3,
              }}>
                <div style={{
                  width: 8, height: 8, borderRadius: "50%",
                  background: t.color, flexShrink: 0,
                  boxShadow: `0 0 4px ${t.color}80`,
                }} />
                <span style={{ fontSize: 9, color: "rgba(255,255,255,0.6)" }}>{t.label}</span>
              </div>
            ))}
          </div>

          {/* Divider */}
          <div style={{ height: 1, background: "rgba(255,255,255,0.06)", marginBottom: 8 }} />

          {/* Active Layers */}
          {activeLayers.length > 0 && (
            <div>
              <div style={{
                fontSize: 8, fontWeight: 700, letterSpacing: "0.8px",
                color: "rgba(255,255,255,0.35)", textTransform: "uppercase",
                marginBottom: 5,
              }}>
                Active Layers
              </div>
              {activeLayers.map((layer) => (
                <div key={layer} style={{
                  display: "flex", alignItems: "center", gap: 7, marginBottom: 3,
                }}>
                  <div style={{
                    width: 8, height: 4, borderRadius: 1,
                    background: LAYER_COLORS[layer] ?? "#888",
                    flexShrink: 0,
                  }} />
                  <span style={{ fontSize: 9, color: "rgba(255,255,255,0.55)" }}>
                    {LAYER_LABELS[layer]}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Divider */}
          <div style={{ height: 1, background: "rgba(255,255,255,0.06)", margin: "8px 0" }} />

          {/* Clusters */}
          <div>
            <div style={{
              fontSize: 8, fontWeight: 700, letterSpacing: "0.8px",
              color: "rgba(255,255,255,0.35)", textTransform: "uppercase",
              marginBottom: 5,
            }}>
              Event Clusters
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              {["#3b82f6","#eab308","#f97316","#ef4444"].map((c, i) => (
                <div key={i} style={{
                  width: i === 0 ? 10 : i === 1 ? 14 : i === 2 ? 18 : 22,
                  height: i === 0 ? 10 : i === 1 ? 14 : i === 2 ? 18 : 22,
                  borderRadius: "50%",
                  background: c,
                  opacity: 0.85,
                  boxShadow: `0 0 5px ${c}60`,
                }} />
              ))}
              <span style={{ fontSize: 8, color: "rgba(255,255,255,0.3)", marginLeft: 2 }}>density</span>
            </div>
          </div>

          {/* Military bases */}
          {layers.bases && (
            <>
              <div style={{ height: 1, background: "rgba(255,255,255,0.06)", margin: "8px 0" }} />
              <div>
                <div style={{
                  fontSize: 8, fontWeight: 700, letterSpacing: "0.8px",
                  color: "rgba(255,255,255,0.35)", textTransform: "uppercase",
                  marginBottom: 5,
                }}>
                  Military Bases
                </div>
                {[
                  { label: "US / NATO",  color: "#22c55e" },
                  { label: "Russia",     color: "#ef4444" },
                  { label: "China",      color: "#f97316" },
                ].map((b) => (
                  <div key={b.label} style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 3 }}>
                    <div style={{
                      width: 8, height: 8,
                      background: b.color,
                      clipPath: "polygon(50% 0%, 0% 100%, 100% 100%)",
                      flexShrink: 0,
                    }} />
                    <span style={{ fontSize: 9, color: "rgba(255,255,255,0.55)" }}>{b.label}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
