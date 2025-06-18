'use client'

import type { IgniterAction, IgniterRouter, ClientCallerFetcher, ClientCallerOptions, MutationActionCallerOptions, MutationActionCallerResult, QueryActionCallerOptions, QueryActionCallerResult, IgniterStoreAdapter, IgniterLogger } from '../types';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useIgniterQueryClient } from './igniter.context';
import { ClientCache } from '../utils/cache';

/**
 * Creates a useQueryClient hook for a specific router
 * @returns A React hook for querying data
*/
export const createUseQueryClient = <TRouter extends IgniterRouter<any, any>>() => {
  return () => {
    const { invalidate } = useIgniterQueryClient<TRouter>();
    return { invalidate }
  }
}

/**
 * Creates a useQuery hook for a specific action
 * @param serverCaller The server action caller function
 * @returns A React hook for querying data
 */
export const createUseQuery = <TAction extends IgniterAction<any, any, any, any, any, any, any, any, any>>(
  serverCaller: ClientCallerFetcher<TAction>
) => {
  return (options?: QueryActionCallerOptions<TAction>): QueryActionCallerResult<TAction> => {
    const { register, unregister } = useIgniterQueryClient();
    
    const [loading, setLoading] = useState(false);
    const [data, setData] = useState<Awaited<TAction['$Infer']['$Output']> | null>(options?.data || null);
    
    const optionsRef = useRef(options);
    optionsRef.current = options;
        
    const actionPath = useMemo(() => (serverCaller as any).__actionPath, []);
    const regKey = useMemo(() => actionPath, [actionPath]);
    
    const getCacheKey = useCallback((params?: ClientCallerOptions<TAction>) => {
      return `${actionPath}:${JSON.stringify(params || {})}`;
    }, [actionPath]);
    
    const execute = useCallback(async (params?: ClientCallerOptions<TAction>) => {
      try {
        console.log(`[Igniter] Executing query for key: ${regKey}`, { params });
        setLoading(true);
        optionsRef.current?.onLoading?.(true);
        
        const cacheKey = getCacheKey(params);
        
        if (optionsRef.current?.staleTime) {
          const cachedData = ClientCache.get(cacheKey, optionsRef.current.staleTime);
          if (cachedData) {
            console.log(`[Igniter] Using cached data for key: ${regKey}`);
            setData(cachedData);
            optionsRef.current?.onRequest?.(cachedData);
            return cachedData;
          }
        }
        
        console.log(`[Igniter] Fetching fresh data for key: ${regKey}`);
        const result = await serverCaller(params || options?.params);
        
        setData(result);
        if (optionsRef.current?.staleTime) {
          ClientCache.set(cacheKey, result);
          console.log(`[Igniter] Cached data for key: ${regKey}`);
        }
        
        optionsRef.current?.onRequest?.(result);
        return result;
      } catch (error) {
        console.error(`[Igniter] Query error for key: ${regKey}:`, error);
        throw error;
      } finally {
        setLoading(false);
        optionsRef.current?.onLoading?.(false);
      }
    }, [getCacheKey, regKey]);
    
    useEffect(() => {
      console.log(`[Igniter] Registering query for key: ${regKey}`);
      register(regKey, execute);
      return () => {
        console.log(`[Igniter] Unregistering query for key: ${regKey}`);
        unregister(regKey, execute);
      };
    }, [regKey, register, unregister, execute]);
    
    // Set up automatic refetching
    useEffect(() => {
      if (options?.refetchInterval) {
        const interval = setInterval(() => {
          if (!options.refetchIntervalInBackground && document.hidden) {
            return;
          }
          // Using empty params, assuming that GET requests can work without body
          execute(options?.params as ClientCallerOptions<TAction>);
        }, options.refetchInterval);
        
        return () => clearInterval(interval);
      }
    }, [execute, options?.refetchInterval, options?.refetchIntervalInBackground]);
    
    // Set up refetch on window focus
    useEffect(() => {
      if (options?.refetchOnWindowFocus !== false) {
        const handleFocus = () => {
          execute(options?.params as ClientCallerOptions<TAction>);
        };
        
        window.addEventListener('focus', handleFocus);
        return () => window.removeEventListener('focus', handleFocus);
      }
    }, [execute, options?.refetchOnWindowFocus]);
    
    // Set up refetch on reconnect
    useEffect(() => {
      if (options?.refetchOnReconnect !== false) {
        const handleOnline = () => {
          execute(options?.params as ClientCallerOptions<TAction>);
        };
        
        window.addEventListener('online', handleOnline);
        return () => window.removeEventListener('online', handleOnline);
      }
    }, [execute, options?.refetchOnReconnect]);
    
    // Initial fetch
    useEffect(() => {
      if (options?.refetchOnMount !== false) {
        execute(options?.params as ClientCallerOptions<TAction>);
      }
    }, [execute, options?.refetchOnMount]);
    
    // @ts-expect-error - data is not typed
    return { loading, execute, invalidate: () => invalidateQuery(regKey), ...data } as QueryActionCallerResult<TAction>;
  };
};

/**
 * Creates a useMutation hook for a specific action
 * @param serverCaller The server action caller function
 * @returns A React hook for mutating data
 */
export const createUseMutation = <TAction extends IgniterAction<any, any, any, any, any, any, any, any, any>>(
  serverCaller: ClientCallerFetcher<TAction>
) => {
  return (options?: MutationActionCallerOptions<TAction>): MutationActionCallerResult<TAction> => {
    const [loading, setLoading] = useState(false);
    const [data, setData] = useState<Awaited<TAction['$Infer']['$Output']>>(
      {} as Awaited<TAction['$Infer']['$Output']>
    );
    
    // Keep track of the latest options for use in mutate
    const optionsRef = useRef(options);
    optionsRef.current = options;
    
    const mutate = useCallback(async (params: ClientCallerOptions<TAction>) => {
      try {
        setLoading(true);
        optionsRef.current?.onLoading?.(true);
        
        // Merge with default values if provided
        const mergedParams = optionsRef.current?.defaultValues 
          ? { ...optionsRef.current.defaultValues, ...params }
          : params;
          
        const result = await serverCaller(mergedParams);
        
        setData(result);
        optionsRef.current?.onRequest?.(result);
        
        return result;
      } catch (error) {
        console.error('Mutation error:', error);
        throw error;
      } finally {
        setLoading(false);
        optionsRef.current?.onLoading?.(false);
      }
    }, []);
    
    return {
      loading,
      mutate,
      ...data
    } as MutationActionCallerResult<TAction>;
  };
};