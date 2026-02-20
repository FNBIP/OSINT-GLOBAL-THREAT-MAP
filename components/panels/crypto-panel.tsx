"use client";

import { useEffect, useState } from "react";
import { PanelShell } from "./panel-shell";
import { TrendingUp, TrendingDown } from "lucide-react";

interface Coin {
  id: string;
  symbol: string;
  name: string;
  price: number | null;
  change: number | null;
}

export function CryptoPanel() {
  const [coins, setCoins] = useState<Coin[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/crypto");
        if (res.ok) {
          const data = await res.json();
          setCoins(data.coins ?? []);
        }
      } catch { /* ignore */ } finally {
        setLoading(false);
      }
    }
    void load();
    const id = setInterval(load, 2 * 60 * 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <PanelShell title="Crypto" live>
      {loading && coins.length === 0 ? (
        <div style={{ padding: "20px 0", display: "flex", justifyContent: "center" }}>
          <div style={{
            width: 16, height: 16, borderRadius: "50%",
            border: "2px solid rgba(0,170,255,0.2)",
            borderTop: "2px solid #00aaff",
            animation: "cpSpin 1s linear infinite",
          }} />
          <style>{`@keyframes cpSpin { to { transform: rotate(360deg); } }`}</style>
        </div>
      ) : (
        <div>
          {coins.map((c) => {
            const up = (c.change ?? 0) >= 0;
            return (
              <div key={c.id} style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "5px 10px", borderBottom: "1px solid rgba(255,255,255,0.04)",
              }}>
                <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
                  <span style={{ fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.8)" }}>{c.name}</span>
                  <span style={{ fontSize: 8, color: "rgba(255,255,255,0.3)", letterSpacing: "0.5px" }}>{c.symbol}</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: "rgba(255,255,255,0.9)", fontVariantNumeric: "tabular-nums" }}>
                    {c.price != null
                      ? c.price >= 1000
                        ? `$${c.price.toLocaleString("en-US", { maximumFractionDigits: 0 })}`
                        : `$${c.price.toFixed(2)}`
                      : "—"}
                  </span>
                  <div style={{ display: "flex", alignItems: "center", gap: 2, minWidth: 60, justifyContent: "flex-end" }}>
                    {c.change != null ? (
                      <>
                        {up
                          ? <TrendingUp style={{ width: 10, height: 10, color: "#00ff88" }} />
                          : <TrendingDown style={{ width: 10, height: 10, color: "#ff4444" }} />}
                        <span style={{ fontSize: 10, fontWeight: 600, color: up ? "#00ff88" : "#ff4444", fontVariantNumeric: "tabular-nums" }}>
                          {up ? "+" : ""}{c.change.toFixed(2)}%
                        </span>
                      </>
                    ) : (
                      <span style={{ fontSize: 10, color: "rgba(255,255,255,0.3)" }}>—</span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </PanelShell>
  );
}
