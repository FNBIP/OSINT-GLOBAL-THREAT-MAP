"use client";

/**
 * Traffic & City Cams Panel — CCTV Mesh
 *
 * Real live traffic camera JPEG images from government DOT & transport agencies
 * worldwide, proxied through /api/cctv to avoid CORS.
 *
 * Images auto-refresh every 15 seconds, giving a near-real-time surveillance
 * feel. When a feed fails, animated canvas static/noise shows "NO SIGNAL".
 */

import { useCallback, useEffect, useRef, useState } from "react";

interface CamInfo {
  id: string;
  label: string;
  city: string;
  country: string;
  camCode: string;
}

// Camera catalog — mirrors the server-side list in /api/cctv
// We only store metadata here; images come from /api/cctv?id=<id>
const CAMERAS: CamInfo[] = [
  // London (TfL JamCams)
  { id: "london-tower-bridge",      label: "London — Tower Bridge",              city: "London",      country: "GB", camCode: "CAM-01" },
  { id: "london-trafalgar",         label: "London — Trafalgar Square",          city: "London",      country: "GB", camCode: "CAM-02" },
  { id: "london-westminster",       label: "London — Westminster Bridge",        city: "London",      country: "GB", camCode: "CAM-03" },
  { id: "london-park-lane",         label: "London — Park Lane / Hyde Park",     city: "London",      country: "GB", camCode: "CAM-04" },
  { id: "london-a40-westway",       label: "London — A40 Westway",              city: "London",      country: "GB", camCode: "CAM-05" },
  // Singapore (data.gov.sg — 5 cameras)
  { id: "singapore-sle-1006",       label: "Singapore — SLE Mandai",             city: "Singapore",   country: "SG", camCode: "CAM-06" },
  { id: "singapore-bke-1003",       label: "Singapore — BKE Dairy Farm",         city: "Singapore",   country: "SG", camCode: "CAM-07" },
  { id: "singapore-ecp-1001",       label: "Singapore — ECP Benjamin Sheares",   city: "Singapore",   country: "SG", camCode: "CAM-12" },
  { id: "singapore-cte-1004",       label: "Singapore — CTE Moulmein",           city: "Singapore",   country: "SG", camCode: "CAM-13" },
  { id: "singapore-pie-1005",       label: "Singapore — PIE Clementi",           city: "Singapore",   country: "SG", camCode: "CAM-14" },
  // Los Angeles (Caltrans D7)
  { id: "la-i110-cypress",          label: "Los Angeles — I-110 Cypress Park",   city: "Los Angeles", country: "US", camCode: "CAM-09" },
  { id: "la-i5-slauson",            label: "Los Angeles — I-5 @ Slauson",        city: "Los Angeles", country: "US", camCode: "CAM-10" },
  { id: "la-i5-south-i10",          label: "Los Angeles — I-5 South of I-10",    city: "Los Angeles", country: "US", camCode: "CAM-11" },
  // Hong Kong (data.one.gov.hk — verified IDs)
  { id: "hk-tsing-yi",              label: "Hong Kong — Tsing Yi Bridge",        city: "Hong Kong",   country: "HK", camCode: "CAM-15" },
  { id: "hk-tuen-mun",              label: "Hong Kong — Tuen Mun Road",          city: "Hong Kong",   country: "HK", camCode: "CAM-16" },
  { id: "hk-kwai-chung",            label: "Hong Kong — Kwai Chung Expressway",  city: "Hong Kong",   country: "HK", camCode: "CAM-17" },
  { id: "hk-tai-po",                label: "Hong Kong — Tai Po Road",            city: "Hong Kong",   country: "HK", camCode: "CAM-18" },
];

const CITIES = ["All", ...Array.from(new Set(CAMERAS.map((c) => c.city)))];
const mono: React.CSSProperties = { fontFamily: "monospace", letterSpacing: "0.5px" };
const REFRESH_MS = 15_000;  // refresh images every 15s

// ── Animated static / noise canvas ─────────────────────────────────────────────
function StaticNoise() {
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
        const v = Math.random() * 40;
        data[i] = v; data[i + 1] = v; data[i + 2] = v; data[i + 3] = 255;
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
      width={160}
      height={90}
      style={{ width: "100%", height: "100%", display: "block", imageRendering: "pixelated" }}
    />
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

// ── Single camera tile ──────────────────────────────────────────────────────────
function CamTile({ cam, expanded = false }: { cam: CamInfo; expanded?: boolean }) {
  const [imgSrc, setImgSrc] = useState<string | null>(null);
  const [offline, setOffline] = useState(false);

  // Auto-refresh image every REFRESH_MS using fetch to properly check status
  useEffect(() => {
    let cancelled = false;

    const loadImage = async () => {
      try {
        const url = `/api/cctv?id=${cam.id}&t=${Date.now()}`;
        const res = await fetch(url, { cache: "no-store" });
        if (cancelled) return;
        const ct = res.headers.get("content-type") || "";
        if (res.ok && ct.startsWith("image/")) {
          // Create object URL from blob for reliable display
          const blob = await res.blob();
          if (cancelled) return;
          const objectUrl = URL.createObjectURL(blob);
          setImgSrc((prev) => { if (prev?.startsWith("blob:")) URL.revokeObjectURL(prev); return objectUrl; });
          setOffline(false);
        } else {
          setOffline(true);
        }
      } catch {
        if (!cancelled) setOffline(true);
      }
    };

    loadImage();
    const interval = setInterval(loadImage, REFRESH_MS);
    return () => { cancelled = true; clearInterval(interval); };
  }, [cam.id]);

  return (
    <div style={{
      position: "relative",
      background: "#050505",
      border: `1px solid ${offline ? "rgba(255,50,50,0.25)" : "rgba(0,255,100,0.15)"}`,
      borderRadius: 2,
      overflow: "hidden",
      aspectRatio: "16/9",
    }}>
      {/* Live image */}
      {imgSrc && !offline && (
        <img
          src={imgSrc}
          alt={cam.label}
          style={{
            width: "100%", height: "100%",
            objectFit: "cover",
            display: "block",
          }}
        />
      )}

      {/* Static noise when offline */}
      {(offline || !imgSrc) && (
        <div style={{ position: "absolute", inset: 0 }}>
          <StaticNoise />
          <div style={{
            position: "absolute", inset: 0,
            backgroundImage: "repeating-linear-gradient(0deg, rgba(0,0,0,0.5) 0px, rgba(0,0,0,0.5) 1px, transparent 1px, transparent 3px)",
            pointerEvents: "none",
          }} />
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

      {/* Corner brackets */}
      {(["tl","tr","bl","br"] as const).map((c) => (
        <div key={c} style={{
          position: "absolute", width: 8, height: 8, pointerEvents: "none", zIndex: 3,
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

      {/* REC badge + cam code */}
      <div style={{
        position: "absolute", top: 4, left: 10, zIndex: 3,
        display: "flex", alignItems: "center", gap: 4,
        pointerEvents: "none",
      }}>
        <span style={{
          fontSize: 7, fontWeight: 800, ...mono, padding: "1px 4px",
          borderRadius: 2,
          background: offline ? "rgba(255,50,50,0.5)" : "rgba(255,50,50,0.85)",
          color: "#fff", animation: offline ? "none" : "wv-blink 1s step-end infinite",
        }}>REC</span>
        <span style={{ fontSize: 7, fontWeight: 700, color: "rgba(255,255,255,0.6)", ...mono }}>
          {cam.camCode}
        </span>
      </div>

      {/* Timestamp */}
      <div style={{
        position: "absolute", top: 4, right: 10, zIndex: 3,
        fontSize: 7, color: "rgba(255,255,255,0.4)", ...mono,
        pointerEvents: "none",
      }}>
        <TimestampTick />
      </div>

      {/* Bottom label + status badge */}
      <div style={{
        position: "absolute", bottom: 0, left: 0, right: 0, zIndex: 3,
        padding: "3px 10px",
        background: "linear-gradient(transparent, rgba(0,0,0,0.85))",
        fontSize: 8, color: "rgba(255,255,255,0.7)", fontWeight: 600,
        ...mono,
        display: "flex", justifyContent: "space-between", alignItems: "center",
      }}>
        <span>{cam.label}</span>
        <span style={{
          fontSize: 6, padding: "1px 3px", borderRadius: 2,
          background: offline ? "rgba(255,50,50,0.3)" : "rgba(0,255,80,0.2)",
          color: offline ? "#ff5555" : "#00ff50",
          border: `1px solid ${offline ? "rgba(255,50,50,0.4)" : "rgba(0,255,80,0.3)"}`,
        }}>
          {offline ? "OFFLINE" : "LIVE"}
        </span>
      </div>

      {/* Scanlines overlay (subtle, over live feed) */}
      {!offline && imgSrc && (
        <div style={{
          position: "absolute", inset: 0, pointerEvents: "none", zIndex: 2,
          backgroundImage: "repeating-linear-gradient(0deg, rgba(0,0,0,0.12) 0px, rgba(0,0,0,0.12) 1px, transparent 1px, transparent 3px)",
        }} />
      )}
    </div>
  );
}

// ── Main panel ──────────────────────────────────────────────────────────────────
export function TrafficCamsPanel() {
  const [activeCam, setActiveCam] = useState<CamInfo | null>(null);
  const [cityFilter, setCityFilter] = useState("All");

  const filtered = cityFilter === "All" ? CAMERAS : CAMERAS.filter((c) => c.city === cityFilter);
  const onlineCount = filtered.length; // optimistic

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

      {/* City filter */}
      <div style={{
        display: "flex", gap: 3, padding: "4px 8px",
        overflowX: "auto", scrollbarWidth: "none", flexShrink: 0,
        borderBottom: "1px solid rgba(255,255,255,0.04)",
      }}>
        {CITIES.map((city) => (
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
          >{city}</button>
        ))}
      </div>

      {/* Expanded cam */}
      {activeCam && (
        <div style={{ position: "relative", flexShrink: 0, margin: "4px 6px 0" }}>
          <CamTile cam={activeCam} expanded />
          <button
            onClick={() => setActiveCam(null)}
            style={{
              position: "absolute", top: 4, right: 32, zIndex: 5,
              fontSize: 8, padding: "2px 6px", cursor: "pointer",
              background: "rgba(0,0,0,0.8)", color: "#fff",
              border: "1px solid rgba(255,255,255,0.2)", borderRadius: 2,
              ...mono,
            }}
          >✕ CLOSE</button>
        </div>
      )}

      {/* Camera grid */}
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

      {/* Bottom status */}
      <div style={{
        padding: "3px 10px",
        borderTop: "1px solid rgba(255,255,255,0.04)",
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <span style={{ fontSize: 7, color: "rgba(255,255,255,0.2)", ...mono }}>
          WORLDVIEW CCTV NETWORK • REFRESH 15s
        </span>
        <span style={{ fontSize: 7, color: "rgba(255,255,255,0.2)", ...mono }}>
          {filtered.length}/{CAMERAS.length} ACTIVE
        </span>
      </div>

      {/* REC blink animation */}
      <style>{`@keyframes wv-blink { 0%,100%{opacity:1} 50%{opacity:0.15} }`}</style>
    </div>
  );
}
