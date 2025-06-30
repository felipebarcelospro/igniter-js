import type { IgniterAction, QueryActionCallerOptions, QueryActionCallerResult, MutationActionCallerOptions, MutationActionCallerResult, StreamActionCallerOptions, StreamActionCallerResult } from "../types";

/**
 * Server-side mock hooks that return consistent objects
 * to prevent destructuring errors during SSR
 */

/**
 * Creates a server-side mock useQuery hook
 */
export const createServerUseQuery = <
  TAction extends IgniterAction<any, any, any, any, any, any, any, any, any, any>,
>() => {
  return (
    options?: QueryActionCallerOptions<TAction>,
  ): QueryActionCallerResult<TAction> => {
    return {
      isLoading: false,
      loading: false,
      execute: async () => {
        throw new Error('useQuery is not available on the server side');
      },
      invalidate: () => {
        // No-op on server
      },
      data: options?.initialData || ({} as Awaited<TAction["$Infer"]["$Output"]>),
      error: null,
    } as QueryActionCallerResult<TAction>;
  };
};

/**
 * Creates a server-side mock useMutation hook
 */
export const createServerUseMutation = <
  TAction extends IgniterAction<any, any, any, any, any, any, any, any, any, any>,
>() => {
  return (
    options?: MutationActionCallerOptions<TAction>,
  ): MutationActionCallerResult<TAction> => {
    return {
      isLoading: false,
      loading: false,
      mutate: async () => {
        throw new Error('useMutation is not available on the server side');
      },
      data: {} as Awaited<TAction["$Infer"]["$Output"]>,
      error: null,
    } as unknown as MutationActionCallerResult<TAction>;
  };
};

/**
 * Creates a server-side mock useStream hook
 */
export const createServerUseStream = <
  TAction extends IgniterAction<any, any, any, any, any, any, any, any, any, any>,
>() => {
  return (
    options?: StreamActionCallerOptions<TAction>,
  ): StreamActionCallerResult<TAction> => {
    return {
      data: options?.initialData || ({} as Awaited<TAction["$Infer"]["$Output"]>),
      isConnected: false,
      isReconnecting: false,
      error: null,
      disconnect: () => {
        // No-op on server
      },
      reconnect: () => {
        // No-op on server
      },
    } as StreamActionCallerResult<TAction>;
  };
};

/**
 * Server-side mock useStream hook
 */
export function useServerStream<T = any>(): {
  data: T | null;
  isConnected: boolean;
} {
  return {
    data: null,
    isConnected: false,
  };
}