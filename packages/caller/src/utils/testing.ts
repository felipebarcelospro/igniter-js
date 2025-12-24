import {
  IgniterCallerError,
  type IgniterCallerErrorCode,
} from '../errors/caller.error'
import type {
  IgniterCallerApiResponse,
  IgniterCallerFileResponse,
} from '../types/response'

/**
 * Testing utilities for `IgniterCaller`.
 *
 * Designed to simplify mocking HTTP responses in unit tests.
 */
export class IgniterCallerMock {
  /**
   * Creates a successful mock response.
   *
   * @param data - Mock response data.
   */
  static mockResponse<T>(data: T): IgniterCallerApiResponse<T> {
    return { data, error: undefined }
  }

  /**
   * Creates an error mock response.
   *
   * @param code - Error code to use.
   * @param message - Optional error message.
   */
  static mockError<T = never>(
    code: IgniterCallerErrorCode,
    message = 'Mock error',
  ): IgniterCallerApiResponse<T> {
    return {
      data: undefined,
      error: new IgniterCallerError({
        code,
        operation: 'execute',
        message,
      }),
    }
  }

  /**
   * Creates a successful file download mock.
   *
   * @param filename - File name for the mock.
   * @param content - File contents as string or Blob.
   */
  static mockFile(
    filename: string,
    content: string | Blob,
  ): IgniterCallerFileResponse {
    const blob = typeof content === 'string' ? new Blob([content]) : content
    const file = new File([blob], filename)

    return { file, error: null }
  }

  /**
   * Creates a failed file download mock.
   *
   * @param message - Optional error message.
   */
  static mockFileError(message = 'Mock file error'): IgniterCallerFileResponse {
    return {
      file: null,
      error: new IgniterCallerError({
        code: 'IGNITER_CALLER_UNKNOWN_ERROR',
        operation: 'download',
        message,
      }),
    }
  }
}
