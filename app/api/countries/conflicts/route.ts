import { NextResponse } from "next/server";
import { getCountryConflicts, streamCountryConflicts, CreditError } from "@/lib/valyu";
import { isSelfHostedMode } from "@/lib/app-mode";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const country = searchParams.get("country");
  const stream = searchParams.get("stream") === "true";
  const accessToken = searchParams.get("accessToken");

  if (!country) {
    return NextResponse.json(
      { error: "Country parameter is required" },
      { status: 400 }
    );
  }

  // In valyu mode, require user token
  const selfHosted = isSelfHostedMode();
  if (!selfHosted && !accessToken) {
    return NextResponse.json(
      { error: "Authentication required", requiresReauth: true },
      { status: 401 }
    );
  }

  // Streaming mode - use Server-Sent Events
  if (stream) {
    const encoder = new TextEncoder();

    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of streamCountryConflicts(country, { accessToken: accessToken || undefined })) {
            const data = `data: ${JSON.stringify(chunk)}\n\n`;
            controller.enqueue(encoder.encode(data));
          }
          controller.close();
        } catch (error) {
          const errorData = `data: ${JSON.stringify({
            type: "error",
            error: error instanceof Error ? error.message : "Unknown error",
          })}\n\n`;
          controller.enqueue(encoder.encode(errorData));
          controller.close();
        }
      },
    });

    return new Response(readable, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  }

  // Non-streaming mode - return full response
  try {
    const result = await getCountryConflicts(country, { accessToken: accessToken || undefined });

    return NextResponse.json({
      country,
      past: {
        conflicts: result.past.answer,
        sources: result.past.sources,
      },
      current: {
        conflicts: result.current.answer,
        sources: result.current.sources,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error fetching country conflicts:", error);
    if (error instanceof CreditError) {
      return NextResponse.json(
        { error: "Insufficient credits", message: "Please top up credits" },
        { status: 402 }
      );
    }
    const errorMsg = error instanceof Error ? error.message : String(error);
    if (errorMsg.toLowerCase().includes("insufficient credits") || errorMsg.includes("402")) {
      return NextResponse.json(
        { error: "Insufficient credits", message: "Please top up credits" },
        { status: 402 }
      );
    }
    return NextResponse.json(
      { error: "Failed to fetch country conflicts" },
      { status: 500 }
    );
  }
}
