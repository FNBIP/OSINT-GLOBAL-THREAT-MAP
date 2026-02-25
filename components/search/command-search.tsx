"use client";

/**
 * Cmd+K Global Search — worldmonitor style
 * Searches across events, news, cities, map layers, and military bases.
 * Custom implementation (no cmdk dependency).
 */

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useEventsStore } from "@/stores/events-store";
import { useNewsStore } from "@/stores/news-store";
import { useMapStore, LAYER_LABELS, type MapLayers } from "@/stores/map-store";

const CITIES: { name: string; country: string; lat: number; lon: number }[] = [
  { name: "Kyiv", country: "Ukraine", lat: 50.45, lon: 30.52 },
  { name: "Gaza City", country: "Palestine", lat: 31.50, lon: 34.47 },
  { name: "Taipei", country: "Taiwan", lat: 25.03, lon: 121.57 },
  { name: "Moscow", country: "Russia", lat: 55.76, lon: 37.62 },
  { name: "Tehran", country: "Iran", lat: 35.69, lon: 51.39 },
  { name: "Beijing", country: "China", lat: 39.91, lon: 116.40 },
  { name: "Pyongyang", country: "North Korea", lat: 39.02, lon: 125.75 },
  { name: "Washington DC", country: "USA", lat: 38.91, lon: -77.04 },
  { name: "Brussels", country: "Belgium", lat: 50.85, lon: 4.35 },
  { name: "Kabul", country: "Afghanistan", lat: 34.53, lon: 69.17 },
  { name: "Baghdad", country: "Iraq", lat: 33.31, lon: 44.37 },
  { name: "Damascus", country: "Syria", lat: 33.51, lon: 36.29 },
  { name: "Khartoum", country: "Sudan", lat: 15.60, lon: 32.53 },
  { name: "Caracas", country: "Venezuela", lat: 10.49, lon: -66.88 },
  { name: "Seoul", country: "South Korea", lat: 37.57, lon: 126.98 },
  { name: "Tel Aviv", country: "Israel", lat: 32.09, lon: 34.78 },
  { name: "Beirut", country: "Lebanon", lat: 33.89, lon: 35.50 },
  { name: "Nairobi", country: "Kenya", lat: -1.29, lon: 36.82 },
  { name: "Islamabad", country: "Pakistan", lat: 33.69, lon: 73.04 },
  { name: "New Delhi", country: "India", lat: 28.61, lon: 77.21 },
];

interface SearchResult {
  id: string;
  title: string;
  subtitle?: string;
  category: "event" | "news" | "city" | "layer" | "base";
  icon: string;
  action: () => void;
}

const mono: React.CSSProperties = { fontFamily: "monospace", letterSpacing: "0.5px" };

export function CommandSearch() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const { filteredEvents, selectEvent } = useEventsStore();
  const newsItems = useNewsStore((s) => s.items);
  const { flyTo, toggleLayer, layers, militaryBases } = useMapStore();

  // Global keyboard shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  // Focus input when opened
  useEffect(() => {
    if (open) {
      setQuery("");
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  const results = useMemo<SearchResult[]>(() => {
    const q = query.toLowerCase().trim();
    if (!q) return [];

    const out: SearchResult[] = [];

    // Search events
    filteredEvents.slice(0, 200).forEach((evt) => {
      if (evt.title.toLowerCase().includes(q) || evt.category.toLowerCase().includes(q)) {
        out.push({
          id: `evt-${evt.id}`,
          title: evt.title,
          subtitle: `${evt.threatLevel.toUpperCase()} / ${evt.category}`,
          category: "event",
          icon: "⚡",
          action: () => {
            selectEvent(evt);
            flyTo(evt.location.longitude, evt.location.latitude, 8);
            setOpen(false);
          },
        });
      }
    });

    // Search news
    newsItems.slice(0, 200).forEach((item, i) => {
      if (item.title.toLowerCase().includes(q)) {
        out.push({
          id: `news-${i}`,
          title: item.title,
          subtitle: item.source,
          category: "news",
          icon: "📰",
          action: () => {
            window.open(item.link, "_blank");
            setOpen(false);
          },
        });
      }
    });

    // Search cities
    CITIES.forEach((city) => {
      if (city.name.toLowerCase().includes(q) || city.country.toLowerCase().includes(q)) {
        out.push({
          id: `city-${city.name}`,
          title: city.name,
          subtitle: city.country,
          category: "city",
          icon: "📍",
          action: () => {
            flyTo(city.lon, city.lat, 10);
            setOpen(false);
          },
        });
      }
    });

    // Search layers
    (Object.keys(LAYER_LABELS) as (keyof MapLayers)[]).forEach((key) => {
      const label = LAYER_LABELS[key];
      if (label.toLowerCase().includes(q) || key.toLowerCase().includes(q)) {
        out.push({
          id: `layer-${key}`,
          title: label,
          subtitle: layers[key] ? "ON — click to toggle off" : "OFF — click to toggle on",
          category: "layer",
          icon: layers[key] ? "🟢" : "⚪",
          action: () => {
            toggleLayer(key);
            setOpen(false);
          },
        });
      }
    });

    // Search military bases
    militaryBases.forEach((base, i) => {
      if (base.baseName.toLowerCase().includes(q) || base.country.toLowerCase().includes(q)) {
        out.push({
          id: `base-${i}`,
          title: base.baseName,
          subtitle: `${base.type.toUpperCase()} — ${base.country}`,
          category: "base",
          icon: "🛡",
          action: () => {
            flyTo(base.longitude, base.latitude, 12);
            setOpen(false);
          },
        });
      }
    });

    return out.slice(0, 50);
  }, [query, filteredEvents, newsItems, layers, militaryBases, selectEvent, flyTo, toggleLayer]);

  // Keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((i) => Math.min(i + 1, results.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((i) => Math.max(i - 1, 0));
      } else if (e.key === "Enter") {
        e.preventDefault();
        results[selectedIndex]?.action();
      }
    },
    [results, selectedIndex]
  );

  // Scroll selected item into view
  useEffect(() => {
    const el = listRef.current?.children[selectedIndex] as HTMLElement | undefined;
    el?.scrollIntoView({ block: "nearest" });
  }, [selectedIndex]);

  if (!open) return null;

  // Group results by category
  const groups: { label: string; items: SearchResult[] }[] = [];
  const byCategory: Record<string, SearchResult[]> = {};
  results.forEach((r) => {
    (byCategory[r.category] ??= []).push(r);
  });
  const catLabels: Record<string, string> = {
    event: "Events",
    news: "News",
    city: "Cities",
    layer: "Map Layers",
    base: "Military Bases",
  };
  for (const cat of ["event", "news", "city", "layer", "base"]) {
    if (byCategory[cat]?.length) {
      groups.push({ label: catLabels[cat], items: byCategory[cat] });
    }
  }

  let globalIndex = 0;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "center",
        paddingTop: "15vh",
        background: "rgba(0,0,0,0.6)",
        backdropFilter: "blur(4px)",
      }}
      onClick={() => setOpen(false)}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 560,
          maxHeight: "60vh",
          background: "#0d0d0d",
          border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: 8,
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 25px 50px rgba(0,0,0,0.5)",
          ...mono,
        }}
      >
        {/* Search input */}
        <div style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "12px 16px",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
        }}>
          <span style={{ fontSize: 14, opacity: 0.4 }}>🔍</span>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => { setQuery(e.target.value); setSelectedIndex(0); }}
            onKeyDown={handleKeyDown}
            placeholder="Search events, news, cities, layers, bases..."
            style={{
              flex: 1,
              background: "none",
              border: "none",
              outline: "none",
              fontSize: 13,
              color: "rgba(255,255,255,0.9)",
              ...mono,
            }}
          />
          <kbd style={{
            fontSize: 9,
            padding: "2px 6px",
            borderRadius: 3,
            background: "rgba(255,255,255,0.06)",
            color: "rgba(255,255,255,0.3)",
            border: "1px solid rgba(255,255,255,0.08)",
          }}>
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div ref={listRef} style={{ overflowY: "auto", maxHeight: "50vh" }}>
          {query && results.length === 0 && (
            <div style={{
              padding: "24px 16px",
              textAlign: "center",
              fontSize: 11,
              color: "rgba(255,255,255,0.25)",
            }}>
              No results found for &quot;{query}&quot;
            </div>
          )}

          {groups.map((group) => (
            <div key={group.label}>
              <div style={{
                padding: "8px 16px 4px",
                fontSize: 9,
                fontWeight: 700,
                color: "rgba(255,255,255,0.3)",
                textTransform: "uppercase",
                letterSpacing: "1px",
              }}>
                {group.label}
              </div>
              {group.items.map((item) => {
                const thisIndex = globalIndex++;
                return (
                  <button
                    key={item.id}
                    onClick={item.action}
                    style={{
                      width: "100%",
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      padding: "8px 16px",
                      border: "none",
                      cursor: "pointer",
                      background: thisIndex === selectedIndex ? "rgba(0,170,255,0.08)" : "transparent",
                      borderLeft: thisIndex === selectedIndex ? "2px solid #00aaff" : "2px solid transparent",
                      transition: "background 0.1s",
                      textAlign: "left",
                      ...mono,
                    }}
                    onMouseEnter={() => setSelectedIndex(thisIndex)}
                  >
                    <span style={{ fontSize: 13, width: 20, textAlign: "center" }}>{item.icon}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        fontSize: 11,
                        color: "rgba(255,255,255,0.8)",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}>
                        {item.title}
                      </div>
                      {item.subtitle && (
                        <div style={{
                          fontSize: 9,
                          color: "rgba(255,255,255,0.3)",
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}>
                          {item.subtitle}
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          ))}
        </div>

        {/* Footer hints */}
        {query && results.length > 0 && (
          <div style={{
            padding: "6px 16px",
            borderTop: "1px solid rgba(255,255,255,0.06)",
            display: "flex",
            gap: 16,
            fontSize: 9,
            color: "rgba(255,255,255,0.2)",
          }}>
            <span>↑↓ navigate</span>
            <span>↵ select</span>
            <span>esc close</span>
          </div>
        )}
      </div>
    </div>
  );
}
