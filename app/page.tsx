"use client";

import { useState, useEffect } from "react";
import { useEvents } from "@/hooks/use-events";
import { useNews } from "@/hooks/use-news";
import { Header } from "@/components/header";
import { ThreatMap } from "@/components/map/threat-map";
import { TimelineScrubber } from "@/components/map/timeline-scrubber";
import { MapControls } from "@/components/map/map-controls";
import { MapLegend } from "@/components/map/map-legend";
import { WelcomeModal } from "@/components/welcome-modal";
import { SignInPanel } from "@/components/auth";
import { ThreatMarketsPanel, THREAT_MARKETS_PANEL_HEIGHT } from "@/components/threat-markets-panel";
import { DashboardGrid } from "@/components/panels/dashboard-grid";
import { CommandSearch } from "@/components/search/command-search";
import { Map, LayoutGrid } from "lucide-react";

const WELCOME_DISMISSED_KEY = "globalthreatmap_welcome_dismissed";

export default function Home() {
  const [showWelcome, setShowWelcome] = useState(false);
  const [view, setView] = useState<"map" | "dashboard">("map");

  const { isLoading, refresh } = useEvents({
    autoRefresh: true,
    refreshInterval: 300000,
  });
  useNews({ autoRefresh: true, refreshInterval: 300000 });

  useEffect(() => {
    const dismissed = localStorage.getItem(WELCOME_DISMISSED_KEY);
    if (!dismissed) setShowWelcome(true);
  }, []);

  return (
    <div className="flex h-screen flex-col" style={{ paddingBottom: THREAT_MARKETS_PANEL_HEIGHT }}>
      <Header
        onRefresh={refresh}
        isLoading={isLoading}
        onShowHelp={() => setShowWelcome(true)}
        view={view}
        onViewChange={setView}
      />

      {view === "map" ? (
        <div className="flex flex-1 overflow-hidden">
          <div className="relative flex-1">
            <ThreatMap />
            <TimelineScrubber />
            <MapControls />
            <MapLegend />
          </div>
        </div>
      ) : (
        <div className="flex flex-1 overflow-hidden">
          <DashboardGrid />
        </div>
      )}

      <WelcomeModal open={showWelcome} onOpenChange={setShowWelcome} />
      <SignInPanel />
      <ThreatMarketsPanel />
      <CommandSearch />
    </div>
  );
}
