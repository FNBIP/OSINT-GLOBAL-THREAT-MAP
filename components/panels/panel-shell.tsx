"use client";

/**
 * PanelShell — worldmonitor-style panel wrapper
 * Handles the header with title, LIVE badge, and optional count badge.
 */

import { type ReactNode } from "react";

interface PanelShellProps {
  title: string;
  live?: boolean;
  count?: number | null;
  updatedAt?: string | null;
  children: ReactNode;
  headerRight?: ReactNode;
}

export function PanelShell({ title, live, count, children, headerRight }: PanelShellProps) {
  return (
    <div
      style={{
        background: "#0d0d0d",
        border: "1px solid rgba(255,255,255,0.06)",
        borderRadius: 2,
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "6px 10px",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
          flexShrink: 0,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span
            style={{
              fontSize: 10,
              fontWeight: 700,
              color: "rgba(255,255,255,0.7)",
              textTransform: "uppercase",
              letterSpacing: "0.8px",
            }}
          >
            {title}
          </span>
          {live && (
            <span
              style={{
                fontSize: 8,
                fontWeight: 700,
                padding: "1px 5px",
                borderRadius: 2,
                background: "rgba(0,255,136,0.15)",
                color: "#00ff88",
                border: "1px solid rgba(0,255,136,0.3)",
                letterSpacing: "0.5px",
              }}
            >
              LIVE
            </span>
          )}
          {count != null && (
            <span
              style={{
                fontSize: 8,
                padding: "1px 5px",
                borderRadius: 2,
                background: "rgba(255,255,255,0.06)",
                color: "rgba(255,255,255,0.4)",
              }}
            >
              {count}
            </span>
          )}
        </div>
        {headerRight && (
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            {headerRight}
          </div>
        )}
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflow: "hidden" }}>
        {children}
      </div>
    </div>
  );
}
