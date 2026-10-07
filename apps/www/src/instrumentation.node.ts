import { tryCatch } from "@igniter-js/core";
export async function register() {
  // The Telegram bot (and the whole AI agent graph it pulls in) is only
  // useful when a token is configured. Skipping the import keeps the
  // server footprint small on hosts without Telegram set up (e.g. Render
  // free tier with 512MB RAM).
  if (!process.env.TELEGRAM_TOKEN) {
    console.log("[instrumentation] TELEGRAM_TOKEN not set, skipping bot start");
    return;
  }
  const { bot } = await import("./ai/bots/lia");
  const result = await tryCatch(bot.start());
  console.log(result);
  if (result.error) {
    console.error(result.error);
  }
}
