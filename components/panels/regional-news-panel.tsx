"use client";

import { useMemo } from "react";
import { useNewsStore } from "@/stores/news-store";
import { PanelShell } from "./panel-shell";
import type { NewsCategory } from "@/lib/rss-feeds";

interface RegionalNewsPanelProps {
  title: string;
  /** One or more NewsCategory ids to filter by */
  categories: NewsCategory[];
  maxItems?: number;
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export function RegionalNewsPanel({ title, categories, maxItems = 8 }: RegionalNewsPanelProps) {
  const items = useNewsStore((s) => s.items);
  const isLoading = useNewsStore((s) => s.isLoading);

  const filtered = useMemo(() => {
    return items
      .filter((i) => categories.includes(i.category as NewsCategory))
      .slice(0, maxItems);
  }, [items, categories, maxItems]);

  return (
    <PanelShell title={title} live count={filtered.length || null}>
      {isLoading && filtered.length === 0 ? (
        <div style={{ padding: "12px", fontSize: 10, color: "rgba(255,255,255,0.3)", textAlign: "center" }}>
          Loading...
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ padding: "12px", fontSize: 10, color: "rgba(255,255,255,0.3)", textAlign: "center" }}>
          No articles
        </div>
      ) : (
        <div style={{ overflowY: "auto", maxHeight: 240 }}>
          {filtered.map((item) => (
            <a
              key={item.id}
              href={item.link}
              target="_blank"
              rel="noopener noreferrer"
              style={{ textDecoration: "none", display: "block" }}
            >
              <div style={{
                padding: "6px 10px",
                borderBottom: "1px solid rgba(255,255,255,0.04)",
                cursor: "pointer",
              }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.03)")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
              >
                <div style={{ fontSize: 10, color: "rgba(255,255,255,0.75)", lineHeight: 1.4, marginBottom: 3 }}>
                  {item.title}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
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
