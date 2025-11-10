/**
 * Telegram HTTP Client
 * 
 * Pre-configured HTTP client for making requests to the Telegram API.
 * Similar to axios.create() - comes with token and base URL pre-configured.
 */

import type { BotLogger } from '../../types/bot.types'
import type { AdapterClient } from '../../types/adapter'
import { getServiceURL } from './telegram.helpers'

/**
 * Creates a pre-configured HTTP client for the Telegram API.
 * Similar to axios.create() - comes with token and base URL pre-configured.
 * 
 * @param token - Telegram bot token
 * @param logger - Optional logger for debug/errors
 * @returns Pre-configured HTTP client
 * 
 * @example
 * ```typescript
 * const adapter = telegram({ token: '123' })
 * const client = adapter.client
 * 
 * // Make GET request
 * const me = await client.get('/getMe')
 * 
 * // Make POST request with body
 * const message = await client.post('/sendMessage', {
 *   chat_id: '123',
 *   text: 'Hello'
 * })
 * 
 * // Custom request
 * const result = await client.request({
 *   method: 'POST',
 *   endpoint: '/sendPhoto',
 *   body: { chat_id: '123', photo: '...' }
 * })
 * ```
 */
export function createTelegramClient(
  token: string,
  logger?: BotLogger
): AdapterClient<any> {
  const baseURL = getServiceURL(token, '')
  
  async function request<T = any>(options: {
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'
    endpoint: string
    body?: Record<string, any>
    params?: Record<string, any>
    headers?: Record<string, string>
  }): Promise<T> {
    const { method, endpoint, body, params, headers = {} } = options
    
    // Build URL with query params if GET
    let url = `${baseURL}${endpoint}`
    if (method === 'GET' && params) {
      const searchParams = new URLSearchParams()
      for (const [key, value] of Object.entries(params)) {
        searchParams.append(key, String(value))
      }
      url += `?${searchParams.toString()}`
    }
    
    // Prepare headers
    const requestHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      ...headers,
    }
    
    // Prepare request options
    const fetchOptions: RequestInit = {
      method,
      headers: requestHeaders,
    }
    
    // Add body if not GET
    if (method !== 'GET' && body) {
      // Check if FormData is needed (for uploads)
      const needsFormData = body.photo || body.video || body.audio || body.document || body.sticker || body.voice
      
      if (needsFormData) {
        const formData = new FormData()
        for (const [key, value] of Object.entries(body)) {
          if (value instanceof File || value instanceof Blob) {
            formData.append(key, value)
          } else if (value !== undefined && value !== null) {
            formData.append(key, String(value))
          }
        }
        fetchOptions.body = formData
        delete requestHeaders['Content-Type'] // Browser will set with boundary
      } else {
        fetchOptions.body = JSON.stringify(body)
      }
    }
    
    try {
      logger?.debug?.('[telegram-client] request', { method, endpoint })
      
      const response = await fetch(url, fetchOptions)
      const result = await response.json()
      
      if (!response.ok || !result.ok) {
        logger?.error?.('[telegram-client] request failed', { 
          endpoint, 
          status: response.status,
          error: result.description 
        })
        throw new Error(`Telegram API error: ${result.description || response.statusText}`)
      }
      
      logger?.debug?.('[telegram-client] request success', { endpoint })
      return result.result as T
    } catch (error) {
      logger?.error?.('[telegram-client] request error', { endpoint, error })
      throw error
    }
  }
  
  return {
    async get<T = any>(endpoint: string, params?: Record<string, any>): Promise<T> {
      return request<T>({ method: 'GET', endpoint, params })
    },
    
    async post<T = any>(endpoint: string, body?: Record<string, any>): Promise<T> {
      return request<T>({ method: 'POST', endpoint, body })
    },
    
    async put<T = any>(endpoint: string, body?: Record<string, any>): Promise<T> {
      return request<T>({ method: 'PUT', endpoint, body })
    },
    
    async patch<T = any>(endpoint: string, body?: Record<string, any>): Promise<T> {
      return request<T>({ method: 'PATCH', endpoint, body })
    },
    
    async delete<T = any>(endpoint: string, params?: Record<string, any>): Promise<T> {
      return request<T>({ method: 'DELETE', endpoint, params })
    },
    
    request,
  }
}

