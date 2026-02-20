"use client";

import { useCallback, useMemo } from "react";
import { useNewsStore } from "@/stores/news-store";
import { ScrollArea } from "@/components/ui/scroll-area";
import { NewsCard } from "./news-card";
import { NewsClusterCard } from "./news-cluster-card";
import { NewsFilters } from "./news-filters";
import { Layers } from "lucide-react";

export function NewsPanel() {
  const filteredItems = useNewsStore((s) => s.filteredItems);
  const filteredClusters = useNewsStore((s) => s.filteredClusters);
  const enableClustering = useNewsStore((s) => s.enableClustering);
  const setEnableClustering = useNewsStore((s) => s.setEnableClustering);
  const isLoading = useNewsStore((s) => s.isLoading);
  const error = useNewsStore((s) => s.error);
  const items = useNewsStore((s) => s.items);
  const lastReadTimestamp = useNewsStore((s) => s.lastReadTimestamp);
  const setItems = useNewsStore((s) => s.setItems);
  const setLoading = useNewsStore((s) => s.setLoading);
  const setError = useNewsStore((s) => s.setError);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/news");
      if (!response.ok) throw new Error("Failed to fetch news");
      const data = await response.json();
      setItems(data.items || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [setItems, setLoading, setError]);

  // Count sources
  const sourceCount = useMemo(() => {
    const sources = new Set(items.map((i) => i.sourceId));
    return sources.size;
  }, [items]);

  return (
    <div className="flex h-full flex-col" style={{ background: "#0a0a0a" }}>
      {/* Header — worldmonitor style */}
      <div
        style={{
          padding: "10px 12px",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span
            style={{
              fontSize: "11px",
              fontWeight: 600,
              color: "rgba(255,255,255,0.7)",
              textTransform: "uppercase",
              letterSpacing: "1px",
            }}
          >
            OSINT Feed
          </span>
          <span
            style={{
              fontSize: "9px",
              padding: "1px 6px",
              borderRadius: "3px",
              background: "rgba(0,255,136,0.15)",
              color: "#00ff88",
              border: "1px solid rgba(0,255,136,0.3)",
              fontWeight: 600,
            }}
          >
            {enableClustering
              ? `${filteredClusters.length} clusters`
              : `${filteredItems.length} articles`}
          </span>
          <span
            style={{
              fontSize: "9px",
              padding: "1px 6px",
              borderRadius: "3px",
              background: "rgba(0,170,255,0.1)",
              color: "#00aaff",
              border: "1px solid rgba(0,170,255,0.2)",
            }}
          >
            {sourceCount} sources
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <button
            onClick={() => setEnableClustering(!enableClustering)}
            style={{
              fontSize: "9px",
              padding: "3px 8px",
              borderRadius: "3px",
              background: enableClustering ? "rgba(0,170,255,0.15)" : "rgba(255,255,255,0.05)",
              color: enableClustering ? "#00aaff" : "rgba(255,255,255,0.4)",
              border: `1px solid ${enableClustering ? "rgba(0,170,255,0.3)" : "rgba(255,255,255,0.1)"}`,
              cursor: "pointer",
              textTransform: "uppercase",
              fontWeight: 600,
              letterSpacing: "0.5px",
              display: "flex",
              alignItems: "center",
              gap: "3px",
            }}
          >
            <Layers className="h-2.5 w-2.5" />
            {enableClustering ? "CLUSTERED" : "FLAT"}
          </button>
          <button
            onClick={refresh}
            disabled={isLoading}
            style={{
              fontSize: "9px",
              padding: "3px 8px",
              borderRadius: "3px",
              background: isLoading ? "rgba(255,255,255,0.05)" : "rgba(0,170,255,0.15)",
              color: isLoading ? "rgba(255,255,255,0.3)" : "#00aaff",
              border: `1px solid ${isLoading ? "rgba(255,255,255,0.08)" : "rgba(0,170,255,0.3)"}`,
              cursor: isLoading ? "not-allowed" : "pointer",
              textTransform: "uppercase",
              fontWeight: 600,
              letterSpacing: "0.5px",
            }}
          >
            {isLoading ? "..." : "\u21BB REFRESH"}
          </button>
        </div>
      </div>

      {/* Filters */}
      <NewsFilters />

      {/* Content */}
      <ScrollArea className="flex-1">
        <div style={{ padding: "0 4px" }}>
          {/* Loading */}
          {isLoading && items.length === 0 && (
            <div
              style={{
                padding: "40px 0",
                textAlign: "center",
                fontSize: "11px",
                color: "rgba(255,255,255,0.35)",
              }}
            >
              <div
                style={{
                  display: "inline-block",
                  width: "16px",
                  height: "16px",
                  border: "2px solid rgba(0,170,255,0.3)",
                  borderTop: "2px solid #00aaff",
                  borderRadius: "50%",
                  animation: "spin 1s linear infinite",
                  marginBottom: "8px",
                }}
              />
              <div>Loading feeds...</div>
              <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </div>
          )}

          {/* Error */}
          {error && (
            <div
              style={{
                padding: "16px 12px",
                textAlign: "center",
                fontSize: "11px",
                color: "#ff6666",
                background: "rgba(255,60,60,0.08)",
                borderBottom: "1px solid rgba(255,60,60,0.15)",
              }}
            >
              <div>{error}</div>
              <button
                onClick={refresh}
                style={{
                  marginTop: "8px",
                  fontSize: "9px",
                  padding: "3px 10px",
                  borderRadius: "3px",
                  background: "rgba(255,60,60,0.15)",
                  color: "#ff6666",
                  border: "1px solid rgba(255,60,60,0.3)",
                  cursor: "pointer",
                }}
              >
                RETRY
              </button>
            </div>
          )}

          {/* Empty (filtered) */}
          {!isLoading &&
            !error &&
            (enableClustering ? filteredClusters.length === 0 : filteredItems.length === 0) &&
            items.length > 0 && (
              <div
                style={{
                  padding: "40px 12px",
                  textAlign: "center",
                  fontSize: "11px",
                  color: "rgba(255,255,255,0.3)",
                }}
              >
                No articles match your filters
              </div>
            )}

          {/* No data */}
          {!isLoading && !error && items.length === 0 && (
            <div
              style={{
                padding: "40px 12px",
                textAlign: "center",
                fontSize: "11px",
                color: "rgba(255,255,255,0.3)",
              }}
            >
              No news articles available
            </div>
          )}

          {/* Clustered view */}
          {enableClustering &&
            filteredClusters.map((cluster) => {
              const isNew = lastReadTimestamp
                ? new Date(cluster.representativeItem.pubDate).getTime() > lastReadTimestamp
                : false;
              return <NewsClusterCard key={cluster.id} cluster={cluster} isNew={isNew} />;
            })}

          {/* Flat view */}
          {!enableClustering &&
            filteredItems.map((item) => {
              const isNew = lastReadTimestamp
                ? new Date(item.pubDate).getTime() > lastReadTimestamp
                : false;
              return <NewsCard key={item.id} item={item} isNew={isNew} />;
            })}
        </div>
      </ScrollArea>
    </div>
  );
}
