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

async function getStatusViaProxy(
  taskId: string,
  accessToken: string
): Promise<any> {
  try {
    const response = await fetch(OAUTH_PROXY_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        path: `/v1/deepresearch/tasks/${taskId}/status`,
        method: "GET",
      }),
    });

    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        return { error: "Session expired. Please sign in again." };
      }
      return { error: `API call failed: ${response.status}` };
    }

    return await response.json();
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Unknown error" };
  }
}

// GET - Check status of a deep research task
export async function GET(
  request: Request,
  { params }: { params: Promise<{ taskId: string }> }
) {
  try {
    const { taskId } = await params;
    const { searchParams } = new URL(request.url);
    const accessToken = searchParams.get("accessToken");

    if (!taskId) {
      return NextResponse.json(
        { error: "Task ID is required" },
        { status: 400 }
      );
    }

    const selfHosted = isSelfHostedMode();
    let statusData: any;

    // Valyu mode requires auth
    if (!selfHosted && !accessToken) {
      return NextResponse.json(
        { error: "Authentication required", requiresReauth: true },
        { status: 401 }
      );
    }

    // Use OAuth proxy in valyu mode
    if (!selfHosted && accessToken) {
      statusData = await getStatusViaProxy(taskId, accessToken);
      if (statusData.error) {
        return NextResponse.json({ error: statusData.error }, { status: 500 });
      }
    } else {
      // Self-hosted mode: use API key directly
      const valyu = getValyuClient();
      statusData = await valyu.deepresearch.status(taskId);

      if (!statusData.success) {
        return NextResponse.json(
          { error: statusData.error || "Failed to get task status" },
          { status: 500 }
        );
      }
    }

    // Return progress info for polling
    const response: {
      taskId: string;
      status: string;
      progress?: { currentStep: number; totalSteps: number };
      output?: string;
      sources?: Array<{ title: string; url: string }>;
      deliverables?: Array<{
        type: string;
        title: string;
        url: string;
        status: string;
      }>;
      pdfUrl?: string;
      error?: string;
    } = {
      taskId,
      status: statusData.status || "unknown",
    };

    // Add progress if available
    if (statusData.progress) {
      response.progress = {
        currentStep: statusData.progress.current_step,
        totalSteps: statusData.progress.total_steps,
      };
    }

    // If completed, include full results
    if (statusData.status === "completed") {
      response.output = typeof statusData.output === "string"
        ? statusData.output
        : JSON.stringify(statusData.output);

      response.sources = (statusData.sources || []).map((s: any) => ({
        title: s.title || "Source",
        url: s.url || "",
      }));

      response.pdfUrl = statusData.pdf_url;

      // Include deliverables
      if (statusData.deliverables) {
        response.deliverables = statusData.deliverables.map((d: any) => ({
          type: d.type,
          title: d.title,
          url: d.url,
          status: d.status,
        }));
      }
    }

    // If failed, include error
    if (statusData.status === "failed") {
      response.error = statusData.error;
    }

    return NextResponse.json(response);
  } catch (error) {
    console.error("Error checking deep research status:", error);
    return NextResponse.json(
      { error: "Failed to check task status" },
      { status: 500 }
    );
  }
}
