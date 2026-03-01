"use client";

/**
 * WorldviewHUD — OSINT intel UI overlay
 * Data layers panel, skin selector, city quick-jump, telemetry.
 */

import { useEffect, useState } from "react";
import { useMapStore } from "@/stores/map-store";
import type { MapSkin } from "@/stores/map-store";

// ── City quick-jump locations ──────────────────────────────────────────────────
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

// ── Skin bottom bar ────────────────────────────────────────────────────────────
const SKIN_BAR: { id: MapSkin; label: string; icon: string }[] = [
  { id: "eo",    label: "Normal",  icon: "○" },
  { id: "crt",   label: "CRT",     icon: "▣" },
  { id: "nvg",   label: "NVG",     icon: "◑" },
  { id: "flir",  label: "FLIR",    icon: "◈" },
  { id: "anime", label: "Anime",   icon: "◇" },
  { id: "noir",  label: "Noir",    icon: "◐" },
  { id: "snow",  label: "Snow",    icon: "❄" },
  { id: "ai",    label: "AI Edit", icon: "✦" },
];

// ── MGRS helper ────────────────────────────────────────────────────────────────
function toMGRS(lat: number, lon: number): string {
  const zone = Math.floor((lon + 180) / 6) + 1;
  const bands = "CDEFGHJKLMNPQRSTUVWX";
  const band = bands[Math.max(0, Math.min(bands.length - 1, Math.floor((lat + 80) / 8)))];
  const e = Math.round(Math.abs(lon * 1000) % 100000);
  const n = Math.round(Math.abs(lat * 1000) % 100000);
  return `${zone}${band} YC ${String(e).padStart(4, "0")} ${String(n).padStart(4, "0")}`;
}

function toDMS(lat: number, lon: number): string {
  const fmt = (v: number, pos: string, neg: string) => {
    const dir = v >= 0 ? pos : neg;
    const abs = Math.abs(v);
    const d = Math.floor(abs);
    const mf = (abs - d) * 60;
    const m = Math.floor(mf);
    const s = ((mf - m) * 60).toFixed(2);
    return `${d}°${String(m).padStart(2,"0")}'${String(s).padStart(5,"0")}"${dir}`;
  };
  return `${fmt(lat,"N","S")} ${fmt(lon,"E","W")}`;
}

// ── Layer row in DATA LAYERS panel ────────────────────────────────────────────
function LayerRow({ icon, name, count, active, onToggle, color = "#00aaff" }: {
  icon: string; name: string; count?: string | number;
  active: boolean; onToggle: () => void; color?: string;
}) {
  return (
    <div style={{ display:"flex", alignItems:"center", gap:6, padding:"5px 8px", borderBottom:"1px solid rgba(255,255,255,0.04)" }}>
      <span style={{ fontSize:11, color: active ? color : "rgba(255,255,255,0.3)", width:14, textAlign:"center" }}>{icon}</span>
      <div style={{ flex:1 }}>
        <div style={{ fontSize:9, fontFamily:"monospace", color: active ? "rgba(255,255,255,0.8)" : "rgba(255,255,255,0.35)", fontWeight:600 }}>{name}</div>
        {count != null && <div style={{ fontSize:7, color:"rgba(255,255,255,0.25)", fontFamily:"monospace" }}>
          {active ? `${count} active` : "—"}
        </div>}
      </div>
      <div
        onClick={onToggle}
        style={{
          fontSize:7, fontFamily:"monospace", fontWeight:700, letterSpacing:"0.5px",
          padding:"1px 5px", borderRadius:2, cursor:"pointer",
          background: active ? `${color}22` : "rgba(255,255,255,0.06)",
          color: active ? color : "rgba(255,255,255,0.25)",
          border:`1px solid ${active ? `${color}55` : "rgba(255,255,255,0.1)"}`,
        }}
      >
        {active ? "ON" : "OFF"}
      </div>
    </div>
  );
}

// ── Main HUD ──────────────────────────────────────────────────────────────────
export function WorldviewHUD({
  mapLat = 0, mapLon = 0, mapZoom = 2,
}: {
  mapLat?: number; mapLon?: number; mapZoom?: number;
}) {
  const {
    mapSkin, setMapSkin,
    showPanoptic, togglePanoptic,
    layers, toggleLayer,
    flyTo,
  } = useMapStore();

  const [now, setNow] = useState<Date | null>(null);
  const [activeCity, setActiveCity] = useState<string | null>(null);
  const [panopticVis, setPanopticVis] = useState(14);
  const [panopticSrc, setPanopticSrc] = useState(1966);
  const [panopticDens, setPanopticDens] = useState(1.46);
  const [panopticLat, setPanopticLat] = useState(3.6);
  const [leftPanelOpen, setLeftPanelOpen] = useState(true);

  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (!showPanoptic) return;
    const id = setInterval(() => {
      setPanopticVis(v => Math.max(1, v + ((Math.random() - 0.5) * 10 | 0)));
      setPanopticSrc(v => Math.max(100, v + ((Math.random() - 0.5) * 200 | 0)));
      setPanopticDens(v => Math.max(0.1, parseFloat((v + (Math.random() - 0.5) * 0.3).toFixed(2))));
      setPanopticLat(v => Math.max(0.5, parseFloat((v + (Math.random() - 0.5) * 0.4).toFixed(1))));
    }, 800);
    return () => clearInterval(id);
  }, [showPanoptic]);

  // Telemetry
  const altKm = Math.round(500 * Math.pow(2, 14 - mapZoom));
  const gsd = (altKm * 0.3).toFixed(2);
  const niirs = Math.max(0, 9 - mapZoom * 0.3).toFixed(1);
  const sunEl = (-36.4 + mapLat * 0.1).toFixed(1);
  const orbCount = 47439 + Math.floor(((now?.getTime() ?? 0) / 90000) % 1000);

  const skinColor: Record<MapSkin, string> = {
    eo:"#00aaff", flir:"#00ff88", crt:"#00ffcc", nvg:"#39ff14",
    anime:"#ff66cc", noir:"#aaaaaa", snow:"#cceeff", ai:"#aa88ff",
  };
  const activeColor = skinColor[mapSkin] ?? "#00aaff";

  const skinLabel: Record<MapSkin, string> = {
    eo:"NORMAL", flir:"FLIR", crt:"CRT", nvg:"NIGHT VISION",
    anime:"ANIME", noir:"NOIR", snow:"SNOW", ai:"AI EDIT",
  };

  const mono: React.CSSProperties = { fontFamily:"monospace", letterSpacing:"0.5px" };

  const panelBg: React.CSSProperties = {
    background: "rgba(4,6,10,0.88)",
    backdropFilter: "blur(10px)",
    WebkitBackdropFilter: "blur(10px)",
    border: "1px solid rgba(255,255,255,0.06)",
  };

  return (
    <>
      {/* ── PANOPTIC stats bar (very top) ── */}
      {showPanoptic && (
        <div style={{
          position:"absolute", top:0, left:0, right:0, zIndex:20,
          height:18, background:"rgba(0,0,0,0.75)",
          borderBottom:"1px solid rgba(0,255,80,0.2)",
          display:"flex", alignItems:"center", gap:14, paddingLeft:8,
          ...mono,
        }}>
          <span style={{ color:"#00ff50", fontSize:9, fontWeight:700 }}>PANOPTIC</span>
          <span style={{ color:"rgba(0,255,80,0.6)", fontSize:9 }}>VIS:<span style={{ color:"#00ff50" }}>{panopticVis}</span></span>
          <span style={{ color:"rgba(0,255,80,0.6)", fontSize:9 }}>SRC:<span style={{ color:"#00ff50" }}>{panopticSrc}</span></span>
          <span style={{ color:"rgba(0,255,80,0.6)", fontSize:9 }}>DENS:<span style={{ color:"#00ff50" }}>{panopticDens}</span></span>
          <span style={{ color:"#00ff50", fontSize:9 }}>{panopticLat}ms</span>
        </div>
      )}

      {/* ── Top-right: ACTIVE STYLE + REC ── */}
      <div style={{
        position:"absolute", top: showPanoptic ? 22 : 6, right:10, zIndex:20,
        textAlign:"right", ...mono, pointerEvents:"none",
      }}>
        <div style={{ color:"rgba(255,255,255,0.25)", fontSize:7, letterSpacing:"1px", marginBottom:2 }}>ACTIVE STYLE</div>
        <div style={{ color:activeColor, fontSize:14, fontWeight:700, letterSpacing:"2px", marginBottom:6 }}>{skinLabel[mapSkin]}</div>
        <div style={{ display:"flex", alignItems:"center", gap:4, justifyContent:"flex-end", marginBottom:1 }}>
          <div style={{ width:6, height:6, borderRadius:"50%", background:"#ff3333", animation:"wv-blink 1s step-end infinite" }} />
          <span style={{ color:"#ff3333", fontSize:8, fontWeight:700 }}>REC</span>
          <span style={{ color:"rgba(255,255,255,0.55)", fontSize:8 }}>
            {now ? `${now.toISOString().slice(0,10).replace(/-/g,"/")} ${now.toTimeString().slice(0,8)}Z` : "—"}
          </span>
        </div>
        <div style={{ color:"rgba(255,255,255,0.35)", fontSize:8 }}>ORB: {orbCount} PASS: DESC-179</div>
      </div>

      {/* ── Left DATA LAYERS panel ── */}
      <div style={{
        position:"absolute",
        top: showPanoptic ? 22 : 0,
        left:0, bottom:0,
        zIndex:20,
        width: leftPanelOpen ? 270 : 0,
        overflow:"hidden",
        transition:"width 0.3s ease",
        display:"flex", flexDirection:"column",
      }}>
        <div style={{ minWidth:270, height:"100%", display:"flex", flexDirection:"column", paddingTop:40 }}>

          {/* PANOPTIC toggle */}
          <div style={{ ...panelBg, margin:"0 0 4px 0", padding:"6px 10px" }}>
            <div
              onClick={togglePanoptic}
              style={{
                display:"flex", alignItems:"center", justifyContent:"space-between",
                cursor:"pointer",
              }}
            >
              <span style={{ fontSize:9, fontWeight:700, color: showPanoptic ? "#00ff50" : "rgba(255,255,255,0.35)", ...mono, letterSpacing:"0.5px" }}>
                {showPanoptic ? "◉ " : "◎ "}PANOPTIC
              </span>
              <span style={{ fontSize:8, color:"rgba(255,255,255,0.2)", ...mono }}>▸</span>
            </div>
          </div>

          {/* DATA LAYERS panel */}
          <div style={{ ...panelBg, flex:1, display:"flex", flexDirection:"column", overflow:"hidden" }}>
            <div style={{ padding:"6px 10px", borderBottom:"1px solid rgba(255,255,255,0.06)", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
              <span style={{ fontSize:9, fontWeight:700, color:"rgba(255,255,255,0.45)", ...mono, letterSpacing:"0.5px" }}>DATA LAYERS</span>
              <span style={{ fontSize:8, color:"rgba(255,255,255,0.2)", ...mono }}>+</span>
            </div>

            <LayerRow icon="✈" name="Live Flights"    count="5.8K" active={layers.flights}   onToggle={() => toggleLayer("flights")}   color="#00ffcc" />
            <LayerRow icon="⚠" name="Conflicts"       count="142"  active={layers.conflicts}  onToggle={() => toggleLayer("conflicts")} color="#ff4444" />
            <LayerRow icon="⊕" name="Earthquakes (24h)" count="—"  active={layers.natural}   onToggle={() => toggleLayer("natural")}   color="#ff9900" />
            <LayerRow icon="◉" name="Satellites"      count={180}  active={layers.satellites} onToggle={() => toggleLayer("satellites")} color="#ff6600" />
            <LayerRow icon="⊘" name="Street Traffic"  count="LIVE" active={layers.traffic}    onToggle={() => toggleLayer("traffic")}  color="#ffcc00" />
            <LayerRow icon="☁" name="Weather Radar"   count="—"    active={layers.weather}    onToggle={() => toggleLayer("weather")}  color="#44aaff" />
            <LayerRow icon="◎" name="CCTV Mesh"       count={36}   active={layers.cctv}       onToggle={() => toggleLayer("cctv")}     color="#aa44ff" />
            <LayerRow icon="⚓" name="AIS / Ships"    count="—"    active={layers.ais}        onToggle={() => toggleLayer("ais")}      color="#00ccff" />
            <LayerRow icon="☢" name="Nuclear"         count="—"    active={layers.nuclear}    onToggle={() => toggleLayer("nuclear")}  color="#88ff00" />
            <LayerRow icon="⚑" name="Mil. Bases"      count="—"    active={layers.bases}      onToggle={() => toggleLayer("bases")}   color="#22c55e" />
          </div>
        </div>
      </div>

      {/* ── Left panel toggle ── */}
      <div
        onClick={() => setLeftPanelOpen(o => !o)}
        style={{
          position:"absolute", top:"50%", left: leftPanelOpen ? 270 : 0,
          transform:"translateY(-50%)",
          zIndex:21, cursor:"pointer",
          background:"rgba(0,0,0,0.7)", border:"1px solid rgba(255,255,255,0.08)",
          borderLeft:"none", borderRadius:"0 4px 4px 0",
          padding:"6px 3px", transition:"left 0.3s ease",
        }}
      >
        <span style={{ fontSize:8, color:"rgba(255,255,255,0.35)", writingMode:"vertical-rl" }}>
          {leftPanelOpen ? "◀" : "▶"}
        </span>
      </div>

      {/* ── Lens crosshair ── */}
      <div style={{
        position:"absolute", inset:0, zIndex:10, pointerEvents:"none",
        display:"flex", alignItems:"center", justifyContent:"center",
        paddingLeft: leftPanelOpen ? "20px" : "0",
      }}>
        <div style={{ position:"relative", width:40, height:40, opacity:0.2 }}>
          <div style={{ position:"absolute", left:"50%", top:0, bottom:0, width:1, background:activeColor, transform:"translateX(-50%)" }} />
          <div style={{ position:"absolute", top:"50%", left:0, right:0, height:1, background:activeColor, transform:"translateY(-50%)" }} />
          <div style={{ position:"absolute", inset:12, border:`1px solid ${activeColor}`, borderRadius:"50%" }} />
        </div>
      </div>

      {/* ── Bottom-left: MGRS + DMS ── */}
      <div style={{ position:"absolute", bottom:130, left: leftPanelOpen ? 278 : 10, zIndex:20, ...mono, pointerEvents:"none", transition:"left 0.3s ease" }}>
        <div style={{ color:"rgba(255,255,255,0.45)", fontSize:8, marginBottom:1 }}>MGRS: {toMGRS(mapLat, mapLon)}</div>
        <div style={{ color:"rgba(255,255,255,0.35)", fontSize:8 }}>{toDMS(mapLat, mapLon)}</div>
      </div>

      {/* ── Bottom-right: GSD / NIIRS / ALT / SUN ── */}
      <div style={{ position:"absolute", bottom:130, right:10, zIndex:20, textAlign:"right", ...mono, pointerEvents:"none" }}>
        <div style={{ color:"rgba(255,220,0,0.85)", fontSize:9, fontWeight:700 }}>GSD: {gsd}M NIIRS: {niirs}</div>
        <div style={{ color:"rgba(255,255,255,0.4)", fontSize:8 }}>ALT: {altKm.toLocaleString()}M SUN: {sunEl}° EL</div>
      </div>

      {/* ── LOCATIONS bar ── */}
      <div style={{
        position:"absolute", bottom:94,
        left: `calc(${leftPanelOpen ? "270px" : "0px"} + (100% - ${leftPanelOpen ? "270px" : "0px"}) / 2)`,
        transform:"translateX(-50%)",
        zIndex:20, ...panelBg, borderRadius:4,
        display:"flex", alignItems:"center", overflow:"hidden",
        transition:"left 0.3s ease",
      }}>
        {CITIES.map((city) => {
          const isActive = activeCity === city.name;
          return (
            <button key={city.name} onClick={() => { setActiveCity(city.name); flyTo(city.lon, city.lat, 13); }}
              style={{
                background: isActive ? "rgba(0,170,255,0.18)" : "transparent",
                color: isActive ? "#00aaff" : "rgba(255,255,255,0.4)",
                border:"none", borderRight:"1px solid rgba(255,255,255,0.05)",
                padding:"4px 10px", fontSize:9, ...mono, fontWeight:600,
                cursor:"pointer", whiteSpace:"nowrap", transition:"all 0.15s",
              }}
            >{city.name}</button>
          );
        })}
      </div>

      {/* ── Bottom skin selector bar ── */}
      <div style={{
        position:"absolute", bottom:6,
        left: `calc(${leftPanelOpen ? "270px" : "0px"} + (100% - ${leftPanelOpen ? "270px" : "0px"}) / 2)`,
        transform:"translateX(-50%)",
        zIndex:20,
        display:"flex", gap:2,
        ...panelBg, borderRadius:6, padding:"4px 6px",
        transition:"left 0.3s ease",
      }}>
        {SKIN_BAR.map((s) => {
          const isActive = mapSkin === s.id;
          const col = skinColor[s.id];
          return (
            <button key={s.id} onClick={() => setMapSkin(s.id)}
              style={{
                display:"flex", flexDirection:"column", alignItems:"center", gap:2,
                background: isActive ? `${col}1a` : "transparent",
                border:`1px solid ${isActive ? `${col}55` : "transparent"}`,
                borderRadius:4, padding:"4px 10px", cursor:"pointer", minWidth:48,
              }}
            >
              <span style={{ fontSize:13, color: isActive ? col : "rgba(255,255,255,0.25)" }}>{s.icon}</span>
              <span style={{ fontSize:8, ...mono, fontWeight:600, color: isActive ? col : "rgba(255,255,255,0.3)", letterSpacing:"0.3px" }}>{s.label}</span>
            </button>
          );
        })}
      </div>

      {/* ── CSS animations ── */}
      <style>{`@keyframes wv-blink { 0%,100%{opacity:1} 50%{opacity:0.15} }`}</style>
    </>
  );
}
