import { NextResponse } from "next/server";
import { Valyu } from "valyu-js";
import { isSelfHostedMode } from "@/lib/app-mode";

export const dynamic = "force-dynamic";

const OAUTH_PROXY_URL =
  process.env.VALYU_OAUTH_PROXY_URL ||
  `${process.env.VALYU_APP_URL || "https://platform.valyu.ai"}/api/oauth/proxy`;

let valyuInstance: Valyu | null = null;

function getValyuClient(): Valyu {
  if (!valyuInstance) {
    const apiKey = process.env.VALYU_API_KEY;
    if (!apiKey) {
      throw new Error("VALYU_API_KEY environment variable is not set");
    }
    valyuInstance = new Valyu(apiKey);
  }
  return valyuInstance;
}

async function createTaskViaProxy(
  topic: string,
  accessToken: string
): Promise<{ taskId?: string; error?: string; requiresCredits?: boolean }> {
  try {
    const response = await fetch(OAUTH_PROXY_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        path: "/v1/deepresearch/tasks",
        method: "POST",
        body: {
          query: `Intelligence dossier on ${topic}. Include:
- Background and overview
- Key locations and geographic presence (with specific city/country names)
- Organizational structure and leadership
- Related entities, allies, and adversaries
- Recent activities and incidents (2023-2025)
- Threat assessment and capabilities
- Timeline of significant events`,
          mode: "fast",
          output_formats: ["markdown", "pdf"],
          deliverables: [
            {
              type: "csv",
              description: `Intelligence data export for ${topic}. Include all locations with coordinates, key figures, related organizations, significant events with dates, and source URLs.`,
              columns: [
                "Category",
                "Name",
                "Description",
                "Location",
                "Latitude",
                "Longitude",
                "Date",
                "Relationship",
                "Source URL",
              ],
              include_headers: true,
            },
            {
              type: "pptx",
              description: `Executive intelligence briefing on ${topic}. Include: overview slide, threat assessment, key locations map, organizational structure, recent activity timeline, related entities network, and recommendations.`,
              slides: 8,
            },
          ],
        },
      }),
    });

    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        return { error: "Session expired. Please sign in again." };
      }
      if (response.status === 402) {
        return { error: "Insufficient credits", requiresCredits: true };
      }
      // Try to parse error for credit-related messages
      try {
        const errorData = await response.json();
        const errorMsg = (errorData.error || errorData.message || "").toLowerCase();
        if (errorMsg.includes("insufficient credits") || errorMsg.includes("credit limit") || errorMsg.includes("no credits")) {
          return { error: "Insufficient credits", requiresCredits: true };
        }
      } catch {}
      return { error: `API call failed: ${response.status}` };
    }

    const data = await response.json();
    return { taskId: data.deepresearch_id };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Unknown error" };
  }
}

// POST - Create a new deep research task
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { topic, accessToken } = body;

    if (!topic) {
      return NextResponse.json(
        { error: "Topic is required" },
        { status: 400 }
      );
    }

    const selfHosted = isSelfHostedMode();

    // Valyu mode requires auth
    if (!selfHosted && !accessToken) {
      return NextResponse.json(
        { error: "Authentication required", requiresReauth: true },
        { status: 401 }
      );
    }

    // Use OAuth proxy in valyu mode
    if (!selfHosted && accessToken) {
      const result = await createTaskViaProxy(topic, accessToken);
      if (result.error) {
        if (result.requiresCredits) {
          return NextResponse.json(
            { error: "Insufficient credits", message: "Please top up credits" },
            { status: 402 }
          );
        }
        return NextResponse.json({ error: result.error }, { status: 500 });
      }
      return NextResponse.json({ taskId: result.taskId, status: "queued" });
    }

    // Self-hosted mode: use API key directly
    const valyu = getValyuClient();

    const task = await valyu.deepresearch.create({
      query: `Intelligence dossier on ${topic}. Include:
- Background and overview
- Key locations and geographic presence (with specific city/country names)
- Organizational structure and leadership
- Related entities, allies, and adversaries
- Recent activities and incidents (2023-2025)
- Threat assessment and capabilities
- Timeline of significant events`,
      mode: "fast",
      outputFormats: ["markdown", "pdf"],
      deliverables: [
        {
          type: "csv",
          description: `Intelligence data export for ${topic}. Include all locations with coordinates, key figures, related organizations, significant events with dates, and source URLs.`,
          columns: [
            "Category",
            "Name",
            "Description",
            "Location",
            "Latitude",
            "Longitude",
            "Date",
            "Relationship",
            "Source URL",
          ],
          includeHeaders: true,
        },
        {
          type: "pptx",
          description: `Executive intelligence briefing on ${topic}. Include: overview slide, threat assessment, key locations map, organizational structure, recent activity timeline, related entities network, and recommendations.`,
          slides: 8,
        },
      ],
    });

    if (!task.success || !task.deepresearch_id) {
      console.error("Failed to create deep research task:", task.error);
      const errorMsg = (task.error || "").toLowerCase();
      if (errorMsg.includes("insufficient credits") || errorMsg.includes("credit limit") || errorMsg.includes("no credits") || errorMsg.includes("402")) {
        return NextResponse.json(
          { error: "Insufficient credits", message: "Please top up credits" },
          { status: 402 }
        );
      }
      return NextResponse.json(
        { error: task.error || "Failed to create research task" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      taskId: task.deepresearch_id,
      status: "queued",
    });
  } catch (error) {
    console.error("Error creating deep research task:", error);
    const errorMsg = error instanceof Error ? error.message : String(error);
    if (errorMsg.toLowerCase().includes("insufficient credits") || errorMsg.includes("402")) {
      return NextResponse.json(
        { error: "Insufficient credits", message: "Please top up credits" },
        { status: 402 }
      );
    }
    return NextResponse.json(
      { error: "Failed to create research task" },
      { status: 500 }
    );
  }
}
