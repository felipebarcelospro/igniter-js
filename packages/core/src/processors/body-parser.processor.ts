import { IgniterError } from "../error";
import type { IgniterLogger } from "../types";
import type {
  IgniterTelemetryProvider,
  IgniterTelemetrySpan,
} from "../types/telemetry.interface";
import { TelemetryManagerProcessor } from "./telemetry-manager.processor";

/**
 * Result of body parsing with metadata
 */
export interface BodyParseResult {
  body: any;
  size: number;
  contentType: string;
}

/**
 * Body parser processor for the Igniter Framework.
 * Handles parsing of request bodies based on content type with telemetry integration.
 */
export class BodyParserProcessor {
  /**
   * Extracts and parses the request body based on content type.
   * Supports various content types including JSON, form data, files, and streams.
   *
   * @param request - The incoming HTTP request
   * @param hasBodySchema - Whether the route has a body schema defined
   * @param logger - Optional logger instance
   * @param telemetry - Optional telemetry provider for metrics
   * @param parentSpan - Optional parent span for tracing
   * @returns The parsed request body or undefined if no body
   *
   * @throws {IgniterError} When body parsing fails
   *
   * @example
   * ```typescript
   * const body = await BodyParserProcessor.parse(request, true, logger);
   * if (body) {
   *   // Handle parsed body
   * }
   * ```
   */
  static async parse(
    request: Request,
    hasBodySchema: boolean,
    logger?: IgniterLogger,
    telemetry?: IgniterTelemetryProvider | null,
    parentSpan?: IgniterTelemetrySpan,
  ): Promise<any> {
    const childLogger = logger?.child("BodyParserProcessor");
    const startTime = Date.now();
    const contentType = request.headers.get("content-type") || "";

    // Create telemetry span for body parsing
    const span = TelemetryManagerProcessor.createBodyParsingSpan(
      telemetry,
      contentType,
      hasBodySchema,
      parentSpan,
      logger,
    );

    try {
      childLogger?.debug("Parsing request body", {
        contentType: contentType || "none",
      });

      if (!hasBodySchema) {
        childLogger?.debug(
          "No body schema, returning undefined. Use request.raw.body instead.",
        );

        const duration = Date.now() - startTime;

        // Finish span - no body to parse
        TelemetryManagerProcessor.finishBodyParsingSpan(
          span,
          true,
          0,
          duration,
          logger,
        );

        // Record metrics
        TelemetryManagerProcessor.recordBodyParsing(
          telemetry,
          contentType,
          0,
          duration,
          true,
          logger,
        );

        return undefined;
      }

      if (!request.body) {
        childLogger?.debug("No request body");

        const duration = Date.now() - startTime;

        // Finish span - no body
        TelemetryManagerProcessor.finishBodyParsingSpan(
          span,
          true,
          0,
          duration,
          logger,
        );

        // Record metrics
        TelemetryManagerProcessor.recordBodyParsing(
          telemetry,
          contentType,
          0,
          duration,
          true,
          logger,
        );

        return undefined;
      }

      // Get content length for metrics
      const contentLength = parseInt(
        request.headers.get("content-length") || "0",
        10,
      );

      let parsedBody: any;

      // JSON content
      if (contentType.includes("application/json")) {
        childLogger?.debug("Parsing as JSON");
        try {
          const text = await request.text();
          if (!text || text.trim() === "") {
            childLogger?.debug("Empty JSON body");
            parsedBody = {};
          } else {
            parsedBody = JSON.parse(text);
          }
        } catch (jsonError) {
          const duration = Date.now() - startTime;

          // Finish span with error
          TelemetryManagerProcessor.finishBodyParsingSpan(
            span,
            false,
            contentLength,
            duration,
            logger,
          );

          // Record metrics
          TelemetryManagerProcessor.recordBodyParsing(
            telemetry,
            contentType,
            contentLength,
            duration,
            false,
            logger,
          );

          throw new IgniterError({
            code: "BODY_PARSE_ERROR",
            message: "Failed to parse JSON request body",
            details:
              jsonError instanceof Error
                ? jsonError.message
                : "Invalid JSON format",
            logger: childLogger,
          });
        }
      }
      // URL encoded form data
      else if (contentType.includes("application/x-www-form-urlencoded")) {
        childLogger?.debug("Parsing as URL encoded form");
        const formData = await request.formData();
        const result: Record<string, string> = {};
        formData.forEach((value, key) => {
          result[key] = value.toString();
        });
        parsedBody = result;
      }
      // Multipart form data (file uploads)
      else if (contentType.includes("multipart/form-data")) {
        childLogger?.debug("Parsing as multipart form data");
        const formData = await request.formData();
        const result: Record<string, any> = {};
        formData.forEach((value, key) => {
          result[key] = value;
        });
        parsedBody = result;
      }
      // Plain text
      else if (contentType.includes("text/plain")) {
        childLogger?.debug("Parsing as plain text");
        parsedBody = await request.text();
      }
      // Binary data
      else if (contentType.includes("application/octet-stream")) {
        childLogger?.debug("Parsing as binary");
        parsedBody = await request.arrayBuffer();
      }
      // Media files (PDF, images, videos)
      else if (
        contentType.includes("application/pdf") ||
        contentType.includes("image/") ||
        contentType.includes("video/")
      ) {
        childLogger?.debug("Parsing as blob", { contentType });
        parsedBody = await request.blob();
      }
      // Streams
      else if (
        contentType.includes("application/stream") ||
        request.body instanceof ReadableStream
      ) {
        childLogger?.debug("Parsing as stream");
        parsedBody = request.body;
      }
      // Default fallback to text
      else {
        childLogger?.debug("Parsing as text");
        parsedBody = await request.text();
      }

      const duration = Date.now() - startTime;

      // Calculate actual body size
      let bodySize = contentLength;
      if (bodySize === 0 && parsedBody) {
        if (typeof parsedBody === "string") {
          bodySize = new TextEncoder().encode(parsedBody).length;
        } else if (parsedBody instanceof ArrayBuffer) {
          bodySize = parsedBody.byteLength;
        } else if (parsedBody instanceof Blob) {
          bodySize = parsedBody.size;
        } else if (typeof parsedBody === "object") {
          bodySize = new TextEncoder().encode(JSON.stringify(parsedBody)).length;
        }
      }

      // Finish span with success
      TelemetryManagerProcessor.finishBodyParsingSpan(
        span,
        true,
        bodySize,
        duration,
        logger,
      );

      // Record metrics
      TelemetryManagerProcessor.recordBodyParsing(
        telemetry,
        contentType,
        bodySize,
        duration,
        true,
        logger,
      );

      return parsedBody;
    } catch (error) {
      // If it's already an IgniterError, just rethrow
      if (error instanceof IgniterError) {
        throw error;
      }

      const duration = Date.now() - startTime;
      const contentLength = parseInt(
        request.headers.get("content-length") || "0",
        10,
      );

      // Finish span with error
      TelemetryManagerProcessor.finishBodyParsingSpan(
        span,
        false,
        contentLength,
        duration,
        logger,
      );

      // Record metrics
      TelemetryManagerProcessor.recordBodyParsing(
        telemetry,
        contentType,
        contentLength,
        duration,
        false,
        logger,
      );

      const igniterError = new IgniterError({
        code: "BODY_PARSE_ERROR",
        message: "Failed to parse request body",
        details:
          error instanceof Error
            ? error.message
            : "Invalid request body format",
        logger: childLogger,
      });

      childLogger?.error("Body parsing failed", {
        component: "BodyParser",
        error: error instanceof Error ? error.message : "Unknown error",
      });

      throw igniterError;
    }
  }
}
