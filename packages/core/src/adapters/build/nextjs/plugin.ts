import { withIgniter, defaultIgniterNextConfig } from './config'
import { IgniterWebpackPlugin } from './webpack-plugin'
import type { IgniterBuildConfig } from '../../../cli/src/types'

/**
 * Main plugin entry point for Next.js integration
 */
export {
  withIgniter,
  defaultIgniterNextConfig,
  IgniterWebpackPlugin
}

/**
 * Create a standalone Igniter build plugin for custom webpack configurations
 * 
 * @param config - Igniter build configuration
 * @returns Webpack plugin instance
 * 
 * @example
 * ```typescript
 * // custom webpack config
 * const { createIgniterPlugin } = require('@igniter-js/core/adapters')
 * 
 * module.exports = {
 *   plugins: [
 *     createIgniterPlugin({
 *       extractTypes: true,
 *       framework: 'nextjs'
 *     })
 *   ]
 * }
 * ```
 */
export function createIgniterPlugin(config: IgniterBuildConfig = {}) {
  return new IgniterWebpackPlugin(config)
}

/**
 * Quick setup for Next.js projects
 * 
 * @example
 * ```typescript
 * // next.config.mjs
 * import { quickSetup } from '@igniter-js/core/adapters'
 * 
 * export default quickSetup()
 * ```
 */
export function quickSetup(config: IgniterBuildConfig = {}) {
  return withIgniter({
    serverComponentsExternalPackages: ['@igniter-js/core']
  }, {
    extractTypes: true,
    optimizeClientBundle: true,
    framework: 'nextjs',
    ...config
  })
} 