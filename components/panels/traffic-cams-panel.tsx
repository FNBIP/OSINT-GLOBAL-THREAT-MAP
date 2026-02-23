"use client";

/**
 * Traffic & City Cams Panel — CCTV Mesh
 *
 * Live public webcam streams from major cities using verified YouTube embed IDs
 * sourced from SkylineWebcams (which configure their streams to allow embedding).
 *
 * When a stream is unavailable the tile shows an animated static/noise effect
 * that mimics a real CCTV system losing signal — matching the WORLDVIEW video.
 */

import { useCallback, useEffect, useRef, useState } from "react";

interface CamFeed {
  id: string;
  label: string;
  city: string;
  src: string;        // YouTube video ID
  camCode: string;    // e.g. "CAM-01"
}

// Verified YouTube IDs from SkylineWebcams (embedding allowed)
const CAMS: CamFeed[] = [
  { id: "austin-tx",       label: "Austin, TX — Skyline",        city: "Austin",        src: "BAUriyvzXPk", camCode: "CAM-01" },
  { id: "nyc-times",       label: "NYC — Times Square",          city: "New York",      src: "rnXIjl_Rzy4", camCode: "CAM-02" },
  { id: "tokyo-shibuya",   label: "Tokyo — Shibuya Crossing",    city: "Tokyo",         src: "dfVK7ld38Ys", camCode: "CAM-03" },
  { id: "london-thames",   label: "London — River Thames",       city: "London",        src: "v7RSr7RU-I0", camCode: "CAM-04" },
  { id: "paris-notre-dame", label: "Paris — Notre Dame / Seine", city: "Paris",         src: "4GCTq0j2O0U", camCode: "CAM-05" },
  { id: "singapore-port",  label: "Singapore — Port",            city: "Singapore",     src: "BcCLN2oCHb4", camCode: "CAM-06" },
  { id: "hong-kong",       label: "Hong Kong — Skyline",         city: "Hong Kong",     src: "7XT3EY_1NPU", camCode: "CAM-07" },
  { id: "dubai-palm",      label: "Dubai — Palm Jumeirah",       city: "Dubai",         src: "eLCq-_7MR3Q", camCode: "CAM-08" },
  { id: "dc-capitol",      label: "Washington DC — Capitol",     city: "Washington DC", src: "UeH7F6IqcpA", camCode: "CAM-09" },
  { id: "chicago-skyline", label: "Chicago — Downtown",          city: "Chicago",       src: "E3xLIjwfFqs", camCode: "CAM-10" },
  { id: "sydney-opera",    label: "Sydney — Opera House",        city: "Sydney",        src: "RVko2pCRXzk", camCode: "CAM-11" },
  { id: "istanbul-bosphor", label: "Istanbul — Bosphorus",       city: "Istanbul",      src: "Oqcp4J5ItcQ", camCode: "CAM-12" },
];

const CITIES = ["All", ...Array.from(new Set(CAMS.map((c) => c.city)))];

const mono: React.CSSProperties = { fontFamily: "monospace", letterSpacing: "0.5px" };

// ── Animated static / noise canvas ─────────────────────────────────────────────
function StaticNoise({ width = 320, height = 180 }: { width?: number; height?: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf: number;
    const draw = () => {
      const imageData = ctx.createImageData(canvas.width, canvas.height);
      const data = imageData.data;
      for (let i = 0; i < data.length; i += 4) {
        const v = Math.random() * 40;   // dark static
        data[i]     = v;
        data[i + 1] = v;
        data[i + 2] = v;
        data[i + 3] = 255;
      }
      ctx.putImageData(imageData, 0, 0);
      raf = requestAnimationFrame(draw);
    };
    draw();
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <canvas
      ref={canvasRef}
      width={width / 2}
      height={height / 2}
      style={{ width: "100%", height: "100%", display: "block", imageRendering: "pixelated" }}
    />
  );
}

// ── Single camera tile ──────────────────────────────────────────────────────────
function CamTile({ cam, expanded = false }: { cam: CamFeed; expanded?: boolean }) {
  const [status, setStatus] = useState<"loading" | "live" | "offline">("loading");
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // YouTube embed URL — autoplay muted, no controls, no branding
  const embedUrl = `https://www.youtube.com/embed/${cam.src}?autoplay=1&mute=1&controls=0&modestbranding=1&rel=0&loop=1&playlist=${cam.src}&playsinline=1`;

  // If iframe loads, mark as live after a delay (YouTube doesn't fire error reliably)
  const handleLoad = useCallback(() => {
    setTimeout(() => {
      if (status === "loading") setStatus("live");
    }, 2000);
  }, [status]);

  // After 8s, if still loading → treat as offline
  useEffect(() => {
    const timer = setTimeout(() => {
      if (status === "loading") setStatus("offline");
    }, 8000);
    return () => clearTimeout(timer);
  }, [status]);

  const showNoise = status === "offline";

  return (
    <div style={{
      position: "relative",
      background: "#050505",
      border: `1px solid ${showNoise ? "rgba(255,50,50,0.25)" : "rgba(0,255,100,0.15)"}`,
      borderRadius: 2,
      overflow: "hidden",
      aspectRatio: expanded ? "16/9" : "16/9",
    }}>
      {/* The iframe (hidden if offline) */}
      {!showNoise && (
        <iframe
          ref={iframeRef}
          src={embedUrl}
          allow="autoplay; encrypted-media"
          style={{
            width: "100%", height: "100%", border: "none",
            opacity: status === "live" ? 1 : 0.3,
            transition: "opacity 0.5s ease",
          }}
          onLoad={handleLoad}
          title={cam.label}
        />
      )}

      {/* Static noise when offline */}
      {showNoise && (
        <div style={{ position: "absolute", inset: 0 }}>
          <StaticNoise />
          {/* Scanlines over noise */}
          <div style={{
            position: "absolute", inset: 0,
            backgroundImage: "repeating-linear-gradient(0deg, rgba(0,0,0,0.5) 0px, rgba(0,0,0,0.5) 1px, transparent 1px, transparent 3px)",
            pointerEvents: "none",
          }} />
          {/* NO SIGNAL text */}
          <div style={{
            position: "absolute", inset: 0,
            display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center",
            pointerEvents: "none",
          }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: "rgba(255,60,60,0.8)", ...mono, marginBottom: 2 }}>
              NO SIGNAL
            </div>
            <div style={{ fontSize: 7, color: "rgba(255,255,255,0.3)", ...mono }}>
              {cam.camCode} • RECONNECTING...
            </div>
          </div>
        </div>
      )}

      {/* Corner brackets — CCTV style */}
      {(["tl","tr","bl","br"] as const).map((c) => (
        <div key={c} style={{
          position: "absolute", width: 8, height: 8, pointerEvents: "none",
          ...(c === "tl" ? { top: 2, left: 2 } :
              c === "tr" ? { top: 2, right: 2 } :
              c === "bl" ? { bottom: 2, left: 2 } :
                           { bottom: 2, right: 2 }),
          borderTop: c.startsWith("t") ? "1px solid rgba(0,255,80,0.5)" : "none",
          borderBottom: c.startsWith("b") ? "1px solid rgba(0,255,80,0.5)" : "none",
          borderLeft: c.endsWith("l") ? "1px solid rgba(0,255,80,0.5)" : "none",
          borderRight: c.endsWith("r") ? "1px solid rgba(0,255,80,0.5)" : "none",
        }} />
      ))}

      {/* Top-left: CAM code + REC */}
      <div style={{
        position: "absolute", top: 4, left: 10,
        display: "flex", alignItems: "center", gap: 4,
        pointerEvents: "none",
      }}>
        <span style={{
          fontSize: 7, fontWeight: 800, ...mono, padding: "1px 4px",
          borderRadius: 2,
          background: showNoise ? "rgba(255,50,50,0.7)" : "rgba(255,50,50,0.85)",
          color: "#fff",
        }}>
          REC
        </span>
        <span style={{ fontSize: 7, fontWeight: 700, color: "rgba(255,255,255,0.6)", ...mono }}>
          {cam.camCode}
        </span>
      </div>

      {/* Top-right: timestamp */}
      <div style={{
        position: "absolute", top: 4, right: 10,
        fontSize: 7, color: "rgba(255,255,255,0.4)", ...mono,
        pointerEvents: "none",
      }}>
        <TimestampTick />
      </div>

      {/* Bottom label */}
      <div style={{
        position: "absolute", bottom: 0, left: 0, right: 0,
        padding: "3px 10px",
        background: "linear-gradient(transparent, rgba(0,0,0,0.85))",
        fontSize: 8, color: "rgba(255,255,255,0.7)", fontWeight: 600,
        ...mono,
        display: "flex", justifyContent: "space-between", alignItems: "center",
      }}>
        <span>{cam.label}</span>
        <span style={{
          fontSize: 6, padding: "1px 3px", borderRadius: 2,
          background: showNoise ? "rgba(255,50,50,0.3)" : "rgba(0,255,80,0.2)",
          color: showNoise ? "#ff5555" : "#00ff50",
          border: `1px solid ${showNoise ? "rgba(255,50,50,0.4)" : "rgba(0,255,80,0.3)"}`,
        }}>
          {showNoise ? "OFFLINE" : "LIVE"}
        </span>
      </div>

      {/* Scanlines over live feed too (subtle) */}
      {!showNoise && (
        <div style={{
          position: "absolute", inset: 0, pointerEvents: "none", zIndex: 2,
          backgroundImage: "repeating-linear-gradient(0deg, rgba(0,0,0,0.15) 0px, rgba(0,0,0,0.15) 1px, transparent 1px, transparent 3px)",
        }} />
      )}
    </div>
  );
}

// ── Ticking timestamp ────────────────────────────────────────────────────────────
function TimestampTick() {
  const [time, setTime] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return <>{time.toISOString().slice(11, 19)}Z</>;
}

// ── Main panel ──────────────────────────────────────────────────────────────────
export function TrafficCamsPanel() {
  const [activeCam, setActiveCam] = useState<CamFeed | null>(null);
  const [cityFilter, setCityFilter] = useState("All");

  const filtered = cityFilter === "All" ? CAMS : CAMS.filter((c) => c.city === cityFilter);

  return (
    <div style={{
      background: "rgba(4,6,10,0.92)",
      backdropFilter: "blur(10px)",
      border: "1px solid rgba(255,255,255,0.06)",
      borderRadius: 4,
      display: "flex", flexDirection: "column",
      maxHeight: "55vh",
      overflow: "hidden",
    }}>
      {/* Header */}
      <div style={{
        padding: "6px 10px",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontSize: 10, color: "rgba(0,255,80,0.8)" }}>◎</span>
          <span style={{ fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.55)", ...mono }}>
            CCTV MESH
          </span>
          <span style={{
            fontSize: 7, padding: "1px 5px", borderRadius: 2,
            background: "rgba(0,255,80,0.12)", color: "#00ff50",
            border: "1px solid rgba(0,255,80,0.25)", ...mono,
          }}>
            {filtered.length} FEEDS
          </span>
        </div>
        <div style={{ fontSize: 7, color: "rgba(255,255,255,0.25)", ...mono }}>
          <TimestampTick />
        </div>
      </div>

      {/* City filter tabs */}
      <div style={{
        display: "flex", gap: 3, padding: "4px 8px",
        overflowX: "auto", scrollbarWidth: "none", flexShrink: 0,
        borderBottom: "1px solid rgba(255,255,255,0.04)",
      }}>
        {CITIES.slice(0, 10).map((city) => (
          <button
            key={city}
            onClick={() => { setCityFilter(city); setActiveCam(null); }}
            style={{
              flexShrink: 0, fontSize: 7, fontWeight: 700, padding: "2px 6px",
              borderRadius: 2, cursor: "pointer", whiteSpace: "nowrap",
              background: cityFilter === city ? "rgba(0,255,80,0.12)" : "transparent",
              color: cityFilter === city ? "#00ff50" : "rgba(255,255,255,0.3)",
              border: `1px solid ${cityFilter === city ? "rgba(0,255,80,0.3)" : "transparent"}`,
              ...mono,
            }}
          >
            {city}
          </button>
        ))}
      </div>

      {/* Expanded cam view */}
      {activeCam && (
        <div style={{ position: "relative", flexShrink: 0, margin: "4px 6px 0" }}>
          <CamTile cam={activeCam} expanded />
          <button
            onClick={() => setActiveCam(null)}
            style={{
              position: "absolute", top: 4, right: 32,
              fontSize: 8, padding: "2px 6px", cursor: "pointer",
              background: "rgba(0,0,0,0.8)", color: "#fff",
              border: "1px solid rgba(255,255,255,0.2)", borderRadius: 2,
              zIndex: 5, ...mono,
            }}
          >✕ CLOSE</button>
        </div>
      )}

      {/* Grid of camera tiles */}
      <div style={{
        overflowY: "auto", flex: 1,
        display: "grid",
        gridTemplateColumns: "repeat(2, 1fr)",
        gap: 3, padding: 6,
      }}>
        {filtered.filter((c) => c !== activeCam).map((cam) => (
          <div
            key={cam.id}
            onClick={() => setActiveCam(cam === activeCam ? null : cam)}
            style={{ cursor: "pointer" }}
          >
            <CamTile cam={cam} />
          </div>
        ))}
      </div>

      {/* Bottom status bar */}
      <div style={{
        padding: "3px 10px",
        borderTop: "1px solid rgba(255,255,255,0.04)",
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <span style={{ fontSize: 7, color: "rgba(255,255,255,0.2)", ...mono }}>
          WORLDVIEW CCTV NETWORK
        </span>
        <span style={{ fontSize: 7, color: "rgba(255,255,255,0.2)", ...mono }}>
          {filtered.length}/{CAMS.length} ACTIVE
        </span>
      </div>
    </div>
  );
}
