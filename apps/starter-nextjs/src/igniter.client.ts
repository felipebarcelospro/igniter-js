/**
 * Generated by @igniter-js/cli
 *
 * WARNING: DO NOT EDIT THIS FILE MANUALLY
 *
 * This file was automatically generated from your Igniter router.
 * Any changes made to this file will be overwritten when the CLI regenerates it.
 *
 * To modify the client API, update your controller files instead.
 *
 * Generated: 2025-07-07T20:55:46.724Z
 * Framework: nextjs
 * Output: src
 */

import { createIgniterClient, useIgniterQueryClient } from '@igniter-js/core/client'
import type { AppRouterType } from './igniter.router'

/**
  * Type-safe API client generated from your Igniter router
  *
  * Usage in Server Components:
  * const users = await api.users.list.query()
  *
  * Usage in Client Components:
  * const { data } = api.users.list.useQuery()
  */
export const api = createIgniterClient<AppRouterType>({
  baseURL: 'http://localhost:3000',
  basePath: '/api/v1/',
  router: () => {
    if (typeof window === 'undefined') {
      return require('./igniter.router').AppRouter
    }

    return require('./igniter.schema').AppRouterSchema
  },
})

/**
  * Type-safe API client generated from your Igniter router
  *
  * Usage in Server Components:
  * const users = await api.users.list.query()
  *
  * Usage in Client Components:
  * const { data } = api.users.list.useQuery()
  */
export type ApiClient = typeof api

/**
  * Type-safe query client generated from your Igniter router
  *
  * Usage in Client Components:
  * const { invalidate } = useQueryClient()
  */
export const useQueryClient = useIgniterQueryClient<AppRouterType>;
