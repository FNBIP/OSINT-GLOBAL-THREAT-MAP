"use client";

import { memo, useState } from "react";
import { formatRelativeTime } from "@/lib/utils";
import { CATEGORY_COLORS } from "@/lib/rss-feeds";
import type { NewsCluster } from "@/lib/news-clustering";
import { getClusterSourcesSummary } from "@/lib/news-clustering";
import { extractEntities, segmentTextWithEntities } from "@/lib/entity-extraction";
import { useMapStore } from "@/stores/map-store";
import { ChevronDown, ChevronRight, Zap } from "lucide-react";

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

interface NewsClusterCardProps {
  cluster: NewsCluster;
  isNew?: boolean;
}

export const NewsClusterCard = memo(function NewsClusterCard({ cluster, isNew }: NewsClusterCardProps) {
  const [hovered, setHovered] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const flyTo = useMapStore((s) => s.flyTo);

  const item = cluster.representativeItem;
  const tier = tierConfig[item.sourceTier] || tierConfig[3];
  const catColor = CATEGORY_COLORS[item.category] || "#888";
  const catLabel = item.category.replace("regional-", "").replace(/^\w/, (c) => c.toUpperCase());

  // Extract entities from title
  const entities = extractEntities(item.title);
  const titleSegments = segmentTextWithEntities(item.title, entities);

  const handleEntityClick = (entity: { type: string; countryCode?: string; text: string }) => {
    if (entity.type === "country" && entity.countryCode) {
      // Fly to country on map (you'd need to add country coordinates)
      console.log("Fly to country:", entity.countryCode);
    } else if (entity.type === "leader" || entity.type === "organization") {
      // Trigger entity search
      console.log("Search entity:", entity.text);
    }
  };

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        padding: "8px 0 8px 10px",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
        borderLeft: `2px solid ${cluster.isBreaking ? "#ff4444" : hovered ? "#00aaff" : "rgba(255,255,255,0.08)"}`,
        transition: "border-left-color 0.15s ease",
        cursor: "pointer",
        background: cluster.isBreaking ? "rgba(255,68,68,0.05)" : "transparent",
      }}
    >
      {/* Line 1 — Source row with cluster info */}
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
        {/* Breaking alert badge */}
        {cluster.isBreaking && (
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "3px",
              fontSize: "9px",
              fontWeight: 700,
              padding: "2px 6px",
              borderRadius: "3px",
              background: "linear-gradient(135deg, rgba(255,68,68,0.3), rgba(255,100,100,0.2))",
              color: "#ff4444",
              border: "1px solid rgba(255,68,68,0.5)",
              whiteSpace: "nowrap",
              animation: "pulse 2s ease-in-out infinite",
            }}
          >
            <Zap className="h-2.5 w-2.5" fill="currentColor" />
            BREAKING
          </span>
        )}

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

        {/* Cluster indicator */}
        {cluster.sourcesCount > 1 && (
          <span
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setExpanded(!expanded);
            }}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "2px",
              fontSize: "9px",
              fontWeight: 600,
              padding: "1px 5px",
              borderRadius: "3px",
              background: "rgba(0,170,255,0.15)",
              color: "#00aaff",
              border: "1px solid rgba(0,170,255,0.3)",
              whiteSpace: "nowrap",
              cursor: "pointer",
            }}
          >
            {expanded ? <ChevronDown className="h-2.5 w-2.5" /> : <ChevronRight className="h-2.5 w-2.5" />}
            {cluster.sourcesCount} sources
          </span>
        )}

        {/* Velocity indicator for breaking news */}
        {cluster.isBreaking && (
          <span
            style={{
              fontSize: "8px",
              padding: "1px 5px",
              borderRadius: "3px",
              background: "rgba(255,170,0,0.15)",
              color: "#ffaa00",
              border: "1px solid rgba(255,170,0,0.3)",
              whiteSpace: "nowrap",
            }}
          >
            {cluster.sourcesPerHour.toFixed(1)} sources/hr
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

      {/* Line 2 — Title with entity extraction */}
      <div
        style={{
          fontSize: "12px",
          lineHeight: "17px",
          color: "rgba(255,255,255,0.88)",
          marginTop: "3px",
        }}
      >
        {titleSegments.map((segment, idx) =>
          segment.entity ? (
            <span
              key={idx}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleEntityClick(segment.entity!);
              }}
              style={{
                color: "#00aaff",
                textDecoration: "underline",
                textDecorationStyle: "dotted",
                cursor: "pointer",
                transition: "color 0.15s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = "#00ff88";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = "#00aaff";
              }}
            >
              {segment.text}
            </span>
          ) : (
            <span key={idx}>{segment.text}</span>
          )
        )}
      </div>

      {/* Line 3 — Time + link */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "6px",
          fontSize: "9px",
          color: "rgba(255,255,255,0.35)",
          marginTop: "3px",
          lineHeight: "12px",
        }}
      >
        <span>{formatRelativeTime(item.pubDate)}</span>
        <span>•</span>
        <a
          href={item.link}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            color: "rgba(0,170,255,0.7)",
            textDecoration: "none",
            transition: "color 0.15s ease",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = "#00aaff";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = "rgba(0,170,255,0.7)";
          }}
        >
          Read more →
        </a>
      </div>

      {/* Expanded: Show all sources in cluster */}
      {expanded && cluster.sourcesCount > 1 && (
        <div
          style={{
            marginTop: "8px",
            padding: "8px",
            background: "rgba(0,170,255,0.05)",
            border: "1px solid rgba(0,170,255,0.15)",
            borderRadius: "4px",
          }}
        >
          <div
            style={{
              fontSize: "9px",
              fontWeight: 600,
              color: "rgba(255,255,255,0.5)",
              textTransform: "uppercase",
              letterSpacing: "0.5px",
              marginBottom: "6px",
            }}
          >
            All Sources ({cluster.sourcesCount})
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
            {cluster.items.map((clusterItem) => (
              <a
                key={clusterItem.id}
                href={clusterItem.link}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  fontSize: "10px",
                  color: "rgba(255,255,255,0.6)",
                  textDecoration: "none",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  transition: "color 0.15s ease",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = "#00aaff";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = "rgba(255,255,255,0.6)";
                }}
              >
                <span
                  style={{
                    fontSize: "8px",
                    padding: "1px 4px",
                    borderRadius: "2px",
                    background: tierConfig[clusterItem.sourceTier]?.bg || "rgba(136,136,136,0.15)",
                    color: tierConfig[clusterItem.sourceTier]?.color || "#888",
                    border: `1px solid ${tierConfig[clusterItem.sourceTier]?.border || "rgba(136,136,136,0.3)"}`,
                  }}
                >
                  {clusterItem.source}
                </span>
                <span>{clusterItem.title}</span>
              </a>
            ))}
          </div>
        </div>
      )}

      {/* CSS animation for breaking pulse */}
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.7; }
        }
      `}</style>
    </div>
  );
});
