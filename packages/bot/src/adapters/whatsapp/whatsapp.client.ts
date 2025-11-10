/**
 * WhatsApp HTTP Client
 * 
 * Pre-configured HTTP client for making requests to the WhatsApp Cloud API.
 * Similar to axios.create() - comes with token and base URL pre-configured.
 */

import type { BotLogger } from '../../types/bot.types'
import type { AdapterClient } from '../../types/adapter'

/**
 * Creates a pre-configured HTTP client for the WhatsApp Cloud API
 * Similar to axios.create() - comes with token and base URL pre-configured
 * 
 * @param phoneNumberId - WhatsApp phone number ID
 * @param token - WhatsApp Cloud API access token
 * @param logger - Optional logger for debug/errors
 * @returns Pre-configured HTTP client
 * 
 * @example
 * ```typescript
 * const adapter = whatsapp({ token: '123', phone: '456' })
 * const client = adapter.client
 * 
 * // Make GET request
 * const templates = await client.get('/message_templates')
 * 
 * // Make POST request with body
 * const message = await client.post('/messages', {
 *   messaging_product: 'whatsapp',
 *   to: '123',
 *   type: 'text',
 *   text: { body: 'Hello' }
 * })
 * ```
 */
export function createWhatsAppClient(
  phoneNumberId: string,
  token: string,
  logger?: BotLogger
): AdapterClient<any> {
  const baseURL = `https://graph.facebook.com/v22.0/${phoneNumberId}`
  
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
      'Authorization': `Bearer ${token}`,
      ...headers,
    }
    
    // Prepare request options
    const fetchOptions: RequestInit = {
      method,
      headers: requestHeaders,
    }
    
    // Add body if not GET
    if (method !== 'GET' && body) {
      fetchOptions.body = JSON.stringify(body)
    }
    
    try {
      logger?.debug?.('[whatsapp-client] request', { method, endpoint })
      
      const response = await fetch(url, fetchOptions)
      const result = await response.json()
      
      if (!response.ok || result.error) {
        logger?.error?.('[whatsapp-client] request failed', { 
          endpoint, 
          status: response.status,
          error: result.error 
        })
        throw new Error(`WhatsApp API error: ${result.error?.message || response.statusText}`)
      }
      
      logger?.debug?.('[whatsapp-client] request success', { endpoint })
      return result as T
    } catch (error) {
      logger?.error?.('[whatsapp-client] request error', { endpoint, error })
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

