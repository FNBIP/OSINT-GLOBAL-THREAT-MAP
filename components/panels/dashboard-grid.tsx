"use client";

/**
 * Dashboard Grid — full worldmonitor-equivalent panel grid
 *
 * Panels matching worldmonitor's FULL_PANELS list:
 * live-news, live-webcams, insights, strategic-posture, cii,
 * strategic-risk, intel (gdelt), cascade, politics, middleeast,
 * africa, latam, asia, energy, gov, thinktanks, polymarket,
 * commodities, markets, economic, finance, tech, crypto, heatmap,
 * ai, layoffs, macro-signals, etf-flows, stablecoins,
 * ucdp-events, displacement, climate, + Live Feed + Intel + Comms
 */

import type { ReactNode } from "react";
import { VideoStreams } from "@/components/news/video-streams";
import { NewsPanel } from "@/components/news/news-panel";
import { EventFeed } from "@/components/feed/event-feed";
import { EntitySearch } from "@/components/search/entity-search";
import { ChatPanel } from "@/components/chat/chat-panel";

import { MarketsPanel, CommoditiesPanel } from "./markets-panel";
import { CryptoPanel } from "./crypto-panel";
import { RegionalNewsPanel } from "./regional-news-panel";
import { InsightsPanel } from "./insights-panel";
import { WebcamsPanel } from "./webcams-panel";
import { TrafficCamsPanel } from "./traffic-cams-panel";
import { PredictionsPanel } from "./predictions-panel";
import { EconomicPanel } from "./economic-panel";
import { SectorHeatmapPanel } from "./sector-heatmap-panel";
import { LayoffsPanel } from "./layoffs-panel";
import { StrategicPosturePanel } from "./strategic-posture-panel";
import { CIIPanel } from "./cii-panel";
import { InfrastructureCascadePanel } from "./infrastructure-cascade-panel";
import { PanelShell } from "./panel-shell";
import {
  AIMLPanel,
  StrategicRiskPanel,
  MarketRadarPanel,
  BTCETFPanel,
  StablecoinsPanel,
  UNHCRPanel,
  ClimateAnomaliesPanel,
  UCDPConflictPanel,
} from "./misc-panels";
import {
  IntelFeedPanel,
  LiveIntelligencePanel,
  SatelliteFiresPanel,
  PopulationExposurePanel,
  MyMonitorsPanel,
} from "./final-panels";

function Wrapped({ title, children }: { title: string; children: ReactNode }) {
  return (
    <PanelShell title={title}>
      <div style={{ height: 360, overflow: "hidden", display: "flex", flexDirection: "column" }}>
        {children}
      </div>
    </PanelShell>
  );
}

export function DashboardGrid() {
  return (
    <div
      style={{
        flex: 1,
        overflowY: "auto",
        background: "#080808",
        padding: "8px",
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
        gap: "8px",
        alignContent: "start",
      }}
    >
      {/* ── LIVE MEDIA ── */}
      <div style={{ gridColumn: "span 2" }}><VideoStreams /></div>
      <div style={{ gridColumn: "span 2" }}><WebcamsPanel /></div>
      <div style={{ gridColumn: "span 2" }}><TrafficCamsPanel /></div>

      {/* ── AI ANALYSIS ── */}
      <InsightsPanel />
      <StrategicPosturePanel />
      <CIIPanel />
      <StrategicRiskPanel />

      {/* ── OSINT FEED ── */}
      <div style={{ gridColumn: "span 2", height: 420, display: "flex", flexDirection: "column" }}>
        <NewsPanel />
      </div>

      {/* ── INTELLIGENCE ── */}
      <IntelFeedPanel />
      <LiveIntelligencePanel />
      <InfrastructureCascadePanel />
      <UCDPConflictPanel />
      <UNHCRPanel />
      <ClimateAnomaliesPanel />
      <SatelliteFiresPanel />
      <PopulationExposurePanel />

      {/* ── MARKETS ── */}
      <MarketsPanel />
      <CommoditiesPanel />
      <CryptoPanel />
      <EconomicPanel />
      <SectorHeatmapPanel />
      <MarketRadarPanel />
      <BTCETFPanel />
      <StablecoinsPanel />
      <PredictionsPanel />

      {/* ── REGIONAL NEWS ── */}
      <RegionalNewsPanel title="World News"         categories={["geopolitics"]} />
      <RegionalNewsPanel title="Middle East"        categories={["regional-mideast"]} />
      <RegionalNewsPanel title="Africa"             categories={["regional-africa"]} />
      <RegionalNewsPanel title="Asia-Pacific"       categories={["regional-asia"]} />
      <RegionalNewsPanel title="Latin America"      categories={["regional-americas"]} />
      <RegionalNewsPanel title="Europe"             categories={["regional-europe"]} />

      {/* ── SECTOR NEWS ── */}
      <RegionalNewsPanel title="Defense"            categories={["defense"]} />
      <RegionalNewsPanel title="Cyber"              categories={["cyber"]} />
      <RegionalNewsPanel title="Terrorism"          categories={["terrorism"]} />
      <RegionalNewsPanel title="Government"         categories={["government"]} />
      <RegionalNewsPanel title="Think Tanks"        categories={["thinktanks"]} />
      <RegionalNewsPanel title="Humanitarian"       categories={["humanitarian"]} />
      <RegionalNewsPanel title="Finance"            categories={["finance"]} />
      <RegionalNewsPanel title="Technology"         categories={["tech"]} />
      <RegionalNewsPanel title="Energy & Resources" categories={["energy"]} />
      <RegionalNewsPanel title="OSINT"              categories={["osint"]} />
      <AIMLPanel />
      <LayoffsPanel />
      <MyMonitorsPanel />

      {/* ── CORE FEEDS ── */}
      <div style={{ gridColumn: "span 2" }}><Wrapped title="Live Feed"><EventFeed /></Wrapped></div>
      <div style={{ gridColumn: "span 2" }}><Wrapped title="Intel / Entity Search"><EntitySearch /></Wrapped></div>
      <div style={{ gridColumn: "span 2" }}><Wrapped title="Comms (BitChat)"><ChatPanel /></Wrapped></div>
    </div>
  );
}
