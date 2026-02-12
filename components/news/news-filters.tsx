"use client";

import { useNewsStore } from "@/stores/news-store";
import { NEWS_CATEGORIES } from "@/lib/rss-feeds";

export function NewsFilters() {
  const searchQuery = useNewsStore((s) => s.searchQuery);
  const categoryFilter = useNewsStore((s) => s.categoryFilter);
  const setSearchQuery = useNewsStore((s) => s.setSearchQuery);
  const setCategoryFilter = useNewsStore((s) => s.setCategoryFilter);

  const hasFilters = searchQuery || categoryFilter;

  return (
    <div
      style={{
        borderBottom: "1px solid rgba(255,255,255,0.06)",
        padding: "8px 12px",
      }}
    >
      {/* Search */}
      <div style={{ position: "relative", marginBottom: "8px" }}>
        <span
          style={{
            position: "absolute",
            left: "8px",
            top: "50%",
            transform: "translateY(-50%)",
            fontSize: "11px",
            color: "rgba(255,255,255,0.3)",
            pointerEvents: "none",
          }}
        >
          {"\u2315"}
        </span>
        <input
          type="text"
          placeholder="Search news..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{
            width: "100%",
            padding: "5px 28px 5px 24px",
            fontSize: "11px",
            color: "rgba(255,255,255,0.8)",
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: "4px",
            outline: "none",
          }}
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery("")}
            style={{
              position: "absolute",
              right: "6px",
              top: "50%",
              transform: "translateY(-50%)",
              fontSize: "10px",
              color: "rgba(255,255,255,0.4)",
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: "2px",
            }}
          >
            {"\u2715"}
          </button>
        )}
      </div>

      {/* Category chips — worldmonitor compact style */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "4px",
        }}
      >
        {NEWS_CATEGORIES.map((cat) => {
          const isActive = categoryFilter === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() =>
                setCategoryFilter(categoryFilter === cat.id ? null : cat.id)
              }
              style={{
                fontSize: "8px",
                padding: "2px 6px",
                borderRadius: "3px",
                cursor: "pointer",
                textTransform: "uppercase",
                letterSpacing: "0.3px",
                fontWeight: isActive ? 600 : 400,
                color: isActive ? cat.color : "rgba(255,255,255,0.4)",
                background: isActive ? `${cat.color}20` : "rgba(255,255,255,0.03)",
                border: `1px solid ${isActive ? `${cat.color}50` : "rgba(255,255,255,0.06)"}`,
                transition: "all 0.15s ease",
              }}
            >
              {cat.label}
            </button>
          );
        })}

        {/* Clear all */}
        {hasFilters && (
          <button
            onClick={() => {
              setSearchQuery("");
              setCategoryFilter(null);
            }}
            style={{
              fontSize: "8px",
              padding: "2px 6px",
              borderRadius: "3px",
              cursor: "pointer",
              textTransform: "uppercase",
              letterSpacing: "0.3px",
              fontWeight: 600,
              color: "#ff6666",
              background: "rgba(255,60,60,0.1)",
              border: "1px solid rgba(255,60,60,0.2)",
            }}
          >
            {"\u2715"} CLEAR
          </button>
        )}
      </div>
    </div>
  );
}
