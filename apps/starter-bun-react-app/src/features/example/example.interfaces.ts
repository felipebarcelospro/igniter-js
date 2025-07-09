/**
 * Example feature interfaces and types
 * @description Define your feature's types here
 */

export interface ExampleUser {
  id: string
  name: string
  email: string
  createdAt: Date
  updatedAt: Date
}

export interface ExampleCreateUserInput {
  name: string
  email: string
}

export interface ExampleCacheItem {
  message: string
  timestamp: string
}

export interface ExampleJobPayload {
  message: string
  timestamp: string
}
