import { NextResponse } from "next/server";
import { deepResearch } from "@/lib/valyu";
import { isSelfHostedMode } from "@/lib/app-mode";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { topic, type, accessToken } = body;

    if (!topic) {
      return NextResponse.json(
        { error: "Research topic is required" },
        { status: 400 }
      );
    }

    // In valyu mode, require authentication
    const selfHosted = isSelfHostedMode();
    if (!selfHosted && !accessToken) {
      return NextResponse.json(
        { error: "Authentication required", requiresReauth: true },
        { status: 401 }
      );
    }

    let enhancedQuery = topic;

    switch (type) {
      case "geopolitical":
        enhancedQuery = `geopolitical analysis ${topic} regional tensions diplomatic relations`;
        break;
      case "economic":
        enhancedQuery = `economic analysis ${topic} trade sanctions financial impact`;
        break;
      case "security":
        enhancedQuery = `security threat analysis ${topic} military defense`;
        break;
      case "humanitarian":
        enhancedQuery = `humanitarian crisis ${topic} refugee displacement aid`;
        break;
      default:
        enhancedQuery = `comprehensive analysis ${topic}`;
    }

    const research = await deepResearch(enhancedQuery, { accessToken: accessToken || undefined });

    return NextResponse.json({
      report: {
        id: `report_${Date.now()}`,
        topic,
        type: type || "general",
        summary: research.summary,
        sources: research.sources,
        generatedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("Error generating report:", error);
    return NextResponse.json(
      { error: "Failed to generate report" },
      { status: 500 }
    );
  }
}
