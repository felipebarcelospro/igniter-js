import { IgniterError } from "../error";
/**
 * Body parser processor for the Igniter Framework.
 * Handles parsing of request bodies based on content type.
 */
export class BodyParserProcessor {
  /**
   * Extracts and parses the request body based on content type.
   * Supports various content types including JSON, form data, files, and streams.
   *
   * @param request - The incoming HTTP request
   * @returns The parsed request body or undefined if no body
   *
   * @throws {IgniterError} When body parsing fails
   *
   * @example
   * ```typescript
   * const body = await BodyParserProcessor.parse(request);
   * if (body) {
   *   // Handle parsed body
   * }
   * ```
   */
  static async parse(request: Request): Promise<any> {
    try {
      const contentType = request.headers.get("content-type") || "";

      if (!request.body) {
        return undefined;
      }

      // JSON content
      // JSON content
      if (contentType.includes("application/json")) {
        try {
          // Tentar obter o texto primeiro para verificar se está vazio
          const text = await request.text();
          if (!text || text.trim() === "") {
            return {}; // Retornar objeto vazio para JSON vazio
          }
          // Fazer o parse manual do texto para JSON
          return JSON.parse(text);
        } catch (jsonError) {
          throw new IgniterError({
            code: "BODY_PARSE_ERROR",
            message: "Failed to parse JSON request body",
            details:
              jsonError instanceof Error
                ? jsonError.message
                : "Invalid JSON format",
          });
        }
      }

      // URL encoded form data
      if (contentType.includes("application/x-www-form-urlencoded")) {
        const formData = await request.formData();
        const result: Record<string, string> = {};
        formData.forEach((value, key) => {
          result[key] = value.toString();
        });
        return result;
      }

      // Multipart form data (file uploads)
      if (contentType.includes("multipart/form-data")) {
        const formData = await request.formData();
        const result: Record<string, any> = {};
        formData.forEach((value, key) => {
          result[key] = value;
        });
        return result;
      }

      // Plain text
      if (contentType.includes("text/plain")) {
        return await request.text();
      }

      // Binary data
      if (contentType.includes("application/octet-stream")) {
        return await request.arrayBuffer();
      }

      // Media files (PDF, images, videos)
      if (
        contentType.includes("application/pdf") ||
        contentType.includes("image/") ||
        contentType.includes("video/")
      ) {
        const blob = await request.blob();
        return blob;
      }

      // Streams
      if (
        contentType.includes("application/stream") ||
        request.body instanceof ReadableStream
      ) {
        return request.body;
      }

      // Default fallback to text
      return await request.text();
    } catch (error) {
      // Throw structured error instead of returning undefined
      throw new IgniterError({
        code: "BODY_PARSE_ERROR",
        message: "Failed to parse request body",
        details:
          error instanceof Error
            ? error.message
            : "Invalid request body format",
      });
    }
  }
}
