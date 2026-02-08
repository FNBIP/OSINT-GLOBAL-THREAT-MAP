"use client";

import { useRef, useEffect, useState } from "react";
import { useNostrStore } from "@/stores/nostr-store";
import { useNostr } from "@/hooks/use-nostr";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { ChannelHeader } from "./channel-header";
import { ChatMessage } from "./chat-message";
import { ChatInput } from "./chat-input";
import { RelayStatus } from "./relay-status";
import { DMPanel } from "./dm-panel";
import { MessageSquareLock, MessageCircle, Settings, Globe } from "lucide-react";

export function ChatPanel() {
  const { sendMessage, isConnected } = useNostr();
  const messages = useNostrStore((s) => s.messages);
  const showDMs = useNostrStore((s) => s.showDMs);
  const toggleDMs = useNostrStore((s) => s.toggleDMs);
  const resetUnread = useNostrStore((s) => s.resetUnread);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showSettings, setShowSettings] = useState(false);

  // Reset unread when panel mounts
  useEffect(() => {
    resetUnread();
  }, [resetUnread]);

  // Auto-scroll on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages.length]);

  if (showDMs) {
    return <DMPanel />;
  }

  return (
    <div className="flex h-full flex-col">
      <ChannelHeader />

      {/* Chat / DMs / Settings toggle */}
      <div className="flex border-b border-border">
        <button className="flex flex-1 items-center justify-center gap-1.5 py-2 text-xs font-medium text-primary border-b-2 border-primary">
          <MessageCircle className="h-3 w-3" />
          Chat
        </button>
        <button
          onClick={toggleDMs}
          className="flex flex-1 items-center justify-center gap-1.5 py-2 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          <MessageSquareLock className="h-3 w-3" />
          Private
        </button>
        <button
          onClick={() => setShowSettings(!showSettings)}
          className={`flex items-center justify-center px-3 py-2 text-xs font-medium transition-colors ${
            showSettings
              ? "text-primary"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Settings className="h-3 w-3" />
        </button>
      </div>

      {/* Settings panel (relay config) - only shown when gear clicked */}
      {showSettings && <RelayStatus />}

      {/* Messages area */}
      <ScrollArea ref={scrollRef} className="flex-1 py-2">
        {messages.length === 0 ? (
          <div className="py-12 text-center px-4">
            <Globe className="mx-auto h-10 w-10 text-muted-foreground/20" />
            <p className="mt-3 text-sm text-muted-foreground">
              No messages in this region yet
            </p>
            <p className="mt-1.5 text-[10px] text-muted-foreground leading-relaxed">
              Move the map to switch chat regions.
              <br />
              Be the first to start a conversation here.
            </p>
          </div>
        ) : (
          <div className="space-y-0.5">
            {messages.map((msg) => (
              <ChatMessage key={msg.id} message={msg} />
            ))}
          </div>
        )}
      </ScrollArea>

      <ChatInput
        onSend={sendMessage}
        disabled={!isConnected}
        placeholder={
          isConnected
            ? "Type a message..."
            : "Connecting..."
        }
      />
    </div>
  );
}
