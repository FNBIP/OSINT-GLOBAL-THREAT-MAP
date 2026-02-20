"use client";

/**
 * Predictions Panel — worldmonitor style
 * Shows Polymarket prediction markets for geopolitical events.
 */

import { useEffect, useState } from "react";
import { PanelShell } from "./panel-shell";

interface Market {
  id: string;
  question: string;
  volume: number;
  outcomePrices?: string[];
  outcomes?: string[];
  endDate?: string;
}

export function PredictionsPanel() {
  const [markets, setMarkets] = useState<Market[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/polymarket?limit=8");
        if (res.ok) {
          const data = await res.json();
          setMarkets(data.markets ?? []);
        }
      } catch { /* ignore */ } finally {
        setLoading(false);
      }
    }
    void load();
    const id = setInterval(load, 5 * 60 * 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <PanelShell title="Predictions" count={markets.length || null} headerRight={
      <span style={{ fontSize: 8, color: "rgba(255,255,255,0.3)", letterSpacing: "0.3px" }}>
        via Polymarket
      </span>
    }>
      {loading && markets.length === 0 ? (
        <Spinner />
      ) : markets.length === 0 ? (
        <Empty />
      ) : (
        <div style={{ overflowY: "auto", maxHeight: 300 }}>
          {markets.map((m) => {
            let yesProb: number | null = null;
            try {
              if (m.outcomePrices) {
                const prices = typeof m.outcomePrices === "string"
                  ? JSON.parse(m.outcomePrices)
                  : m.outcomePrices;
                yesProb = Math.round(parseFloat(prices[0]) * 100);
              }
            } catch { /* ignore */ }

            const vol = m.volume
              ? m.volume >= 1_000_000
                ? `$${(m.volume / 1_000_000).toFixed(1)}M`
                : `$${Math.round(m.volume / 1000)}K`
              : null;

            return (
              <div key={m.id} style={{
                padding: "7px 10px",
                borderBottom: "1px solid rgba(255,255,255,0.04)",
              }}>
                <div style={{ fontSize: 10, color: "rgba(255,255,255,0.75)", lineHeight: 1.4, marginBottom: 5 }}>
                  {m.question}
                </div>
                {yesProb !== null && (
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    {/* Bar */}
                    <div style={{ flex: 1, height: 4, background: "rgba(255,255,255,0.08)", borderRadius: 2, overflow: "hidden" }}>
                      <div style={{
                        height: "100%",
                        width: `${yesProb}%`,
                        background: yesProb > 60 ? "#22c55e" : yesProb > 40 ? "#eab308" : "#ef4444",
                        borderRadius: 2,
                        transition: "width 0.3s",
                      }} />
                    </div>
                    <span style={{
                      fontSize: 9, fontWeight: 700, minWidth: 30,
                      color: yesProb > 60 ? "#22c55e" : yesProb > 40 ? "#eab308" : "#ef4444",
                    }}>
                      {yesProb}%
                    </span>
                    {vol && <span style={{ fontSize: 8, color: "rgba(255,255,255,0.25)" }}>Vol {vol}</span>}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </PanelShell>
  );
}

function Spinner() {
  return (
    <div style={{ padding: "20px 0", display: "flex", justifyContent: "center" }}>
      <div style={{ width: 14, height: 14, borderRadius: "50%", border: "2px solid rgba(0,170,255,0.2)", borderTop: "2px solid #00aaff", animation: "predSpin 1s linear infinite" }} />
      <style>{`@keyframes predSpin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}
function Empty() {
  return <div style={{ padding: "16px", fontSize: 10, color: "rgba(255,255,255,0.3)", textAlign: "center" }}>No prediction markets available</div>;
}
