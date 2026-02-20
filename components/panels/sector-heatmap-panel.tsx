"use client";

/**
 * Sector Heatmap Panel — worldmonitor style
 * Shows US equity sector ETF performance.
 */

import { useEffect, useState } from "react";
import { PanelShell } from "./panel-shell";

const SECTORS = [
  { symbol: "XLK",  label: "Technology",       short: "Tech"    },
  { symbol: "XLF",  label: "Financials",        short: "Finance" },
  { symbol: "XLE",  label: "Energy",            short: "Energy"  },
  { symbol: "XLV",  label: "Healthcare",        short: "Health"  },
  { symbol: "XLY",  label: "Consumer Disc.",     short: "Cons.D"  },
  { symbol: "XLI",  label: "Industrials",        short: "Indust." },
  { symbol: "XLP",  label: "Consumer Staples",   short: "Cons.S"  },
  { symbol: "XLU",  label: "Utilities",          short: "Util."   },
  { symbol: "XLB",  label: "Materials",          short: "Matl."   },
  { symbol: "XLRE", label: "Real Estate",        short: "R.Est."  },
  { symbol: "XLC",  label: "Comm. Services",     short: "Comms"   },
  { symbol: "SMH",  label: "Semiconductors",     short: "Semis"   },
];

interface SectorQuote {
  symbol: string;
  label: string;
  short: string;
  change: number | null;
}

function getColor(change: number | null): string {
  if (change === null) return "rgba(255,255,255,0.07)";
  if (change >= 2)  return "rgba(34,197,94,0.5)";
  if (change >= 0.5) return "rgba(34,197,94,0.25)";
  if (change >= 0)  return "rgba(34,197,94,0.1)";
  if (change >= -0.5) return "rgba(239,68,68,0.15)";
  if (change >= -2)  return "rgba(239,68,68,0.3)";
  return "rgba(239,68,68,0.5)";
}

function getTextColor(change: number | null): string {
  if (change === null) return "rgba(255,255,255,0.4)";
  return change >= 0 ? "#4ade80" : "#f87171";
}

export function SectorHeatmapPanel() {
  const [sectors, setSectors] = useState<SectorQuote[]>(
    SECTORS.map((s) => ({ ...s, change: null }))
  );
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        // Reuse our /api/markets route but we need per-sector data
        // We'll fetch each ETF using Yahoo Finance via a batch approach
        const symbols = SECTORS.map((s) => s.symbol).join(",");
        const res = await fetch(`/api/markets?symbols=${symbols}&type=etfs`);
        if (res.ok) {
          const data = await res.json();
          if (data.etfs) {
            setSectors(data.etfs);
            return;
          }
        }
      } catch { /* fallback: keep nulls */ } finally {
        setLoading(false);
      }
    }
    void load();
    const id = setInterval(load, 5 * 60 * 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <PanelShell title="Sector Heatmap" live>
      {loading && sectors.every((s) => s.change === null) ? (
        <div style={{ padding: "16px", fontSize: 10, color: "rgba(255,255,255,0.3)", textAlign: "center" }}>
          Loading...
        </div>
      ) : (
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 3,
          padding: "8px",
        }}>
          {sectors.map((s) => (
            <div key={s.symbol} style={{
              background: getColor(s.change),
              borderRadius: 3,
              padding: "6px 4px",
              textAlign: "center",
              border: "1px solid rgba(255,255,255,0.06)",
              transition: "background 0.3s",
            }}>
              <div style={{ fontSize: 8, fontWeight: 700, color: "rgba(255,255,255,0.6)", marginBottom: 2 }}>
                {s.short}
              </div>
              <div style={{ fontSize: 9, fontWeight: 700, color: getTextColor(s.change) }}>
                {s.change !== null ? `${s.change >= 0 ? "+" : ""}${s.change.toFixed(2)}%` : "—"}
              </div>
            </div>
          ))}
        </div>
      )}
    </PanelShell>
  );
}
