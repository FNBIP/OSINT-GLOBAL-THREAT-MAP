"use client";

import { memo } from "react";
import { cn, formatRelativeTime } from "@/lib/utils";
import { useNostrStore } from "@/stores/nostr-store";
import type { NostrMessage } from "@/types";
import { Link2 } from "lucide-react";

function getDisplayName(message: NostrMessage): string {
  // BitChat protocol: use the "n" tag nickname if available
  if (message.nickname) return message.nickname;
  // Fallback: short pubkey suffix (like BitChat does)
  return `anon${message.pubkey.slice(-4)}`;
}

function getAvatarLetters(message: NostrMessage): string {
  if (message.nickname) return message.nickname.slice(0, 2).toUpperCase();
  return message.pubkey.slice(0, 2).toUpperCase();
}

interface ChatMessageProps {
  message: NostrMessage;
}

export const ChatMessage = memo(function ChatMessage({
  message,
}: ChatMessageProps) {
  const myPubkey = useNostrStore((s) => s.keypair?.publicKey);
  const isMine = message.pubkey === myPubkey;

  if (message.isSystem) {
    return (
      <div className="py-1 text-center text-[10px] text-muted-foreground italic">
        {message.content}
      </div>
    );
  }

  const displayName = getDisplayName(message);
  const pubkeySuffix = `#${message.pubkey.slice(-4)}`;

  return (
    <div
      className={cn(
        "group flex gap-2 px-3 py-1.5",
        isMine && "flex-row-reverse"
      )}
    >
      {/* Pubkey-colored avatar */}
      <div
        className="flex h-6 w-6 shrink-0 items-center justify-center rounded-sm text-[10px] font-bold text-white"
        style={{
          backgroundColor: `#${message.pubkey.slice(0, 6)}`,
        }}
      >
        {getAvatarLetters(message)}
      </div>

      <div className={cn("max-w-[75%]", isMine && "text-right")}>
        <div
          className={cn(
            "flex items-center gap-1.5 text-[10px]",
            isMine && "justify-end"
          )}
        >
          <span className="font-semibold text-foreground">{displayName}</span>
          <span className="text-muted-foreground/60 font-mono">{pubkeySuffix}</span>
          <span className="text-muted-foreground">
            {formatRelativeTime(new Date(message.created_at * 1000))}
          </span>
        </div>
        <div
          className={cn(
            "mt-0.5 inline-block rounded-sm px-2 py-1 text-sm break-words",
            isMine
              ? "bg-primary/20 text-foreground"
              : "bg-muted text-foreground"
          )}
        >
          {message.content}
          {message.eventRef && (
            <span className="ml-2 inline-flex items-center gap-1 text-[10px] text-primary">
              <Link2 className="h-3 w-3" />
              Event
            </span>
          )}
        </div>
      </div>
    </div>
  );
});
