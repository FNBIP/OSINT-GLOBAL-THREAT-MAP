"use client";

/**
 * Country Instability Index (CII) Panel — enhanced worldmonitor style
 * Ranks 22 countries by instability signals with ring scores,
 * trend indicators, and a world heatmap dot display.
 */

import { useMemo, useState } from "react";
import { useNewsStore } from "@/stores/news-store";
import { PanelShell } from "./panel-shell";

// ── 22 tracked countries with keywords, base score, and approximate map positions ──
const TRACKED_COUNTRIES = [
  { name: "Gaza / Israel", keywords: ["gaza","israel","hamas","netanyahu","idf","hezbollah"], base: 90, x: 55, y: 38 },
  { name: "Ukraine", keywords: ["ukraine","kyiv","zelensky","donbas","kherson","crimea"], base: 85, x: 54, y: 28 },
  { name: "Sudan", keywords: ["sudan","khartoum","rsf","darfur"], base: 80, x: 54, y: 45 },
  { name: "Haiti", keywords: ["haiti","port-au-prince","gang"], base: 75, x: 25, y: 42 },
  { name: "Myanmar", keywords: ["myanmar","burma","junta","tatmadaw"], base: 70, x: 72, y: 42 },
  { name: "Yemen", keywords: ["yemen","houthi","sanaa","aden","red sea"], base: 72, x: 57, y: 44 },
  { name: "Syria", keywords: ["syria","damascus","hts","bashar","idlib"], base: 65, x: 55, y: 36 },
  { name: "Sahel", keywords: ["mali","burkina faso","niger","sahel","jnim"], base: 68, x: 45, y: 44 },
  { name: "Iran", keywords: ["iran","tehran","irgc","khamenei"], base: 60, x: 60, y: 36 },
  { name: "Russia", keywords: ["russia","moscow","kremlin","putin","wagner"], base: 55, x: 65, y: 24 },
  { name: "North Korea", keywords: ["north korea","dprk","kim jong","pyongyang"], base: 50, x: 78, y: 32 },
  { name: "Venezuela", keywords: ["venezuela","maduro","caracas"], base: 55, x: 23, y: 47 },
  { name: "Taiwan Strait", keywords: ["taiwan","taipei","strait","pla","tsai"], base: 52, x: 79, y: 38 },
  { name: "South Korea", keywords: ["south korea","seoul","yoon","korean peninsula"], base: 40, x: 78, y: 34 },
  { name: "Red Sea", keywords: ["red sea","bab el-mandeb","shipping","suez"], base: 58, x: 56, y: 43 },
  { name: "DRC", keywords: ["congo","drc","kinshasa","m23","goma"], base: 65, x: 52, y: 52 },
  { name: "Ethiopia", keywords: ["ethiopia","addis ababa","tigray","amhara"], base: 60, x: 56, y: 48 },
  { name: "Somalia", keywords: ["somalia","mogadishu","al-shabaab"], base: 70, x: 58, y: 49 },
  { name: "Libya", keywords: ["libya","tripoli","haftar","benghazi"], base: 55, x: 48, y: 36 },
  { name: "Lebanon", keywords: ["lebanon","beirut","hezbollah","nasrallah"], base: 62, x: 55, y: 37 },
  { name: "Afghanistan", keywords: ["afghanistan","kabul","taliban"], base: 65, x: 64, y: 36 },
  { name: "South China Sea", keywords: ["south china sea","spratly","paracel","nine-dash"], base: 45, x: 76, y: 42 },
];

function getColor(score: number): string {
  if (score >= 80) return "#ef4444";
  if (score >= 65) return "#f97316";
  if (score >= 50) return "#eab308";
  return "#22c55e";
}

function getLabel(score: number): string {
  if (score >= 80) return "CRIT";
  if (score >= 65) return "HIGH";
  if (score >= 50) return "MED";
  return "LOW";
}

// ── Ring Score SVG ──────────────────────────────────────────────────────────────
function RingScore({ score, size = 32 }: { score: number; size?: number }) {
  const r = (size - 4) / 2;
  const circumference = 2 * Math.PI * r;
  const offset = circumference * (1 - score / 100);
  const color = getColor(score);

  return (
    <svg width={size} height={size} style={{ flexShrink: 0 }}>
      {/* Background ring */}
      <circle
        cx={size / 2} cy={size / 2} r={r}
        fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={2.5}
      />
      {/* Score ring */}
      <circle
        cx={size / 2} cy={size / 2} r={r}
        fill="none" stroke={color} strokeWidth={2.5}
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        style={{ transition: "stroke-dashoffset 0.6s ease" }}
      />
      {/* Score text */}
      <text
        x={size / 2} y={size / 2 + 1}
        textAnchor="middle" dominantBaseline="middle"
        fill={color} fontSize={size > 28 ? 9 : 7} fontWeight={800}
        fontFamily="monospace"
      >
        {score}
      </text>
    </svg>
  );
}

// ── World Heatmap Dots ──────────────────────────────────────────────────────────
function WorldHeatmap({ countries }: { countries: { name: string; score: number; x: number; y: number }[] }) {
  return (
    <div style={{
      position: "relative",
      width: "100%",
      height: 80,
      background: "rgba(255,255,255,0.02)",
      borderRadius: 4,
      overflow: "hidden",
      margin: "4px 0",
    }}>
      {/* Simple world outline (stylized) */}
      <svg viewBox="0 0 100 70" width="100%" height="100%" style={{ opacity: 0.08 }}>
        <ellipse cx={50} cy={35} rx={48} ry={32} fill="none" stroke="white" strokeWidth={0.3} />
        {/* Equator */}
        <line x1={2} y1={35} x2={98} y2={35} stroke="white" strokeWidth={0.15} />
        {/* Grid lines */}
        <line x1={50} y1={3} x2={50} y2={67} stroke="white" strokeWidth={0.15} />
        <line x1={25} y1={3} x2={25} y2={67} stroke="white" strokeWidth={0.1} />
        <line x1={75} y1={3} x2={75} y2={67} stroke="white" strokeWidth={0.1} />
      </svg>
      {/* Country dots */}
      {countries.map((c) => (
        <div
          key={c.name}
          title={`${c.name}: ${c.score}`}
          style={{
            position: "absolute",
            left: `${c.x}%`,
            top: `${c.y * 100 / 70}%`,
            width: 6,
            height: 6,
            borderRadius: "50%",
            background: getColor(c.score),
            opacity: 0.85,
            transform: "translate(-50%, -50%)",
            boxShadow: `0 0 ${c.score > 75 ? 6 : 3}px ${getColor(c.score)}60`,
            transition: "all 0.4s",
          }}
        />
      ))}
    </div>
  );
}

export function CIIPanel() {
  const items = useNewsStore((s) => s.items);
  const isLoading = useNewsStore((s) => s.isLoading);
  const [showMap, setShowMap] = useState(true);

  const ranked = useMemo(() => {
    const now = Date.now();
    const cutoff24 = now - 24 * 60 * 60 * 1000;
    const cutoff48 = now - 48 * 60 * 60 * 1000;

    const recent24 = items.filter((i) => new Date(i.pubDate).getTime() > cutoff24);
    const recent48 = items.filter((i) => {
      const t = new Date(i.pubDate).getTime();
      return t > cutoff48 && t <= cutoff24;
    });

    return TRACKED_COUNTRIES.map((country) => {
      // 24h mentions
      const mentions24 = recent24.filter((i) =>
        country.keywords.some((k) => i.title.toLowerCase().includes(k))
      );
      const conflict24 = mentions24.filter((i) =>
        /attack|killed|strike|bomb|explosion|missile|offensive|clash|casualties|dead|wounded/.test(i.title.toLowerCase())
      ).length;
      const boost24 = Math.min(mentions24.length * 1.5 + conflict24 * 3, 20);
      const score24 = Math.min(Math.round(country.base + boost24), 99);

      // 48h-24h mentions (previous day)
      const mentions48 = recent48.filter((i) =>
        country.keywords.some((k) => i.title.toLowerCase().includes(k))
      );
      const conflict48 = mentions48.filter((i) =>
        /attack|killed|strike|bomb|explosion|missile|offensive|clash|casualties|dead|wounded/.test(i.title.toLowerCase())
      ).length;
      const boost48 = Math.min(mentions48.length * 1.5 + conflict48 * 3, 20);
      const score48 = Math.min(Math.round(country.base + boost48), 99);

      // Trend: compare 24h score to previous-day score
      const diff = score24 - score48;
      const trend: "up" | "down" | "stable" = diff > 2 ? "up" : diff < -2 ? "down" : "stable";

      return {
        ...country,
        score: score24,
        prevScore: score48,
        trend,
        newsCount: mentions24.length,
        conflictCount: conflict24,
      };
    }).sort((a, b) => b.score - a.score);
  }, [items]);

  const trendIcon = (t: "up" | "down" | "stable") => {
    if (t === "up") return { symbol: "▲", color: "#ef4444" };
    if (t === "down") return { symbol: "▼", color: "#22c55e" };
    return { symbol: "►", color: "rgba(255,255,255,0.2)" };
  };

  return (
    <PanelShell title="Country Instability Index" live count={ranked.length} headerRight={
      <button
        onClick={() => setShowMap((v) => !v)}
        style={{
          fontSize: 8, padding: "1px 5px", borderRadius: 2, cursor: "pointer",
          background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)",
          color: "rgba(255,255,255,0.3)", letterSpacing: "0.3px",
        }}
      >
        {showMap ? "LIST" : "MAP"}
      </button>
    }>
      {isLoading && items.length === 0 ? (
        <div style={{ padding: "16px", fontSize: 10, color: "rgba(255,255,255,0.3)", textAlign: "center" }}>
          Analyzing threat signals...
        </div>
      ) : (
        <div style={{ overflowY: "auto", maxHeight: 420 }}>
          {/* World Heatmap */}
          {showMap && (
            <div style={{ padding: "4px 10px" }}>
              <WorldHeatmap countries={ranked.map((c) => ({ name: c.name, score: c.score, x: c.x, y: c.y }))} />
            </div>
          )}

          {/* Country list */}
          {ranked.map((c, i) => {
            const ti = trendIcon(c.trend);
            return (
              <div key={c.name} style={{
                display: "flex", alignItems: "center", gap: 6,
                padding: "5px 10px", borderBottom: "1px solid rgba(255,255,255,0.04)",
              }}>
                {/* Rank */}
                <span style={{
                  fontSize: 8, color: "rgba(255,255,255,0.15)",
                  minWidth: 14, fontWeight: 700, fontFamily: "monospace",
                }}>
                  {String(i + 1).padStart(2, "0")}
                </span>

                {/* Ring score */}
                <RingScore score={c.score} size={30} />

                {/* Country info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <span style={{
                      fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.8)",
                      whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                    }}>
                      {c.name}
                    </span>
                    {/* Trend indicator */}
                    <span style={{ fontSize: 7, color: ti.color, fontWeight: 800 }}>
                      {ti.symbol}
                    </span>
                  </div>
                  {/* Breakdown */}
                  <div style={{ display: "flex", gap: 8, fontSize: 8, color: "rgba(255,255,255,0.25)", marginTop: 1 }}>
                    <span>{c.newsCount} article{c.newsCount !== 1 ? "s" : ""}</span>
                    {c.conflictCount > 0 && (
                      <span style={{ color: "rgba(239,68,68,0.5)" }}>
                        {c.conflictCount} conflict signal{c.conflictCount !== 1 ? "s" : ""}
                      </span>
                    )}
                  </div>
                </div>

                {/* Severity badge */}
                <div style={{
                  display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 1, minWidth: 36,
                }}>
                  <span style={{
                    fontSize: 7, fontWeight: 800, padding: "1px 4px", borderRadius: 2,
                    background: `${getColor(c.score)}15`, color: getColor(c.score),
                    border: `1px solid ${getColor(c.score)}30`, letterSpacing: "0.4px",
                    fontFamily: "monospace",
                  }}>
                    {getLabel(c.score)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </PanelShell>
  );
}
