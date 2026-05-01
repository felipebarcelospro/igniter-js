import { tryCatch } from "@igniter-js/core";
export async function register() {
  const { bot } = await import("./ai/bots/lia");
  const result = await tryCatch(bot.start());
  console.log(result);
  if (result.error) {
    console.error(result.error);
  }
}
