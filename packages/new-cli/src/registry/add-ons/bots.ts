import type { ProjectSetupConfig } from "@/commands/init/types";
import { BaseAddOn } from "@/core/registry/add-ons/base-addon";
import path from "path";

export class BotsAddOn extends BaseAddOn {
  name = "Bots (Telegram, WhatsApp, Discord, etc.)";
  description = "Multi-platform chatbot support";
  value = "bots";
  hint = "For multi-platform chatbot support";
  templates = [
    {
      template: path.resolve(
        process.cwd(),
        "templates/add-ons/bots/sample-bot.hbs",
      ),
      outputPath: "src/bots/sample-bot.ts",
    },
    {
      template: (data: ProjectSetupConfig) => {
        const templates = {
          nextjs: path.resolve(
            process.cwd(),
            "templates/add-ons/bots/nextjs/route-handler.hbs",
          ),
          "tanstack-start": path.resolve(
            process.cwd(),
            "templates/add-ons/bots/tanstack-start/route-handler.hbs",
          ),
        };

        return templates[data.starter as keyof typeof templates] || "";
      },
      outputPath: (data: ProjectSetupConfig) => {
        const outputPaths = {
          nextjs: "src/app/api/bots/[provider]/[botId]/route.ts",
          "tanstack-start": "src/routes/api/bots/$provider/$botId.ts",
        };

        return outputPaths[data.starter as keyof typeof outputPaths] || "";
      },
    },
  ];
  dependencies = [
    {
      name: "@igniter-js/bot",
      version: "alpha",
      type: "dependency",
    },
  ];
  envVars = [
    {
      key: "TELEGRAM_TOKEN",
      value: "",
      description: "Telegram bot token",
    },
    {
      key: "TELEGRAM_WEBHOOK_URL",
      value: "",
      description: "Telegram webhook URL",
    },
    {
      key: "TELEGRAM_WEBHOOK_SECRET",
      value: "",
      description: "Telegram webhook secret",
    },
  ];
}
