import { IgniterLogger } from '@igniter-js/logger';

// Create base logger
const logger = IgniterLogger.create()
  .withContext({ service: "api", version: "1.0.0" })
  .build();

// Create child logger for HTTP requests
const httpLogger = logger.child("http", {
  requestId: `req-${Date.now()}`,
  method: "GET",
});

httpLogger.info("Request received");
httpLogger.info("Response sent", { statusCode: 200 });

// Create child logger for database operations
const dbLogger = logger.child("database", {
  connection: "main",
  query: "SELECT",
});

dbLogger.debug("Query executed", { duration: 45 });
