import { IgniterLogger } from '@igniter-js/logger';

const logger = IgniterLogger.create()
  .addTransport({
    target: "http",
    options: {
      url: process.env.LOG_URL || "https://logs.example.com/ingest",
      headers: {
        "X-API-Key": process.env.LOG_API_KEY || "your-api-key",
      },
      batchSize: 100,
    },
  })
  .build();

logger.info("HTTP transport example");
logger.error("Remote logging", { service: "api" });
