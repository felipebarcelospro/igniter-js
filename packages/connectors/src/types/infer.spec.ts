/**
 * @fileoverview Type inference tests for IgniterConnector
 * @module @igniter-js/connectors/types/infer.spec
 */

import { describe, it, expectTypeOf } from 'vitest'
import { z } from 'zod'
import { IgniterConnectorManager } from '../builders/main.builder'
import { IgniterConnector } from '../builders/connector.builder'
import type { IgniterConnectorMockAdapter } from '../adapters/mock.adapter'
import type {
  $Infer,
  $InferScoped,
  $InferConnectorKey,
  $InferScopeKey,
  $InferConfig,
  $InferActionKeys,
} from './infer'

// Setup types
const telegram = IgniterConnector.create()
  .withConfig(z.object({ botToken: z.string() }))
  .addAction('sendMessage', {
    input: z.object({ text: z.string() }),
    output: z.object({ id: z.number() }),
    handler: async () => ({ id: 1 }),
  })
  .build()

const discord = IgniterConnector.create()
  .withConfig(z.object({ webhookUrl: z.string() }))
  .addAction('sendEmbed', {
    input: z.object({ title: z.string() }),
    handler: async () => ({}),
  })
  .build()

const manager = IgniterConnectorManager.create()
  .withDatabase({} as IgniterConnectorMockAdapter)
  .addScope('organization', { required: true })
  .addScope('user', { required: false })
  .addConnector('telegram', telegram)
  .addConnector('discord', discord)
  .build()

describe('Type Inference', () => {
  it('should infer connector keys', () => {
    type Keys = $InferConnectorKey<typeof manager>
    expectTypeOf<Keys>().toEqualTypeOf<'telegram' | 'discord'>()
  })

  it('should infer scope keys', () => {
    type Scopes = $InferScopeKey<typeof manager>
    expectTypeOf<Scopes>().toEqualTypeOf<'organization' | 'user'>()
  })

  it('should infer config types', () => {
    type TelegramConfig = $InferConfig<typeof manager, 'telegram'>
    expectTypeOf<TelegramConfig>().toEqualTypeOf<{ botToken: string }>()

    type DiscordConfig = $InferConfig<typeof manager, 'discord'>
    expectTypeOf<DiscordConfig>().toEqualTypeOf<{ webhookUrl: string }>()
  })

  it('should infer action keys', () => {
    type TelegramActions = $InferActionKeys<typeof manager, 'telegram'>
    expectTypeOf<TelegramActions>().toEqualTypeOf<'sendMessage'>()
  })

  it('should infer full type map', () => {
    type Types = $Infer<typeof manager>
    
    expectTypeOf<Types['ConnectorKey']>().toEqualTypeOf<'telegram' | 'discord'>()
    expectTypeOf<Types['ScopeKey']>().toEqualTypeOf<'organization' | 'user'>()
    
    expectTypeOf<Types['ActionInput']['telegram']['sendMessage']>().toEqualTypeOf<{ text: string }>()
    expectTypeOf<Types['ActionOutput']['telegram']['sendMessage']>().toEqualTypeOf<{ id: number }>()
  })

  it('should infer scoped instance', () => {
    type Scoped = $InferScoped<typeof manager>
    
    // Verify scoped methods are typed
    expectTypeOf<Scoped['connect']>().toBeFunction()
    expectTypeOf<Scoped['action']>().toBeFunction()
  })
})
