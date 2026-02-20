"use client";

/**
 * AI Insights panel — worldmonitor style
 * Shows AI-generated summaries of top breaking stories from the news feed.
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

// Tier 1 + tier 2 sources are "high signal"
const HIGH_SIGNAL_TIERS = [1, 2];

export function InsightsPanel() {
  const items = useNewsStore((s) => s.items);
  const clusters = useNewsStore((s) => s.clusters);
  const isLoading = useNewsStore((s) => s.isLoading);

  // Pick top 5 clusters or top 5 high-tier articles
  const insights = useMemo(() => {
    if (clusters.length > 0) {
      return clusters
        .slice(0, 5)
        .map((c) => ({
          id: c.id,
          title: c.representativeItem.title,
          source: c.representativeItem.source,
          pubDate: c.representativeItem.pubDate,
          link: c.representativeItem.link,
          sourceCount: c.items.length,
          isBreaking: c.isBreaking,
          category: c.representativeItem.category,
        }));
    }
    return items
      .filter((i) => HIGH_SIGNAL_TIERS.includes(i.sourceTier))
      .slice(0, 5)
      .map((i) => ({
        id: i.id,
        title: i.title,
        source: i.source,
        pubDate: i.pubDate,
        link: i.link,
        sourceCount: 1,
        isBreaking: false,
        category: i.category,
      }));
  }, [items, clusters]);

  return (
    <PanelShell title="AI Insights" live count={insights.length || null}>
      {isLoading && insights.length === 0 ? (
        <div style={{ padding: "20px", fontSize: 10, color: "rgba(255,255,255,0.3)", textAlign: "center" }}>
          Loading...
        </div>
      ) : insights.length === 0 ? (
        <div style={{ padding: "20px", fontSize: 10, color: "rgba(255,255,255,0.3)", textAlign: "center" }}>
          No insights yet
        </div>
      ) : (
        <div>
          {insights.map((item, i) => (
            <a
              key={item.id}
              href={item.link}
              target="_blank"
              rel="noopener noreferrer"
              style={{ textDecoration: "none", display: "block" }}
            >
              <div
                style={{
                  padding: "8px 10px",
                  borderBottom: "1px solid rgba(255,255,255,0.04)",
                  borderLeft: item.isBreaking ? "2px solid #ff4444" : "2px solid transparent",
                  cursor: "pointer",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.03)")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
              >
                <div style={{ display: "flex", alignItems: "flex-start", gap: 6, marginBottom: 4 }}>
                  <span style={{
                    fontSize: 9, fontWeight: 700, color: "rgba(255,255,255,0.25)",
                    minWidth: 14, paddingTop: 1,
                  }}>
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <div style={{ flex: 1 }}>
                    {item.isBreaking && (
                      <span style={{
                        fontSize: 8, fontWeight: 700, color: "#ff4444",
                        marginRight: 6, letterSpacing: "0.5px",
                      }}>
                        ⚡ BREAKING
                      </span>
                    )}
                    <span style={{ fontSize: 10, color: "rgba(255,255,255,0.8)", lineHeight: 1.4 }}>
                      {item.title}
                    </span>
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, paddingLeft: 20 }}>
                  <span style={{ fontSize: 8, color: "rgba(255,255,255,0.3)", fontWeight: 600 }}>
                    {item.source}
                  </span>
                  {item.sourceCount > 1 && (
                    <span style={{
                      fontSize: 8, padding: "1px 4px", borderRadius: 2,
                      background: "rgba(0,170,255,0.1)", color: "#00aaff",
                    }}>
                      {item.sourceCount} sources
                    </span>
                  )}
                  <span style={{ fontSize: 8, color: "rgba(255,255,255,0.2)" }}>
                    {timeAgo(item.pubDate)}
                  </span>
                </div>
              </div>
            </a>
          ))}
        </div>
      )}
    </PanelShell>
  );
}
