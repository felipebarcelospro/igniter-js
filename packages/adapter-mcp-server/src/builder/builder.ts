import type { IgniterRouter } from "@igniter-js/core";
import type { ServerCapabilities } from "@modelcontextprotocol/sdk/types.js";
import { createMcpAdapter } from "src/core/adapter";
import type { ArgsRawShape, InferToolPaths, McpAdapterOptions, McpAdapterSpecificOptions, McpCustomTool, McpEventsOptions, McpOAuthConfig, McpPrompt, McpResource, McpResponseOptions, McpServerInfo, McpToolFilterMode, McpToolTransform } from "src/types";

export class IgniterMcpServer<
  TRouter extends IgniterRouter<any, any, any, any, any>,
  TCustomTools extends readonly McpCustomTool<any, any>[],
  TCustomPrompts extends readonly McpPrompt<any, any>[],
  TCustomResources extends readonly McpResource<any>[]
> {
  private _options: McpAdapterOptions<TRouter, TRouter['$Infer']['$context']>;
  private _handler: {
    server: (request: Request) => Promise<Response>;
    auth: {
      resource: (request: Request) => Promise<Response> | Response;
      cors: (request: Request) => Promise<Response> | Response;
    };
  };

  constructor(options?: McpAdapterOptions<TRouter, TRouter['$Infer']['$context']>) {
    this._options = options || {} as McpAdapterOptions<TRouter, TRouter['$Infer']['$context']>
    this._handler = {
      server: async (request: Request) => new Response('Not implemented', { status: 501 }),
      auth: {
        resource: async (request: Request) => new Response('Not implemented', { status: 501 }),
        cors: async (request: Request) => new Response('Not implemented', { status: 501 }),
      }
    };
  }

  static create() {
    return new IgniterMcpServer();
  }

  router<
    TNewRouter extends IgniterRouter<any, any, any, any, any>,
  >(router: TNewRouter): IgniterMcpServer<TNewRouter, [], [], []> {
    const { router: _, ...rest } = this._options;
    return new IgniterMcpServer<TNewRouter, [], [], []>({
      ...rest,
      router,
    });
  }

  withLogger(logger: {
    log: (message: string) => void;
    error: (message: string) => void;
    warn: (message: string) => void;
    debug: (message: string) => void;
  }): IgniterMcpServer<TRouter, TCustomTools, TCustomPrompts, TCustomResources> {
    this._options.logger = logger;
    return new IgniterMcpServer<TRouter, TCustomTools, TCustomPrompts, TCustomResources>({
      ...this._options,
    });
  }

  withToolTransform(transform: McpToolTransform): IgniterMcpServer<TRouter, TCustomTools, TCustomPrompts, TCustomResources> {
    if (!this._options.tools) {
      this._options.tools = { autoMap: true, custom: [] };
    }
    this._options.tools.transform = transform;
    return new IgniterMcpServer<TRouter, TCustomTools, TCustomPrompts, TCustomResources>({
      ...this._options,
    });
  }

  /**
   * Filter which tools to expose based on a type-safe list of tool paths.
   * 
   * @param paths - Array of tool paths in format "controller.action"
   * @param mode - 'include' (only these tools) or 'exclude' (all except these). Default: 'include'
   * 
   * @example
   * ```typescript
   * // Only include specific tools
   * .withToolFilter(['users.list', 'users.getById'])
   * 
   * // Exclude specific tools (include all others)
   * .withToolFilter(['users.delete', 'users.dangerousAction'], 'exclude')
   * ```
   */
  withToolFilter<TPaths extends InferToolPaths<TRouter>>(
    paths: TPaths[],
    mode: McpToolFilterMode = 'include'
  ): IgniterMcpServer<TRouter, TCustomTools, TCustomPrompts, TCustomResources> {
    if (!this._options.tools) {
      this._options.tools = { autoMap: true, custom: [] };
    }
    this._options.tools.toolPaths = paths;
    this._options.tools.filterMode = mode;
    return new IgniterMcpServer<TRouter, TCustomTools, TCustomPrompts, TCustomResources>({
      ...this._options,
    });
  }

  withInstructions(instructions: string): IgniterMcpServer<TRouter, TCustomTools, TCustomPrompts, TCustomResources> {
    this._options.instructions = instructions;
    return new IgniterMcpServer<TRouter, TCustomTools, TCustomPrompts, TCustomResources>({
      ...this._options,
    });
  }
  
  withCapabilities(capatibilities: ServerCapabilities): IgniterMcpServer<TRouter, TCustomTools, TCustomPrompts, TCustomResources> {
    this._options.capatibilities = capatibilities;
    return new IgniterMcpServer<TRouter, TCustomTools, TCustomPrompts, TCustomResources>({
      ...this._options,
    });
  }

  withServerInfo(serverInfo: McpServerInfo): IgniterMcpServer<TRouter, TCustomTools, TCustomPrompts, TCustomResources> {
    this._options.serverInfo = serverInfo;
    return new IgniterMcpServer<TRouter, TCustomTools, TCustomPrompts, TCustomResources>({
      ...this._options,
    });
  }

  withOAuth(oauth: McpOAuthConfig): IgniterMcpServer<TRouter, TCustomTools, TCustomPrompts, TCustomResources> {
    this._options.oauth = oauth;
    return new IgniterMcpServer<TRouter, TCustomTools, TCustomPrompts, TCustomResources>({
      ...this._options,
    });
  }

  addPrompt<
    TArgs extends ArgsRawShape,
    TPrompt extends McpPrompt<TArgs, TRouter['$Infer']['$context']>
  >(prompt: TPrompt): IgniterMcpServer<TRouter, TCustomTools, [...TCustomPrompts, TPrompt], TCustomResources> {
    if (!this._options.prompts) {
      this._options.prompts = { custom: [] };
    }
    if (!this._options.prompts.custom) {
      this._options.prompts.custom = [];
    }
    this._options.prompts.custom.push(prompt);
    return new IgniterMcpServer<TRouter, TCustomTools, [...TCustomPrompts, TPrompt], TCustomResources>({
      ...this._options,
    });
  }

  addTool<
    TArgs extends ArgsRawShape,
    TTool extends McpCustomTool<TArgs, TRouter['$Infer']['$context']>
  >(tool: McpCustomTool<TArgs, TRouter['$Infer']['$context']>): IgniterMcpServer<TRouter, [...TCustomTools, TTool], TCustomPrompts, TCustomResources> {
    if (!this._options.tools) {
      this._options.tools = { autoMap: true, custom: [] };
    }
    if (!this._options.tools.custom) {
      this._options.tools.custom = [];
    }
    this._options.tools.custom.push(tool);
    return new IgniterMcpServer<TRouter, [...TCustomTools, TTool], TCustomPrompts, TCustomResources>({
      ...this._options,
    });
  }

  addResource<TResource extends McpResource<TRouter['$Infer']['$context']>>(resource: TResource): IgniterMcpServer<TRouter, TCustomTools, TCustomPrompts, [...TCustomResources, TResource]> {
    if (!this._options.resources) {
      this._options.resources = { custom: [] };
    }
    if (!this._options.resources.custom) {
      this._options.resources.custom = [];
    }
    this._options.resources.custom.push(resource);
    return new IgniterMcpServer<TRouter, TCustomTools, TCustomPrompts, [...TCustomResources, TResource]>({
      ...this._options,
    });
  }

  withEvents(events: McpEventsOptions<TRouter['$Infer']['$context']>): IgniterMcpServer<TRouter, TCustomTools, TCustomPrompts, TCustomResources> {
    this._options.events = events;
    return new IgniterMcpServer<TRouter, TCustomTools, TCustomPrompts, TCustomResources>({
      ...this._options,
    });
  }

  withResponse(response: McpResponseOptions<TRouter['$Infer']['$context']>): IgniterMcpServer<TRouter, TCustomTools, TCustomPrompts, TCustomResources> {
    this._options.response = response;
    return new IgniterMcpServer<TRouter, TCustomTools, TCustomPrompts, TCustomResources>({
      ...this._options,
    });
  }

  withAdapter(adapter: McpAdapterSpecificOptions): IgniterMcpServer<TRouter, TCustomTools, TCustomPrompts, TCustomResources> {
    this._options.adapter = adapter;
    return new IgniterMcpServer<TRouter, TCustomTools, TCustomPrompts, TCustomResources>({
      ...this._options,
    });
  }

  build() {
    if (!this._options.router) {
      throw new Error("Router is required to build the MCP server.");
    }

    this._handler = createMcpAdapter<TRouter>(this._options);

    return {
      handler: this._handler.server,
      auth: this._handler.auth,
      $Infer: {
        $context: {} as TRouter['$Infer']['$context'],
        $tools: {} as TCustomTools,
        $prompts: {} as TCustomPrompts,
        $resources: {} as TCustomResources,
      }
    };
  }
}