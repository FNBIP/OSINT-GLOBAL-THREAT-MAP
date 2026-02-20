"use client";

import { useEventsStore } from "@/stores/events-store";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Globe, RefreshCw, Activity, HelpCircle, Map, LayoutGrid } from "lucide-react";

interface HeaderProps {
  onRefresh: () => void;
  isLoading: boolean;
  onShowHelp?: () => void;
  view?: "map" | "dashboard";
  onViewChange?: (v: "map" | "dashboard") => void;
}

export function Header({ onRefresh, isLoading, onShowHelp, view, onViewChange }: HeaderProps) {
  const { filteredEvents } = useEventsStore();

  const threatCounts = filteredEvents.reduce(
    (acc, event) => {
      acc[event.threatLevel] = (acc[event.threatLevel] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  return (
    <header className="relative flex h-14 items-center justify-between border-b border-border bg-card px-4">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <Globe className="h-6 w-6 text-primary" />
          <h1 className="text-lg font-bold text-foreground">
            Global Threat Map
          </h1>
        </div>
        <Badge variant="outline" className="hidden md:flex">
          <Activity className="mr-1 h-3 w-3" />
          Live
        </Badge>

        {/* View toggle */}
        {onViewChange && (
          <div
            style={{
              display: "flex",
              background: "rgba(255,255,255,0.05)",
              borderRadius: 6,
              padding: 2,
              gap: 2,
            }}
          >
            <button
              onClick={() => onViewChange("map")}
              title="Map view"
              style={{
                display: "flex",
                alignItems: "center",
                gap: 4,
                padding: "3px 10px",
                borderRadius: 4,
                fontSize: 11,
                fontWeight: 600,
                cursor: "pointer",
                border: "none",
                background: view === "map" ? "rgba(0,170,255,0.2)" : "transparent",
                color: view === "map" ? "#00aaff" : "rgba(255,255,255,0.4)",
                transition: "all 0.15s",
              }}
            >
              <Map style={{ width: 12, height: 12 }} />
              Map
            </button>
            <button
              onClick={() => onViewChange("dashboard")}
              title="Dashboard view"
              style={{
                display: "flex",
                alignItems: "center",
                gap: 4,
                padding: "3px 10px",
                borderRadius: 4,
                fontSize: 11,
                fontWeight: 600,
                cursor: "pointer",
                border: "none",
                background: view === "dashboard" ? "rgba(0,170,255,0.2)" : "transparent",
                color: view === "dashboard" ? "#00aaff" : "rgba(255,255,255,0.4)",
                transition: "all 0.15s",
              }}
            >
              <LayoutGrid style={{ width: 12, height: 12 }} />
              Dashboard
            </button>
          </div>
        )}
      </div>

      <div className="absolute left-1/2 -translate-x-1/2 text-sm text-muted-foreground">
        Powered by{" "}
        <a
          href="https://www.valyu.ai/search-api"
          target="_blank"
          rel="noopener noreferrer"
          className="font-bold text-white hover:underline"
        >
          Valyu
        </a>
      </div>

      <div className="flex items-center gap-4">
        <div className="hidden items-center gap-2 md:flex">
          {threatCounts.critical && (
            <Badge variant="critical">{threatCounts.critical} Critical</Badge>
          )}
          {threatCounts.high && (
            <Badge variant="high">{threatCounts.high} High</Badge>
          )}
          <Badge variant="outline">{filteredEvents.length} Events</Badge>
        </div>

        <Button
          variant="ghost"
          size="icon"
          onClick={onShowHelp}
          title="Show features"
        >
          <HelpCircle className="h-4 w-4" />
        </Button>

        <Button
          variant="ghost"
          size="icon"
          onClick={onRefresh}
          disabled={isLoading}
          title="Refresh events"
        >
          <RefreshCw
            className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`}
          />
        </Button>
      </div>
    </header>
  );
}
