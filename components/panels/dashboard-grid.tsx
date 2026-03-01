"use client";

/**
 * Dashboard Grid — organized, scrollable panel layout
 *
 * Grouped into collapsible sections with clear visual hierarchy.
 * Each section has a header, and panels within each section use
 * a responsive grid layout.
 */

import { type ReactNode, useState } from "react";
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

// ── Section header with collapse toggle ─────────────────────────────────────────
function SectionHeader({
  title,
  icon,
  count,
  open,
  onToggle,
}: {
  title: string;
  icon: string;
  count?: number;
  open: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      onClick={onToggle}
      style={{
        width: "100%",
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "14px 20px",
        background: open ? "rgba(255,255,255,0.03)" : "transparent",
        border: "none",
        borderBottom: "1px solid rgba(255,255,255,0.08)",
        cursor: "pointer",
        transition: "background 0.15s",
      }}
    >
      <span style={{ fontSize: 18 }}>{icon}</span>
      <span style={{
        fontSize: 13,
        fontWeight: 700,
        color: open ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.5)",
        letterSpacing: "1.5px",
        textTransform: "uppercase",
        fontFamily: "monospace",
        transition: "color 0.15s",
      }}>
        {title}
      </span>
      {count != null && (
        <span style={{
          fontSize: 11, fontWeight: 600,
          padding: "2px 8px", borderRadius: 6,
          background: "rgba(0,170,255,0.1)", color: "rgba(0,170,255,0.8)",
          border: "1px solid rgba(0,170,255,0.2)",
        }}>
          {count}
        </span>
      )}
      <span style={{
        marginLeft: "auto",
        fontSize: 12,
        color: "rgba(255,255,255,0.3)",
        transition: "transform 0.2s",
        transform: open ? "rotate(0deg)" : "rotate(-90deg)",
      }}>
        ▾
      </span>
    </button>
  );
}

// ── Grid wrapper for panels within a section ────────────────────────────────────
function SectionGrid({ cols, children }: { cols?: number; children: ReactNode }) {
  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: `repeat(auto-fill, minmax(${cols === 1 ? "100%" : "380px"}, 1fr))`,
      gap: 14,
      padding: "14px 20px 20px",
    }}>
      {children}
    </div>
  );
}

function Wrapped({ title, children }: { title: string; children: ReactNode }) {
  return (
    <PanelShell title={title}>
      <div style={{ height: 420, overflow: "hidden", display: "flex", flexDirection: "column" }}>
        {children}
      </div>
    </PanelShell>
  );
}

// ── Main dashboard ──────────────────────────────────────────────────────────────
export function DashboardGrid() {
  const [sections, setSections] = useState<Record<string, boolean>>({
    media: true,
    analysis: true,
    osint: true,
    intel: true,
    markets: false,
    regional: false,
    sector: false,
    core: true,
  });

  const toggle = (key: string) =>
    setSections((s) => ({ ...s, [key]: !s[key] }));

  return (
    <div
      style={{
        flex: 1,
        overflowY: "auto",
        background: "#0a0a0f",
        scrollbarWidth: "thin",
        scrollbarColor: "rgba(255,255,255,0.1) transparent",
      }}
    >
      {/* ═══════════════════════════════════════════════════════════════════════
          SECTION 1: LIVE MEDIA
          ═══════════════════════════════════════════════════════════════════════ */}
      <SectionHeader title="Live Media" icon="📡" count={3} open={sections.media} onToggle={() => toggle("media")} />
      {sections.media && (
        <SectionGrid>
          <div style={{ gridColumn: "1 / -1" }}><VideoStreams /></div>
          <WebcamsPanel />
          <TrafficCamsPanel />
        </SectionGrid>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          SECTION 2: AI ANALYSIS & STRATEGIC
          ═══════════════════════════════════════════════════════════════════════ */}
      <SectionHeader title="Strategic Analysis" icon="🎯" count={4} open={sections.analysis} onToggle={() => toggle("analysis")} />
      {sections.analysis && (
        <SectionGrid>
          <InsightsPanel />
          <StrategicPosturePanel />
          <CIIPanel />
          <StrategicRiskPanel />
        </SectionGrid>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          SECTION 3: OSINT FEED
          ═══════════════════════════════════════════════════════════════════════ */}
      <SectionHeader title="OSINT Feed" icon="📰" open={sections.osint} onToggle={() => toggle("osint")} />
      {sections.osint && (
        <SectionGrid>
          <div style={{ gridColumn: "1 / -1", height: 500, display: "flex", flexDirection: "column" }}>
            <NewsPanel />
          </div>
        </SectionGrid>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          SECTION 4: INTELLIGENCE
          ═══════════════════════════════════════════════════════════════════════ */}
      <SectionHeader title="Intelligence" icon="🔍" count={8} open={sections.intel} onToggle={() => toggle("intel")} />
      {sections.intel && (
        <SectionGrid>
          <IntelFeedPanel />
          <LiveIntelligencePanel />
          <InfrastructureCascadePanel />
          <UCDPConflictPanel />
          <UNHCRPanel />
          <ClimateAnomaliesPanel />
          <SatelliteFiresPanel />
          <PopulationExposurePanel />
        </SectionGrid>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          SECTION 5: MARKETS & FINANCE
          ═══════════════════════════════════════════════════════════════════════ */}
      <SectionHeader title="Markets & Finance" icon="📊" count={9} open={sections.markets} onToggle={() => toggle("markets")} />
      {sections.markets && (
        <SectionGrid>
          <MarketsPanel />
          <CommoditiesPanel />
          <CryptoPanel />
          <EconomicPanel />
          <SectorHeatmapPanel />
          <MarketRadarPanel />
          <BTCETFPanel />
          <StablecoinsPanel />
          <PredictionsPanel />
        </SectionGrid>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          SECTION 6: REGIONAL NEWS
          ═══════════════════════════════════════════════════════════════════════ */}
      <SectionHeader title="Regional News" icon="🌍" count={6} open={sections.regional} onToggle={() => toggle("regional")} />
      {sections.regional && (
        <SectionGrid>
          <RegionalNewsPanel title="World News"    categories={["geopolitics"]} />
          <RegionalNewsPanel title="Middle East"   categories={["regional-mideast"]} />
          <RegionalNewsPanel title="Africa"        categories={["regional-africa"]} />
          <RegionalNewsPanel title="Asia-Pacific"  categories={["regional-asia"]} />
          <RegionalNewsPanel title="Latin America" categories={["regional-americas"]} />
          <RegionalNewsPanel title="Europe"        categories={["regional-europe"]} />
        </SectionGrid>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          SECTION 7: SECTOR NEWS & SPECIAL
          ═══════════════════════════════════════════════════════════════════════ */}
      <SectionHeader title="Sector News" icon="🏢" count={13} open={sections.sector} onToggle={() => toggle("sector")} />
      {sections.sector && (
        <SectionGrid>
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
        </SectionGrid>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          SECTION 8: CORE TOOLS
          ═══════════════════════════════════════════════════════════════════════ */}
      <SectionHeader title="Core Tools" icon="⚙" count={3} open={sections.core} onToggle={() => toggle("core")} />
      {sections.core && (
        <SectionGrid>
          <Wrapped title="Live Feed"><EventFeed /></Wrapped>
          <Wrapped title="Intel / Entity Search"><EntitySearch /></Wrapped>
          <Wrapped title="Comms (BitChat)"><ChatPanel /></Wrapped>
        </SectionGrid>
      )}

      {/* Bottom padding */}
      <div style={{ height: 40 }} />
    </div>
  );
}
