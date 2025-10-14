/**
 * @igniter-js/bot - Public Types Barrel
 *
 * This barrel file re‑exports all public type definitions for consumers.
 *
 * Design Goals:
 *  - Keep a single stable import path for all types:
 *       import type { BotContext, BotCommand, BotEvent } from '@igniter-js/bot/types'
 *  - Avoid leaking internal / future experimental types unintentionally.
 *  - Make it easy to evolve by adding explicit re-exports if we split files later.
 *
 * NOTE:
 *  If new type definition files are introduced under this directory,
 *  prefer explicit re-exports instead of a wildcard on the directory root
 *  to maintain a clean, predictable public surface.
 */

export * from './bot.types'

/**
 * Versioned typing note:
 *  The exported surface here is considered semver‑governed.
 *  Removing or changing the meaning of an existing exported type
 *  requires at least a minor (if additive / backwards compatible)
 *  or major (if breaking) version bump once out of alpha.
 */
