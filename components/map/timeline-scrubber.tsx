"use client";

/**
 * Timeline Scrubber — 7-day event density bar + time filter presets
 * Shows event distribution over the past 7 days with severity coloring.
 * Quick filter buttons: 1h, 6h, 24h, 48h, 7d, Clear
 */

import { useEffect, useRef, useMemo, useCallback } from "react";
import { useMapStore } from "@/stores/map-store";
import { useEventsStore } from "@/stores/events-store";
import { Play, Pause } from "lucide-react";

const PAN_SPEED = 0.3;
const DAY_MS = 24 * 60 * 60 * 1000;

const mono: React.CSSProperties = { fontFamily: "monospace", letterSpacing: "0.5px" };

const PRESETS: { label: string; hours: number }[] = [
  { label: "1H", hours: 1 },
  { label: "6H", hours: 6 },
  { label: "24H", hours: 24 },
  { label: "48H", hours: 48 },
  { label: "7D", hours: 168 },
];

function getSeverityColor(level: string): string {
  switch (level) {
    case "critical": return "#ef4444";
    case "high": return "#f97316";
    case "medium": return "#eab308";
    case "low": return "#3b82f6";
    default: return "#6b7280";
  }
}

function getSeverityPriority(level: string): number {
  switch (level) {
    case "critical": return 4;
    case "high": return 3;
    case "medium": return 2;
    case "low": return 1;
    default: return 0;
  }
}

interface DayBucket {
  date: string;       // e.g. "Mon", "Tue"
  fullDate: string;   // e.g. "Feb 24"
  count: number;
  maxSeverity: string;
  color: string;
}

export function TimelineScrubber() {
  const { isAutoPlaying, startAutoPlay, stopAutoPlay, viewport, setViewport } = useMapStore();
  const { events, timeRange, setTimeRange } = useEventsStore();
  const animationRef = useRef<number | null>(null);

  // Auto-pan logic
  const handlePlayToggle = useCallback(() => {
    if (isAutoPlaying) stopAutoPlay();
    else startAutoPlay();
  }, [isAutoPlaying, startAutoPlay, stopAutoPlay]);

  useEffect(() => {
    if (!isAutoPlaying) {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
      return;
    }
    const animate = () => {
      setViewport({ longitude: viewport.longitude + PAN_SPEED });
      animationRef.current = requestAnimationFrame(animate);
    };
    animationRef.current = requestAnimationFrame(animate);
    return () => { if (animationRef.current) cancelAnimationFrame(animationRef.current); };
  }, [isAutoPlaying, viewport.longitude, setViewport]);

  // Compute 7-day buckets
  const buckets = useMemo<DayBucket[]>(() => {
    const now = Date.now();
    const days: DayBucket[] = [];
    const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

    for (let i = 6; i >= 0; i--) {
      const dayStart = now - i * DAY_MS;
      const dayEnd = dayStart + DAY_MS;
      const d = new Date(dayStart);

      const dayEvents = events.filter((e) => {
        const t = new Date(e.timestamp).getTime();
        return t >= dayStart && t < dayEnd;
      });

      let maxSev = "info";
      let maxPri = 0;
      dayEvents.forEach((e) => {
        const pri = getSeverityPriority(e.threatLevel);
        if (pri > maxPri) { maxPri = pri; maxSev = e.threatLevel; }
      });

      days.push({
        date: dayNames[d.getDay()],
        fullDate: `${monthNames[d.getMonth()]} ${d.getDate()}`,
        count: dayEvents.length,
        maxSeverity: maxSev,
        color: dayEvents.length === 0 ? "rgba(255,255,255,0.06)" : getSeverityColor(maxSev),
      });
    }
    return days;
  }, [events]);

  const maxCount = useMemo(() => Math.max(...buckets.map((b) => b.count), 1), [buckets]);

  const handlePreset = useCallback((hours: number) => {
    const now = new Date();
    const start = new Date(now.getTime() - hours * 60 * 60 * 1000);
    setTimeRange({ start, end: now });
  }, [setTimeRange]);

  const handleClear = useCallback(() => {
    setTimeRange(null);
  }, [setTimeRange]);

  // Which preset is active?
  const activePreset = useMemo(() => {
    if (!timeRange) return null;
    const diffMs = timeRange.end.getTime() - timeRange.start.getTime();
    const diffHours = Math.round(diffMs / (60 * 60 * 1000));
    return PRESETS.find((p) => p.hours === diffHours)?.label ?? null;
  }, [timeRange]);

  return (
    <div style={{
      position: "absolute",
      bottom: 80,
      left: 290,
      right: 280,
      zIndex: 20,
      display: "flex",
      alignItems: "center",
      gap: 10,
      padding: "6px 12px",
      background: "rgba(8,8,8,0.85)",
      border: "1px solid rgba(255,255,255,0.06)",
      borderRadius: 6,
      backdropFilter: "blur(8px)",
      ...mono,
    }}>
      {/* Play/Pause button */}
      <button
        onClick={handlePlayToggle}
        style={{
          width: 28,
          height: 28,
          borderRadius: "50%",
          border: "1px solid rgba(255,255,255,0.1)",
          background: isAutoPlaying ? "rgba(0,170,255,0.2)" : "rgba(255,255,255,0.04)",
          color: isAutoPlaying ? "#00aaff" : "rgba(255,255,255,0.5)",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
        title={isAutoPlaying ? "Pause auto-pan" : "Start auto-pan"}
      >
        {isAutoPlaying ? <Pause style={{ width: 10, height: 10 }} /> : <Play style={{ width: 10, height: 10, marginLeft: 1 }} />}
      </button>

      {/* 7-day density bars */}
      <div style={{ flex: 1, display: "flex", alignItems: "flex-end", gap: 3, height: 32 }}>
        {buckets.map((bucket, i) => {
          const barH = Math.max(4, (bucket.count / maxCount) * 28);
          return (
            <div key={i} style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 2,
            }}>
              {/* Bar */}
              <div style={{
                width: "100%",
                height: barH,
                background: bucket.color,
                borderRadius: 2,
                opacity: bucket.count === 0 ? 0.3 : 0.85,
                transition: "height 0.3s, background 0.3s",
                position: "relative",
              }}>
                {bucket.count > 0 && (
                  <span style={{
                    position: "absolute",
                    top: -12,
                    left: "50%",
                    transform: "translateX(-50%)",
                    fontSize: 7,
                    color: "rgba(255,255,255,0.4)",
                    whiteSpace: "nowrap",
                  }}>
                    {bucket.count}
                  </span>
                )}
              </div>
              {/* Day label */}
              <span style={{ fontSize: 7, color: "rgba(255,255,255,0.25)", whiteSpace: "nowrap" }}>
                {i === 6 ? "Today" : bucket.date}
              </span>
            </div>
          );
        })}
      </div>

      {/* Separator */}
      <div style={{ width: 1, height: 24, background: "rgba(255,255,255,0.06)", flexShrink: 0 }} />

      {/* Time filter presets */}
      <div style={{ display: "flex", gap: 3, flexShrink: 0 }}>
        {PRESETS.map((p) => (
          <button
            key={p.label}
            onClick={() => handlePreset(p.hours)}
            style={{
              fontSize: 8,
              fontWeight: 700,
              padding: "3px 7px",
              borderRadius: 3,
              border: "1px solid",
              borderColor: activePreset === p.label ? "rgba(0,170,255,0.3)" : "rgba(255,255,255,0.08)",
              background: activePreset === p.label ? "rgba(0,170,255,0.12)" : "rgba(255,255,255,0.03)",
              color: activePreset === p.label ? "#00aaff" : "rgba(255,255,255,0.35)",
              cursor: "pointer",
              letterSpacing: "0.5px",
              ...mono,
            }}
          >
            {p.label}
          </button>
        ))}
        <button
          onClick={handleClear}
          style={{
            fontSize: 8,
            fontWeight: 700,
            padding: "3px 7px",
            borderRadius: 3,
            border: "1px solid rgba(255,255,255,0.08)",
            background: !timeRange ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.03)",
            color: !timeRange ? "rgba(255,255,255,0.5)" : "rgba(255,255,255,0.25)",
            cursor: "pointer",
            letterSpacing: "0.5px",
            ...mono,
          }}
        >
          ALL
        </button>
      </div>
    </div>
  );
}
