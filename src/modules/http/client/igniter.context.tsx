'use client'

import type { IgniterRouter } from '../types';
import type { IgniterContextType, RefetchFn } from '../types/client.interface';

import { createContext, useContext, useState, useCallback, useMemo, useEffect, type PropsWithChildren } from 'react';
import { IgniterError } from '../../../core/error';


/**
 * Igniter context provider type
 */
const IgniterContext = createContext<IgniterContextType<any> | undefined>(undefined);


/**
 * Provider component for the Igniter context, managing query invalidation and refetching.
 * 
 * @component
 * @param {PropsWithChildren} props - The component props
 * @param {React.ReactNode} props.children - Child components to be wrapped by the provider
 * 
 * @example
 * ```tsx
 * <IgniterProvider>
 *   <App />
 * </IgniterProvider>
 * ```
 * 
 * @remarks
 * The IgniterProvider manages a collection of query listeners and provides methods to:
 * - Register refetch functions for specific query keys
 * - Unregister refetch functions
 * - Invalidate queries by key(s)
 * 
 * @internal State
 * - listeners: Map<string, Set<RefetchFn>> - Stores refetch functions indexed by query keys
 * 
 * @public Methods
 * - register(key: string, refetch: RefetchFn): () => void
 *   Registers a refetch function for a specific query key and returns cleanup function
 * 
 * - unregister(key: string, refetch: RefetchFn): void
 *   Removes a refetch function registration for a specific query key
 * 
 * - invalidate(keys: string | string[]): void
 *   Triggers refetch for all registered queries matching the provided key(s)
 * 
 * @returns {JSX.Element} Provider component wrapping its children with Igniter context
 */
export function IgniterProvider({ children }: PropsWithChildren) {
  // Utilizando Map para armazenar os listeners por queryKey
  const [listeners] = useState(() => new Map<string, Set<RefetchFn>>());
  
  // Registra uma função de refetch para uma queryKey específica
  const register = useCallback((key: string, refetch: RefetchFn) => {
    console.log(`[Igniter] Registering refetch function for key: ${key}`);
    
    const current = listeners.get(key) || new Set();
    current.add(refetch);
    listeners.set(key, current);
    
    console.log(`[Igniter] Current listeners for ${key}:`, current.size);
    
    return () => {
      const listenerSet = listeners.get(key);
      if (listenerSet) {
        listenerSet.delete(refetch);
        if (listenerSet.size === 0) {
          listeners.delete(key);
        }
        console.log(`[Igniter] Unregistered refetch function for key: ${key}`);
      }
    };
  }, [listeners]);

  // Remove o registro de uma função de refetch
  const unregister = useCallback((key: string, refetch: RefetchFn) => {
    console.log(`[Igniter] Unregistering refetch function for key: ${key}`);
    
    const current = listeners.get(key);
    if (current) {
      current.delete(refetch);
      if (current.size === 0) {
        listeners.delete(key);
      }
      console.log(`[Igniter] Current listeners for ${key}:`, current.size);
    }
  }, [listeners]);

  // Trigger the refetch for all registered queries with the specified queryKey
  const invalidate = useCallback((keys: string | string[]) => {
    const keysArray = Array.isArray(keys) ? keys : [keys];

    keysArray.forEach(key => {
      console.log(`[Igniter] Invalidating query for key: ${key}`);
      const registered = listeners.get(key);
      
      if (registered) {
        console.log(`[Igniter] Found ${registered.size} listeners for key: ${key}`);
        registered.forEach(refetch => {
          try {
            console.log(`[Igniter] Executing refetch for key: ${key}`);
            refetch();
          } catch (err) {
            console.error(`[Igniter] Error refetching query for key '${key}':`, err);
          }
        });
      } else {
        console.log(`[Igniter] No listeners found for key: ${key}`);
      }
    });
  }, [listeners]);

  // Memoizando o valor do contexto para evitar re-renders desnecessários
  const contextValue = useMemo(() => ({ 
    register, 
    unregister, 
    invalidate,
    listeners
  }), [register, unregister, invalidate, listeners]);

  useEffect(() => {
    console.log('[Igniter] Provider mounted');
    console.log('[Igniter] Current listeners:', Array.from(listeners.entries()).map(([key, set]) => ({
      key,
      listeners: set.size
    })));
    
    return () => {
      console.log('[Igniter] Provider unmounted');
    };
  }, [listeners]);

  return (
    <IgniterContext.Provider value={contextValue}>
      {children}
    </IgniterContext.Provider>
  );
}

/**
 * Hook to access the Igniter context, providing access to query registration and invalidation methods.
 *
 * @returns {IgniterContextType} Igniter context object
 *
 * @throws {IgniterError} Throws an error if the hook is used outside of an IgniterProvider
 */
export const useIgniterQueryClient = <TRouter extends IgniterRouter<any, any>>() => {
  const context = useContext(IgniterContext) as IgniterContextType<TRouter> | undefined;

  if (!context) {
    throw new IgniterError({
      code: 'NO_IGNITER_CONTEXT',
      message: 'useIgniterQueryClient must be used within an IgniterProvider'
    });
  }

  return context;
};