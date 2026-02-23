"use client";

/**
 * WorldviewHUD — WORLDVIEW classified intel UI overlay
 * Matches the video: logo, classified header, DATA LAYERS left panel,
 * right parameters panel, city bar, skin bar, telemetry.
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

// ── Slider ─────────────────────────────────────────────────────────────────────
function HudSlider({ value, color = "#00aaff", onChange }: {
  value: number; color?: string; onChange?: (v: number) => void;
}) {
  return (
    <div
      style={{ flex: 1, height: 3, background: "rgba(255,255,255,0.08)", borderRadius: 2, position: "relative", cursor: "pointer" }}
      onClick={(e) => {
        const r = e.currentTarget.getBoundingClientRect();
        onChange?.(Math.round(((e.clientX - r.left) / r.width) * 100));
      }}
    >
      <div style={{ position:"absolute", left:0, top:0, bottom:0, width:`${value}%`, background:color, borderRadius:2 }} />
      <div style={{ position:"absolute", top:"50%", left:`${value}%`, transform:"translate(-50%,-50%)", width:8, height:8, borderRadius:"50%", background:color, boxShadow:`0 0 5px ${color}` }} />
    </div>
  );
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

  const [now, setNow] = useState(new Date());
  const [bloom, setBloom] = useState(100);
  const [sharpen, setSharpen] = useState(56);
  const [panopticOpacity, setPanopticOpacity] = useState(40);
  const [pixelation, setPixelation] = useState(35);
  const [distortion, setDistortion] = useState(65);
  const [instability, setInstability] = useState(55);
  const [activeCity, setActiveCity] = useState<string | null>(null);
  const [panopticVis, setPanopticVis] = useState(14);
  const [panopticSrc, setPanopticSrc] = useState(1966);
  const [panopticDens, setPanopticDens] = useState(1.46);
  const [panopticLat, setPanopticLat] = useState(3.6);
  const [leftPanelOpen, setLeftPanelOpen] = useState(true);
  const [rightPanelOpen, setRightPanelOpen] = useState(true);

  useEffect(() => {
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
  const orbCount = 47439 + Math.floor((now.getTime() / 90000) % 1000);

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

      {/* ── Top-left: WORLDVIEW logo + classified header ── */}
      <div style={{
        position:"absolute", top: showPanoptic ? 22 : 6, left:10, zIndex:20,
        pointerEvents:"none",
      }}>
        {/* Logo */}
        <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:2 }}>
          <div style={{
            width:22, height:22, borderRadius:"50%",
            border:"1px solid rgba(255,255,255,0.3)",
            display:"flex", alignItems:"center", justifyContent:"center",
          }}>
            <div style={{ width:10, height:10, borderRadius:"50%", background:"rgba(255,255,255,0.15)", border:"1px solid rgba(255,255,255,0.4)" }} />
          </div>
          <div>
            <div style={{ fontSize:15, fontWeight:700, color:"#fff", letterSpacing:"3px", lineHeight:1, ...mono }}>
              WORLDVIEW
            </div>
            <div style={{ fontSize:7, color:"rgba(255,255,255,0.3)", letterSpacing:"2px", ...mono }}>
              NO PLACE LEFT BEHIND
            </div>
          </div>
        </div>

        {/* Classified */}
        <div style={{ marginTop:8, ...mono }}>
          <div style={{ color:"#ff3333", fontSize:9, fontWeight:700, letterSpacing:"1px", marginBottom:1 }}>
            TOP SECRET // SI-TK // NOFORN
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:4 }}>
            <div style={{ width:2, height:28, background:"rgba(255,200,80,0.5)" }} />
            <div>
              <div style={{ color:"rgba(255,200,100,0.6)", fontSize:7.5 }}>KH11-4166 OPS-4117</div>
              <div style={{ color:activeColor, fontSize:13, fontWeight:700, letterSpacing:"2px" }}>{skinLabel[mapSkin]}</div>
            </div>
          </div>
          <div style={{ marginTop:4 }}>
            <div style={{ color:"rgba(255,255,255,0.25)", fontSize:7, letterSpacing:"0.5px" }}>SUMMARY</div>
            <div style={{ color:"rgba(255,255,255,0.55)", fontSize:8, maxWidth:220 }}>
              {skinLabel[mapSkin]} {activeCity ? `STREET NEAR ${activeCity.toUpperCase()}` : "GLOBAL"} | 0KM | NORTH...
            </div>
          </div>
        </div>
      </div>

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
            {now.toISOString().slice(0,10).replace(/-/g,"/")} {now.toTimeString().slice(0,8)}Z
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
        <div style={{ minWidth:270, height:"100%", display:"flex", flexDirection:"column", paddingTop:80 }}>

          {/* CCTV MESH mini section */}
          <div style={{ ...panelBg, margin:"0 0 4px 0", padding:"6px 10px" }}>
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
              <span style={{ fontSize:9, color:"rgba(255,255,255,0.35)", ...mono, letterSpacing:"0.5px" }}>CCTV MESH</span>
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

      {/* ── Lens outer glow ring ── */}
      <div style={{
        position:"absolute", inset:0, zIndex:9, pointerEvents:"none",
        display:"flex", alignItems:"center", justifyContent:"center",
        paddingLeft: leftPanelOpen ? "20px" : "0",
      }}>
        <div style={{
          width:"min(72vh, 72vw)", height:"min(72vh, 72vw)",
          borderRadius:"50%",
          border:"1px solid rgba(255,255,255,0.12)",
          boxShadow:"0 0 0 1px rgba(255,255,255,0.03)",
          flexShrink:0,
        }} />
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

      {/* ── Right parameters panel ── */}
      <div style={{
        position:"absolute", top: showPanoptic ? 62 : 48, right:0, bottom:0, zIndex:20,
        width: rightPanelOpen ? 250 : 0,
        overflow:"hidden", transition:"width 0.3s ease",
        ...panelBg,
        borderTop:"none", borderBottom:"none", borderRight:"none",
      }}>
        <div style={{ padding:"10px 12px", minWidth:250 }}>

          {/* BLOOM */}
          <div style={{ marginBottom:8 }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:4 }}>
              <span style={{ fontSize:9, fontWeight:700, color:"rgba(255,255,255,0.55)", ...mono }}>✦ BLOOM</span>
              <span style={{ fontSize:9, color:"#00aaff", ...mono }}>{bloom}%</span>
            </div>
            <HudSlider value={bloom} color="#00aaff" onChange={setBloom} />
          </div>

          {/* SHARPEN */}
          <div style={{ marginBottom:8 }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:4 }}>
              <div style={{ display:"flex", alignItems:"center", gap:4 }}>
                <div style={{ width:7, height:7, borderRadius:"50%", background:"#00aaff" }} />
                <span style={{ fontSize:9, fontWeight:700, color:"rgba(255,255,255,0.55)", ...mono }}>SHARPEN</span>
              </div>
              <span style={{ fontSize:9, color:"#00aaff", ...mono }}>{sharpen}%</span>
            </div>
            <HudSlider value={sharpen} color="#00aaff" onChange={setSharpen} />
          </div>

          {/* HUD */}
          <div style={{ marginBottom:8 }}>
            <div style={{ background:"rgba(255,255,255,0.08)", border:"1px solid rgba(255,255,255,0.12)", borderRadius:3, padding:"3px 8px", marginBottom:6, display:"flex", alignItems:"center", justifyContent:"space-between" }}>
              <span style={{ fontSize:9, fontWeight:700, color:"#fff", ...mono }}>HUD</span>
            </div>
            <div style={{ display:"flex", alignItems:"center", gap:6 }}>
              <span style={{ fontSize:8, color:"rgba(255,255,255,0.3)", ...mono }}>LAYOUT</span>
              <div style={{ flex:1, background:"rgba(255,255,255,0.06)", border:"1px solid rgba(255,255,255,0.1)", borderRadius:3, padding:"2px 6px", display:"flex", justifyContent:"space-between" }}>
                <span style={{ fontSize:9, color:"rgba(255,255,255,0.65)", ...mono }}>Tactical</span>
                <span style={{ fontSize:8, color:"rgba(255,255,255,0.3)" }}>▾</span>
              </div>
            </div>
          </div>

          {/* PANOPTIC */}
          <div style={{ marginBottom:8 }}>
            <div
              onClick={togglePanoptic}
              style={{
                display:"flex", justifyContent:"space-between", alignItems:"center",
                background: showPanoptic ? "rgba(0,255,80,0.14)" : "rgba(255,255,255,0.04)",
                border:`1px solid ${showPanoptic ? "rgba(0,255,80,0.45)" : "rgba(255,255,255,0.08)"}`,
                borderRadius:3, padding:"4px 8px", cursor:"pointer", marginBottom:6,
              }}
            >
              <span style={{ fontSize:9, fontWeight:700, color: showPanoptic ? "#00ff50" : "rgba(255,255,255,0.4)", ...mono }}>
                {showPanoptic ? "◉ " : "◎ "}PANOPTIC
              </span>
            </div>
            {showPanoptic && (
              <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:4 }}>
                <span style={{ fontSize:7, color:"rgba(255,255,255,0.3)", ...mono, minWidth:48 }}>OPACITY</span>
                <HudSlider value={panopticOpacity} color="#00ff50" onChange={setPanopticOpacity} />
                <span style={{ fontSize:7, color:"#00ff50", ...mono, minWidth:22, textAlign:"right" }}>{panopticOpacity}%</span>
              </div>
            )}
          </div>

          {/* CLEAN UI */}
          <div style={{ background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.08)", borderRadius:3, padding:"4px 8px", marginBottom:10, cursor:"pointer", textAlign:"center" }}>
            <span style={{ fontSize:9, color:"rgba(255,255,255,0.4)", ...mono }}>CLEAN UI</span>
          </div>

          {/* PARAMETERS */}
          <div style={{ borderTop:"1px solid rgba(255,255,255,0.05)", paddingTop:8 }}>
            <div style={{ fontSize:8, color:"rgba(255,255,255,0.2)", ...mono, letterSpacing:"0.5px", marginBottom:8 }}>PARAMETERS</div>

            {(mapSkin === "crt") && (
              <>
                {[["Pixelation", pixelation, setPixelation] as const,
                  ["Distortion", distortion, setDistortion] as const,
                  ["Instability", instability, setInstability] as const,
                ].map(([label, val, setter]) => (
                  <div key={label} style={{ display:"flex", alignItems:"center", gap:6, marginBottom:6 }}>
                    <span style={{ fontSize:8, color:"rgba(255,255,255,0.4)", ...mono, minWidth:58 }}>{label}</span>
                    <HudSlider value={val as number} color="#00aaff" onChange={setter as (v:number)=>void} />
                  </div>
                ))}
              </>
            )}
            {(mapSkin === "flir") && (
              <>
                {[["Sensitivity",70],["Bloom",bloom],["SHOT/BNOT",45],["Pixelation",pixelation]].map(([l,v]) => (
                  <div key={String(l)} style={{ display:"flex", alignItems:"center", gap:6, marginBottom:6 }}>
                    <span style={{ fontSize:8, color:"rgba(255,255,255,0.4)", ...mono, minWidth:58 }}>{l}</span>
                    <HudSlider value={Number(v)} color="#00ff88" />
                  </div>
                ))}
              </>
            )}
            {(mapSkin === "nvg") && (
              <>
                {[["Gain",75],["Bloom",bloom],["Scanlines",80],["Pixelation",pixelation]].map(([l,v]) => (
                  <div key={String(l)} style={{ display:"flex", alignItems:"center", gap:6, marginBottom:6 }}>
                    <span style={{ fontSize:8, color:"rgba(255,255,255,0.4)", ...mono, minWidth:58 }}>{l}</span>
                    <HudSlider value={Number(v)} color="#39ff14" />
                  </div>
                ))}
              </>
            )}
            {(!["crt","flir","nvg"].includes(mapSkin)) && (
              <>
                {[["Contrast",55],["Saturation",60],["Brightness",50]].map(([l,v]) => (
                  <div key={String(l)} style={{ display:"flex", alignItems:"center", gap:6, marginBottom:6 }}>
                    <span style={{ fontSize:8, color:"rgba(255,255,255,0.4)", ...mono, minWidth:58 }}>{l}</span>
                    <HudSlider value={Number(v)} color={activeColor} />
                  </div>
                ))}
              </>
            )}
          </div>
        </div>
      </div>

      {/* ── Right panel toggle ── */}
      <div
        onClick={() => setRightPanelOpen(o => !o)}
        style={{
          position:"absolute", top:"50%", right: rightPanelOpen ? 250 : 0,
          transform:"translateY(-50%)",
          zIndex:21, cursor:"pointer",
          background:"rgba(0,0,0,0.7)", border:"1px solid rgba(255,255,255,0.08)",
          borderRight:"none", borderRadius:"4px 0 0 4px",
          padding:"6px 3px", transition:"right 0.3s ease",
        }}
      >
        <span style={{ fontSize:8, color:"rgba(255,255,255,0.35)", writingMode:"vertical-rl" }}>
          {rightPanelOpen ? "▶" : "◀"}
        </span>
      </div>

      {/* ── Bottom-left: MGRS + DMS ── */}
      <div style={{ position:"absolute", bottom:80, left: leftPanelOpen ? 278 : 10, zIndex:20, ...mono, pointerEvents:"none", transition:"left 0.3s ease" }}>
        <div style={{ color:"rgba(255,255,255,0.45)", fontSize:8, marginBottom:1 }}>MGRS: {toMGRS(mapLat, mapLon)}</div>
        <div style={{ color:"rgba(255,255,255,0.35)", fontSize:8 }}>{toDMS(mapLat, mapLon)}</div>
      </div>

      {/* ── Bottom-right: GSD / NIIRS / ALT / SUN ── */}
      <div style={{ position:"absolute", bottom:80, right: rightPanelOpen ? 258 : 10, zIndex:20, textAlign:"right", ...mono, pointerEvents:"none", transition:"right 0.3s ease" }}>
        <div style={{ color:"rgba(255,220,0,0.85)", fontSize:9, fontWeight:700 }}>GSD: {gsd}M NIIRS: {niirs}</div>
        <div style={{ color:"rgba(255,255,255,0.4)", fontSize:8 }}>ALT: {altKm.toLocaleString()}M SUN: {sunEl}° EL</div>
      </div>

      {/* ── LOCATIONS bar (above city bar) ── */}
      <div style={{
        position:"absolute", bottom:54, left:"50%", transform:"translateX(-50%)",
        zIndex:20, ...panelBg, borderRadius:4,
        display:"flex", alignItems:"center", overflow:"hidden",
        paddingLeft: leftPanelOpen ? "20px" : "0",
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
        position:"absolute", bottom:6, left:"50%", transform:"translateX(-50%)",
        zIndex:20,
        display:"flex", gap:2,
        ...panelBg, borderRadius:6, padding:"4px 6px",
        paddingLeft: leftPanelOpen ? "20px" : "4px",
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
