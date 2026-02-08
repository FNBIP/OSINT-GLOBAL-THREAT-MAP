                                                                                                              import { NextResponse } from "next/server";
import { getMilitaryBases } from "@/lib/valyu";

export const dynamic = "force-dynamic";

// Cache the military bases data in memory
let cachedBases: Awaited<ReturnType<typeof getMilitaryBases>> | null = null;
let cacheTimestamp: number = 0;
const CACHE_DURATION = 1000 * 60 * 60; // 1 hour

export async function GET() {
  try {
    // Return cached data if available and fresh
    if (cachedBases && Date.now() - cacheTimestamp < CACHE_DURATION) {
      return NextResponse.json({
        bases: cachedBases,
        cached: true,
        timestamp: new Date(cacheTimestamp).toISOString(),
      });
    }

    const bases = await getMilitaryBases();

    // Update cache
    cachedBases = bases;
    cacheTimestamp = Date.now();

    return NextResponse.json({
      bases,
      cached: false,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error fetching military bases:", error);

    // Return cached data on error if available
    if (cachedBases) {
      return NextResponse.json({
        bases: cachedBases,
        cached: true,
        error: "Using cached data due to fetch error",
        timestamp: new Date(cacheTimestamp).toISOString(),
      });
    }

    return NextResponse.json(
      { error: "Failed to fetch military bases" },
      { status: 500 }
    );
  }
}
