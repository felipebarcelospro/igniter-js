import type { NextRequest } from "next/server";
import { headers } from "next/headers";
import { memoryProvider } from "@/ai/agents/shared";
import { getClientIP } from "@/lib/rate-limiter";
import { generateId } from "ai";

export const runtime = "edge";
export const maxDuration = 60;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const chatId = searchParams.get("chatId");

    if (!chatId) {
      return new Response(JSON.stringify({ error: "Chat ID is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const ip = getClientIP(request);
    const userId = `user-${ip}`;

    const messages = await memoryProvider.getMessages({
      chatId
    });

    if (!messages) {
      return new Response(JSON.stringify({ error: "Chat not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    const parsedMessages = messages.map((msg) => {
      const content = msg.content || "";

      // Try to parse content as complete UIMessage object
      try {
        const parsed = JSON.parse(content);

        // If it's a complete message object with parts, use it directly
        if (parsed.parts && parsed.id && parsed.role) {
          return {
            ...parsed,
            createdAt: parsed.createdAt
              ? new Date(parsed.createdAt)
              : new Date(),
          };
        }

        // Fallback: if it's just a parts array, construct a message
        if (Array.isArray(parsed)) {
          return {
            id: generateId(),
            role: msg.role,
            content,
            parts: parsed,
            createdAt: msg.timestamp ? new Date(msg.timestamp) : new Date(),
          };
        }
      } catch {
        // If parsing fails, treat as plain text (legacy format)
      }
    });

    // The chat object from memoryProvider.chats.get already contains the messages
    return new Response(JSON.stringify(parsedMessages), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in fetching chat history:", error);
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
