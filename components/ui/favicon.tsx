"use client";

import { useState } from "react";
import { Globe } from "lucide-react";
import { cn } from "@/lib/utils";

interface FaviconProps {
  url: string;
  size?: number;
  className?: string;
}

export function Favicon({ url, size = 16, className }: FaviconProps) {
  const [error, setError] = useState(false);

  let hostname: string;
  try {
    hostname = new URL(url).hostname;
  } catch {
    return <Globe className={cn("text-muted-foreground", className)} style={{ width: size, height: size }} />;
  }

  if (error) {
    return <Globe className={cn("text-muted-foreground", className)} style={{ width: size, height: size }} />;
  }

  // Use Google's favicon service for reliable favicon fetching
  const faviconUrl = `https://www.google.com/s2/favicons?domain=${hostname}&sz=${size * 2}`;

  return (
    <img
      src={faviconUrl}
      alt=""
      width={size}
      height={size}
      className={cn("shrink-0 rounded-sm", className)}
      onError={() => setError(true)}
    />
  );
}
