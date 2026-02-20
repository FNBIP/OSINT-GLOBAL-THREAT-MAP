"use client";

/**
 * Infrastructure Cascade Panel — worldmonitor style
 * Shows critical infrastructure news: cables, pipelines, ports,
 * power grids, cyber attacks on infrastructure.
 */

import { useMemo } from "react";
import { useNewsStore } from "@/stores/news-store";
import { PanelShell } from "./panel-shell";

const INFRA_TABS = [
  { id: "cables",    label: "Cables",    keywords: ["submarine cable","undersea cable","internet cable","fiber cut","cable cut","telecom"] },
  { id: "pipelines", label: "Pipelines", keywords: ["pipeline","nord stream","gas supply","oil supply","energy infrastructure"] },
  { id: "ports",     label: "Ports",     keywords: ["port","shipping lane","chokepoint","suez","hormuz","malacca","panama canal","strait"] },
  { id: "power",     label: "Grid",      keywords: ["power grid","electricity","blackout","outage","energy attack","grid attack"] },
  { id: "cyber",     label: "Cyber",     keywords: ["cyberattack","ransomware","critical infrastructure","scada","ics attack","hack"] },
] as const;

type TabId = typeof INFRA_TABS[number]["id"];

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

import { useState } from "react";

export function InfrastructureCascadePanel() {
  const [activeTab, setActiveTab] = useState<TabId>("cables");
  const items = useNewsStore((s) => s.items);
  const isLoading = useNewsStore((s) => s.isLoading);

  const tab = INFRA_TABS.find((t) => t.id === activeTab)!;

  const filtered = useMemo(() => {
    return items
      .filter((i) => {
        const text = (i.title + " " + (i.description ?? "")).toLowerCase();
        return tab.keywords.some((k) => text.includes(k));
      })
      .slice(0, 8);
  }, [items, tab]);

  // Count per tab for badges
  const counts = useMemo(() => {
    return Object.fromEntries(INFRA_TABS.map((t) => [
      t.id,
      items.filter((i) => {
        const text = (i.title + " " + (i.description ?? "")).toLowerCase();
        return t.keywords.some((k) => text.includes(k));
      }).length,
    ]));
  }, [items]);

  return (
    <PanelShell title="Infrastructure Cascade" live count={counts[activeTab] || null}>
      {/* Tab strip */}
      <div style={{ display: "flex", borderBottom: "1px solid rgba(255,255,255,0.06)", flexShrink: 0 }}>
        {INFRA_TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            style={{
              flex: 1, padding: "5px 2px", fontSize: 8, fontWeight: 700,
              letterSpacing: "0.3px", textTransform: "uppercase", cursor: "pointer",
              background: activeTab === t.id ? "rgba(0,170,255,0.08)" : "transparent",
              color: activeTab === t.id ? "#00aaff" : "rgba(255,255,255,0.35)",
              borderBottom: `2px solid ${activeTab === t.id ? "#00aaff" : "transparent"}`,
              borderTop: "none", borderLeft: "none", borderRight: "none",
              transition: "all 0.15s",
            }}
          >
            {t.label}
            {counts[t.id] > 0 && (
              <span style={{
                marginLeft: 3, fontSize: 7, padding: "0 3px",
                borderRadius: 2, background: "rgba(255,255,255,0.08)",
                color: "rgba(255,255,255,0.4)",
              }}>
                {counts[t.id]}
              </span>
            )}
          </button>
        ))}
      </div>

      {isLoading && filtered.length === 0 ? (
        <div style={{ padding: "16px", fontSize: 10, color: "rgba(255,255,255,0.3)", textAlign: "center" }}>Loading...</div>
      ) : filtered.length === 0 ? (
        <div style={{ padding: "16px", fontSize: 10, color: "rgba(255,255,255,0.25)", textAlign: "center" }}>
          No recent {tab.label.toLowerCase()} incidents
        </div>
      ) : (
        <div style={{ overflowY: "auto", maxHeight: 260 }}>
          {filtered.map((item) => (
            <a key={item.id} href={item.link} target="_blank" rel="noopener noreferrer"
              style={{ textDecoration: "none", display: "block" }}>
              <div
                style={{ padding: "6px 10px", borderBottom: "1px solid rgba(255,255,255,0.04)", cursor: "pointer" }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.03)")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
              >
                <div style={{ fontSize: 10, color: "rgba(255,255,255,0.75)", lineHeight: 1.4, marginBottom: 3 }}>{item.title}</div>
                <div style={{ display: "flex", gap: 6 }}>
                  <span style={{ fontSize: 8, color: "rgba(255,255,255,0.3)", fontWeight: 600 }}>{item.source}</span>
                  <span style={{ fontSize: 8, color: "rgba(255,255,255,0.2)" }}>{timeAgo(item.pubDate)}</span>
                </div>
              </div>
            </a>
          ))}
        </div>
      )}
    </PanelShell>
  );
}
