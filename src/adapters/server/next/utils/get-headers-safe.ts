/**
 * Safe header accessor that works in both server and client environments
 * This prevents "next/headers" from being imported in client components
 */
export const getHeadersSafe = async (): Promise<Headers> => {
  if (typeof window === 'undefined') {
    try {
      const { headers } = await import('next/headers');
      return headers();
    } catch (error) {
      console.warn('Failed to import next/headers, falling back to empty headers', error);
      return new Headers();
    }
  } else {
    // In client, we can't access request headers, so return empty headers
    // You could alternatively return some client-side headers if needed
    return new Headers();
  }
};