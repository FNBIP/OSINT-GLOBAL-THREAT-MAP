"use client";

import { useState } from "react";
import { Play, X } from "lucide-react";

interface VideoStream {
  id: string;
  name: string;
  thumbnail: string;
  embedUrl: string;
}

const VIDEO_STREAMS: VideoStream[] = [
  {
    id: "sky-news",
    name: "Sky News",
    thumbnail: "https://img.youtube.com/vi/9Auq9mYxFEE/maxresdefault.jpg",
    embedUrl: "https://www.youtube.com/embed/9Auq9mYxFEE?autoplay=1&mute=1",
  },
  {
    id: "al-jazeera",
    name: "Al Jazeera English",
    thumbnail: "https://img.youtube.com/vi/gCNeDWCI0vo/maxresdefault.jpg",
    embedUrl: "https://www.youtube.com/embed/gCNeDWCI0vo?autoplay=1&mute=1",
  },
  {
    id: "france24",
    name: "France 24 English",
    thumbnail: "https://img.youtube.com/vi/tkDUSbvIBRw/maxresdefault.jpg",
    embedUrl: "https://www.youtube.com/embed/tkDUSbvIBRw?autoplay=1&mute=1",
  },
  {
    id: "dw-news",
    name: "DW News",
    thumbnail: "https://img.youtube.com/vi/pqabxBKzZ6M/maxresdefault.jpg",
    embedUrl: "https://www.youtube.com/embed/pqabxBKzZ6M?autoplay=1&mute=1",
  },
];

export function VideoStreams() {
  const [activeStream, setActiveStream] = useState<VideoStream | null>(null);

  return (
    <div
      style={{
        padding: "12px",
        background: "#0a0a0a",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
      }}
    >
      {/* Header */}
      <div
        style={{
          fontSize: "11px",
          fontWeight: 600,
          color: "rgba(255,255,255,0.7)",
          textTransform: "uppercase",
          letterSpacing: "1px",
          marginBottom: "10px",
          display: "flex",
          alignItems: "center",
          gap: "6px",
        }}
      >
        <span
          style={{
            width: "6px",
            height: "6px",
            borderRadius: "50%",
            background: "#ff4444",
            animation: "blink 2s ease-in-out infinite",
          }}
        />
        Live News Streams
      </div>

      {/* Active stream (full player) */}
      {activeStream && (
        <div
          style={{
            marginBottom: "10px",
            position: "relative",
            background: "#000",
            borderRadius: "4px",
            overflow: "hidden",
            border: "1px solid rgba(0,170,255,0.3)",
          }}
        >
          <button
            onClick={() => setActiveStream(null)}
            style={{
              position: "absolute",
              top: "8px",
              right: "8px",
              zIndex: 10,
              width: "24px",
              height: "24px",
              borderRadius: "50%",
              background: "rgba(0,0,0,0.7)",
              border: "1px solid rgba(255,255,255,0.3)",
              color: "#fff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              transition: "all 0.15s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "rgba(255,68,68,0.9)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "rgba(0,0,0,0.7)";
            }}
          >
            <X className="h-3 w-3" />
          </button>

          <div
            style={{
              fontSize: "10px",
              fontWeight: 600,
              color: "#00aaff",
              padding: "8px",
              background: "rgba(0,0,0,0.8)",
              borderBottom: "1px solid rgba(0,170,255,0.2)",
            }}
          >
            {activeStream.name}
          </div>

          <iframe
            src={activeStream.embedUrl}
            style={{
              width: "100%",
              height: "200px",
              border: "none",
            }}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      )}

      {/* Stream grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(2, 1fr)",
          gap: "8px",
        }}
      >
        {VIDEO_STREAMS.map((stream) => (
          <div
            key={stream.id}
            onClick={() => setActiveStream(stream)}
            style={{
              position: "relative",
              cursor: "pointer",
              borderRadius: "4px",
              overflow: "hidden",
              border: "1px solid rgba(255,255,255,0.1)",
              background: "#000",
              transition: "all 0.15s ease",
              aspectRatio: "16/9",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = "rgba(0,170,255,0.5)";
              e.currentTarget.style.transform = "scale(1.02)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)";
              e.currentTarget.style.transform = "scale(1)";
            }}
          >
            {/* Thumbnail */}
            <img
              src={stream.thumbnail}
              alt={stream.name}
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                opacity: 0.7,
              }}
            />

            {/* Overlay */}
            <div
              style={{
                position: "absolute",
                inset: 0,
                background: "linear-gradient(to bottom, transparent, rgba(0,0,0,0.7))",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: "4px",
              }}
            >
              <div
                style={{
                  width: "28px",
                  height: "28px",
                  borderRadius: "50%",
                  background: "rgba(0,170,255,0.9)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  border: "2px solid rgba(255,255,255,0.3)",
                }}
              >
                <Play className="h-3 w-3" fill="currentColor" style={{ marginLeft: "2px" }} />
              </div>
            </div>

            {/* Label */}
            <div
              style={{
                position: "absolute",
                bottom: 0,
                left: 0,
                right: 0,
                padding: "6px 8px",
                background: "rgba(0,0,0,0.8)",
                fontSize: "9px",
                fontWeight: 600,
                color: "rgba(255,255,255,0.9)",
                borderTop: "1px solid rgba(255,255,255,0.1)",
              }}
            >
              {stream.name}
            </div>

            {/* Live indicator */}
            <div
              style={{
                position: "absolute",
                top: "6px",
                left: "6px",
                padding: "2px 6px",
                background: "rgba(255,68,68,0.9)",
                color: "#fff",
                fontSize: "8px",
                fontWeight: 700,
                borderRadius: "3px",
                textTransform: "uppercase",
                letterSpacing: "0.5px",
                display: "flex",
                alignItems: "center",
                gap: "4px",
              }}
            >
              <span
                style={{
                  width: "4px",
                  height: "4px",
                  borderRadius: "50%",
                  background: "#fff",
                }}
              />
              Live
            </div>
          </div>
        ))}
      </div>

      <style>{`
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
      `}</style>
    </div>
  );
}
