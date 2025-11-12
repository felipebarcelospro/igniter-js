/**
 * Discord HTTP Client
 * 
 * Pre-configured HTTP client for making requests to the Discord API.
 * Similar to axios.create() - comes with token and base URL pre-configured.
 */

import type { BotLogger } from '../../types/bot.types'
import type { AdapterClient } from '../../types/adapter'

const DISCORD_API_BASE = 'https://discord.com/api/v10'

/**
 * Creates a pre-configured HTTP client for the Discord API.
 * Similar to axios.create() - comes with token and base URL pre-configured.
 * 
 * @param token - Discord bot token
 * @param logger - Optional logger for debug/errors
 * @returns Pre-configured HTTP client
 * 
 * @example
 * ```typescript
 * const adapter = discord({ token: '123' })
 * const client = adapter.client
 * 
 * // Make GET request
 * const me = await client.get('/users/@me')
 * 
 * // Make POST request with body
 * const message = await client.post('/channels/123/messages', {
 *   content: 'Hello'
 * })
 * 
 * // Custom request
 * const result = await client.request({
 *   method: 'POST',
 *   endpoint: '/channels/123/messages',
 *   body: { content: 'Hello' }
 * })
 * ```
 */
export function createDiscordClient(
  token: string,
  logger?: BotLogger
): AdapterClient<any> {
  const baseURL = DISCORD_API_BASE
  
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
      'Authorization': `Bot ${token}`,
      'Content-Type': 'application/json',
      'User-Agent': 'DiscordBot (https://igniterjs.com, 1.0)',
      ...headers,
    }
    
    // Prepare request options
    const fetchOptions: RequestInit = {
      method,
      headers: requestHeaders,
    }
    
    // Add body if not GET
    if (method !== 'GET' && body) {
      // Check if FormData is needed (for file uploads)
      const needsFormData = body.file || body.files
      
      if (needsFormData) {
        const formData = new FormData()
        
        // Handle files
        if (body.files && Array.isArray(body.files)) {
          body.files.forEach((file: File, index: number) => {
            formData.append(`files[${index}]`, file)
          })
        } else if (body.file) {
          formData.append('file', body.file)
        }
        
        // Add JSON payload if provided
        if (body.payload_json) {
          formData.append('payload_json', JSON.stringify(body.payload_json))
        } else {
          // Add other fields as JSON
          const jsonPayload: Record<string, any> = { ...body }
          delete jsonPayload.file
          delete jsonPayload.files
          if (Object.keys(jsonPayload).length > 0) {
            formData.append('payload_json', JSON.stringify(jsonPayload))
          }
        }
        
        fetchOptions.body = formData
        delete requestHeaders['Content-Type'] // Browser will set with boundary
      } else {
        fetchOptions.body = JSON.stringify(body)
      }
    }
    
    try {
      logger?.debug?.('[discord-client] request', { method, endpoint })
      
      const response = await fetch(url, fetchOptions)
      
      // Handle empty responses
      const contentType = response.headers.get('content-type')
      let result: any
      
      if (contentType?.includes('application/json')) {
        result = await response.json()
      } else {
        const text = await response.text()
        result = text ? { data: text } : {}
      }
      
      if (!response.ok) {
        logger?.error?.('[discord-client] request failed', { 
          endpoint, 
          status: response.status,
          statusText: response.statusText,
          error: result.message || result
        })
        throw new Error(`Discord API error: ${result.message || response.statusText} (${response.status})`)
      }
      
      logger?.debug?.('[discord-client] request success', { endpoint })
      return result
    } catch (error) {
      logger?.error?.('[discord-client] request error', { endpoint, error })
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

