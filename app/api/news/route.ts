import { NextResponse } from "next/server";
import { RSS_FEEDS } from "@/lib/rss-feeds";
import { fetchAllFeeds } from "@/lib/rss";
import type { NewsCategory } from "@/lib/rss-feeds";

export const dynamic = "force-dynamic";
export const maxDuration = 30; // Vercel: max 30s

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const category = searchParams.get("category") as NewsCategory | null;

  try {
    let feeds = RSS_FEEDS.filter((f) => f.enabled);
    if (category) {
      feeds = feeds.filter((f) => f.category === category);
    }

    // Race the feed fetching against a global timeout
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("Global timeout")), 25_000)
    );

    const items = await Promise.race([
      fetchAllFeeds(feeds),
      timeoutPromise,
    ]);

    return NextResponse.json({
      items,
      count: items.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[NEWS] Error fetching feeds:", error);
    // Even on timeout, return whatever we have cached
    return NextResponse.json({
      items: [],
      count: 0,
      timestamp: new Date().toISOString(),
      error: "Some feeds timed out — try again shortly",
    });
  }
}
