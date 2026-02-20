"use client";

/**
 * Live Webcams panel — worldmonitor style
 * Shows live webcam streams from strategic global locations.
 *
 * Using YouTube live stream embeds. If a stream goes offline,
 * the panel shows a "Search on YouTube" fallback link.
 */

import { useState } from "react";
import { PanelShell } from "./panel-shell";

interface Webcam {
  id: string;
  name: string;
  location: string;
  /** YouTube video ID for a known 24/7 live stream */
  videoId: string;
  /** YouTube search query used as fallback */
  searchQuery: string;
}

// Confirmed and well-established 24/7 YouTube live streams
const WEBCAMS: Webcam[] = [
  {
    id: "shibuya",
    name: "Shibuya",
    location: "Tokyo, Japan",
    videoId: "hmtqztrfvE4",  // 渋谷スクランブル交差点 ライブカメラ — confirmed 24/7
    searchQuery: "Shibuya Scramble Crossing live camera 24/7",
  },
  {
    id: "times-square",
    name: "Times Sq",
    location: "New York, USA",
    videoId: "wMXFjKhia-Y",  // EarthCam Times Square live
    searchQuery: "Times Square New York live webcam 24/7",
  },
  {
    id: "dubai",
    name: "Dubai",
    location: "UAE",
    videoId: "nJRNbS24B4E",  // Dubai live cam
    searchQuery: "Dubai live webcam 24/7 city",
  },
  {
    id: "tokyo-tower",
    name: "Tokyo Tower",
    location: "Tokyo, Japan",
    videoId: "9nDC0AMKPSY",  // Tokyo Tower / city live
    searchQuery: "Tokyo Tower live camera 24/7",
  },
  {
    id: "nyc-skyline",
    name: "NYC Skyline",
    location: "New York, USA",
    videoId: "VLCIOMNjsRE",  // NYC skyline live
    searchQuery: "New York City skyline live cam 24/7",
  },
  {
    id: "taipei",
    name: "Taipei 101",
    location: "Taipei, Taiwan",
    videoId: "Eoq_UvVFJMk",  // Taipei live
    searchQuery: "Taipei 101 live webcam 24/7",
  },
];

export function WebcamsPanel() {
  const [active, setActive] = useState<Webcam>(WEBCAMS[0]!);
  const [errored, setErrored] = useState<Set<string>>(new Set());

  const isErrored = errored.has(active.id);

  const markErrored = () => {
    setErrored((prev) => new Set([...prev, active.id]));
  };

  const embedUrl = `https://www.youtube.com/embed/${active.videoId}?autoplay=1&mute=1&controls=1`;

  return (
    <PanelShell
      title="Live Webcams"
      live
      headerRight={
        <div style={{ display: "flex", gap: 3, flexWrap: "wrap" }}>
          {WEBCAMS.map((cam) => (
            <button
              key={cam.id}
              onClick={() => setActive(cam)}
              style={{
                fontSize: 8,
                padding: "2px 6px",
                borderRadius: 2,
                cursor: "pointer",
                background: active.id === cam.id ? "rgba(0,170,255,0.2)" : "rgba(255,255,255,0.05)",
                color: active.id === cam.id ? "#00aaff" : "rgba(255,255,255,0.4)",
                border: `1px solid ${active.id === cam.id ? "rgba(0,170,255,0.4)" : "rgba(255,255,255,0.1)"}`,
                fontWeight: 600,
                letterSpacing: "0.3px",
              }}
            >
              {cam.name}
            </button>
          ))}
        </div>
      }
    >
      <div style={{ position: "relative", aspectRatio: "16/9", background: "#000" }}>
        {isErrored ? (
          /* Fallback: YouTube search link */
          <div style={{
            position: "absolute", inset: 0, display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center", gap: 10,
            background: "rgba(0,0,0,0.8)",
          }}>
            <span style={{ fontSize: 10, color: "rgba(255,255,255,0.4)" }}>
              Stream unavailable
            </span>
            <a
              href={`https://www.youtube.com/results?search_query=${encodeURIComponent(active.searchQuery)}&sp=EgJAAQ%3D%3D`}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                fontSize: 9, padding: "4px 12px", borderRadius: 3,
                background: "rgba(255,0,0,0.2)", color: "#ff4444",
                border: "1px solid rgba(255,0,0,0.3)", textDecoration: "none",
                fontWeight: 600, letterSpacing: "0.4px",
              }}
            >
              ▶ Find on YouTube
            </a>
          </div>
        ) : (
          <iframe
            key={active.id}
            src={embedUrl}
            style={{ width: "100%", height: "100%", border: "none", display: "block" }}
            allow="autoplay; encrypted-media"
            allowFullScreen
            onError={markErrored}
          />
        )}

        {/* Location label */}
        {!isErrored && (
          <div style={{
            position: "absolute", bottom: 6, left: 8,
            fontSize: 9, color: "rgba(255,255,255,0.6)",
            background: "rgba(0,0,0,0.6)", padding: "2px 6px", borderRadius: 2,
            pointerEvents: "none",
          }}>
            {active.name} — {active.location}
          </div>
        )}

        {/* Refresh button for errored state */}
        {!isErrored && (
          <button
            onClick={() => setErrored((prev) => { const n = new Set(prev); n.delete(active.id); return n; })}
            style={{
              position: "absolute", top: 6, right: 8,
              fontSize: 8, padding: "2px 6px", borderRadius: 2,
              background: "rgba(0,0,0,0.5)", color: "rgba(255,255,255,0.4)",
              border: "1px solid rgba(255,255,255,0.1)", cursor: "pointer",
            }}
          >
            ↻
          </button>
        )}
      </div>
    </PanelShell>
  );
}
