"use client";

/**
 * Live News Streams
 *
 * Matches worldmonitor's LiveNewsPanel exactly:
 * - Same 8 channels (Bloomberg, Sky, Euronews, DW, CNBC, France24, AlArabiya, AlJazeera)
 * - YouTube IFrame API player (not basic iframe embeds)
 * - Channel switcher tab strip above the player
 * - Mute / Live (play-pause) buttons in the header
 * - Idle auto-pause after 5 minutes of user inactivity
 * - 16:9 aspect ratio player
 */

import { useEffect, useRef, useState, useCallback } from "react";
import { Volume2, VolumeX, Pause } from "lucide-react";

interface LiveChannel {
  id: string;
  name: string;
  fallbackVideoId: string;
  useFallbackOnly?: boolean;
}

const LIVE_CHANNELS: LiveChannel[] = [
  { id: "bloomberg",  name: "Bloomberg",  fallbackVideoId: "iEpJwprxDdk" },
  { id: "sky",        name: "Sky News",   fallbackVideoId: "YDvsBbKfLPA" },
  { id: "euronews",   name: "Euronews",   fallbackVideoId: "pykpO5kQJ98" },
  { id: "dw",         name: "DW",         fallbackVideoId: "LuKwFajn37U" },
  { id: "cnbc",       name: "CNBC",       fallbackVideoId: "9NyxcX3rhQs" },
  { id: "france24",   name: "France24",   fallbackVideoId: "Ap-UM1O9RBU" },
  { id: "alarabiya",  name: "AlArabiya",  fallbackVideoId: "n7eQejkXbnM", useFallbackOnly: true },
  { id: "aljazeera",  name: "AlJazeera",  fallbackVideoId: "gCNeDWCI0vo", useFallbackOnly: true },
];

const IDLE_PAUSE_MS = 5 * 60 * 1000; // 5 minutes

// Extend window type for YouTube IFrame API
declare global {
  interface Window {
    YT?: {
      Player: new (
        el: HTMLElement | string,
        opts: {
          videoId: string;
          host?: string;
          playerVars: Record<string, number | string>;
          events: {
            onReady?: () => void;
            onError?: (e: { data: number }) => void;
          };
        }
      ) => YTPlayer;
    };
    onYouTubeIframeAPIReady?: () => void;
  }
}

interface YTPlayer {
  playVideo(): void;
  pauseVideo(): void;
  mute(): void;
  unMute(): void;
  loadVideoById(id: string): void;
  destroy(): void;
}

// Singleton promise so the YouTube script is loaded only once
let ytApiPromise: Promise<void> | null = null;

function loadYouTubeApi(): Promise<void> {
  if (ytApiPromise) return ytApiPromise;
  ytApiPromise = new Promise<void>((resolve) => {
    if (window.YT?.Player) { resolve(); return; }
    const prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => { prev?.(); resolve(); };
    const s = document.createElement("script");
    s.src = "https://www.youtube.com/iframe_api";
    s.async = true;
    s.onerror = () => { ytApiPromise = null; resolve(); };
    document.head.appendChild(s);
  });
  return ytApiPromise;
}

export function VideoStreams() {
  const [activeChannel, setActiveChannel] = useState<LiveChannel>(LIVE_CHANNELS[0]!);
  const [isMuted, setIsMuted] = useState(true);
  const [isPlaying, setIsPlaying] = useState(true);
  const [loadingChannel, setLoadingChannel] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const playerRef = useRef<YTPlayer | null>(null);
  const playerElRef = useRef<HTMLDivElement | null>(null);
  const playerReadyRef = useRef(false);
  const isPlayingRef = useRef(true);
  const isMutedRef = useRef(true);
  const activeChannelRef = useRef<LiveChannel>(LIVE_CHANNELS[0]!);
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(true);

  // Keep refs in sync
  useEffect(() => { isPlayingRef.current = isPlaying; }, [isPlaying]);
  useEffect(() => { isMutedRef.current = isMuted; }, [isMuted]);
  useEffect(() => { activeChannelRef.current = activeChannel; }, [activeChannel]);

  const syncPlayer = useCallback(() => {
    const p = playerRef.current;
    if (!p || !playerReadyRef.current) return;
    if (isMutedRef.current) p.mute(); else p.unMute();
    if (isPlayingRef.current) p.playVideo(); else p.pauseVideo();
  }, []);

  const destroyPlayer = useCallback(() => {
    try { playerRef.current?.destroy(); } catch { /* ignore */ }
    playerRef.current = null;
    playerReadyRef.current = false;
  }, []);

  const initPlayer = useCallback(async (channel: LiveChannel) => {
    if (!playerElRef.current || !mountedRef.current) return;
    destroyPlayer();
    setError(null);

    await loadYouTubeApi();
    if (!mountedRef.current || !playerElRef.current || !window.YT?.Player) return;

    // Re-create a fresh mount div (YouTube replaces the element in the DOM)
    const container = playerElRef.current;
    container.innerHTML = "";
    const el = document.createElement("div");
    el.id = `yt-player-${channel.id}-${Date.now()}`;
    container.appendChild(el);

    playerRef.current = new window.YT.Player(el, {
      host: "https://www.youtube-nocookie.com",
      videoId: channel.fallbackVideoId,
      playerVars: {
        autoplay: isPlayingRef.current ? 1 : 0,
        mute: isMutedRef.current ? 1 : 0,
        rel: 0,
        playsinline: 1,
        enablejsapi: 1,
        origin: typeof window !== "undefined" ? window.location.origin : "",
        widget_referrer: typeof window !== "undefined" ? window.location.origin : "",
      },
      events: {
        onReady: () => {
          if (!mountedRef.current) return;
          playerReadyRef.current = true;
          syncPlayer();
          setLoadingChannel(null);
        },
        onError: () => {
          if (!mountedRef.current) return;
          setLoadingChannel(null);
          setError(`${channel.name} cannot be embedded`);
        },
      },
    });
  }, [destroyPlayer, syncPlayer]);

  // Init on mount
  useEffect(() => {
    mountedRef.current = true;
    void initPlayer(activeChannel);
    return () => {
      mountedRef.current = false;
      destroyPlayer();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Idle detection — pause after 5 min of inactivity
  const resetIdleTimer = useCallback(() => {
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    idleTimerRef.current = setTimeout(() => {
      if (isPlayingRef.current) {
        setIsPlaying(false);
        playerRef.current?.pauseVideo();
      }
    }, IDLE_PAUSE_MS);
  }, []);

  useEffect(() => {
    const evts = ["mousedown", "keydown", "scroll", "touchstart"] as const;
    evts.forEach((e) => document.addEventListener(e, resetIdleTimer, { passive: true }));
    resetIdleTimer();
    return () => {
      evts.forEach((e) => document.removeEventListener(e, resetIdleTimer));
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    };
  }, [resetIdleTimer]);

  const handleChannelSwitch = useCallback((channel: LiveChannel) => {
    if (channel.id === activeChannelRef.current.id) return;
    setActiveChannel(channel);
    setLoadingChannel(channel.id);
    setError(null);
    void initPlayer(channel);
  }, [initPlayer]);

  const handleTogglePlay = () => {
    const next = !isPlaying;
    setIsPlaying(next);
    if (next) { playerRef.current?.playVideo(); resetIdleTimer(); }
    else playerRef.current?.pauseVideo();
  };

  const handleToggleMute = () => {
    const next = !isMuted;
    setIsMuted(next);
    if (next) playerRef.current?.mute(); else playerRef.current?.unMute();
  };

  return (
    <div style={{ background: "#0a0a0a", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>

      {/* Header */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "8px 10px", borderBottom: "1px solid rgba(255,255,255,0.06)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <span style={{
            width: 6, height: 6, borderRadius: "50%",
            background: isPlaying ? "#ff4444" : "rgba(255,255,255,0.25)",
            display: "inline-block",
            animation: isPlaying ? "lvBlink 2s ease-in-out infinite" : "none",
          }} />
          <span style={{
            fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,0.7)",
            textTransform: "uppercase", letterSpacing: "1px",
          }}>Live News</span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          {/* Play / Pause toggle */}
          <button onClick={handleTogglePlay} title={isPlaying ? "Pause" : "Resume"} style={{
            display: "flex", alignItems: "center", gap: 3,
            fontSize: 9, fontWeight: 600, padding: "2px 7px", borderRadius: 3,
            cursor: "pointer", textTransform: "uppercase", letterSpacing: "0.5px",
            background: isPlaying ? "rgba(255,68,68,0.15)" : "rgba(255,255,255,0.05)",
            color: isPlaying ? "#ff6666" : "rgba(255,255,255,0.4)",
            border: `1px solid ${isPlaying ? "rgba(255,68,68,0.3)" : "rgba(255,255,255,0.1)"}`,
          }}>
            {isPlaying
              ? <><span style={{ width:6, height:6, borderRadius:"50%", background:"#ff4444", display:"inline-block", animation:"lvBlink 2s ease-in-out infinite" }} /> Live</>
              : <><Pause style={{ width:9, height:9 }} /> Paused</>
            }
          </button>

          {/* Mute toggle */}
          <button onClick={handleToggleMute} title={isMuted ? "Unmute" : "Mute"} style={{
            display: "flex", alignItems: "center", justifyContent: "center",
            width: 22, height: 22, borderRadius: 3, cursor: "pointer",
            background: isMuted ? "rgba(255,255,255,0.05)" : "rgba(0,170,255,0.15)",
            color: isMuted ? "rgba(255,255,255,0.35)" : "#00aaff",
            border: `1px solid ${isMuted ? "rgba(255,255,255,0.1)" : "rgba(0,170,255,0.3)"}`,
          }}>
            {isMuted ? <VolumeX style={{ width:11, height:11 }} /> : <Volume2 style={{ width:11, height:11 }} />}
          </button>
        </div>
      </div>

      {/* Channel tab strip — same as worldmonitor */}
      <div style={{
        display: "flex", overflowX: "auto", borderBottom: "1px solid rgba(255,255,255,0.06)",
        scrollbarWidth: "none",
      }}>
        {LIVE_CHANNELS.map((ch) => (
          <button key={ch.id} onClick={() => handleChannelSwitch(ch)} style={{
            flexShrink: 0, fontSize: 10, fontWeight: 600,
            padding: "5px 10px", cursor: "pointer",
            background: activeChannel.id === ch.id ? "rgba(0,170,255,0.12)" : "transparent",
            color: activeChannel.id === ch.id ? "#00aaff"
              : loadingChannel === ch.id ? "rgba(255,255,255,0.6)"
              : "rgba(255,255,255,0.4)",
            borderTop: "none", borderLeft: "none", borderRight: "none",
            borderBottom: `2px solid ${activeChannel.id === ch.id ? "#00aaff" : "transparent"}`,
            transition: "color 0.15s, border-color 0.15s, background 0.15s",
            letterSpacing: "0.3px",
          }}>
            {loadingChannel === ch.id && (
              <span style={{
                display: "inline-block", width: 5, height: 5, borderRadius: "50%",
                background: "#00aaff", marginRight: 4,
                animation: "lvBlink 0.8s ease-in-out infinite",
              }} />
            )}
            {ch.name}
          </button>
        ))}
      </div>

      {/* 16:9 player container */}
      <div style={{ position: "relative", aspectRatio: "16/9", background: "#000" }}>
        <div ref={playerElRef} style={{ width: "100%", height: "100%", position: "absolute", inset: 0 }} />

        {/* Loading spinner */}
        {loadingChannel && (
          <div style={{
            position: "absolute", inset: 0, zIndex: 2,
            display: "flex", alignItems: "center", justifyContent: "center",
            background: "rgba(0,0,0,0.65)",
          }}>
            <div style={{
              width: 20, height: 20, borderRadius: "50%",
              border: "2px solid rgba(0,170,255,0.3)",
              borderTop: "2px solid #00aaff",
              animation: "lvSpin 1s linear infinite",
            }} />
          </div>
        )}

        {/* Error state */}
        {error && !loadingChannel && (
          <div style={{
            position: "absolute", inset: 0, zIndex: 2,
            display: "flex", flexDirection: "column", alignItems: "center",
            justifyContent: "center", gap: 8, background: "rgba(0,0,0,0.85)",
          }}>
            <span style={{ fontSize: 24 }}>📺</span>
            <span style={{ fontSize: 11, color: "rgba(255,255,255,0.45)", textAlign: "center", padding: "0 16px" }}>
              {error}
            </span>
            <a
              href={`https://www.youtube.com/watch?v=${activeChannel.fallbackVideoId}`}
              target="_blank" rel="noopener noreferrer"
              style={{
                fontSize: 10, padding: "4px 10px", borderRadius: 3,
                background: "rgba(0,170,255,0.15)", color: "#00aaff",
                border: "1px solid rgba(0,170,255,0.3)", textDecoration: "none",
              }}
            >
              Open on YouTube →
            </a>
          </div>
        )}
      </div>

      <style>{`
        @keyframes lvBlink { 0%,100%{opacity:1} 50%{opacity:0.3} }
        @keyframes lvSpin  { to{transform:rotate(360deg)} }
      `}</style>
    </div>
  );
}
