import { smoothStream } from "ai";
import type { NextRequest } from "next/server";
import { buildAppContext } from "@/ai/agents/shared";
import { liaAgent } from "@/ai/agents/lia";
import { checkRateLimit, getClientIP } from "@/lib/rate-limiter";
import { headers } from "next/headers";
import { memoryProvider } from "@/ai/agents/shared";

export const runtime = "edge";
export const maxDuration = 60;

export async function GET(request: NextRequest) {
  try {
    const ip = getClientIP(request);
    const userId = `user-${ip}`;
    const allChats = await memoryProvider.getChats(userId);

    return new Response(JSON.stringify(allChats), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in fetching chat list:", error);
    return new Response(
      JSON.stringify({
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const ip = getClientIP(request);
    const { success, remaining, limit, reset } = await checkRateLimit(ip);

    if (!success) {
      return new Response(
        JSON.stringify({
          error: "Rate limit exceeded. Please try again later.",
          remaining,
          limit,
          reset,
          code: "RATE_LIMIT_EXCEEDED",
        }),
        {
          status: 429,
          headers: {
            "Content-Type": "application/json",
            "X-RateLimit-Limit": limit.toString(),
            "X-RateLimit-Remaining": remaining.toString(),
            "X-RateLimit-Reset": typeof reset === "number" ? reset.toString() : reset,
          },
        },
      );
    }

    // Get request body
    const body = await request.json();

    const { message, id, currentPage, attachedPages, timezone } = body;

    if (!message) {
      return new Response(
        JSON.stringify({ error: "No message provided" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    // Build app context
    const userId = `user-${ip}`;

    const appContext = buildAppContext({
      userId,
      chatId: id,
      currentPage: currentPage || undefined,
      attachedPages: attachedPages || [],
      timezone: timezone || "UTC",
      locale: "en-US",
    });

    // Stream response using Lia agent
    return liaAgent.toUIMessageStream({
      message,
      strategy: "auto",
      maxRounds: 5,
      maxSteps: 20,
      context: appContext,
      experimental_transform: smoothStream({
        chunking: "word",
      }),
      sendReasoning: true,
      sendSources: true,
    });
  } catch (error) {
    console.error("Error in chat API:", error);
    return new Response(
      JSON.stringify({
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    );
  }
}

