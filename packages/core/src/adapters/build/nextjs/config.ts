import type { NextConfig } from 'next'
import type { IgniterBuildConfig } from '../../../cli/src/types'

/**
 * Configuration wrapper for Next.js with Igniter build-time extraction
 * 
 * @param nextConfig - Next.js configuration object
 * @param igniterConfig - Igniter build configuration
 * @returns Enhanced Next.js configuration with Igniter support
 * 
 * @example
 * ```typescript
 * // next.config.mjs
 * import { withIgniter } from '@igniter-js/core/adapters'
 * 
 * const nextConfig = {
 *   experimental: {
 *     serverComponentsExternalPackages: ['@igniter-js/core']
 *   }
 * }
 * 
 * export default withIgniter(nextConfig, {
 *   extractTypes: true,
 *   optimizeClientBundle: true,
 *   framework: 'nextjs'
 * })
 * ```
 */
export function withIgniter(
  nextConfig: NextConfig = {},
  igniterConfig: IgniterBuildConfig = {}
): NextConfig {
  const config: IgniterBuildConfig = {
    extractTypes: true,
    optimizeClientBundle: true,
    outputDir: 'generated',
    framework: 'nextjs',
    hotReload: true,
    controllerPatterns: ['**/*.controller.{ts,js}'],
    debug: false,
    ...igniterConfig
  }

  return {
    ...nextConfig,

    // Webpack configuration for build-time extraction
    webpack(webpackConfig: any, props: any) {
      const { dev, isServer } = props
      
      // Call user webpack config first
      if (nextConfig.webpack) {
        webpackConfig = nextConfig.webpack(webpackConfig, props)
      }

      // Add Igniter plugin only for client builds
      if (!isServer) {
        const IgniterWebpackPlugin = require('./webpack-plugin').IgniterWebpackPlugin
        
        webpackConfig.plugins = webpackConfig.plugins || []
        webpackConfig.plugins.push(
          new IgniterWebpackPlugin({
            ...config,
            isDev: dev,
            isProd: !dev,
            framework: 'nextjs'
          })
        )
      }

      // External server-only packages
      if (!isServer) {
        webpackConfig.externals = webpackConfig.externals || []
        webpackConfig.externals.push(
          // Database packages
          'prisma',
          '@prisma/client',
          'drizzle-orm',
          'mongoose',
          
          // Server-only packages
          'ioredis',
          'bullmq',
          'nodemailer',
          'aws-sdk',
          '@aws-sdk/client-s3',
          
          // Node.js built-ins that shouldn't be in client bundle
          'fs',
          'path',
          'crypto',
          'os'
        )
      }

      return webpackConfig
    },

    // Enhanced experimental features
    experimental: {
      ...nextConfig.experimental,
      // External packages that should stay on server
      serverComponentsExternalPackages: [
        ...(nextConfig.experimental?.serverComponentsExternalPackages || []),
        '@igniter-js/core/server',
        'ioredis',
        'bullmq'
      ]
    },

    // Environment variables for build-time detection
    env: {
      ...nextConfig.env,
      IGNITER_BUILD_EXTRACTION: config.extractTypes ? 'true' : 'false',
      IGNITER_OUTPUT_DIR: config.outputDir,
      IGNITER_DEBUG: config.debug ? 'true' : 'false'
    }
  }
}

/**
 * Default Next.js configuration for Igniter projects
 * 
 * @example
 * ```typescript
 * // next.config.mjs
 * import { defaultIgniterNextConfig } from '@igniter-js/core/adapters'
 * 
 * export default defaultIgniterNextConfig
 * ```
 */
export const defaultIgniterNextConfig = withIgniter({
  experimental: {
    serverComponentsExternalPackages: ['@igniter-js/core']
  },
  transpilePackages: ['@igniter-js/core']
}, {
  extractTypes: true,
  optimizeClientBundle: true,
  framework: 'nextjs'
}) 