import type { IgniterAction } from "@igniter-js/core";
import type { IgniterRouter, ContextCallback } from "@igniter-js/core";
import type { AuthInfo } from "@modelcontextprotocol/sdk/server/auth/types.js";
import type { McpServer, ReadResourceCallback, RegisteredPrompt } from "@modelcontextprotocol/sdk/server/mcp.js";
import { CallToolResult, type GetPromptResult, type ServerCapabilities } from "@modelcontextprotocol/sdk/types.js";
import { ZodRawShape, ZodObject } from "zod";
import type { ZodOptional, ZodType, ZodTypeDef, infer as ZodInfer, AnyZodObject, objectOutputType, ZodTypeAny } from "zod/v3";

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
  /** Timestamp of the request */
  timestamp: number;
  /** Client information */
  client?: string;
  /** MCP Server */
  server?: McpServer;
}

export type InferZodRawShape<T> = T extends ZodObject<infer R> ? R : T extends ZodRawShape ? T : never

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
  schema?: ZodRawShape;
  /** Tool tags */
  tags?: string[];
}

/**
 * Custom MCP tool definition with type inference.
 */
export interface McpCustomTool<
  TArgs extends ArgsRawShape,
  TContext = any
> {
  /** Tool name */
  name: string;
  /** Tool description */
  description: string;
  /** Tool arguments schema (ZodRawShape: { field: z.string() }) */
  args: TArgs;
  /** Tool handler function */
  handler: (
    args: objectOutputType<TArgs, ZodTypeAny>,
    context: McpContext<TContext>
  ) => Promise<CallToolResult> | CallToolResult;
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
  schema?: ZodObject<any> | ZodRawShape;
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

export type ArgsRawShape = {
    [k: string]: ZodTypeAny;
};

/**
 * MCP Prompt definition.
 */
export interface McpPrompt<Args extends ArgsRawShape, TContext = any> {
  /** Prompt name */
  name: string;
  /** Prompt description */
  description: string;
  /** Prompt arguments schema (ZodRawShape: { field: z.string() }) */
  args?: Args;
  /** Prompt handler function */
  handler: (args: objectOutputType<Args, ZodTypeAny>, context: McpContext<TContext>) => GetPromptResult | Promise<GetPromptResult>;
}

/**
 * MCP Resource definition.
 */
export interface McpResource<TContext = any> {
  /** Resource name */
  name: string;
  /** Resource URI */
  uri: string;
  /** Resource handler function */
  handler: ReadResourceCallback;
}

/**
 * OAuth configuration for MCP Authorization.
 */
export interface McpOAuthConfig<TContext = object | ContextCallback> {
  /** OAuth issuer URL (authorization server) */
  issuer: string;
  /** Path to OAuth protected resource metadata endpoint */
  resourceMetadataPath?: string;
  /** Token verification function */
  verifyToken?: (props: { request: Request; bearerToken?: string | undefined, context: McpContext<TContext> }) => AuthInfo | undefined | Promise<AuthInfo | undefined>;
  /** Scopes required for access */
  scopes?: string[];
}

export interface McpServerInfo {
  name: string;
  version: string;
}

/** 
 * Function type for custom tool naming strategy.
 */
export type McpToolNaming = (controller: string, action: string) => string;

/**
 * Function type to filter tools.
 */
export type McpToolFilter = (controller: string, action: string, actionConfig: IgniterAction<any, any, any, any, any, any, any, any, any, any>) => boolean;

/**
 * Function type to transform tool configurations.
 */
export type McpToolTransform = (controller: string, action: string, actionConfig: IgniterAction<any, any, any, any, any, any, any, any, any, any>) => McpToolConfig;

/**
 * MCP tools configuration options.
 */
export interface McpToolsOptions<TContext = any> {
  /** Automatically map all router actions as tools */
  autoMap?: boolean;
  /** Custom naming strategy for tools */
  naming?: McpToolNaming;
  /** Filter which actions to expose as tools */
  filter?: McpToolFilter;
  /** Transform action configurations */
  transform?: McpToolTransform;
  /** Custom tools to add */
  custom?: McpCustomTool<any, TContext>[];
}

/**
 * MCP prompts configuration options.
 */
export interface McpPromptsOptions<TContext = any> {
  /** Custom prompts to register */
  custom?: McpPrompt<any, TContext>[];
}

/**
 * MCP resources configuration options.
 */
export interface McpResourcesOptions<TContext = any> {
  /** Custom resources to register */
  custom?: McpResource<TContext>[];
}

/**
 * MCP events configuration options.
 */
export interface McpEventsOptions<TContext = any> {
  /** Called when a tool is invoked */
  onToolCall?: (toolName: string, args: any, context: McpContext<TContext>) => void | Promise<void>;
  /** Called when a tool succeeds */
  onToolSuccess?: (toolName: string, result: any, duration: number, context: McpContext<TContext>) => void | Promise<void>;
  /** Called when a tool fails */
  onToolError?: (toolName: string, error: Error, context: McpContext<TContext>) => void | Promise<void>;
  /** Called on MCP request */
  onRequest?: (request: Request, context: McpContext<TContext>) => void | Promise<void>;
  /** Called on MCP response */
  onResponse?: (response: any, context: McpContext<TContext>) => void | Promise<void>;
  /** Called on general MCP adapter errors */
  onError?: (error: Error, context: McpContext<TContext>) => void | Promise<void>;
}

/**
 * MCP response configuration options.
 */
export interface McpResponseOptions<TContext = any> {
  /** Transform Igniter response to MCP format */
  transform?: (igniterResponse: any, toolName: string, context: McpContext<TContext>) => CallToolResult | Promise<CallToolResult>;
  /** Handle errors */
  onError?: (error: Error, toolName: string, context: McpContext<TContext>) => CallToolResult | Promise<CallToolResult>;
}

/**
 * MCP adapter-specific configuration options.
 */
export interface McpAdapterSpecificOptions {
  streamableHttpEndpoint?: string;
  sseEndpoint?: string;
  sseMessageEndpoint?: string;
  basePath?: string;
  redisUrl?: string;
  disableSse?: boolean;
  maxDuration?: number;
  verboseLogs?: boolean;
  redis?: {
    url: string;
  };
}

/**
 * MCP adapter configuration options with automatic type inference.
 *
 * @template TContext - The context type inferred from the router
 */
export interface McpAdapterOptions<
  TRouter extends IgniterRouter<any, any, any, any, any>,
  TContext extends object | ContextCallback = InferMcpContextFromRouter<TRouter>
> {
  logger?: {
    log: (message: string) => void;
    error: (message: string) => void;
    warn: (message: string) => void;
    debug: (message: string) => void;
  }

  /** Igniter router to expose as MCP server */
  router: TRouter;

  /** Optional instructions function */
  instructions?: string;  

  /** Optional server capabilities to advertise */
  capatibilities?: ServerCapabilities;

  /** Server information */
  serverInfo?: McpServerInfo;

  /** Tool configuration */
  tools?: McpToolsOptions<TContext>;

  /** Prompts configuration */
  prompts?: McpPromptsOptions<TContext>;

  /** Resources configuration */
  resources?: McpResourcesOptions<TContext>;

  /** OAuth configuration for MCP Authorization */
  oauth?: McpOAuthConfig<TContext>;

  /** Event handlers */
  events?: McpEventsOptions<TContext>;

  /** Response transformation */
  response?: McpResponseOptions<TContext>;

  /** Adapter-specific options */
  adapter?: McpAdapterSpecificOptions;
}

/**
 * Utility type to infer context type from router.
 */
export type InferMcpContextFromRouter<TRouter> = TRouter extends IgniterRouter<any, any, any, any, any>
  ? TRouter['$Infer']['$context']
  : never;

/**
 * MCP handler with optional authentication for IgniterMcpServer
*/
export type IgniterMcpHandler = {
  handler: (request: Request) => Promise<Response> | Response;
  auth: {
    resourceHandler: (request: Request) => Promise<Response> | Response;
    corsHandler: (request: Request) => Promise<Response> | Response;
  };
}