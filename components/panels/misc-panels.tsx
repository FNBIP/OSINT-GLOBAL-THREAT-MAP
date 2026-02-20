"use client";

/**
 * Miscellaneous panels matching worldmonitor's remaining panel list:
 * - Market Radar (Macro Signals)
 * - BTC ETF Tracker
 * - Stablecoins
 * - UNHCR Displacement
 * - Climate Anomalies
 * - UCDP Conflict Events
 * - Strategic Risk Overview
 * - AI/ML News
 */

import { useMemo } from "react";
import { useNewsStore } from "@/stores/news-store";
import { PanelShell } from "./panel-shell";

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function NewsListPanel({ title, keywords, maxItems = 6 }: {
  title: string;
  keywords: string[];
  maxItems?: number;
}) {
  const items = useNewsStore((s) => s.items);
  const isLoading = useNewsStore((s) => s.isLoading);

  const filtered = useMemo(() => {
    return items
      .filter((i) => {
        const text = (i.title + " " + (i.description ?? "")).toLowerCase();
        return keywords.some((k) => text.includes(k));
      })
      .slice(0, maxItems);
  }, [items, keywords, maxItems]);

  return (
    <PanelShell title={title} live count={filtered.length || null}>
      {isLoading && filtered.length === 0 ? (
        <div style={{ padding: "14px", fontSize: 10, color: "rgba(255,255,255,0.3)", textAlign: "center" }}>Loading...</div>
      ) : filtered.length === 0 ? (
        <div style={{ padding: "14px", fontSize: 10, color: "rgba(255,255,255,0.25)", textAlign: "center" }}>No articles found</div>
      ) : (
        <div style={{ overflowY: "auto", maxHeight: 220 }}>
          {filtered.map((item) => (
            <a key={item.id} href={item.link} target="_blank" rel="noopener noreferrer"
              style={{ textDecoration: "none", display: "block" }}>
              <div
                style={{ padding: "6px 10px", borderBottom: "1px solid rgba(255,255,255,0.04)", cursor: "pointer" }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.03)")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
              >
                <div style={{ fontSize: 10, color: "rgba(255,255,255,0.75)", lineHeight: 1.4, marginBottom: 3 }}>{item.title}</div>
                <div style={{ display: "flex", gap: 6 }}>
                  <span style={{ fontSize: 8, color: "rgba(255,255,255,0.3)", fontWeight: 600 }}>{item.source}</span>
                  <span style={{ fontSize: 8, color: "rgba(255,255,255,0.2)" }}>{timeAgo(item.pubDate)}</span>
                </div>
              </div>
            </a>
          ))}
        </div>
      )}
    </PanelShell>
  );
}

// ── Exported panels ──────────────────────────────────────────────

export function AIMLPanel() {
  return <NewsListPanel
    title="AI / ML"
    keywords={["artificial intelligence","machine learning","llm","openai","anthropic","gemini","gpt","deepmind","nvidia ai","ai model","large language"]}
  />;
}

export function StrategicRiskPanel() {
  return <NewsListPanel
    title="Strategic Risk"
    keywords={["strategic","escalation","nuclear","deterrence","sanctions","geopolitical risk","regime change","coup","destabiliz","wmd","chemical weapon","biological weapon"]}
  />;
}

export function MarketRadarPanel() {
  return <NewsListPanel
    title="Market Radar"
    keywords={["macro","recession","inflation","interest rate","fed","ecb","central bank","yield","treasury","gdp","trade war","tariff","dollar","yen","euro"]}
  />;
}

export function BTCETFPanel() {
  return <NewsListPanel
    title="BTC ETF Tracker"
    keywords={["bitcoin etf","btc etf","blackrock bitcoin","fidelity bitcoin","spot etf","crypto etf","coinbase","binance","crypto fund"]}
  />;
}

export function StablecoinsPanel() {
  return <NewsListPanel
    title="Stablecoins"
    keywords={["stablecoin","usdc","usdt","tether","dai","defi","depegged","stable coin","cbdc","digital dollar"]}
  />;
}

export function UNHCRPanel() {
  return <NewsListPanel
    title="UNHCR Displacement"
    keywords={["refugee","displaced","displacement","asylum","unhcr","forced migration","humanitarian crisis","civilian evacuation","internally displaced"]}
  />;
}

export function ClimateAnomaliesPanel() {
  return <NewsListPanel
    title="Climate Anomalies"
    keywords={["climate","extreme weather","hurricane","typhoon","flood","drought","wildfire","earthquake","tsunami","eruption","heatwave","cyclone"]}
  />;
}

export function UCDPConflictPanel() {
  return <NewsListPanel
    title="UCDP Conflict Events"
    keywords={["conflict","armed group","militia","battle","siege","airstrike","ground offensive","ceasefire","hostilities","war crime","ucdp","acled"]}
  />;
}
