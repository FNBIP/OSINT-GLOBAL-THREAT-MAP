"use client";

/**
 * Country Instability Index (CII) Panel — worldmonitor style
 * Ranks countries by instability signals derived from news volume,
 * conflict keywords, and crisis indicators.
 */

import { useMemo } from "react";
import { useNewsStore } from "@/stores/news-store";
import { PanelShell } from "./panel-shell";

// Countries to track with seed scores (base instability)
const TRACKED_COUNTRIES = [
  { name: "Ukraine",       keywords: ["ukraine","kyiv","zelensky","donbas"],           base: 85 },
  { name: "Gaza / Israel", keywords: ["gaza","israel","hamas","netanyahu","idf"],       base: 90 },
  { name: "Sudan",         keywords: ["sudan","khartoum","rsf","darfur"],              base: 80 },
  { name: "Haiti",         keywords: ["haiti","port-au-prince","gang","ariel henry"], base: 75 },
  { name: "Myanmar",       keywords: ["myanmar","burma","junta","tatmadaw"],          base: 70 },
  { name: "Syria",         keywords: ["syria","damascus","hts","bashar"],              base: 65 },
  { name: "Yemen",         keywords: ["yemen","houthi","sanaa","aden"],                base: 72 },
  { name: "Iran",          keywords: ["iran","tehran","irgc","khamenei"],              base: 60 },
  { name: "Russia",        keywords: ["russia","moscow","kremlin","putin","wagner"],    base: 55 },
  { name: "North Korea",   keywords: ["north korea","dprk","kim jong","pyongyang"],    base: 50 },
  { name: "Sahel",         keywords: ["mali","burkina faso","niger","sahel"],          base: 68 },
  { name: "Venezuela",     keywords: ["venezuela","maduro","caracas"],                 base: 55 },
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

export function CIIPanel() {
  const items = useNewsStore((s) => s.items);
  const isLoading = useNewsStore((s) => s.isLoading);

  const ranked = useMemo(() => {
    const cutoff = Date.now() - 48 * 60 * 60 * 1000; // 48h
    const recent = items.filter((i) => new Date(i.pubDate).getTime() > cutoff);

    return TRACKED_COUNTRIES.map((country) => {
      const mentions = recent.filter((i) =>
        country.keywords.some((k) => i.title.toLowerCase().includes(k))
      );

      // Boost score based on article volume and conflict keywords
      const conflictHits = mentions.filter((i) =>
        /attack|killed|strike|bomb|explosion|missile|offensive|clash|casualties/.test(i.title.toLowerCase())
      ).length;

      const boost = Math.min(mentions.length * 1.5 + conflictHits * 3, 20);
      const score = Math.min(Math.round(country.base + boost), 99);

      return { ...country, score, mentions: mentions.length };
    }).sort((a, b) => b.score - a.score);
  }, [items]);

  return (
    <PanelShell title="Country Instability" live headerRight={
      <span style={{ fontSize: 8, color: "rgba(255,255,255,0.3)", letterSpacing: "0.3px" }}>CII</span>
    }>
      {isLoading && items.length === 0 ? (
        <div style={{ padding: "16px", fontSize: 10, color: "rgba(255,255,255,0.3)", textAlign: "center" }}>Analyzing...</div>
      ) : (
        <div style={{ overflowY: "auto", maxHeight: 320 }}>
          {ranked.map((c, i) => (
            <div key={c.name} style={{
              display: "flex", alignItems: "center", gap: 8,
              padding: "5px 10px", borderBottom: "1px solid rgba(255,255,255,0.04)",
            }}>
              <span style={{ fontSize: 9, color: "rgba(255,255,255,0.2)", minWidth: 16, fontWeight: 700 }}>
                {String(i + 1).padStart(2, "0")}
              </span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.8)", marginBottom: 2 }}>
                  {c.name}
                </div>
                {/* Score bar */}
                <div style={{ height: 3, background: "rgba(255,255,255,0.06)", borderRadius: 2, overflow: "hidden" }}>
                  <div style={{
                    height: "100%", width: `${c.score}%`,
                    background: getColor(c.score), borderRadius: 2,
                    transition: "width 0.4s",
                  }} />
                </div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 1, minWidth: 48 }}>
                <span style={{
                  fontSize: 8, fontWeight: 800, padding: "1px 5px", borderRadius: 2,
                  background: `${getColor(c.score)}20`, color: getColor(c.score),
                  border: `1px solid ${getColor(c.score)}40`, letterSpacing: "0.4px",
                }}>
                  {getLabel(c.score)}
                </span>
                <span style={{ fontSize: 8, color: "rgba(255,255,255,0.2)" }}>{c.score}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </PanelShell>
  );
}
