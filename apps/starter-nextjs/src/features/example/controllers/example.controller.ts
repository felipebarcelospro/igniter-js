import { igniter } from '@/igniter'
import { z } from 'zod'

export const exampleController = igniter.controller({
  name: 'example',
  path: '/example',
  actions: {
    hello: igniter.query({
      path: '/hello',
      handler: async ({ response }) => {
        return response.success({ message: 'Hello from example!' })
      },
    }),
  },
})
