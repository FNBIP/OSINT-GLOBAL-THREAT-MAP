"use client";

/**
 * Traffic & City Cams Panel
 * Live public webcam streams from major cities — traffic, ports, city centers.
 * Uses YouTube embeds for cameras with live streams.
 */

import { useState } from "react";
import { PanelShell } from "./panel-shell";

interface CamFeed {
  id: string;
  label: string;
  city: string;
  type: "youtube" | "embed";
  src: string; // YouTube video ID or embed URL
}

// Public live streams — traffic cams, city cams, port cams
const CAMS: CamFeed[] = [
  { id: "austin-tx",      label: "Austin, TX — Downtown",    city: "Austin",      type: "youtube", src: "hKEqas8XFNE" },
  { id: "nyc-times",      label: "NYC — Times Square",       city: "New York",    type: "youtube", src: "sTGN6QBXZLQ" },
  { id: "chicago-loop",   label: "Chicago — The Loop",       city: "Chicago",     type: "youtube", src: "M6sBGIiGMnA" },
  { id: "la-traffic",     label: "Los Angeles — Freeway",    city: "Los Angeles", type: "youtube", src: "dCEhMr_kUCs" },
  { id: "london-bridge",  label: "London — Tower Bridge",    city: "London",      type: "youtube", src: "oYUFVaOVhCY" },
  { id: "tokyo-shibuya",  label: "Tokyo — Shibuya Crossing", city: "Tokyo",       type: "youtube", src: "hmtqztrfvE4" },
  { id: "dubai-marina",   label: "Dubai — Marina Walk",      city: "Dubai",       type: "youtube", src: "jtGXHI0QGWA" },
  { id: "paris-seine",    label: "Paris — Seine River",      city: "Paris",       type: "youtube", src: "cizgrukvp7c" },
  { id: "singapore-bay",  label: "Singapore — Marina Bay",   city: "Singapore",   type: "youtube", src: "PBiGkSMjuNE" },
  { id: "hong-kong-harbor", label: "Hong Kong — Harbour",   city: "Hong Kong",   type: "youtube", src: "tyxzBBxOibQ" },
  { id: "istanbul-bosphorus", label: "Istanbul — Bosphorus", city: "Istanbul",    type: "youtube", src: "Oqcp4J5ItcQ" },
  { id: "sydney-opera",   label: "Sydney — Opera House",     city: "Sydney",      type: "youtube", src: "RVko2pCRXzk" },
];

const CITIES = ["All", ...Array.from(new Set(CAMS.map((c) => c.city)))];

function CamTile({ cam }: { cam: CamFeed }) {
  const [error, setError] = useState(false);
  const embedUrl = cam.type === "youtube"
    ? `https://www.youtube.com/embed/${cam.src}?autoplay=1&mute=1&controls=0&modestbranding=1&rel=0&loop=1&playlist=${cam.src}`
    : cam.src;

  return (
    <div style={{
      position: "relative",
      background: "#0a0a0a",
      border: "1px solid rgba(255,255,255,0.06)",
      borderRadius: 3,
      overflow: "hidden",
      aspectRatio: "16/9",
    }}>
      {!error ? (
        <iframe
          src={embedUrl}
          allow="autoplay; encrypted-media"
          style={{ width: "100%", height: "100%", border: "none" }}
          onError={() => setError(true)}
          title={cam.label}
        />
      ) : (
        <div style={{
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
          height: "100%", padding: 8,
        }}>
          <div style={{ fontSize: 8, color: "rgba(255,255,255,0.3)", marginBottom: 4 }}>Stream unavailable</div>
          <a
            href={`https://www.youtube.com/watch?v=${cam.src}`}
            target="_blank" rel="noopener noreferrer"
            style={{ fontSize: 8, color: "#00aaff", textDecoration: "none" }}
          >
            Open on YouTube →
          </a>
        </div>
      )}
      {/* Label overlay */}
      <div style={{
        position: "absolute", bottom: 0, left: 0, right: 0,
        padding: "4px 6px",
        background: "linear-gradient(transparent, rgba(0,0,0,0.8))",
        fontSize: 8, color: "rgba(255,255,255,0.7)", fontWeight: 600,
        letterSpacing: "0.3px",
      }}>
        {cam.label}
      </div>
      {/* Live badge */}
      <div style={{
        position: "absolute", top: 4, left: 4,
        fontSize: 7, fontWeight: 800, padding: "1px 4px",
        borderRadius: 2, background: "#ef4444", color: "#fff",
        letterSpacing: "0.5px",
      }}>
        LIVE
      </div>
    </div>
  );
}

export function TrafficCamsPanel() {
  const [activeCam, setActiveCam] = useState<CamFeed | null>(null);
  const [cityFilter, setCityFilter] = useState("All");

  const filtered = cityFilter === "All" ? CAMS : CAMS.filter((c) => c.city === cityFilter);

  return (
    <PanelShell title="Traffic & City Cams" live count={filtered.length}>
      {/* City filter tabs */}
      <div style={{
        display: "flex", gap: 4, padding: "4px 8px",
        overflowX: "auto", scrollbarWidth: "none", flexShrink: 0,
        borderBottom: "1px solid rgba(255,255,255,0.05)",
      }}>
        {CITIES.slice(0, 8).map((city) => (
          <button
            key={city}
            onClick={() => setCityFilter(city)}
            style={{
              flexShrink: 0, fontSize: 8, fontWeight: 700, padding: "3px 7px",
              borderRadius: 3, cursor: "pointer", whiteSpace: "nowrap",
              background: cityFilter === city ? "rgba(0,170,255,0.15)" : "transparent",
              color: cityFilter === city ? "#00aaff" : "rgba(255,255,255,0.35)",
              border: `1px solid ${cityFilter === city ? "rgba(0,170,255,0.4)" : "transparent"}`,
            }}
          >
            {city}
          </button>
        ))}
      </div>

      {/* Fullscreen selected cam */}
      {activeCam && (
        <div style={{ position: "relative", flexShrink: 0 }}>
          <CamTile cam={activeCam} />
          <button
            onClick={() => setActiveCam(null)}
            style={{
              position: "absolute", top: 4, right: 4,
              fontSize: 9, padding: "2px 6px", cursor: "pointer",
              background: "rgba(0,0,0,0.7)", color: "#fff",
              border: "1px solid rgba(255,255,255,0.2)", borderRadius: 3,
            }}
          >✕ Close</button>
        </div>
      )}

      {/* Grid of cams */}
      <div style={{
        overflowY: "auto", flex: 1,
        display: "grid",
        gridTemplateColumns: "repeat(2, 1fr)",
        gap: 4, padding: 6,
      }}>
        {filtered.filter((c) => c !== activeCam).map((cam) => (
          <div
            key={cam.id}
            onClick={() => setActiveCam(cam === activeCam ? null : cam)}
            style={{ cursor: "pointer" }}
          >
            <div style={{
              background: "#0a0a0a",
              border: "1px solid rgba(255,255,255,0.06)",
              borderRadius: 3, overflow: "hidden",
              aspectRatio: "16/9",
              display: "flex", alignItems: "center", justifyContent: "center",
              position: "relative",
            }}>
              {/* Placeholder thumbnail */}
              <div style={{
                position: "absolute", inset: 0,
                background: "linear-gradient(135deg, #0a0a14 0%, #0d1117 100%)",
              }} />
              <div style={{
                position: "relative", textAlign: "center", padding: 4,
              }}>
                <div style={{ fontSize: 16, marginBottom: 4 }}>📷</div>
                <div style={{ fontSize: 7, color: "rgba(255,255,255,0.5)", lineHeight: 1.3 }}>{cam.label}</div>
              </div>
              <div style={{
                position: "absolute", bottom: 0, left: 0, right: 0,
                padding: "3px 5px",
                background: "rgba(0,0,0,0.6)",
                fontSize: 7, color: "rgba(255,255,255,0.6)",
              }}>
                Click to expand
              </div>
            </div>
          </div>
        ))}
      </div>
    </PanelShell>
  );
}
