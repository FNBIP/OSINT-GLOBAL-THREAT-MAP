import { NextResponse } from "next/server";
import { streamCountryConflicts, getCountryConflicts, type ConflictStreamChunk } from "@/lib/valyu";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const country = searchParams.get("country");
  const stream = searchParams.get("stream") === "true";
  const accessToken = searchParams.get("accessToken") || undefined;

  if (!country) {
    return NextResponse.json(
      { error: "Country parameter is required" },
      { status: 400 }
    );
  }

  // Streaming mode - use Server-Sent Events
  if (stream) {
    const encoder = new TextEncoder();

    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of streamCountryConflicts(country, { accessToken }) as AsyncGenerator<ConflictStreamChunk>) {
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
    const result = await getCountryConflicts(country, { accessToken });

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
    return NextResponse.json(
      { error: "Failed to fetch country conflicts" },
      { status: 500 }
    );
  }
}
