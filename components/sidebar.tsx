"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { EventFeed } from "@/components/feed/event-feed";
import { EntitySearch } from "@/components/search/entity-search";
import { ChatPanel } from "@/components/chat/chat-panel";
import { NewsPanel } from "@/components/news/news-panel";
import { VideoStreams } from "@/components/news/video-streams";
import { useNostrStore } from "@/stores/nostr-store";
import { useNewsStore } from "@/stores/news-store";
import {
  Activity,
  FileText,
  ChevronLeft,
  ChevronRight,
  Radio,
  Newspaper,
} from "lucide-react";

type Tab = "feed" | "news" | "search" | "comms";

export function Sidebar() {
  const [activeTab, setActiveTab] = useState<Tab>("feed");
  const [isCollapsed, setIsCollapsed] = useState(false);
  const unreadCount = useNostrStore((s) => s.unreadCount);
  const unreadNewsCount = useNewsStore((s) => s.unreadCount);

  const tabs = [
    { id: "feed" as Tab, label: "Live Feed", icon: Activity },
    { id: "news" as Tab, label: "News", icon: Newspaper },
    { id: "search" as Tab, label: "Intel", icon: FileText },
    { id: "comms" as Tab, label: "Comms", icon: Radio },
  ];

  const handleTabClick = (tabId: Tab) => {
    setActiveTab(tabId);
    if (tabId === "comms") {
      useNostrStore.getState().resetUnread();
    }
    if (tabId === "news") {
      useNewsStore.getState().markAsRead();
    }
  };

  return (
    <div
      className={cn(
        "relative flex h-full flex-col border-r border-border bg-card transition-all duration-300",
        isCollapsed ? "w-12" : "w-96"
      )}
    >
      {/* Collapse toggle */}
      <Button
        variant="ghost"
        size="icon"
        className="absolute -right-3 top-4 z-10 h-6 w-6 rounded-full border border-border bg-card"
        onClick={() => setIsCollapsed(!isCollapsed)}
      >
        {isCollapsed ? (
          <ChevronRight className="h-3 w-3" />
        ) : (
          <ChevronLeft className="h-3 w-3" />
        )}
      </Button>

      {!isCollapsed && (
        <div className="flex h-full flex-col overflow-hidden">
          {/* ── Live News panel (worldmonitor top-left position) ── */}
          <div style={{ flexShrink: 0, borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
            <VideoStreams />
          </div>

          {/* ── Tab strip ── */}
          <div
            style={{
              flexShrink: 0,
              display: "flex",
              borderBottom: "1px solid rgba(255,255,255,0.08)",
              background: "#0a0a0a",
            }}
          >
            {tabs.map((tab) => {
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => handleTabClick(tab.id)}
                  style={{
                    flex: 1,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "4px",
                    padding: "8px 4px",
                    fontSize: "10px",
                    fontWeight: 600,
                    letterSpacing: "0.4px",
                    textTransform: "uppercase",
                    cursor: "pointer",
                    background: active ? "rgba(0,170,255,0.08)" : "transparent",
                    color: active ? "#00aaff" : "rgba(255,255,255,0.4)",
                    borderBottom: `2px solid ${active ? "#00aaff" : "transparent"}`,
                    borderTop: "none",
                    borderLeft: "none",
                    borderRight: "none",
                    transition: "color 0.15s, border-color 0.15s, background 0.15s",
                    position: "relative",
                  }}
                >
                  <tab.icon style={{ width: 12, height: 12 }} />
                  {tab.label}
                  {tab.id === "comms" && unreadCount > 0 && (
                    <span
                      style={{
                        position: "absolute",
                        top: 4,
                        right: 4,
                        minWidth: 14,
                        height: 14,
                        borderRadius: 7,
                        background: "#00aaff",
                        color: "#000",
                        fontSize: 8,
                        fontWeight: 700,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        padding: "0 3px",
                      }}
                    >
                      {unreadCount > 99 ? "99+" : unreadCount}
                    </span>
                  )}
                  {tab.id === "news" && unreadNewsCount > 0 && (
                    <span
                      style={{
                        position: "absolute",
                        top: 4,
                        right: 4,
                        minWidth: 14,
                        height: 14,
                        borderRadius: 7,
                        background: "#ff4444",
                        color: "#fff",
                        fontSize: 8,
                        fontWeight: 700,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        padding: "0 3px",
                      }}
                    >
                      {unreadNewsCount > 99 ? "99+" : unreadNewsCount}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* ── Tab content ── */}
          <div style={{ flex: 1, overflow: "hidden" }}>
            {activeTab === "feed" && <EventFeed />}
            {activeTab === "news" && <NewsPanel />}
            {activeTab === "search" && <EntitySearch />}
            {activeTab === "comms" && <ChatPanel />}
          </div>
        </div>
      )}

      {/* Collapsed icon strip */}
      {isCollapsed && (
        <div className="flex flex-col items-center gap-2 pt-12">
          {tabs.map((tab) => (
            <Button
              key={tab.id}
              variant="ghost"
              size="icon"
              onClick={() => {
                handleTabClick(tab.id);
                setIsCollapsed(false);
              }}
              className={cn(
                "relative h-8 w-8",
                activeTab === tab.id && "bg-primary/20 text-primary"
              )}
            >
              <tab.icon className="h-4 w-4" />
              {tab.id === "comms" && unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-primary px-0.5 text-[8px] text-primary-foreground">
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              )}
              {tab.id === "news" && unreadNewsCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-primary px-0.5 text-[8px] text-primary-foreground">
                  {unreadNewsCount > 99 ? "99+" : unreadNewsCount}
                </span>
              )}
            </Button>
          ))}
        </div>
      )}
    </div>
  );
}
