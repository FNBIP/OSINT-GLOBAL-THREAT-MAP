"use client";

/**
 * WorldviewHUD — WORLDVIEW-style classified intelligence UI overlay
 *
 * Features:
 * - Circular telescope / lens viewport vignette
 * - TOP SECRET // SI-TK // NOFORN classified header (top-left)
 * - REC timestamp + ORB/PASS orbital data (top-right)
 * - PANOPTIC stats bar (very top)
 * - Bottom city quick-jump bar
 * - Bottom skin selector (Normal / CRT / NVG / FLIR / Anime / Noir / Snow / AI)
 * - Right-side parameters panel (BLOOM, SHARPEN, HUD, PANOPTIC, PARAMETERS sliders)
 * - MGRS + geodetic coordinates (bottom-left corner)
 * - GSD / NIIRS / ALT / SUN telemetry (bottom-right corner)
 */

import { useEffect, useState, useRef, useCallback } from "react";
import { useMapStore } from "@/stores/map-store";
import type { MapSkin } from "@/stores/map-store";

// ── City quick-jump locations ─────────────────────────────────────────────────
const CITIES = [
  { name: "Austin",        lon: -97.7431,  lat: 30.2672 },
  { name: "San Francisco", lon: -122.4194, lat: 37.7749 },
  { name: "New York",      lon: -74.0060,  lat: 40.7128 },
  { name: "Tokyo",         lon: 139.6917,  lat: 35.6895 },
  { name: "London",        lon: -0.1276,   lat: 51.5074 },
  { name: "Paris",         lon: 2.3522,    lat: 48.8566 },
  { name: "Dubai",         lon: 55.2708,   lat: 25.2048 },
  { name: "Washington DC", lon: -77.0369,  lat: 38.9072 },
];

// ── Skin options matching WORLDVIEW bottom bar ────────────────────────────────
const SKIN_BAR: { id: MapSkin; label: string; icon: string }[] = [
  { id: "eo",    label: "Normal", icon: "○" },
  { id: "crt",   label: "CRT",    icon: "▣" },
  { id: "nvg",   label: "NVG",    icon: "◑" },
  { id: "flir",  label: "FLIR",   icon: "◈" },
  { id: "anime", label: "Anime",  icon: "◇" },
  { id: "noir",  label: "Noir",   icon: "◐" },
  { id: "snow",  label: "Snow",   icon: "❄" },
  { id: "ai",    label: "AI Edit",icon: "◈" },
];

// ── MGRS helper (simplified) ──────────────────────────────────────────────────
function toMGRS(lat: number, lon: number): string {
  const zone = Math.floor((lon + 180) / 6) + 1;
  const band = "CDEFGHJKLMNPQRSTUVWX"[Math.max(0, Math.floor((lat + 80) / 8))];
  const easting = Math.round(Math.abs(lon * 1000) % 100000);
  const northing = Math.round(Math.abs(lat * 1000) % 100000);
  return `${zone}${band || "N"} ${String(easting).padStart(5, "0")} ${String(northing).padStart(5, "0")}`;
}

function toDMS(lat: number, lon: number): string {
  const fmt = (v: number, pos: string, neg: string) => {
    const dir = v >= 0 ? pos : neg;
    const abs = Math.abs(v);
    const deg = Math.floor(abs);
    const minF = (abs - deg) * 60;
    const min = Math.floor(minF);
    const sec = ((minF - min) * 60).toFixed(2);
    return `${deg}°${String(min).padStart(2,"0")}'${String(sec).padStart(5,"0")}"${dir}`;
  };
  return `${fmt(lat, "N", "S")} ${fmt(lon, "E", "W")}`;
}

// ── Slider component ──────────────────────────────────────────────────────────
function HudSlider({ value, color = "#00aaff", onChange }: {
  value: number; color?: string; onChange?: (v: number) => void
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 4, flex: 1 }}>
      <div style={{
        flex: 1, height: 3, background: "rgba(255,255,255,0.1)", borderRadius: 2,
        position: "relative", cursor: "pointer",
      }}
        onClick={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          const v = Math.round(((e.clientX - rect.left) / rect.width) * 100);
          onChange?.(v);
        }}
      >
        <div style={{
          position: "absolute", left: 0, top: 0, bottom: 0,
          width: `${value}%`, background: color, borderRadius: 2,
        }} />
        <div style={{
          position: "absolute", top: "50%", left: `${value}%`,
          transform: "translate(-50%, -50%)",
          width: 8, height: 8, borderRadius: "50%", background: color,
          boxShadow: `0 0 6px ${color}`,
        }} />
      </div>
    </div>
  );
}

// ── Main HUD component ────────────────────────────────────────────────────────
export function WorldviewHUD({
  mapLat = 0,
  mapLon = 0,
  mapZoom = 2,
}: {
  mapLat?: number;
  mapLon?: number;
  mapZoom?: number;
}) {
  const { mapSkin, setMapSkin, showPanoptic, togglePanoptic, flyTo } = useMapStore();

  const [now, setNow] = useState(new Date());
  const [bloom, setBloom] = useState(100);
  const [sharpen, setSharpen] = useState(56);
  const [panopticOpacity, setPanopticOpacity] = useState(40);
  const [pixelation, setPixelation] = useState(30);
  const [distortion, setDistortion] = useState(60);
  const [instability, setInstability] = useState(50);
  const [activeCity, setActiveCity] = useState<string | null>(null);
  const [panopticVis, setPanopticVis] = useState(14);
  const [panopticSrc, setPanopticSrc] = useState(1966);
  const [panopticDens, setPanopticDens] = useState(1.46);
  const [panopticLat, setPanopticLat] = useState(3.6);
  const [rightPanelOpen, setRightPanelOpen] = useState(true);

  // Live clock
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  // Animate panoptic stats
  useEffect(() => {
    if (!showPanoptic) return;
    const id = setInterval(() => {
      setPanopticVis(v => Math.max(1, Math.min(200, v + (Math.random() - 0.5) * 10 | 0)));
      setPanopticSrc(v => Math.max(100, v + (Math.random() - 0.5) * 200 | 0));
      setPanopticDens(v => Math.max(0.1, parseFloat((v + (Math.random() - 0.5) * 0.3).toFixed(2))));
      setPanopticLat(v => Math.max(0.5, parseFloat((v + (Math.random() - 0.5) * 0.4).toFixed(1))));
    }, 800);
    return () => clearInterval(id);
  }, [showPanoptic]);

  // Compute telemetry from zoom
  const altKm = Math.round(500 * Math.pow(2, (14 - mapZoom)));
  const gsd = (altKm * 0.3).toFixed(2);
  const niirs = Math.max(0, Math.min(9, (9 - mapZoom * 0.3))).toFixed(1);
  const sunEl = (-36.4 + mapLat * 0.1).toFixed(1);

  // Orbital pass counter (fake but consistent)
  const orbCount = 47439 + Math.floor((now.getTime() / 90000) % 1000);

  const skinColor: Record<MapSkin, string> = {
    eo:    "#00aaff",
    flir:  "#00ff88",
    crt:   "#00ff50",
    nvg:   "#39ff14",
    anime: "#ff66cc",
    noir:  "#aaaaaa",
    snow:  "#cceeff",
    ai:    "#aa88ff",
  };
  const activeColor = skinColor[mapSkin] ?? "#00aaff";

  const skinLabel: Record<MapSkin, string> = {
    eo:    "EO",
    flir:  "FLIR",
    crt:   "CRT",
    nvg:   "NVG",
    anime: "ANIME",
    noir:  "NOIR",
    snow:  "SNOW",
    ai:    "AI",
  };

  const mono: React.CSSProperties = { fontFamily: "monospace", letterSpacing: "0.5px" };

  return (
    <>
      {/* ── PANOPTIC stats bar (very top) ── */}
      {showPanoptic && (
        <div style={{
          position: "absolute", top: 0, left: 0, right: 0, zIndex: 20,
          height: 18,
          background: "rgba(0,0,0,0.6)",
          borderBottom: "1px solid rgba(0,255,80,0.2)",
          display: "flex", alignItems: "center", gap: 12,
          paddingLeft: 8, paddingRight: 8,
          ...mono,
        }}>
          <span style={{ color: "#00ff50", fontSize: 9, fontWeight: 700 }}>PANOPTIC</span>
          <span style={{ color: "rgba(0,255,80,0.7)", fontSize: 9 }}>
            VIS:<span style={{ color: "#00ff50" }}>{panopticVis}</span>
          </span>
          <span style={{ color: "rgba(0,255,80,0.7)", fontSize: 9 }}>
            SRC:<span style={{ color: "#00ff50" }}>{panopticSrc}</span>
          </span>
          <span style={{ color: "rgba(0,255,80,0.7)", fontSize: 9 }}>
            DENS:<span style={{ color: "#00ff50" }}>{panopticDens}</span>
          </span>
          <span style={{ color: "rgba(0,255,80,0.7)", fontSize: 9 }}>
            <span style={{ color: "#00ff50" }}>{panopticLat}ms</span>
          </span>
        </div>
      )}

      {/* ── Top-left: Classified header ── */}
      <div style={{
        position: "absolute", top: showPanoptic ? 22 : 8, left: 10, zIndex: 20,
        ...mono,
        pointerEvents: "none",
      }}>
        <div style={{ color: "#ff3333", fontSize: 9, fontWeight: 700, letterSpacing: "1px", marginBottom: 1 }}>
          TOP SECRET // SI-TK // NOFORN
        </div>
        <div style={{ color: "rgba(255,200,100,0.7)", fontSize: 8, marginBottom: 2 }}>
          KH11-4166 OPS-4117
        </div>
        <div style={{ color: activeColor, fontSize: 14, fontWeight: 700, letterSpacing: "2px", marginBottom: 3 }}>
          {skinLabel[mapSkin]}
        </div>
        <div style={{ color: "rgba(255,255,255,0.35)", fontSize: 7, letterSpacing: "0.5px", marginBottom: 1 }}>
          SUMMARY
        </div>
        <div style={{ color: "rgba(255,255,255,0.6)", fontSize: 8, maxWidth: 260 }}>
          {skinLabel[mapSkin]} GLOBAL NEAR {activeCity?.toUpperCase() || "CURRENT VIEW"} | 0KM | NORTH...
        </div>
      </div>

      {/* ── Top-right: ACTIVE STYLE + REC + ORB ── */}
      <div style={{
        position: "absolute", top: showPanoptic ? 22 : 8, right: 10, zIndex: 20,
        textAlign: "right", ...mono, pointerEvents: "none",
      }}>
        <div style={{ color: "rgba(255,255,255,0.3)", fontSize: 8, letterSpacing: "1px", marginBottom: 2 }}>
          ACTIVE STYLE
        </div>
        <div style={{ color: activeColor, fontSize: 14, fontWeight: 700, letterSpacing: "2px", marginBottom: 6 }}>
          {skinLabel[mapSkin]}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 4, justifyContent: "flex-end", marginBottom: 1 }}>
          <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#ff3333", animation: "wv-blink 1s step-end infinite" }} />
          <span style={{ color: "#ff3333", fontSize: 8, fontWeight: 700 }}>REC</span>
          <span style={{ color: "rgba(255,255,255,0.6)", fontSize: 8 }}>
            {now.toISOString().slice(0,10).replace(/-/g,"/")} {now.toTimeString().slice(0,8)}Z
          </span>
        </div>
        <div style={{ color: "rgba(255,255,255,0.4)", fontSize: 8 }}>
          ORB: {orbCount} PASS: DESC-179
        </div>
      </div>

      {/* ── Lens outer glow ring — sits around the circular map ── */}
      <div style={{
        position: "absolute", inset: 0, zIndex: 9, pointerEvents: "none",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        <div style={{
          width: "min(76vw, 76vh)",
          height: "min(76vw, 76vh)",
          borderRadius: "50%",
          border: `1px solid rgba(255,255,255,0.14)`,
          boxShadow: `0 0 0 1px rgba(255,255,255,0.04), 0 0 30px rgba(0,0,0,0.5)`,
          flexShrink: 0,
        }} />
      </div>

      {/* ── Lens crosshair (center) ── */}
      <div style={{
        position: "absolute", inset: 0, zIndex: 10, pointerEvents: "none",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        <div style={{ position: "relative", width: 40, height: 40, opacity: 0.25 }}>
          <div style={{ position:"absolute", left:"50%", top:0, bottom:0, width:1, background: activeColor, transform:"translateX(-50%)" }} />
          <div style={{ position:"absolute", top:"50%", left:0, right:0, height:1, background: activeColor, transform:"translateY(-50%)" }} />
          <div style={{ position:"absolute", inset: 12, border:`1px solid ${activeColor}`, borderRadius:"50%" }} />
        </div>
      </div>

      {/* ── Bottom-left: MGRS + DMS coordinates ── */}
      <div style={{
        position: "absolute", bottom: 80, left: 10, zIndex: 20,
        ...mono, pointerEvents: "none",
      }}>
        <div style={{ color: "rgba(255,255,255,0.5)", fontSize: 8, marginBottom: 1 }}>
          MGRS: {toMGRS(mapLat, mapLon)}
        </div>
        <div style={{ color: "rgba(255,255,255,0.4)", fontSize: 8 }}>
          {toDMS(mapLat, mapLon)}
        </div>
      </div>

      {/* ── Bottom-right: GSD / NIIRS / ALT / SUN telemetry ── */}
      <div style={{
        position: "absolute", bottom: 80, right: rightPanelOpen ? 260 : 10, zIndex: 20,
        textAlign: "right", ...mono, pointerEvents: "none",
        transition: "right 0.3s ease",
      }}>
        <div style={{ color: "rgba(255,220,0,0.8)", fontSize: 9, fontWeight: 700 }}>
          GSD: {gsd}M NIIRS: {niirs}
        </div>
        <div style={{ color: "rgba(255,255,255,0.5)", fontSize: 8 }}>
          ALT: {altKm.toLocaleString()}M SUN: {sunEl}° EL
        </div>
      </div>

      {/* ── Right-side parameters panel ── */}
      <div style={{
        position: "absolute", top: showPanoptic ? 62 : 48, right: 0, zIndex: 20,
        width: rightPanelOpen ? 250 : 0,
        overflow: "hidden",
        transition: "width 0.3s ease",
        background: "rgba(5,5,5,0.88)",
        borderLeft: `1px solid rgba(255,255,255,0.08)`,
        backdropFilter: "blur(8px)",
        WebkitBackdropFilter: "blur(8px)",
      }}>
        <div style={{ padding: "10px 12px", minWidth: 250 }}>
          {/* BLOOM */}
          <div style={{ marginBottom: 8 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
              <span style={{ fontSize: 9, fontWeight: 700, color: "rgba(255,255,255,0.6)", fontFamily:"monospace", letterSpacing:"0.5px" }}>
                ✦ BLOOM
              </span>
              <span style={{ fontSize: 9, color: "#00aaff", fontFamily:"monospace" }}>{bloom}%</span>
            </div>
            <HudSlider value={bloom} color="#00aaff" onChange={setBloom} />
          </div>

          {/* SHARPEN */}
          <div style={{ marginBottom: 8 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#00aaff" }} />
                <span style={{ fontSize: 9, fontWeight: 700, color: "rgba(255,255,255,0.6)", fontFamily:"monospace", letterSpacing:"0.5px" }}>SHARPEN</span>
              </div>
              <span style={{ fontSize: 9, color: "#00aaff", fontFamily:"monospace" }}>{sharpen}%</span>
            </div>
            <HudSlider value={sharpen} color="#00aaff" onChange={setSharpen} />
          </div>

          {/* HUD */}
          <div style={{ marginBottom: 8 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
              <span style={{ fontSize: 9, fontWeight: 700, color: "#ffffff", fontFamily:"monospace", letterSpacing:"0.5px", background:"rgba(255,255,255,0.1)", padding:"1px 6px", borderRadius:2 }}>HUD</span>
            </div>
            {/* Layout dropdown */}
            <div style={{ marginBottom: 6, display:"flex", alignItems:"center", gap:6 }}>
              <span style={{ fontSize:8, color:"rgba(255,255,255,0.35)", fontFamily:"monospace" }}>LAYOUT</span>
              <div style={{
                flex:1, display:"flex", alignItems:"center", justifyContent:"space-between",
                background:"rgba(255,255,255,0.06)", border:"1px solid rgba(255,255,255,0.12)",
                borderRadius:3, padding:"2px 6px",
              }}>
                <span style={{ fontSize:9, color:"rgba(255,255,255,0.7)", fontFamily:"monospace" }}>Tactical</span>
                <span style={{ fontSize:8, color:"rgba(255,255,255,0.4)" }}>▾</span>
              </div>
            </div>
          </div>

          {/* PANOPTIC toggle */}
          <div style={{ marginBottom: 8 }}>
            <div
              onClick={togglePanoptic}
              style={{
                display: "flex", justifyContent: "space-between", alignItems: "center",
                background: showPanoptic ? "rgba(0,255,80,0.15)" : "rgba(255,255,255,0.05)",
                border: `1px solid ${showPanoptic ? "rgba(0,255,80,0.5)" : "rgba(255,255,255,0.1)"}`,
                borderRadius: 3, padding: "4px 8px", cursor: "pointer",
                marginBottom: 6,
              }}
            >
              <span style={{ fontSize: 9, fontWeight: 700, color: showPanoptic ? "#00ff50" : "rgba(255,255,255,0.5)", fontFamily:"monospace" }}>
                {showPanoptic ? "◉ " : "◎ "}PANOPTIC
              </span>
            </div>
            {showPanoptic && (
              <>
                <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:4 }}>
                  <span style={{ fontSize:7, color:"rgba(255,255,255,0.3)", fontFamily:"monospace", minWidth:50 }}>OPACITY</span>
                  <HudSlider value={panopticOpacity} color="#00ff50" onChange={setPanopticOpacity} />
                  <span style={{ fontSize:7, color:"#00ff50", fontFamily:"monospace", minWidth:22, textAlign:"right" }}>{panopticOpacity}%</span>
                </div>
              </>
            )}
          </div>

          {/* CLEAN UI button */}
          <div style={{
            background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: 3, padding: "4px 8px", marginBottom: 8, cursor:"pointer",
            display:"flex", alignItems:"center", justifyContent:"center",
          }}>
            <span style={{ fontSize: 9, color: "rgba(255,255,255,0.5)", fontFamily:"monospace" }}>CLEAN UI</span>
          </div>

          {/* PARAMETERS section */}
          <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: 8 }}>
            <div style={{ fontSize: 8, color: "rgba(255,255,255,0.25)", fontFamily:"monospace", letterSpacing:"0.5px", marginBottom: 6 }}>
              PARAMETERS
            </div>

            {/* Skin-specific params */}
            {(mapSkin === "crt") && (
              <>
                <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:5 }}>
                  <span style={{ fontSize:8, color:"rgba(255,255,255,0.4)", fontFamily:"monospace", minWidth:60 }}>Pixelation</span>
                  <HudSlider value={pixelation} color="#00aaff" onChange={setPixelation} />
                </div>
                <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:5 }}>
                  <span style={{ fontSize:8, color:"rgba(255,255,255,0.4)", fontFamily:"monospace", minWidth:60 }}>Distortion</span>
                  <HudSlider value={distortion} color="#00aaff" onChange={setDistortion} />
                </div>
                <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:5 }}>
                  <span style={{ fontSize:8, color:"rgba(255,255,255,0.4)", fontFamily:"monospace", minWidth:60 }}>Instability</span>
                  <HudSlider value={instability} color="#00aaff" onChange={setInstability} />
                </div>
              </>
            )}
            {(mapSkin === "flir") && (
              <>
                <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:5 }}>
                  <span style={{ fontSize:8, color:"rgba(255,255,255,0.4)", fontFamily:"monospace", minWidth:60 }}>Sensitivity</span>
                  <HudSlider value={70} color="#00ff88" />
                </div>
                <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:5 }}>
                  <span style={{ fontSize:8, color:"rgba(255,255,255,0.4)", fontFamily:"monospace", minWidth:60 }}>Bloom</span>
                  <HudSlider value={bloom} color="#00ff88" onChange={setBloom} />
                </div>
                <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:5 }}>
                  <span style={{ fontSize:8, color:"rgba(255,255,255,0.4)", fontFamily:"monospace", minWidth:60 }}>SHOT/BNOT</span>
                  <HudSlider value={45} color="#00ff88" />
                </div>
                <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:5 }}>
                  <span style={{ fontSize:8, color:"rgba(255,255,255,0.4)", fontFamily:"monospace", minWidth:60 }}>Pixelation</span>
                  <HudSlider value={pixelation} color="#00ff88" onChange={setPixelation} />
                </div>
              </>
            )}
            {(mapSkin === "nvg") && (
              <>
                <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:5 }}>
                  <span style={{ fontSize:8, color:"rgba(255,255,255,0.4)", fontFamily:"monospace", minWidth:60 }}>Gain</span>
                  <HudSlider value={75} color="#39ff14" />
                </div>
                <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:5 }}>
                  <span style={{ fontSize:8, color:"rgba(255,255,255,0.4)", fontFamily:"monospace", minWidth:60 }}>Noise</span>
                  <HudSlider value={30} color="#39ff14" />
                </div>
              </>
            )}
            {(mapSkin === "eo" || mapSkin === "anime" || mapSkin === "noir" || mapSkin === "snow" || mapSkin === "ai") && (
              <>
                <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:5 }}>
                  <span style={{ fontSize:8, color:"rgba(255,255,255,0.4)", fontFamily:"monospace", minWidth:60 }}>Contrast</span>
                  <HudSlider value={50} color={activeColor} />
                </div>
                <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:5 }}>
                  <span style={{ fontSize:8, color:"rgba(255,255,255,0.4)", fontFamily:"monospace", minWidth:60 }}>Saturation</span>
                  <HudSlider value={60} color={activeColor} />
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ── Panel toggle button ── */}
      <div
        onClick={() => setRightPanelOpen(o => !o)}
        style={{
          position:"absolute", top: "50%", right: rightPanelOpen ? 250 : 0,
          transform:"translateY(-50%)",
          zIndex:21, cursor:"pointer",
          background:"rgba(0,0,0,0.7)", border:"1px solid rgba(255,255,255,0.1)",
          borderRight:"none", borderRadius:"4px 0 0 4px",
          padding:"6px 3px",
          transition:"right 0.3s ease",
        }}
      >
        <span style={{ fontSize:8, color:"rgba(255,255,255,0.4)", writingMode:"vertical-rl" }}>
          {rightPanelOpen ? "▶" : "◀"}
        </span>
      </div>

      {/* ── City quick-jump bar ── */}
      <div style={{
        position: "absolute", bottom: 54, left: "50%", transform: "translateX(-50%)",
        zIndex: 20,
        display: "flex", gap: 0,
        background: "rgba(5,5,5,0.82)",
        border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: 4,
        backdropFilter: "blur(8px)",
        WebkitBackdropFilter: "blur(8px)",
        overflow: "hidden",
      }}>
        {CITIES.map((city) => {
          const isActive = activeCity === city.name;
          return (
            <button
              key={city.name}
              onClick={() => {
                setActiveCity(city.name);
                flyTo(city.lon, city.lat, 12);
              }}
              style={{
                background: isActive ? "rgba(0,170,255,0.2)" : "transparent",
                color: isActive ? "#00aaff" : "rgba(255,255,255,0.45)",
                border: "none",
                borderRight: "1px solid rgba(255,255,255,0.06)",
                padding: "4px 10px",
                fontSize: 9,
                fontFamily: "monospace",
                fontWeight: 600,
                cursor: "pointer",
                whiteSpace: "nowrap",
                letterSpacing: "0.3px",
                transition: "all 0.15s",
              }}
            >
              {city.name}
            </button>
          );
        })}
      </div>

      {/* ── Bottom skin selector bar ── */}
      <div style={{
        position: "absolute", bottom: 6, left: "50%", transform: "translateX(-50%)",
        zIndex: 20,
        display: "flex", gap: 2,
        background: "rgba(5,5,5,0.85)",
        border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: 6,
        padding: "4px 6px",
        backdropFilter: "blur(8px)",
        WebkitBackdropFilter: "blur(8px)",
      }}>
        {SKIN_BAR.map((s) => {
          const isActive = mapSkin === s.id;
          const col = skinColor[s.id];
          return (
            <button
              key={s.id}
              onClick={() => setMapSkin(s.id)}
              style={{
                display: "flex", flexDirection: "column", alignItems: "center", gap: 2,
                background: isActive ? `${col}22` : "transparent",
                border: `1px solid ${isActive ? `${col}66` : "transparent"}`,
                borderRadius: 4,
                padding: "4px 10px",
                cursor: "pointer",
                minWidth: 48,
              }}
            >
              <span style={{ fontSize: 14, color: isActive ? col : "rgba(255,255,255,0.3)" }}>
                {s.icon}
              </span>
              <span style={{
                fontSize: 8, fontFamily: "monospace", fontWeight: 600,
                color: isActive ? col : "rgba(255,255,255,0.35)",
                letterSpacing: "0.3px",
              }}>
                {s.label}
              </span>
            </button>
          );
        })}
      </div>

      {/* ── CSS keyframes ── */}
      <style>{`
        @keyframes wv-blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.2; }
        }
      `}</style>
    </>
  );
}
