/**
 * Tests for IgniterCallerSchema builder.
 */

import { describe, expect, expectTypeOf, it } from 'vitest'
import { z } from 'zod'
import { IgniterCallerSchema } from './schema.builder'

const UserSchema = z.object({
  id: z.string(),
  name: z.string(),
})

const CreateUserSchema = z.object({
  name: z.string(),
})

const ErrorSchema = z.object({
  message: z.string(),
})

describe('IgniterCallerSchema', () => {
  it('builds schemas with registry and path helpers', () => {
    const userListSchema = z.array(UserSchema)

    const schemas = IgniterCallerSchema.create()
      .schema('User', UserSchema)
      .schema('Error', ErrorSchema)
      .path('/users', (path) =>
        path.get({
          responses: {
            200: userListSchema,
            401: path.ref('Error').schema,
          },
        }),
      )
      .build()

    expect(schemas.get.path('/users')).toBeDefined()
    expect(schemas.get.response('/users', 'GET', 200)).toBe(userListSchema)
    expect(schemas.get.schema('User')).toBe(UserSchema)
  })

  it('attaches $Infer helpers for type inference', () => {
    const schemas = IgniterCallerSchema.create()
      .schema('User', UserSchema)
      .schema('CreateUser', CreateUserSchema)
      .schema('Error', ErrorSchema)
      .path('/users', (path) =>
        path
          .get({
            responses: {
              200: path.ref('User').array(),
              401: path.ref('Error').schema,
            },
          })
          .post({
            request: path.ref('CreateUser').schema,
            responses: {
              201: path.ref('User').schema,
              400: path.ref('Error').schema,
            },
          }),
      )
      .build()

    type UsersGetResponse = ReturnType<
      typeof schemas.$Infer.Response<'/users', 'GET', 200>
    >
    type UsersPostRequest = ReturnType<
      typeof schemas.$Infer.Request<'/users', 'POST'>
    >
    type UsersPostResponses = ReturnType<
      typeof schemas.$Infer.Responses<'/users', 'POST'>
    >

    expectTypeOf<UsersGetResponse>().toEqualTypeOf<
      Array<{ id: string; name: string }>
    >()
    expectTypeOf<UsersPostRequest>().toEqualTypeOf<{ name: string }>()
    expectTypeOf<UsersPostResponses>().toEqualTypeOf<{
      201: { id: string; name: string }
      400: { message: string }
    }>()
  })

  it('throws on duplicate registry keys', () => {
    expect(() =>
      IgniterCallerSchema.create()
        .schema('User', UserSchema)
        .schema('User', UserSchema),
    ).toThrowError(/already defined/i)
  })

  it('throws on duplicate methods within a path', () => {
    expect(() =>
      IgniterCallerSchema.create().path('/users', (path) =>
        path
          .get({ responses: { 200: UserSchema } })
          .get({ responses: { 200: UserSchema } }),
      ),
    ).toThrowError(/already defined/i)
  })

  it('throws on duplicate path + method registration', () => {
    expect(() =>
      IgniterCallerSchema.create()
        .path('/users', (path) => path.get({ responses: { 200: UserSchema } }))
        .path('/users', (path) => path.get({ responses: { 200: UserSchema } })),
    ).toThrowError(/already defined/i)
  })

  it('throws on invalid path', () => {
    expect(() =>
      IgniterCallerSchema.create().path('users', (path) =>
        path.get({ responses: { 200: UserSchema } }),
      ),
    ).toThrowError(/must start/i)
  })
})
