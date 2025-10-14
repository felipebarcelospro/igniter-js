/**
 * @igniter-js/bot - Adapters Barrel
 *
 * Re-exports first-party adapter factories.
 *
 * Design goals:
 *  - Single, central place to expose official adapters.
 *  - Side‑effect free (pure exports) to preserve tree-shaking.
 *  - Predictable import ergonomics:
 *
 *      import { telegram, whatsapp } from '@igniter-js/bot/adapters'
 *      // or via root:
 *      import { telegram } from '@igniter-js/bot'
 *
 *  - Clear location to register future adapters (e.g. discord, slack).
 *
 * Adapter Authoring Guidelines:
 *  1. Each adapter lives in its own subdirectory: ./<name>/
 *  2. Each adapter subdirectory must export a factory created with `Bot.adapter(...)`
 *  3. Keep platform-specific helpers & schemas colocated inside the adapter folder.
 *  4. Avoid performing network I/O at module top-level (do it inside init()).
 *  5. Return only parsed context objects (never raw platform payloads) from `handle`.
 */

export * from './telegram'
export * from './whatsapp'

/**
 * Namespace-style export for optional ergonomic access:
 *
 * Example:
 *   import { builtinAdapters } from '@igniter-js/bot/adapters'
 *   const bot = Bot.create({
 *     id: 'demo',
 *     name: 'DemoBot',
 *     adapters: {
 *       telegram: builtinAdapters.telegram({ token: '...' }),
 *       whatsapp: builtinAdapters.whatsapp({ token: '...', phone: '...' })
 *     }
 *   })
 */
import { telegram } from './telegram'
import { whatsapp } from './whatsapp'

export const builtinAdapters = {
  telegram,
  whatsapp,
} as const

/**
 * Type helper: derives the literal keys of builtin adapters.
 * Useful if you want to constrain configuration objects to known adapters:
 *
 *   type SupportedBuiltinAdapter = BuiltinAdapterName
 */
export type BuiltinAdapterName = keyof typeof builtinAdapters

/**
 * INTERNAL ROADMAP NOTE (remove when stable):
 *  - Future planned adapters: discord, slack, matrix.
 *  - Consider dynamic registration pattern if ecosystem expands significantly.
 */
