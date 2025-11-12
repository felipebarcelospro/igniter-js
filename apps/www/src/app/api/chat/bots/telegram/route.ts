import { bot } from "@/ai/bots/lia";
import type { NextRequest } from "next/server";

export async function POST(request: NextRequest) {
  return bot.handle('telegram', request);
}