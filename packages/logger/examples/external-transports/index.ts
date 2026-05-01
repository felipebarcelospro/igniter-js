import { IgniterLogger } from '@igniter-js/logger';

// Using pino-pretty (must be installed separately)
const prettyLogger = IgniterLogger.create()
  .addTransport({
    target: "pino-pretty",
    options: {
      colorize: true,
      translateTime: "SYS:standard",
      ignore: "pid,hostname",
    },
  })
  .build();

prettyLogger.info("Pretty formatted logs");

// Using external SaaS logger (e.g., @logtail/pino)
// npm install @logtail/pino
const remoteLogger = IgniterLogger.create()
  .addTransport({
    target: "@logtail/pino",
    options: {
      sourceToken: process.env.LOGTAIL_TOKEN || "your-token",
    },
  })
  .build();

remoteLogger.info("Sent to SaaS logging service");
