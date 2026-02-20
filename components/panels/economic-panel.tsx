"use client";

/**
 * Economic Indicators Panel — worldmonitor style
 * Shows key FRED economic data: CPI, unemployment, GDP growth, etc.
 * Uses the /api/fred-data endpoint if available, otherwise shows static FRED links.
 */

import { useEffect, useState } from "react";
import { PanelShell } from "./panel-shell";
import { TrendingUp, TrendingDown } from "lucide-react";

interface Indicator {
  id: string;
  label: string;
  value: string | null;
  change: number | null;
  unit: string;
  description: string;
}

// Fallback static data for common FRED series (updated periodically)
const FALLBACK_INDICATORS: Indicator[] = [
  { id: "CPIAUCSL",  label: "CPI",          value: null, change: null, unit: "YoY%",  description: "Consumer Price Index" },
  { id: "UNRATE",    label: "Unemployment",  value: null, change: null, unit: "%",     description: "US Unemployment Rate" },
  { id: "GDP",       label: "GDP Growth",    value: null, change: null, unit: "Ann%",  description: "Real GDP Growth" },
  { id: "FEDFUNDS",  label: "Fed Funds",     value: null, change: null, unit: "%",     description: "Federal Funds Rate" },
  { id: "T10Y2Y",    label: "Yield Curve",   value: null, change: null, unit: "%",     description: "10Y-2Y Treasury Spread" },
  { id: "DGS10",     label: "10Y Treasury",  value: null, change: null, unit: "%",     description: "10-Year Treasury Yield" },
];

export function EconomicPanel() {
  const [indicators, setIndicators] = useState<Indicator[]>(FALLBACK_INDICATORS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        // Try our FRED proxy if it exists
        const res = await fetch("/api/fred-data");
        if (res.ok) {
          const data = await res.json();
          if (data.indicators) setIndicators(data.indicators);
        }
      } catch { /* use fallback */ } finally {
        setLoading(false);
      }
    }
    void load();
  }, []);

  return (
    <PanelShell
      title="Economic Indicators"
      live
      headerRight={
        <a
          href="https://fred.stlouisfed.org"
          target="_blank"
          rel="noopener noreferrer"
          style={{ fontSize: 8, color: "rgba(255,255,255,0.3)", textDecoration: "none", letterSpacing: "0.3px" }}
        >
          FRED ↗
        </a>
      }
    >
      <div>
        {indicators.map((ind) => (
          <div key={ind.id} style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "5px 10px", borderBottom: "1px solid rgba(255,255,255,0.04)",
          }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
              <span style={{ fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.75)" }}>{ind.label}</span>
              <span style={{ fontSize: 8, color: "rgba(255,255,255,0.25)" }}>{ind.description}</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              {loading || ind.value === null ? (
                <a
                  href={`https://fred.stlouisfed.org/series/${ind.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    fontSize: 8, padding: "2px 7px", borderRadius: 2,
                    background: "rgba(0,170,255,0.08)", color: "#00aaff",
                    border: "1px solid rgba(0,170,255,0.2)", textDecoration: "none",
                    fontWeight: 600,
                  }}
                >
                  View →
                </a>
              ) : (
                <>
                  <span style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.85)", fontVariantNumeric: "tabular-nums" }}>
                    {ind.value} <span style={{ fontSize: 8, color: "rgba(255,255,255,0.3)" }}>{ind.unit}</span>
                  </span>
                  {ind.change !== null && (
                    <div style={{ display: "flex", alignItems: "center", gap: 2 }}>
                      {ind.change >= 0
                        ? <TrendingUp style={{ width: 9, height: 9, color: "#22c55e" }} />
                        : <TrendingDown style={{ width: 9, height: 9, color: "#ef4444" }} />}
                      <span style={{ fontSize: 9, color: ind.change >= 0 ? "#22c55e" : "#ef4444", fontWeight: 600 }}>
                        {ind.change >= 0 ? "+" : ""}{ind.change.toFixed(2)}
                      </span>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        ))}
      </div>
    </PanelShell>
  );
}
