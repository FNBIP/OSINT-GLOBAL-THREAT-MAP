"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useNostrStore } from "@/stores/nostr-store";
import { useNostr } from "@/hooks/use-nostr";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ChatInput } from "./chat-input";
import { cn, formatRelativeTime } from "@/lib/utils";
import { ArrowLeft, Send, Lock, MessageSquareLock } from "lucide-react";

function shortenPubkey(pubkey: string): string {
  return `${pubkey.slice(0, 8)}...${pubkey.slice(-4)}`;
}

export function DMPanel() {
  const dms = useNostrStore((s) => s.dms);
  const activeDMPubkey = useNostrStore((s) => s.activeDMPubkey);
  const setActiveDMPubkey = useNostrStore((s) => s.setActiveDMPubkey);
  const toggleDMs = useNostrStore((s) => s.toggleDMs);
  const { sendDM } = useNostr();

  const [newRecipient, setNewRecipient] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  // Group DMs by conversation partner
  const conversations = dms.reduce(
    (acc, dm) => {
      const otherPubkey = dm.isMine ? dm.recipientPubkey : dm.pubkey;
      if (!acc[otherPubkey]) acc[otherPubkey] = [];
      acc[otherPubkey].push(dm);
      return acc;
    },
    {} as Record<string, typeof dms>
  );

  const handleSendDM = useCallback(
    async (content: string) => {
      if (!activeDMPubkey) return;
      await sendDM(activeDMPubkey, content);
    },
    [activeDMPubkey, sendDM]
  );

  const handleStartNewDM = () => {
    const pk = newRecipient.trim();
    if (pk.length === 64) {
      setActiveDMPubkey(pk);
      setNewRecipient("");
    }
  };

  // Auto-scroll on new messages in thread
  const threadMessages = activeDMPubkey
    ? conversations[activeDMPubkey] || []
    : [];

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [threadMessages.length]);

  // --- Conversation thread view ---
  if (activeDMPubkey) {
    return (
      <div className="flex h-full flex-col">
        <div className="flex items-center gap-2 border-b border-border p-3">
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={() => setActiveDMPubkey(null)}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center gap-1 text-sm font-medium text-foreground">
              <MessageSquareLock className="h-3.5 w-3.5 text-primary" />
              {shortenPubkey(activeDMPubkey)}
            </div>
            <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
              <Lock className="h-2.5 w-2.5" />
              NIP-04 Encrypted
            </div>
          </div>
        </div>

        <ScrollArea ref={scrollRef} className="flex-1 p-3">
          <div className="space-y-2">
            {threadMessages.length === 0 ? (
              <div className="py-8 text-center">
                <Lock className="mx-auto h-6 w-6 text-muted-foreground/50" />
                <p className="mt-2 text-xs text-muted-foreground">
                  Start an encrypted conversation
                </p>
              </div>
            ) : (
              threadMessages.map((dm) => (
                <div
                  key={dm.id}
                  className={cn(
                    "max-w-[80%] px-2 py-1 text-sm break-words",
                    dm.isMine
                      ? "ml-auto bg-primary/20 text-foreground"
                      : "bg-muted text-foreground"
                  )}
                >
                  {dm.content}
                  <div className="mt-0.5 text-[10px] text-muted-foreground">
                    {formatRelativeTime(new Date(dm.created_at * 1000))}
                  </div>
                </div>
              ))
            )}
          </div>
        </ScrollArea>

        <ChatInput onSend={handleSendDM} placeholder="Encrypted message..." />
      </div>
    );
  }

  // --- Conversation list view ---
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-border p-3">
        <div className="flex items-center gap-2 text-sm font-medium text-foreground">
          <MessageSquareLock className="h-4 w-4 text-primary" />
          Encrypted DMs
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="text-xs h-7"
          onClick={toggleDMs}
        >
          Channel
        </Button>
      </div>

      {/* New DM input */}
      <div className="border-b border-border p-3">
        <div className="flex gap-1.5">
          <Input
            value={newRecipient}
            onChange={(e) => setNewRecipient(e.target.value)}
            placeholder="Recipient pubkey (hex)..."
            className="flex-1 text-[10px] font-mono h-7"
            onKeyDown={(e) => e.key === "Enter" && handleStartNewDM()}
          />
          <Button
            size="icon"
            className="h-7 w-7 shrink-0"
            onClick={handleStartNewDM}
            disabled={newRecipient.trim().length !== 64}
          >
            <Send className="h-3 w-3" />
          </Button>
        </div>
      </div>

      <ScrollArea className="flex-1 p-2">
        {Object.keys(conversations).length === 0 ? (
          <div className="py-8 text-center">
            <MessageSquareLock className="mx-auto h-8 w-8 text-muted-foreground/50" />
            <p className="mt-2 text-sm text-muted-foreground">
              No conversations yet
            </p>
            <p className="mt-1 text-[10px] text-muted-foreground">
              Paste a pubkey above to start an encrypted chat
            </p>
          </div>
        ) : (
          <div className="space-y-0.5">
            {Object.entries(conversations).map(([pubkey, msgs]) => {
              const lastMsg = msgs[msgs.length - 1];
              return (
                <button
                  key={pubkey}
                  onClick={() => setActiveDMPubkey(pubkey)}
                  className="flex w-full items-center gap-3 p-2 text-left hover:bg-muted/50 transition-colors"
                >
                  <div
                    className="flex h-8 w-8 shrink-0 items-center justify-center text-xs font-bold text-white"
                    style={{ backgroundColor: `#${pubkey.slice(0, 6)}` }}
                  >
                    {pubkey.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-[10px] font-mono text-foreground">
                      {shortenPubkey(pubkey)}
                    </div>
                    <div className="truncate text-[10px] text-muted-foreground">
                      {lastMsg.content}
                    </div>
                  </div>
                  <span className="text-[10px] text-muted-foreground shrink-0">
                    {formatRelativeTime(new Date(lastMsg.created_at * 1000))}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
