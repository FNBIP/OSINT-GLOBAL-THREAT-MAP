"use client";

import { useState } from "react";
import { useNostrStore } from "@/stores/nostr-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  Wifi,
  Plus,
  X,
  Copy,
  Key,
  Download,
  Upload,
  Check,
} from "lucide-react";
import { exportKeypairHex, importKeypairHex, saveKeypair } from "@/lib/nostr";

export function RelayStatus() {
  const relays = useNostrStore((s) => s.relays);
  const addRelay = useNostrStore((s) => s.addRelay);
  const removeRelay = useNostrStore((s) => s.removeRelay);
  const keypair = useNostrStore((s) => s.keypair);
  const setKeypair = useNostrStore((s) => s.setKeypair);
  const geoRelayCount = useNostrStore((s) => s.geoRelayCount);

  const [newRelayUrl, setNewRelayUrl] = useState("");
  const [copied, setCopied] = useState(false);

  const handleAddRelay = () => {
    const url = newRelayUrl.trim();
    if (!url || !url.startsWith("ws")) return;
    addRelay(url);
    setNewRelayUrl("");
  };

  const handleCopyPubkey = async () => {
    if (!keypair?.publicKey) return;
    await navigator.clipboard.writeText(keypair.publicKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleExportKey = async () => {
    if (!keypair) return;
    const hex = exportKeypairHex(keypair.privateKey);
    await navigator.clipboard.writeText(hex);
    alert("Private key copied to clipboard. Store it safely!");
  };

  const handleImportKey = () => {
    const hex = prompt("Paste your private key (hex):");
    if (!hex) return;
    try {
      const kp = importKeypairHex(hex.trim());
      saveKeypair(kp.privateKey);
      setKeypair(kp);
    } catch {
      alert("Invalid key format");
    }
  };

  return (
    <div className="border-b border-border p-3 space-y-3">
      {/* Identity section */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-medium text-foreground flex items-center gap-1">
            <Key className="h-3 w-3" />
            Identity
          </span>
          <div className="flex gap-0.5">
            <Button
              variant="ghost"
              size="icon"
              className="h-5 w-5"
              onClick={handleCopyPubkey}
              title="Copy public key"
            >
              {copied ? (
                <Check className="h-3 w-3 text-green-500" />
              ) : (
                <Copy className="h-3 w-3" />
              )}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-5 w-5"
              onClick={handleExportKey}
              title="Export private key"
            >
              <Download className="h-3 w-3" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-5 w-5"
              onClick={handleImportKey}
              title="Import private key"
            >
              <Upload className="h-3 w-3" />
            </Button>
          </div>
        </div>
        <p className="font-mono text-[10px] text-muted-foreground truncate">
          {keypair?.publicKey || "No key generated"}
        </p>
      </div>

      {/* Relays section */}
      <div className="space-y-1.5">
        <span className="text-[10px] font-medium text-foreground">Relays</span>
        {relays.map((relay) => (
          <div
            key={relay.url}
            className="flex items-center justify-between text-[10px]"
          >
            <div className="flex items-center gap-1.5 truncate">
              <div
                className={cn(
                  "h-1.5 w-1.5 rounded-full shrink-0",
                  relay.status === "connected"
                    ? "bg-green-500"
                    : relay.status === "connecting"
                      ? "bg-yellow-500"
                      : "bg-red-500"
                )}
              />
              <span className="font-mono truncate text-muted-foreground">
                {relay.url.replace("wss://", "")}
              </span>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-4 w-4 shrink-0"
              onClick={() => removeRelay(relay.url)}
            >
              <X className="h-2.5 w-2.5" />
            </Button>
          </div>
        ))}
        <div className="flex gap-1 mt-1">
          <Input
            value={newRelayUrl}
            onChange={(e) => setNewRelayUrl(e.target.value)}
            placeholder="wss://relay.example.com"
            className="h-6 text-[10px]"
            onKeyDown={(e) => e.key === "Enter" && handleAddRelay()}
          />
          <Button
            size="icon"
            className="h-6 w-6 shrink-0"
            onClick={handleAddRelay}
          >
            <Plus className="h-3 w-3" />
          </Button>
        </div>
        <p className="text-[10px] text-muted-foreground">
          Supports .onion addresses for Tor
        </p>
        {geoRelayCount > 0 && (
          <p className="text-[10px] text-green-500/80">
            + {geoRelayCount} geo-distributed relays active
          </p>
        )}
      </div>

    </div>
  );
}
