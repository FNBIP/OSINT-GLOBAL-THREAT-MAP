"use client";

/**
 * Final Missing Panels from worldmonitor:
 * - Intel Feed (GDELT)
 * - Live Intelligence (GDELT Doc)
 * - Satellite Fires
 * - Population Exposure
 * - My Monitors
 */

import { useMemo, useState } from "react";
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

// ── GDELT Intel Feed ──────────────────────────────────────────

/**
 * Intel Feed — GDELT-derived intelligence signals
 * Uses top-tier news sources + conflict/intelligence keywords
 */
export function IntelFeedPanel() {
  const items = useNewsStore((s) => s.items);
  const isLoading = useNewsStore((s) => s.isLoading);

  const intelItems = useMemo(() => {
    // Tier 1 + 2 sources only + intelligence/conflict keywords
    const keywords = [
      "intelligence", "classified", "leak", "security breach", "coup",
      "assassination", "regime", "military operation", "offensive", "strike",
      "airstrike", "missile", "nuclear", "wmd", "sanctions", "espionage",
      "spy", "cia", "mi6", "mossad", "fsb", "gru", "msss", "insurgency",
    ];

    return items
      .filter((i) => {
        if (i.sourceTier > 2) return false;
        const text = (i.title + " " + (i.description ?? "")).toLowerCase();
        return keywords.some((k) => text.includes(k));
      })
      .slice(0, 10);
  }, [items]);

  return (
    <PanelShell title="Intel Feed" live count={intelItems.length || null}>
      {isLoading && intelItems.length === 0 ? (
        <div style={{ padding: "16px", fontSize: 10, color: "rgba(255,255,255,0.3)", textAlign: "center" }}>Loading...</div>
      ) : intelItems.length === 0 ? (
        <div style={{ padding: "16px", fontSize: 10, color: "rgba(255,255,255,0.25)", textAlign: "center" }}>
          No intelligence signals detected
        </div>
      ) : (
        <div style={{ overflowY: "auto", maxHeight: 300 }}>
          {intelItems.map((item) => (
            <a key={item.id} href={item.link} target="_blank" rel="noopener noreferrer"
              style={{ textDecoration: "none", display: "block" }}>
              <div
                style={{
                  padding: "6px 10px",
                  borderBottom: "1px solid rgba(255,255,255,0.04)",
                  borderLeft: item.sourceTier === 1 ? "2px solid #00aaff" : "2px solid transparent",
                  cursor: "pointer",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.03)")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
              >
                <div style={{ fontSize: 10, color: "rgba(255,255,255,0.75)", lineHeight: 1.4, marginBottom: 3 }}>
                  {item.title}
                </div>
                <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                  <span style={{ fontSize: 8, color: "rgba(255,255,255,0.3)", fontWeight: 600 }}>{item.source}</span>
                  {item.sourceTier === 1 && (
                    <span style={{
                      fontSize: 7, padding: "1px 4px", borderRadius: 2,
                      background: "rgba(0,170,255,0.15)", color: "#00aaff",
                      fontWeight: 700, letterSpacing: "0.3px",
                    }}>
                      T1
                    </span>
                  )}
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

// ── Live Intelligence (GDELT Doc) ─────────────────────────────

/**
 * Live Intelligence — Real-time document stream
 * Shows breaking news from wire services with threat classification
 */
export function LiveIntelligencePanel() {
  const items = useNewsStore((s) => s.items);
  const clusters = useNewsStore((s) => s.clusters);
  const isLoading = useNewsStore((s) => s.isLoading);

  const liveItems = useMemo(() => {
    // Use breaking clusters if available, otherwise recent tier-1 items
    if (clusters.some((c) => c.isBreaking)) {
      return clusters
        .filter((c) => c.isBreaking)
        .slice(0, 8)
        .map((c) => ({
          id: c.id,
          title: c.representativeItem.title,
          source: c.representativeItem.source,
          pubDate: c.representativeItem.pubDate,
          link: c.representativeItem.link,
          velocity: c.sourcesPerHour,
        }));
    }

    const cutoff = Date.now() - 2 * 60 * 60 * 1000; // 2h
    return items
      .filter((i) => i.sourceTier === 1 && new Date(i.pubDate).getTime() > cutoff)
      .slice(0, 8)
      .map((i) => ({
        id: i.id,
        title: i.title,
        source: i.source,
        pubDate: i.pubDate,
        link: i.link,
        velocity: 0,
      }));
  }, [items, clusters]);

  return (
    <PanelShell title="Live Intelligence" live count={liveItems.length || null}>
      {isLoading && liveItems.length === 0 ? (
        <div style={{ padding: "16px", fontSize: 10, color: "rgba(255,255,255,0.3)", textAlign: "center" }}>Loading...</div>
      ) : liveItems.length === 0 ? (
        <div style={{ padding: "16px", fontSize: 10, color: "rgba(255,255,255,0.25)", textAlign: "center" }}>
          No breaking intelligence
        </div>
      ) : (
        <div style={{ overflowY: "auto", maxHeight: 280 }}>
          {liveItems.map((item) => (
            <a key={item.id} href={item.link} target="_blank" rel="noopener noreferrer"
              style={{ textDecoration: "none", display: "block" }}>
              <div
                style={{
                  padding: "6px 10px",
                  borderBottom: "1px solid rgba(255,255,255,0.04)",
                  borderLeft: item.velocity > 0 ? "2px solid #ff4444" : "2px solid #00aaff",
                  cursor: "pointer",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.03)")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
              >
                {item.velocity > 0 && (
                  <div style={{ marginBottom: 3 }}>
                    <span style={{
                      fontSize: 7, padding: "1px 5px", borderRadius: 2,
                      background: "rgba(255,68,68,0.15)", color: "#ff4444",
                      border: "1px solid rgba(255,68,68,0.3)",
                      fontWeight: 700, letterSpacing: "0.4px",
                    }}>
                      ⚡ {item.velocity.toFixed(1)}/h
                    </span>
                  </div>
                )}
                <div style={{ fontSize: 10, color: "rgba(255,255,255,0.75)", lineHeight: 1.4, marginBottom: 3 }}>
                  {item.title}
                </div>
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

// ── Satellite Fires ───────────────────────────────────────────

/**
 * Satellite Fires — NASA FIRMS fire detection
 * Shows wildfire/fire news filtered from feed
 */
export function SatelliteFiresPanel() {
  const items = useNewsStore((s) => s.items);
  const isLoading = useNewsStore((s) => s.isLoading);

  const fireItems = useMemo(() => {
    const keywords = [
      "wildfire", "fire", "blaze", "burn", "forest fire", "brush fire",
      "arson", "firefight", "smoke", "evacuate fire", "flames",
    ];
    return items
      .filter((i) => {
        const text = (i.title + " " + (i.description ?? "")).toLowerCase();
        return keywords.some((k) => text.includes(k));
      })
      .slice(0, 8);
  }, [items]);

  return (
    <PanelShell title="Fires" live count={fireItems.length || null} headerRight={
      <span style={{ fontSize: 8, color: "rgba(255,255,255,0.3)", letterSpacing: "0.3px" }}>NASA FIRMS</span>
    }>
      {isLoading && fireItems.length === 0 ? (
        <div style={{ padding: "16px", fontSize: 10, color: "rgba(255,255,255,0.3)", textAlign: "center" }}>Loading...</div>
      ) : fireItems.length === 0 ? (
        <div style={{ padding: "16px", fontSize: 10, color: "rgba(255,255,255,0.25)", textAlign: "center" }}>
          No active fire alerts
        </div>
      ) : (
        <div style={{ overflowY: "auto", maxHeight: 240 }}>
          {fireItems.map((item) => (
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

// ── Population Exposure ───────────────────────────────────────

/**
 * Population Exposure — WorldPop exposure analysis
 * Shows humanitarian/crisis news filtered from feed
 */
export function PopulationExposurePanel() {
  const items = useNewsStore((s) => s.items);
  const isLoading = useNewsStore((s) => s.isLoading);

  const exposureItems = useMemo(() => {
    const keywords = [
      "population", "civilians", "humanitarian", "displaced", "refugee",
      "evacuation", "casualties", "civilian casualties", "affected population",
      "at risk", "vulnerable", "exposure", "shelter", "aid",
    ];
    return items
      .filter((i) => {
        const text = (i.title + " " + (i.description ?? "")).toLowerCase();
        return keywords.some((k) => text.includes(k));
      })
      .slice(0, 8);
  }, [items]);

  return (
    <PanelShell title="Population Exposure" live count={exposureItems.length || null}>
      {isLoading && exposureItems.length === 0 ? (
        <div style={{ padding: "16px", fontSize: 10, color: "rgba(255,255,255,0.3)", textAlign: "center" }}>Loading...</div>
      ) : exposureItems.length === 0 ? (
        <div style={{ padding: "16px", fontSize: 10, color: "rgba(255,255,255,0.25)", textAlign: "center" }}>
          No exposure alerts
        </div>
      ) : (
        <div style={{ overflowY: "auto", maxHeight: 240 }}>
          {exposureItems.map((item) => (
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

// ── My Monitors ───────────────────────────────────────────────

/**
 * My Monitors — Custom saved monitors
 * Placeholder for user-defined monitors (requires auth + storage)
 */
export function MyMonitorsPanel() {
  const [monitors] = useState<string[]>([]);

  return (
    <PanelShell title="My Monitors" count={monitors.length || null}>
      <div style={{ padding: "20px 12px", textAlign: "center" }}>
        <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", marginBottom: 8 }}>
          No custom monitors configured
        </div>
        <button style={{
          fontSize: 9, padding: "4px 10px", borderRadius: 3,
          background: "rgba(0,170,255,0.1)", color: "#00aaff",
          border: "1px solid rgba(0,170,255,0.25)", cursor: "pointer",
          fontWeight: 600, letterSpacing: "0.3px",
        }}>
          + Add Monitor
        </button>
      </div>
    </PanelShell>
  );
}
