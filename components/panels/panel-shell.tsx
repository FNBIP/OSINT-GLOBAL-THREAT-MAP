"use client";

/**
 * PanelShell — clean, readable panel wrapper
 * Improved visual hierarchy with larger text, better contrast, and accent styling.
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
        background: "#111116",
        border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: 8,
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
          padding: "10px 14px",
          borderBottom: "1px solid rgba(255,255,255,0.08)",
          background: "rgba(255,255,255,0.02)",
          flexShrink: 0,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span
            style={{
              fontSize: 12,
              fontWeight: 700,
              color: "rgba(255,255,255,0.85)",
              textTransform: "uppercase",
              letterSpacing: "1px",
            }}
          >
            {title}
          </span>
          {live && (
            <span
              style={{
                fontSize: 9,
                fontWeight: 700,
                padding: "2px 7px",
                borderRadius: 4,
                background: "rgba(0,255,136,0.12)",
                color: "#00ff88",
                border: "1px solid rgba(0,255,136,0.25)",
                letterSpacing: "0.5px",
              }}
            >
              LIVE
            </span>
          )}
          {count != null && (
            <span
              style={{
                fontSize: 10,
                fontWeight: 600,
                padding: "2px 7px",
                borderRadius: 4,
                background: "rgba(255,255,255,0.06)",
                color: "rgba(255,255,255,0.5)",
              }}
            >
              {count}
            </span>
          )}
        </div>
        {headerRight && (
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
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
