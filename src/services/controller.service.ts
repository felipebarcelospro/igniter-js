import type { IgniterAction, IgniterControllerConfig } from "../types";
import { isServer } from "../utils";

/**
 * Creates a controller configuration for the Igniter Framework.
 * Controllers group related actions together and provide a common path prefix.
 * 
 * @template TControllerContext - The type of the controller context
 * @template TControllerActions - Record of actions belonging to this controller
 * 
 * @param config - The controller configuration object
 * @returns A configured controller object
 * 
 * @example
 * ```typescript
 * const userController = igniter.controller({
 *   path: 'users',
 *   actions: {
 *     list: igniter.query({
 *       path: '',
 *       handler: (ctx) => ctx.response.success({ users: [] })
 *     }),
 *     create: igniter.mutation({
 *       path: '',
 *       method: 'POST',
 *       body: userSchema,
 *       handler: (ctx) => ctx.response.created({ id: 1 })
 *     })
 *   }
 * });
 * ```
 */
export const createIgniterController = <
  TControllerContext extends object, 
  TControllerActions extends Record<string, IgniterAction<TControllerContext, any, any, any, any, any, any, any, any>>
>(
  config: IgniterControllerConfig<TControllerContext, TControllerActions>
): IgniterControllerConfig<TControllerContext, TControllerActions> => {
  
  console.log('[Igniter] Creating controller:', {
    path: config.path,
    isServer,
    actionCount: Object.keys(config.actions).length
  });

  // 🔥 SERVER: Retorna controller completo
  if (isServer) {
    console.log('[Igniter] Running in server mode - returning full controller');
    return config;
  }
  
  // 🌐 CLIENT: Retorna proxy sem handlers
  console.log('[Igniter] Running in client mode - creating client-safe controller');
  return {
    ...config,
    actions: createClientActions(config.actions, config.path)
  } as IgniterControllerConfig<TControllerContext, TControllerActions>;
}

/**
 * Creates client-safe versions of actions (removes handlers, keeps types)
 */
function createClientActions<T extends Record<string, IgniterAction<any, any, any, any, any, any, any, any, any>>>(
  serverActions: T,
  basePath: string
): T {
  console.log('[Igniter] Creating client actions for path:', basePath);
  
  const clientActions = {} as T;
  
  Object.keys(serverActions).forEach(actionName => {
    console.log('[Igniter] Processing action:', actionName);
    
    const serverAction = serverActions[actionName];
    
    // ✅ Preserva metadata, remove apenas handler
    // @ts-expect-error - DON'T KNOW WHY THIS IS NEEDED
    clientActions[actionName] = {
      path: serverAction.path,
      description: serverAction.description,
      method: serverAction.method,
      body: serverAction.body,
      query: serverAction.query,
      params: serverAction.params,
      headers: serverAction.headers,
      $Caller: serverAction.$Caller,
      $Infer: serverAction.$Infer,
      use: serverAction.use,
      handler: createClientHandler(actionName, basePath, serverAction),
    } as T[typeof actionName];

    console.log('[Igniter] Created client action:', {
      actionName,
      path: serverAction.path,
      method: serverAction.method
    });
  });
  
  return clientActions;
}

/**
 * Creates a client-safe handler that prevents server code execution
 */
function createClientHandler<T extends IgniterAction<any, any, any, any, any, any, any, any, any>>(
  actionName: string, 
  basePath: string, 
  originalAction: T
): T['handler'] {
  return function clientHandler(ctx: any) {
    console.log('[Igniter] Client handler called:', {
      actionName,
      basePath,
      isServer
    });

    // 🚨 Previne execução do handler no cliente
    if (!isServer) {
      console.error('[Igniter] Attempted to execute client handler on server');
      throw new Error(
        `Action "${actionName}" handler should not be executed on client. ` +
        `Use createIgniterClient() for client-side API calls.`
      );
    }
    
    // ⚠️ Fallback para server (caso seja chamado incorretamente)
    console.log('[Igniter] Executing original handler as fallback');
    return originalAction.handler(ctx) as T['handler'];
  };
}