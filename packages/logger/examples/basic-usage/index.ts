import { IgniterLogger } from '@igniter-js/logger';

// Create logger with default settings
const logger = IgniterLogger.create().build();

// Basic logging
logger.info("Application started");
logger.debug("Debug information", { userId: "123" });
logger.warn("Warning message");
logger.error("Error occurred", { code: 500 });

// Custom success logging
logger.success("Operation completed successfully");

// Grouping
logger.group("Processing items");
logger.info("Processing item 1");
logger.info("Processing item 2");
logger.groupEnd();
