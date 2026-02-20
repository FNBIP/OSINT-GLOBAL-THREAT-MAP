"use client";

/**
 * Layoffs Tracker Panel — worldmonitor style
 * Aggregates layoff news from tech/finance sectors via RSS.
 */

import { useMemo } from "react";
import { useNewsStore } from "@/stores/news-store";
import { PanelShell } from "./panel-shell";

const LAYOFF_KEYWORDS = [
  "layoff", "layoffs", "laid off", "redundanc", "job cut", "workforce reduction",
  "headcount reduction", "reorg", "downsizing", "rif ", "reduction in force",
];

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export function LayoffsPanel() {
  const items = useNewsStore((s) => s.items);
  const isLoading = useNewsStore((s) => s.isLoading);

  const layoffItems = useMemo(() => {
    const lower = (s: string) => s.toLowerCase();
    return items
      .filter((i) => {
        const text = lower(i.title) + " " + lower(i.description ?? "");
        return LAYOFF_KEYWORDS.some((kw) => text.includes(kw));
      })
      .slice(0, 10);
  }, [items]);

  return (
    <PanelShell title="Layoffs Tracker" live count={layoffItems.length || null}>
      {isLoading && layoffItems.length === 0 ? (
        <div style={{ padding: "16px", fontSize: 10, color: "rgba(255,255,255,0.3)", textAlign: "center" }}>Loading...</div>
      ) : layoffItems.length === 0 ? (
        <div style={{ padding: "16px", fontSize: 10, color: "rgba(255,255,255,0.3)", textAlign: "center" }}>
          No layoff news found
        </div>
      ) : (
        <div style={{ overflowY: "auto", maxHeight: 260 }}>
          {layoffItems.map((item) => (
            <a
              key={item.id}
              href={item.link}
              target="_blank"
              rel="noopener noreferrer"
              style={{ textDecoration: "none", display: "block" }}
            >
              <div
                style={{ padding: "6px 10px", borderBottom: "1px solid rgba(255,255,255,0.04)", cursor: "pointer" }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.03)")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
              >
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
