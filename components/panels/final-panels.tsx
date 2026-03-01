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

export function IntelFeedPanel() {
  const items = useNewsStore((s) => s.items);
  const isLoading = useNewsStore((s) => s.isLoading);

  const intelItems = useMemo(() => {
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
        <div style={{ padding: "20px", fontSize: 12, color: "rgba(255,255,255,0.4)", textAlign: "center" }}>Loading...</div>
      ) : intelItems.length === 0 ? (
        <div style={{ padding: "20px", fontSize: 12, color: "rgba(255,255,255,0.3)", textAlign: "center" }}>
          No intelligence signals detected
        </div>
      ) : (
        <div style={{ overflowY: "auto", maxHeight: 340 }}>
          {intelItems.map((item) => (
            <a key={item.id} href={item.link} target="_blank" rel="noopener noreferrer"
              style={{ textDecoration: "none", display: "block" }}>
              <div
                style={{
                  padding: "10px 14px",
                  borderBottom: "1px solid rgba(255,255,255,0.06)",
                  borderLeft: item.sourceTier === 1 ? "3px solid #00aaff" : "3px solid transparent",
                  cursor: "pointer",
                  transition: "background 0.1s",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.04)")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
              >
                <div style={{ fontSize: 12, color: "rgba(255,255,255,0.85)", lineHeight: 1.5, marginBottom: 4 }}>
                  {item.title}
                </div>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <span style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", fontWeight: 600 }}>{item.source}</span>
                  {item.sourceTier === 1 && (
                    <span style={{
                      fontSize: 9, padding: "2px 6px", borderRadius: 3,
                      background: "rgba(0,170,255,0.15)", color: "#00aaff",
                      fontWeight: 700, letterSpacing: "0.3px",
                    }}>
                      T1
                    </span>
                  )}
                  <span style={{ fontSize: 10, color: "rgba(255,255,255,0.3)" }}>{timeAgo(item.pubDate)}</span>
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

export function LiveIntelligencePanel() {
  const items = useNewsStore((s) => s.items);
  const clusters = useNewsStore((s) => s.clusters);
  const isLoading = useNewsStore((s) => s.isLoading);

  const liveItems = useMemo(() => {
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

    const cutoff = Date.now() - 2 * 60 * 60 * 1000;
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
        <div style={{ padding: "20px", fontSize: 12, color: "rgba(255,255,255,0.4)", textAlign: "center" }}>Loading...</div>
      ) : liveItems.length === 0 ? (
        <div style={{ padding: "20px", fontSize: 12, color: "rgba(255,255,255,0.3)", textAlign: "center" }}>
          No breaking intelligence
        </div>
      ) : (
        <div style={{ overflowY: "auto", maxHeight: 320 }}>
          {liveItems.map((item) => (
            <a key={item.id} href={item.link} target="_blank" rel="noopener noreferrer"
              style={{ textDecoration: "none", display: "block" }}>
              <div
                style={{
                  padding: "10px 14px",
                  borderBottom: "1px solid rgba(255,255,255,0.06)",
                  borderLeft: item.velocity > 0 ? "3px solid #ff4444" : "3px solid #00aaff",
                  cursor: "pointer",
                  transition: "background 0.1s",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.04)")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
              >
                {item.velocity > 0 && (
                  <div style={{ marginBottom: 4 }}>
                    <span style={{
                      fontSize: 9, padding: "2px 6px", borderRadius: 3,
                      background: "rgba(255,68,68,0.15)", color: "#ff4444",
                      border: "1px solid rgba(255,68,68,0.3)",
                      fontWeight: 700, letterSpacing: "0.4px",
                    }}>
                      {item.velocity.toFixed(1)}/h
                    </span>
                  </div>
                )}
                <div style={{ fontSize: 12, color: "rgba(255,255,255,0.85)", lineHeight: 1.5, marginBottom: 4 }}>
                  {item.title}
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <span style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", fontWeight: 600 }}>{item.source}</span>
                  <span style={{ fontSize: 10, color: "rgba(255,255,255,0.3)" }}>{timeAgo(item.pubDate)}</span>
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
      <span style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", letterSpacing: "0.3px" }}>NASA FIRMS</span>
    }>
      {isLoading && fireItems.length === 0 ? (
        <div style={{ padding: "20px", fontSize: 12, color: "rgba(255,255,255,0.4)", textAlign: "center" }}>Loading...</div>
      ) : fireItems.length === 0 ? (
        <div style={{ padding: "20px", fontSize: 12, color: "rgba(255,255,255,0.3)", textAlign: "center" }}>
          No active fire alerts
        </div>
      ) : (
        <div style={{ overflowY: "auto", maxHeight: 280 }}>
          {fireItems.map((item) => (
            <a key={item.id} href={item.link} target="_blank" rel="noopener noreferrer"
              style={{ textDecoration: "none", display: "block" }}>
              <div
                style={{
                  padding: "10px 14px",
                  borderBottom: "1px solid rgba(255,255,255,0.06)",
                  cursor: "pointer",
                  transition: "background 0.1s",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.04)")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
              >
                <div style={{ fontSize: 12, color: "rgba(255,255,255,0.85)", lineHeight: 1.5, marginBottom: 4 }}>{item.title}</div>
                <div style={{ display: "flex", gap: 8 }}>
                  <span style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", fontWeight: 600 }}>{item.source}</span>
                  <span style={{ fontSize: 10, color: "rgba(255,255,255,0.3)" }}>{timeAgo(item.pubDate)}</span>
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
        <div style={{ padding: "20px", fontSize: 12, color: "rgba(255,255,255,0.4)", textAlign: "center" }}>Loading...</div>
      ) : exposureItems.length === 0 ? (
        <div style={{ padding: "20px", fontSize: 12, color: "rgba(255,255,255,0.3)", textAlign: "center" }}>
          No exposure alerts
        </div>
      ) : (
        <div style={{ overflowY: "auto", maxHeight: 280 }}>
          {exposureItems.map((item) => (
            <a key={item.id} href={item.link} target="_blank" rel="noopener noreferrer"
              style={{ textDecoration: "none", display: "block" }}>
              <div
                style={{
                  padding: "10px 14px",
                  borderBottom: "1px solid rgba(255,255,255,0.06)",
                  cursor: "pointer",
                  transition: "background 0.1s",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.04)")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
              >
                <div style={{ fontSize: 12, color: "rgba(255,255,255,0.85)", lineHeight: 1.5, marginBottom: 4 }}>{item.title}</div>
                <div style={{ display: "flex", gap: 8 }}>
                  <span style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", fontWeight: 600 }}>{item.source}</span>
                  <span style={{ fontSize: 10, color: "rgba(255,255,255,0.3)" }}>{timeAgo(item.pubDate)}</span>
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

export function MyMonitorsPanel() {
  const [monitors] = useState<string[]>([]);

  return (
    <PanelShell title="My Monitors" count={monitors.length || null}>
      <div style={{ padding: "24px 14px", textAlign: "center" }}>
        <div style={{ fontSize: 12, color: "rgba(255,255,255,0.35)", marginBottom: 10 }}>
          No custom monitors configured
        </div>
        <button style={{
          fontSize: 11, padding: "6px 14px", borderRadius: 4,
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
