"use client";

import { memo, useState } from "react";
import { formatRelativeTime } from "@/lib/utils";
import { CATEGORY_COLORS } from "@/lib/rss-feeds";
import type { NewsItem } from "@/lib/rss";

/* ── Tier badge config (worldmonitor style) ── */
const tierConfig: Record<number, { symbol: string; label: string; bg: string; color: string; border: string }> = {
  1: {
    symbol: "\u2605", // ★
    label: "Wire",
    bg: "linear-gradient(135deg, rgba(0,255,136,0.25), rgba(0,200,100,0.15))",
    color: "#00ff88",
    border: "rgba(0,255,136,0.4)",
  },
  2: {
    symbol: "\u25CF", // ●
    label: "Major",
    bg: "rgba(0,170,255,0.15)",
    color: "#00aaff",
    border: "rgba(0,170,255,0.3)",
  },
  3: {
    symbol: "\u25CF", // ●
    label: "Spec",
    bg: "rgba(255,170,0,0.15)",
    color: "#ffaa00",
    border: "rgba(255,170,0,0.3)",
  },
  4: {
    symbol: "\u25CB", // ○
    label: "Agg",
    bg: "rgba(136,136,136,0.15)",
    color: "#888888",
    border: "rgba(136,136,136,0.3)",
  },
};

interface NewsCardProps {
  item: NewsItem;
  isNew?: boolean;
}

export const NewsCard = memo(function NewsCard({ item, isNew }: NewsCardProps) {
  const [hovered, setHovered] = useState(false);
  const tier = tierConfig[item.sourceTier] || tierConfig[3];
  const catColor = CATEGORY_COLORS[item.category] || "#888";
  const catLabel = item.category.replace("regional-", "").replace(/^\w/, (c) => c.toUpperCase());

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        padding: "8px 0 8px 10px",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
        borderLeft: `2px solid ${hovered ? "#00aaff" : "rgba(255,255,255,0.08)"}`,
        transition: "border-left-color 0.15s ease",
        cursor: "pointer",
      }}
    >
      {/* Line 1 — Source row */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "6px",
          flexWrap: "wrap",
          fontSize: "9px",
          textTransform: "uppercase",
          letterSpacing: "0.5px",
          color: "rgba(255,255,255,0.45)",
          lineHeight: "14px",
        }}
      >
        {/* Tier badge */}
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "3px",
            fontSize: "9px",
            fontWeight: 600,
            padding: "1px 5px",
            borderRadius: "3px",
            background: tier.bg,
            color: tier.color,
            border: `1px solid ${tier.border}`,
            whiteSpace: "nowrap",
          }}
        >
          {tier.symbol} {tier.label}
        </span>

        {/* Source name */}
        <span style={{ fontWeight: 500 }}>{item.source}</span>

        {/* Propaganda badge */}
        {item.propagandaRisk === "high" && (
          <span
            style={{
              fontSize: "8px",
              fontWeight: 600,
              padding: "1px 5px",
              borderRadius: "3px",
              background: "rgba(255,60,60,0.2)",
              color: "#ff6666",
              border: "1px solid rgba(255,60,60,0.3)",
              whiteSpace: "nowrap",
            }}
          >
            {"\u26A0"} State Media{item.stateAffiliation ? ` (${item.stateAffiliation})` : ""}
          </span>
        )}
        {item.propagandaRisk === "medium" && (
          <span
            style={{
              fontSize: "8px",
              fontWeight: 600,
              padding: "1px 5px",
              borderRadius: "3px",
              background: "rgba(255,170,0,0.15)",
              color: "#ffaa00",
              border: "1px solid rgba(255,170,0,0.3)",
              whiteSpace: "nowrap",
            }}
          >
            ! Caution{item.stateAffiliation ? ` (${item.stateAffiliation})` : ""}
          </span>
        )}

        {/* NEW tag */}
        {isNew && (
          <span
            style={{
              fontSize: "8px",
              fontWeight: 700,
              padding: "1px 5px",
              borderRadius: "3px",
              background: "#00ff88",
              color: "#0a0a0a",
              whiteSpace: "nowrap",
            }}
          >
            NEW
          </span>
        )}

        {/* Category tag */}
        <span
          style={{
            fontSize: "8px",
            padding: "1px 5px",
            borderRadius: "3px",
            color: catColor,
            border: `1px solid ${catColor}40`,
            background: `${catColor}20`,
            whiteSpace: "nowrap",
          }}
        >
          {catLabel}
        </span>
      </div>

      {/* Line 2 — Title */}
      <a
        href={item.link}
        target="_blank"
        rel="noopener noreferrer"
        style={{
          display: "block",
          fontSize: "12px",
          lineHeight: "17px",
          color: hovered ? "#00aaff" : "rgba(255,255,255,0.88)",
          textDecoration: "none",
          marginTop: "3px",
          transition: "color 0.15s ease",
        }}
      >
        {item.title}
      </a>

      {/* Line 3 — Time */}
      <div
        style={{
          fontSize: "9px",
          color: "rgba(255,255,255,0.35)",
          marginTop: "3px",
          lineHeight: "12px",
        }}
      >
        {formatRelativeTime(item.pubDate)}
      </div>
    </div>
  );
});
