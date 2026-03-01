"use client";

import { useEffect, useState } from "react";
import { PanelShell } from "./panel-shell";
import { TrendingUp, TrendingDown } from "lucide-react";

interface Quote {
  symbol: string;
  label: string;
  short: string;
  price: number | null;
  change: number | null;
  currency: string;
}

interface MarketsData {
  indices: Quote[];
  commodities: Quote[];
  updatedAt: string;
}

function Ticker({ q }: { q: Quote }) {
  const up = (q.change ?? 0) >= 0;
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "8px 14px",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: "rgba(255,255,255,0.9)" }}>
          {q.label}
        </span>
        <span style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", letterSpacing: "0.5px" }}>
          {q.short}
        </span>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{ fontSize: 14, fontWeight: 700, color: "rgba(255,255,255,0.95)", fontVariantNumeric: "tabular-nums" }}>
          {q.price != null
            ? q.price >= 1000
              ? `$${q.price.toLocaleString("en-US", { maximumFractionDigits: 0 })}`
              : `$${q.price.toFixed(2)}`
            : "—"}
        </span>
        <div style={{ display: "flex", alignItems: "center", gap: 3, minWidth: 70, justifyContent: "flex-end" }}>
          {q.change != null ? (
            <>
              {up
                ? <TrendingUp style={{ width: 12, height: 12, color: "#00ff88" }} />
                : <TrendingDown style={{ width: 12, height: 12, color: "#ff4444" }} />}
              <span style={{ fontSize: 12, fontWeight: 600, color: up ? "#00ff88" : "#ff4444", fontVariantNumeric: "tabular-nums" }}>
                {up ? "+" : ""}{q.change.toFixed(2)}%
              </span>
            </>
          ) : (
            <span style={{ fontSize: 12, color: "rgba(255,255,255,0.3)" }}>—</span>
          )}
        </div>
      </div>
    </div>
  );
}

export function MarketsPanel() {
  const [data, setData] = useState<MarketsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/markets");
        if (res.ok) setData(await res.json());
      } catch { /* ignore */ } finally {
        setLoading(false);
      }
    }
    void load();
    const id = setInterval(load, 2 * 60 * 1000); // refresh every 2 min
    return () => clearInterval(id);
  }, []);

  return (
    <PanelShell title="Markets" live>
      {loading && !data ? (
        <Spinner />
      ) : (
        <div>
          {data?.indices.map((q) => <Ticker key={q.symbol} q={q} />)}
        </div>
      )}
    </PanelShell>
  );
}

export function CommoditiesPanel() {
  const [data, setData] = useState<MarketsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/markets");
        if (res.ok) setData(await res.json());
      } catch { /* ignore */ } finally {
        setLoading(false);
      }
    }
    void load();
    const id = setInterval(load, 2 * 60 * 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <PanelShell title="Commodities" live>
      {loading && !data ? (
        <Spinner />
      ) : (
        <div>
          {data?.commodities.map((q) => <Ticker key={q.symbol} q={q} />)}
        </div>
      )}
    </PanelShell>
  );
}

function Spinner() {
  return (
    <div style={{ padding: "20px 0", display: "flex", justifyContent: "center" }}>
      <div style={{
        width: 16, height: 16, borderRadius: "50%",
        border: "2px solid rgba(0,170,255,0.2)",
        borderTop: "2px solid #00aaff",
        animation: "mkSpin 1s linear infinite",
      }} />
      <style>{`@keyframes mkSpin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
