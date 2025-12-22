import React from 'react'
import type { StandardSchemaV1 } from '@igniter-js/core'
import { describe, expect, it } from 'vitest'
import { IgniterMailError } from '../errors/mail.error'
import { IgniterMailTemplateBuilder } from './template.builder'

describe('IgniterMailTemplateBuilder', () => {
  const schema: StandardSchemaV1 = {
    '~standard': {
      vendor: '@igniter-js/mail',
      version: 1,
      validate: async (value: unknown) => ({ value }),
    },
  }

  it('builds a template when fully configured', () => {
    const template = IgniterMailTemplateBuilder.create()
      .withSubject('Welcome')
      .withSchema(schema)
      .withRender(() => React.createElement('div', null, 'hello'))
      .build()

    expect(template.subject).toBe('Welcome')
    expect(template.schema).toBe(schema)
    expect(typeof template.render).toBe('function')
  })

  it('throws when subject is missing', () => {
    expect(() =>
      IgniterMailTemplateBuilder.create()
        .withSchema(schema)
        .withRender(() => React.createElement('div', null, 'hello'))
        .build(),
    ).toThrow(IgniterMailError)
  })

  it('throws when schema is missing', () => {
    expect(() =>
      IgniterMailTemplateBuilder.create()
        .withSubject('Welcome')
        .withRender(() => React.createElement('div', null, 'hello'))
        .build(),
    ).toThrow(IgniterMailError)
  })

  it('throws when render is missing', () => {
    expect(() =>
      IgniterMailTemplateBuilder.create()
        .withSubject('Welcome')
        .withSchema(schema)
        .build(),
    ).toThrow(IgniterMailError)
  })
})
