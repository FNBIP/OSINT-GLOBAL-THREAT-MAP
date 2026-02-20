"use client";

/**
 * AI Strategic Posture Panel — worldmonitor style
 * Shows geopolitical theater posture indicators derived from
 * the top breaking/conflict news clusters.
 *
 * Theaters: Ukraine, Middle East, Taiwan Strait, Korean Peninsula,
 *           South China Sea, Sahel, Red Sea, Iran
 */

import { useMemo } from "react";
import { useNewsStore } from "@/stores/news-store";
import { PanelShell } from "./panel-shell";

interface Theater {
  id: string;
  name: string;
  keywords: string[];
  baseLevel: "LOW" | "ELEVATED" | "HIGH" | "CRIT";
}

const THEATERS: Theater[] = [
  { id: "ukraine",     name: "Ukraine",          keywords: ["ukraine","russia","kyiv","donbas","zelensky","putin"],    baseLevel: "CRIT"     },
  { id: "mideast",     name: "Middle East",       keywords: ["israel","gaza","hamas","hezbollah","iran","lebanon"],     baseLevel: "CRIT"     },
  { id: "taiwan",      name: "Taiwan Strait",     keywords: ["taiwan","pla","tsmc","strait","beijing","taipei"],        baseLevel: "ELEVATED" },
  { id: "korea",       name: "Korean Peninsula",  keywords: ["north korea","dprk","pyongyang","missile","kim jong"],    baseLevel: "ELEVATED" },
  { id: "redsea",      name: "Red Sea",           keywords: ["houthi","red sea","shipping","tanker","drone attack"],    baseLevel: "HIGH"     },
  { id: "sahel",       name: "Sahel",             keywords: ["mali","burkina","niger","sahel","wagner","al-qaeda"],     baseLevel: "HIGH"     },
  { id: "scs",         name: "South China Sea",   keywords: ["south china sea","philippines","spratly","paracels"],     baseLevel: "ELEVATED" },
  { id: "iran",        name: "Iran",              keywords: ["iran","irgc","nuclear","enrichment","tehran","sanctions"],baseLevel: "HIGH"     },
];

const LEVEL_COLOR: Record<string, string> = {
  LOW:      "#22c55e",
  ELEVATED: "#eab308",
  HIGH:     "#f97316",
  CRIT:     "#ef4444",
};

const LEVEL_ORDER: Record<string, number> = { CRIT: 4, HIGH: 3, ELEVATED: 2, LOW: 1 };

function detectLevel(title: string, keywords: string[]): "LOW" | "ELEVATED" | "HIGH" | "CRIT" {
  const t = title.toLowerCase();
  const hit = keywords.some((k) => t.includes(k));
  if (!hit) return "LOW";
  // Escalation indicators
  if (/attack|strike|killed|bomb|explosion|missile|war|invasion|offensive/.test(t)) return "CRIT";
  if (/threat|sanction|deploy|escalat|tension|clash|casualties/.test(t)) return "HIGH";
  return "ELEVATED";
}

export function StrategicPosturePanel() {
  const items = useNewsStore((s) => s.items);
  const isLoading = useNewsStore((s) => s.isLoading);

  const theaters = useMemo(() => {
    // Score each theater based on recent articles (last 24h)
    const cutoff = Date.now() - 24 * 60 * 60 * 1000;
    const recent = items.filter((i) => new Date(i.pubDate).getTime() > cutoff);

    return THEATERS.map((theater) => {
      const hits = recent.filter((i) =>
        theater.keywords.some((k) => i.title.toLowerCase().includes(k))
      );

      let level = theater.baseLevel;
      if (hits.length > 0) {
        const levels = hits.map((i) => detectLevel(i.title, theater.keywords));
        const maxLevel = levels.reduce((a, b) =>
          LEVEL_ORDER[b]! > LEVEL_ORDER[a]! ? b : a, "LOW" as string
        ) as "LOW" | "ELEVATED" | "HIGH" | "CRIT";
        // Take max of base and detected
        level = LEVEL_ORDER[maxLevel]! >= LEVEL_ORDER[theater.baseLevel]! ? maxLevel : theater.baseLevel;
      }

      return { ...theater, level, articleCount: hits.length };
    }).sort((a, b) => LEVEL_ORDER[b.level]! - LEVEL_ORDER[a.level]!);
  }, [items]);

  return (
    <PanelShell title="AI Strategic Posture" live headerRight={
      <span style={{ fontSize: 8, padding: "1px 5px", borderRadius: 2, background: "rgba(239,68,68,0.15)", color: "#ef4444", border: "1px solid rgba(239,68,68,0.3)", fontWeight: 700, letterSpacing: "0.4px" }}>
        {theaters.filter((t) => t.level === "CRIT").length} CRIT
      </span>
    }>
      {isLoading && items.length === 0 ? (
        <div style={{ padding: "16px", fontSize: 10, color: "rgba(255,255,255,0.3)", textAlign: "center" }}>Analyzing...</div>
      ) : (
        <div>
          {theaters.map((t) => (
            <div key={t.id} style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "6px 10px", borderBottom: "1px solid rgba(255,255,255,0.04)",
              borderLeft: `2px solid ${LEVEL_COLOR[t.level]}`,
            }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                <span style={{ fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.8)" }}>{t.name}</span>
                <span style={{ fontSize: 8, color: "rgba(255,255,255,0.25)" }}>
                  {t.articleCount > 0 ? `${t.articleCount} articles (24h)` : "monitoring"}
                </span>
              </div>
              <span style={{
                fontSize: 9, fontWeight: 800, padding: "2px 7px", borderRadius: 2,
                background: `${LEVEL_COLOR[t.level]}20`,
                color: LEVEL_COLOR[t.level],
                border: `1px solid ${LEVEL_COLOR[t.level]}40`,
                letterSpacing: "0.5px",
              }}>
                {t.level}
              </span>
            </div>
          ))}
        </div>
      )}
    </PanelShell>
  );
}
