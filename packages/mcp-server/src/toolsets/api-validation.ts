/**
 * API Validation Tools - OpenAPI spec retrieval and HTTP request testing
 */

import { z } from "zod";
import axios from "axios";
import { ToolsetContext } from "./types";

export function registerApiValidationTools({ server }: ToolsetContext) {
  // --- API Validation Tools ---
  server.registerTool("get_openapi_spec", {
    title: "Get OpenAPI Specification",
    description: "Retrieve and parse the OpenAPI specification from the running server",
    inputSchema: {
      url: z.string().optional().describe("Custom URL for the OpenAPI spec (defaults to local dev server)"),
    },
  }, async ({ url }: { url?: string }) => {
    try {
      const specUrl = url || "http://localhost:3000/api/v1/docs/openapi.json";
      const response = await axios.get(specUrl);
      
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(response.data, null, 2),
          },
        ],
      };
    } catch (error: any) {
      return {
        content: [
          {
            type: "text",
            text: `Failed to fetch OpenAPI spec: ${error.message}`,
          },
        ],
      };
    }
  });

  server.registerTool("make_api_request", {
    title: "Make API Request",
    description: "Make HTTP requests to test API endpoints",
    inputSchema: {
      method: z.enum(["GET", "POST", "PUT", "DELETE", "PATCH"]),
      url: z.string(),
      headers: z.record(z.string()).optional(),
      body: z.any().optional(),
      timeout: z.number().optional().describe("Request timeout in milliseconds"),
    },
  }, async ({ method, url, headers, body, timeout }: { 
    method: string; 
    url: string; 
    headers?: Record<string, string>; 
    body?: any; 
    timeout?: number 
  }) => {
    try {
      const config: any = {
        method,
        url,
        headers: headers || {},
        timeout: timeout || 10000,
      };
      
      if (body && ["POST", "PUT", "PATCH"].includes(method)) {
        config.data = body;
        if (!config.headers["Content-Type"]) {
          config.headers["Content-Type"] = "application/json";
        }
      }
      
      const response = await axios(config);
      
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              status: response.status,
              statusText: response.statusText,
              headers: response.headers,
              data: response.data,
            }, null, 2),
          },
        ],
      };
    } catch (error: any) {
      const errorInfo = {
        message: error.message,
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
      };
      
      return {
        content: [
          {
            type: "text",
            text: `API request failed:\n${JSON.stringify(errorInfo, null, 2)}`,
          },
        ],
      };
    }
  });
}
