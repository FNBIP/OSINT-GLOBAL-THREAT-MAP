"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { EventFeed } from "@/components/feed/event-feed";
import { EntitySearch } from "@/components/search/entity-search";
import { ChatPanel } from "@/components/chat/chat-panel";
import { useNostrStore } from "@/stores/nostr-store";
import {
  Activity,
  FileText,
  ChevronLeft,
  ChevronRight,
  Radio,
} from "lucide-react";

type Tab = "feed" | "search" | "comms";

export function Sidebar() {
  const [activeTab, setActiveTab] = useState<Tab>("feed");
  const [isCollapsed, setIsCollapsed] = useState(false);
  const unreadCount = useNostrStore((s) => s.unreadCount);

  const tabs = [
    { id: "feed" as Tab, label: "Live Feed", icon: Activity },
    { id: "search" as Tab, label: "Intel", icon: FileText },
    { id: "comms" as Tab, label: "Comms", icon: Radio },
  ];

  const handleTabClick = (tabId: Tab) => {
    setActiveTab(tabId);
    if (tabId === "comms") {
      useNostrStore.getState().resetUnread();
    }
  };

  return (
    <div
      className={cn(
        "relative flex h-full flex-col border-l border-border bg-card transition-all duration-300",
        isCollapsed ? "w-12" : "w-96"
      )}
    >
      <Button
        variant="ghost"
        size="icon"
        className="absolute -left-3 top-4 z-10 h-6 w-6 rounded-full border border-border bg-card"
        onClick={() => setIsCollapsed(!isCollapsed)}
      >
        {isCollapsed ? (
          <ChevronLeft className="h-3 w-3" />
        ) : (
          <ChevronRight className="h-3 w-3" />
        )}
      </Button>

      {!isCollapsed && (
        <>
          <div className="flex border-b border-border">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => handleTabClick(tab.id)}
                className={cn(
                  "flex flex-1 items-center justify-center gap-1.5 py-3 text-sm font-medium transition-colors",
                  activeTab === tab.id
                    ? "border-b-2 border-primary text-primary"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <tab.icon className="h-4 w-4" />
                {tab.label}
                {tab.id === "comms" && unreadCount > 0 && (
                  <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] text-primary-foreground">
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </span>
                )}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-hidden">
            {activeTab === "feed" && <EventFeed />}
            {activeTab === "search" && <EntitySearch />}
            {activeTab === "comms" && <ChatPanel />}
          </div>
        </>
      )}

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
            </Button>
          ))}
        </div>
      )}
    </div>
  );
}
