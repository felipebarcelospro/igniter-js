import type { IgniterRouter, IgniterControllerConfig } from "../../../types";

/**
 * MCP context passed to event handlers and instructions function.
 */
export interface McpContext<TContext = any> {
  /** Original router context */
  context: TContext;
  /** Available tools */
  tools: McpToolInfo[];
  /** Request information */
  request: Request;
  /** User information if available */
  user?: any;
  /** Timestamp of the request */
  timestamp: number;
  /** Client information */
  client?: string;
}

/**
 * Information about an MCP tool.
 */
export interface McpToolInfo {
  /** Tool name */
  name: string;
  /** Tool description */
  description: string;
  /** Controller name */
  controller: string;
  /** Action name */
  action: string;
  /** HTTP method */
  method: string;
  /** Tool schema */
  schema?: any;
  /** Tool tags */
  tags?: string[];
}

/**
 * Custom MCP tool definition with type inference.
 */
export interface McpCustomTool<TContext = any> {
  /** Tool name */
  name: string;
  /** Tool description */
  description: string;
  /** Tool schema (Zod schema) */
  schema: any;
  /** Tool handler function */
  handler: (args: any, context: McpContext<TContext>) => Promise<any> | any;
  /** Tool tags */
  tags?: string[];
}

/**
 * MCP tool configuration after transformation.
 */
export interface McpToolConfig {
  /** Tool name */
  name: string;
  /** Tool description */
  description: string;
  /** Tool schema */
  schema?: any;
  /** Tool tags */
  tags?: string[];
}

/**
 * MCP response format.
 */
export interface McpResponse {
  /** Response content */
  content: Array<{
    /** Content type */
    type: 'text' | 'image' | 'resource';
    /** Content text */
    text?: string;
    /** Content data */
    data?: any;
  }>;
}

/**
 * MCP adapter configuration options with automatic type inference.
 */
export interface McpAdapterOptions<TContext = any, TInferredContext = any> {
  /** Server information */
  serverInfo?: {
    /** Server name */
    name: string;
    /** Server version */
    version: string;
  };
  
  /** Instructions for the MCP server */
  instructions?: string | ((context: McpContext<TInferredContext>) => string | Promise<string>);
  
  /** Tool configuration */
  tools?: {
    /** Automatically map all router actions as tools */
    autoMap?: boolean;
    /** Custom naming strategy for tools */
    naming?: (controller: string, action: string) => string;
    /** Filter which actions to expose as tools */
    filter?: (controller: string, action: string, actionConfig: any) => boolean;
    /** Transform action configurations */
    transform?: (controller: string, action: string, actionConfig: any) => McpToolConfig;
    /** Custom tools to add */
    custom?: McpCustomTool<TInferredContext>[];
  };
  
  /** Event handlers */
  events?: {
    /** Called when a tool is invoked */
    onToolCall?: (toolName: string, args: any, context: McpContext<TInferredContext>) => void | Promise<void>;
    /** Called when a tool succeeds */
    onToolSuccess?: (toolName: string, result: any, duration: number, context: McpContext<TInferredContext>) => void | Promise<void>;
    /** Called when a tool fails */
    onToolError?: (toolName: string, error: Error, context: McpContext<TInferredContext>) => void | Promise<void>;
    /** Called on MCP request */
    onRequest?: (request: Request, context: McpContext<TInferredContext>) => void | Promise<void>;
    /** Called on MCP response */
    onResponse?: (response: any, context: McpContext<TInferredContext>) => void | Promise<void>;
    /** Called on general MCP adapter errors */
    onError?: (error: Error, context: McpContext<TInferredContext>) => void | Promise<void>;
  };
  
  /** Context creation function with automatic type inference */
  context?: (request: Request) => McpContext<TInferredContext> | Promise<McpContext<TInferredContext>>;
  
  /** Response transformation */
  response?: {
    /** Transform Igniter response to MCP format */
    transform?: (igniterResponse: any, toolName: string, context: McpContext<TInferredContext>) => McpResponse | Promise<McpResponse>;
    /** Handle errors */
    onError?: (error: Error, toolName: string, context: McpContext<TInferredContext>) => McpResponse | Promise<McpResponse>;
  };
  
  /** Adapter-specific options */
  adapter?: {
    /** Base path for MCP endpoints */
    basePath?: string;
    /** Maximum duration for requests */
    maxDuration?: number;
    /** Enable verbose logging */
    verboseLogs?: boolean;
    /** Redis configuration for SSE transport */
    redis?: {
      /** Redis URL */
      url?: string;
      /** Key prefix for Redis keys */
      keyPrefix?: string;
    };
  };
}

/**
 * Utility type to infer context type from context function.
 */
export type InferMcpContextFromFunction<T> = T extends (request: Request) => McpContext<infer U> | Promise<McpContext<infer U>>
  ? U
  : never;

/**
 * Utility type to infer context type from router.
 */
export type InferMcpContextFromRouter<TRouter> = TRouter extends IgniterRouter<infer TContext, any>
  ? TContext
  : never;

/**
 * Utility type to infer the full context from options.
 */
export type InferMcpContext<TRouterContext, TOptions> = TOptions extends { context: infer TContextFn }
  ? TContextFn extends (request: Request) => McpContext<infer TInferred> | Promise<McpContext<infer TInferred>>
    ? TInferred
    : TRouterContext
  : TRouterContext;

/**
 * MCP handler function type.
 */
export type McpHandler = {
  (request: Request): Promise<Response>;
  /** For Next.js compatibility */
  GET?: McpHandler;
  POST?: McpHandler;
  DELETE?: McpHandler;
}; 