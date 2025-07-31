"use client";

import { useState, useCallback } from "react";
import type { RefetchFn } from "../types";
import { generateQueryKey } from "../utils/queryKey";

/**
 * Configuration options for the useQueryCacheManager hook.
 */
interface UseQueryCacheManagerOptions {
  /**
   * An optional logger instance for debugging.
   */
  logger?: {
    log: (...args: any[]) => void;
    error: (...args: any[]) => void;
  };
}

/**
 * The return type of the useQueryCacheManager hook.
 */
export interface UseQueryCacheManagerResult {
  listeners: Map<string, Set<RefetchFn>>;
  register: (key: string, refetch: RefetchFn) => () => void;
  unregister: (key: string, refetch: RefetchFn) => void;
  invalidate: (...args: any[]) => void;
}

/**
 * A hook to manage the client-side query cache. It encapsulates the logic for
 * registering, unregistering, and invalidating query listeners. This centralizes
 * the cache management logic, making the IgniterProvider cleaner and more focused.
 *
 * @param options - Configuration options for the cache manager.
 * @returns An object with functions and state to interact with the query cache.
 */
export const useQueryCacheManager = ({
  logger = { log: () => {}, error: () => {} },
}: UseQueryCacheManagerOptions = {}): UseQueryCacheManagerResult => {
  const [listeners] = useState(() => new Map<string, Set<RefetchFn>>());

  /**
   * Registers a refetch function for a specific query key.
   * Returns a cleanup function to automatically unregister.
   */
  const register = useCallback(
    (key: string, refetch: RefetchFn) => {
      logger.log(`Registering listener for key: ${key}`);
      const listenerSet = listeners.get(key) || new Set();
      listenerSet.add(refetch);
      listeners.set(key, listenerSet);

      // Return the unregister function for easy cleanup in useEffect hooks.
      return () => {
        logger.log(`Unregistering listener for key: ${key}`);
        const currentSet = listeners.get(key);
        if (currentSet) {
          currentSet.delete(refetch);
          if (currentSet.size === 0) {
            listeners.delete(key);
          }
        }
      };
    },
    [listeners, logger],
  );

  /**
   * Explicitly unregisters a refetch function.
   * Note: The function returned by `register` is the preferred cleanup method.
   */
  const unregister = useCallback(
    (key: string, refetch: RefetchFn) => {
      logger.log(`Unregistering listener for key: ${key}`);
      const listenerSet = listeners.get(key);
      if (listenerSet) {
        listenerSet.delete(refetch);
        if (listenerSet.size === 0) {
          listeners.delete(key);
        }
      }
    },
    [listeners, logger],
  );

  /**
   * Triggers a refetch for all registered queries matching the provided key(s).
   * Supports broad invalidation (e.g., 'users' invalidates 'users.getAll' and 'users.getById:123').
   */
  const invalidate = useCallback(
    (...args: any[]) => {
      const [firstArg, secondArg] = args;
      let keysToInvalidate: string[] = [];

      if (typeof firstArg === "string") {
        // Handles: invalidate('controller.action', input)
        const [controller, action] = firstArg.split(".");
        if (!controller || !action) {
          logger.error(
            `Invalid path format for invalidate: "${firstArg}". Expected "controller.action".`,
          );
          return;
        }
        keysToInvalidate.push(generateQueryKey(controller, action, secondArg));
      } else if (Array.isArray(firstArg)) {
        // Handles: invalidate(['path1', 'path2'])
        keysToInvalidate = firstArg
          .map((path: string) => {
            const [controller, action] = path.split(".");
            if (!controller || !action) {
              logger.error(
                `Invalid path format in array for invalidate: "${path}".`,
              );
              return `INVALID_PATH::${path}`;
            }
            return generateQueryKey(controller, action);
          })
          .filter((key) => !key.startsWith("INVALID_PATH"));
      }

      if (keysToInvalidate.length > 0) {
        logger.log(`Invalidating queries for keys:`, keysToInvalidate);
        keysToInvalidate.forEach((key) => {
          listeners.forEach((callbacks, registeredKey) => {
            if (registeredKey.startsWith(key)) {
              logger.log(
                `Matching key: ${registeredKey}. Triggering ${callbacks.size} callbacks.`,
              );
              callbacks.forEach((cb) => cb());
            }
          });
        });
      }
    },
    [listeners, logger],
  );

  return {
    listeners,
    register,
    unregister,
    invalidate,
  };
};
