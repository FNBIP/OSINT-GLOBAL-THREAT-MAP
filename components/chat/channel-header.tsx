"use client";

import { useState, useMemo } from "react";
import { useNostrStore } from "@/stores/nostr-store";
import { useMapStore } from "@/stores/map-store";
import { cn } from "@/lib/utils";
import { Globe, ChevronDown, Users, MessageSquare, Radio } from "lucide-react";

// Pre-seeded geohash rooms — always visible, like bitchat.land
// These map geohash prefixes (precision 2) to named regions with coordinates
const SEEDED_ROOMS: Array<{
  geohash: string;
  name: string;
  lat: number;
  lon: number;
  zoom: number;
}> = [
  // Americas
  { geohash: "dr", name: "US East Coast", lat: 40.7, lon: -74.0, zoom: 5 },
  { geohash: "9q", name: "US West Coast", lat: 37.8, lon: -122.4, zoom: 5 },
  { geohash: "dp", name: "US Midwest", lat: 41.9, lon: -87.6, zoom: 5 },
  { geohash: "9v", name: "US South", lat: 32.8, lon: -96.8, zoom: 5 },
  { geohash: "f2", name: "Canada", lat: 45.5, lon: -73.6, zoom: 4 },
  { geohash: "d2", name: "Mexico", lat: 19.4, lon: -99.1, zoom: 5 },
  { geohash: "6g", name: "Brazil", lat: -23.5, lon: -46.6, zoom: 4 },
  { geohash: "69", name: "Argentina", lat: -34.6, lon: -58.4, zoom: 4 },
  // Europe
  { geohash: "u4", name: "Western Europe", lat: 48.9, lon: 2.3, zoom: 5 },
  { geohash: "gc", name: "United Kingdom", lat: 51.5, lon: -0.1, zoom: 5 },
  { geohash: "u3", name: "Central Europe", lat: 52.5, lon: 13.4, zoom: 5 },
  { geohash: "u2", name: "Northern Europe", lat: 59.3, lon: 18.1, zoom: 4 },
  { geohash: "sp", name: "Southern Europe", lat: 41.9, lon: 12.5, zoom: 5 },
  { geohash: "u8", name: "Eastern Europe", lat: 50.4, lon: 30.5, zoom: 4 },
  // Middle East & Africa
  { geohash: "sv", name: "Middle East", lat: 25.2, lon: 55.3, zoom: 4 },
  { geohash: "s1", name: "North Africa", lat: 30.0, lon: 31.2, zoom: 4 },
  { geohash: "kz", name: "East Africa", lat: -1.3, lon: 36.8, zoom: 4 },
  { geohash: "ke", name: "West Africa", lat: 6.5, lon: 3.4, zoom: 4 },
  // Asia & Pacific
  { geohash: "tt", name: "South Asia", lat: 28.6, lon: 77.2, zoom: 4 },
  { geohash: "wx", name: "East Asia", lat: 31.2, lon: 121.5, zoom: 4 },
  { geohash: "xn", name: "Japan / Korea", lat: 35.7, lon: 139.7, zoom: 5 },
  { geohash: "w2", name: "Southeast Asia", lat: 13.8, lon: 100.5, zoom: 4 },
  { geohash: "r3", name: "Australia", lat: -33.9, lon: 151.2, zoom: 4 },
];

function timeAgo(timestamp: number): string {
  const seconds = Math.floor(Date.now() / 1000) - timestamp;
  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

export function ChannelHeader() {
  const currentChannelName = useNostrStore((s) => s.currentChannelName);
  const connectionStatus = useNostrStore((s) => s.connectionStatus);
  const discoveredChannels = useNostrStore((s) => s.discoveredChannels);
  const flyTo = useMapStore((s) => s.flyTo);
  const [showRooms, setShowRooms] = useState(false);

  // Merge seeded rooms with discovered relay data
  const rooms = useMemo(() => {
    return SEEDED_ROOMS.map((seeded) => {
      const discovered = discoveredChannels.get(seeded.geohash);
      return {
        ...seeded,
        messageCount: discovered?.messageCount ?? 0,
        participants: discovered?.participants?.size ?? 0,
        lastActivity: discovered?.lastActivity ?? 0,
        isActive: (discovered?.lastActivity ?? 0) > Date.now() / 1000 - 1800, // active in last 30 min
      };
    }).sort((a, b) => {
      // Active rooms first, then by participants, then by message count
      if (a.isActive !== b.isActive) return a.isActive ? -1 : 1;
      if (a.participants !== b.participants) return b.participants - a.participants;
      return b.messageCount - a.messageCount;
    });
  }, [discoveredChannels]);

  // Count rooms with live activity
  const activeCount = rooms.filter((r) => r.isActive).length;

  const handleRoomSelect = (room: (typeof rooms)[number]) => {
    flyTo(room.lon, room.lat, room.zoom);
    setShowRooms(false);
  };

  return (
    <div className="border-b border-border">
      {/* Header */}
      <div className="flex items-center justify-between p-3">
        <button
          onClick={() => setShowRooms(!showRooms)}
          className="flex items-center gap-2 hover:text-primary transition-colors"
        >
          <Globe className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-semibold text-foreground">
            {currentChannelName}
          </h2>
          <ChevronDown
            className={cn(
              "h-3 w-3 text-muted-foreground transition-transform",
              showRooms && "rotate-180"
            )}
          />
        </button>
        <div className="flex items-center gap-1.5">
          <div
            className={`h-2 w-2 rounded-full ${
              connectionStatus === "connected"
                ? "bg-green-500"
                : connectionStatus === "connecting"
                  ? "bg-yellow-500 animate-pulse"
                  : "bg-red-500"
            }`}
          />
          <span className="text-[10px] text-muted-foreground">
            {connectionStatus === "connected"
              ? "Live"
              : connectionStatus === "connecting"
                ? "Connecting..."
                : "Offline"}
          </span>
        </div>
      </div>

      {/* Room selector dropdown */}
      {showRooms && (
        <div className="border-t border-border max-h-96 overflow-y-auto">
          <div className="px-2 py-1.5">
            <div className="flex items-center justify-between px-2 py-1">
              <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider flex items-center gap-1">
                <Radio className="h-2.5 w-2.5" />
                Rooms
              </p>
              {activeCount > 0 && (
                <span className="text-[9px] text-green-500 font-medium">
                  {activeCount} active
                </span>
              )}
            </div>
            {rooms.map((room) => (
              <button
                key={room.geohash}
                onClick={() => handleRoomSelect(room)}
                className={cn(
                  "flex w-full items-center justify-between px-2 py-2 text-xs transition-colors hover:bg-muted/50 rounded-sm",
                  currentChannelName === room.name
                    ? "text-primary bg-muted/30"
                    : "text-foreground"
                )}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <div
                    className={cn(
                      "h-2 w-2 rounded-full shrink-0",
                      room.isActive
                        ? "bg-green-500 animate-pulse"
                        : room.messageCount > 0
                          ? "bg-yellow-500/60"
                          : "bg-muted-foreground/20"
                    )}
                  />
                  <span className="truncate font-medium">{room.name}</span>
                  <span className="font-mono text-[9px] text-muted-foreground/60 shrink-0">
                    {room.geohash}
                  </span>
                </div>
                <div className="flex items-center gap-2 shrink-0 ml-2">
                  {room.participants > 0 && (
                    <span className="flex items-center gap-0.5 text-[9px] text-muted-foreground" title="People chatting">
                      <Users className="h-2.5 w-2.5" />
                      {room.participants}
                    </span>
                  )}
                  {room.messageCount > 0 && (
                    <span className="flex items-center gap-0.5 text-[9px] text-muted-foreground" title="Messages">
                      <MessageSquare className="h-2.5 w-2.5" />
                      {room.messageCount}
                    </span>
                  )}
                  {room.lastActivity > 0 && (
                    <span className="text-[9px] text-muted-foreground/70">
                      {timeAgo(room.lastActivity)}
                    </span>
                  )}
                </div>
              </button>
            ))}
          </div>
          <p className="px-4 pt-1.5 pb-2 text-[10px] text-muted-foreground border-t border-border/50">
            {rooms.length} rooms · {activeCount > 0 ? `${activeCount} with live activity · ` : ""}
            Pan the map to join any region
          </p>
        </div>
      )}
    </div>
  );
}
