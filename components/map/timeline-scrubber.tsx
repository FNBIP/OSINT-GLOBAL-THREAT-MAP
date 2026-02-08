"use client";

import { useEffect, useRef } from "react";
import { useMapStore } from "@/stores/map-store";
import { Play, Pause } from "lucide-react";

const PAN_SPEED = 0.3;

export function TimelineScrubber() {
  const { isAutoPlaying, startAutoPlay, stopAutoPlay, viewport, setViewport } =
    useMapStore();
  const animationRef = useRef<number | null>(null);

  const handlePlayToggle = () => {
    if (isAutoPlaying) {
      stopAutoPlay();
    } else {
      startAutoPlay();
    }
  };

  useEffect(() => {
    if (!isAutoPlaying) {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
      return;
    }

    const animate = () => {
      setViewport({
        longitude: viewport.longitude + PAN_SPEED,
      });
      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isAutoPlaying, viewport.longitude, setViewport]);

  return (
    <div className="absolute bottom-6 left-6 z-10">
      <button
        onClick={handlePlayToggle}
        className={`flex h-12 w-12 items-center justify-center rounded-full shadow-lg transition-all duration-200 ${
          isAutoPlaying
            ? "bg-primary text-primary-foreground hover:bg-primary/90"
            : "bg-card/95 text-foreground hover:bg-card border border-border"
        } backdrop-blur-sm`}
        title={isAutoPlaying ? "Pause auto-pan" : "Start auto-pan"}
      >
        {isAutoPlaying ? (
          <Pause className="h-5 w-5" />
        ) : (
          <Play className="h-5 w-5 ml-0.5" />
        )}
      </button>
    </div>
  );
}
