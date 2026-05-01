import { IgniterLogger, IgniterLogLevel } from '@igniter-js/logger';

const logger = IgniterLogger.create()
  .withLevel(IgniterLogLevel.Info)
  .addTransport({
    target: "file",
    options: {
      path: "./logs/app.log",
      mkdir: true,
    },
  })
  .build();

logger.info("File logging example");
logger.error("Error logged to file", { timestamp: Date.now() });

// Flush logs before exit
process.on("beforeExit", async () => {
  await logger.flush();
});
