import { describe, expect, it, vi, beforeEach } from 'vitest';
import { IgniterCookie } from '../cookie.service';

// Mock the uncrypto module since that's what the code imports
vi.mock('uncrypto', () => ({
  subtle: {
    importKey: vi.fn(),
    sign: vi.fn(),
    verify: vi.fn(),
  },
}));

// Get the mocked subtle for test expectations
import { subtle } from 'uncrypto';
const mockSubtle = vi.mocked(subtle);

// Mock Headers class
class MockHeaders {
  private headers: Map<string, string> = new Map();

  constructor(init?: Record<string, string>) {
    if (init) {
      Object.entries(init).forEach(([key, value]) => {
        this.headers.set(key.toLowerCase(), value);
      });
    }
  }

  get(name: string): string | null {
    return this.headers.get(name.toLowerCase()) || null;
  }

  set(name: string, value: string): void {
    this.headers.set(name.toLowerCase(), value);
  }

  has(name: string): boolean {
    return this.headers.has(name.toLowerCase());
  }

  entries(): IterableIterator<[string, string]> {
    return this.headers.entries();
  }
}

describe('Cookie Service', () => {
  let headers: MockHeaders;
  let cookies: IgniterCookie;

  beforeEach(() => {
    vi.clearAllMocks();
    headers = new MockHeaders();
    cookies = new IgniterCookie(headers as any);
  });

  describe('IgniterCookie Construction', () => {
    it('should create cookie instance with empty headers', () => {
      const emptyHeaders = new MockHeaders();
      const emptyCookies = new IgniterCookie(emptyHeaders as any);

      expect(emptyCookies).toBeDefined();
      expect(emptyCookies.getAll().size).toBe(0);
    });

    it('should parse existing cookies from headers', () => {
      const headersWithCookies = new MockHeaders({
        cookie: 'user=john; session=abc123; theme=dark'
      });
      const parsedCookies = new IgniterCookie(headersWithCookies as any);

      expect(parsedCookies.get('user')).toBe('john');
      expect(parsedCookies.get('session')).toBe('abc123');
      expect(parsedCookies.get('theme')).toBe('dark');
      expect(parsedCookies.getAll().size).toBe(3);
    });

    it('should handle malformed cookie headers gracefully', () => {
      const malformedHeaders = new MockHeaders({
        cookie: 'invalid; =empty; valid=value; another='
      });
      const parsedCookies = new IgniterCookie(malformedHeaders as any);

      expect(parsedCookies.get('valid')).toBe('value');
      expect(parsedCookies.getAll().size).toBeGreaterThan(0);
    });

    it('should handle empty cookie header', () => {
      const emptyHeaders = new MockHeaders({ cookie: '' });
      const parsedCookies = new IgniterCookie(emptyHeaders as any);

      expect(parsedCookies.getAll().size).toBe(0);
    });
  });

  describe('Basic Operations', () => {
    it('should get cookie values', () => {
      cookies.set('test', 'value');
      expect(cookies.get('test')).toBe('value');
    });

    it('should return undefined for non-existent cookie', () => {
      expect(cookies.get('nonexistent')).toBeUndefined();
    });

    it('should set basic cookies', () => {
      const result = cookies.set('user', 'john');
      
      expect(cookies.get('user')).toBe('john');
      expect(result).toBe('user=john');
      expect(headers.get('Set-Cookie')).toBe('user=john');
    });

    it('should set cookies with basic options', () => {
      const result = cookies.set('session', 'abc123', {
        httpOnly: true,
        secure: true,
        maxAge: 3600
      });

      expect(result).toContain('session=abc123');
      expect(result).toContain('Max-Age=3600');
      expect(result).toContain('HttpOnly');
      expect(result).toContain('Secure');
    });

    it('should check if cookie exists', () => {
      cookies.set('exists', 'yes');
      
      expect(cookies.has('exists')).toBe(true);
      expect(cookies.has('notexists')).toBe(false);
    });

    it('should delete cookies', () => {
      cookies.set('temp', 'value');
      expect(cookies.has('temp')).toBe(true);
      
      cookies.delete('temp');
      expect(cookies.has('temp')).toBe(false);
    });

    it('should clear all cookies', () => {
      cookies.set('one', 'value1');
      cookies.set('two', 'value2');
      expect(cookies.getAll().size).toBe(2);
      
      cookies.clear();
      expect(cookies.getAll().size).toBe(0);
    });

    it('should get all cookies as Map', () => {
      cookies.set('first', 'value1');
      cookies.set('second', 'value2');
      
      const allCookies = cookies.getAll();
      expect(allCookies instanceof Map).toBe(true);
      expect(allCookies.size).toBe(2);
      expect(allCookies.get('first')).toBe('value1');
      expect(allCookies.get('second')).toBe('value2');
    });
  });

  describe('Cookie Serialization', () => {
    it('should serialize cookies with path', () => {
      const result = cookies.set('test', 'value', { path: '/admin' });
      expect(result).toContain('Path=/admin');
    });

    it('should serialize cookies with domain', () => {
      const result = cookies.set('test', 'value', { domain: '.example.com' });
      expect(result).toContain('Domain=.example.com');
    });

    it('should serialize cookies with expires date', () => {
      const expires = new Date('2024-12-31T23:59:59Z');
      const result = cookies.set('test', 'value', { expires });
      expect(result).toContain('Expires=Tue, 31 Dec 2024 23:59:59 GMT');
    });

    it('should serialize cookies with sameSite', () => {
      const result = cookies.set('test', 'value', { sameSite: 'strict' });
      expect(result).toContain('SameSite=Strict');
    });

    it('should serialize cookies with sameSite lax', () => {
      const result = cookies.set('test', 'value', { sameSite: 'lax' });
      expect(result).toContain('SameSite=Lax');
    });

    it('should serialize cookies with sameSite none', () => {
      const result = cookies.set('test', 'value', { sameSite: 'none' });
      expect(result).toContain('SameSite=None');
    });

    it('should serialize cookies with partitioned attribute', () => {
      const result = cookies.set('test', 'value', { partitioned: true });
      expect(result).toContain('Partitioned');
      expect(result).toContain('Secure'); // Partitioned requires Secure
    });
  });

  describe('Cookie Prefixes', () => {
    it('should handle __Secure- prefix', () => {
      const result = cookies.set('token', 'abc123', { prefix: 'secure' });
      
      expect(result).toContain('__Secure-token=abc123');
      expect(result).toContain('Secure'); // Auto-added for __Secure- prefix
    });

    it('should handle __Host- prefix', () => {
      const result = cookies.set('session', 'xyz789', { prefix: 'host' });
      
      expect(result).toContain('__Host-session=xyz789');
      expect(result).toContain('Secure'); // Auto-added for __Host- prefix
      expect(result).toContain('Path=/'); // Auto-set to / for __Host- prefix
      expect(result).not.toContain('Domain'); // Domain not allowed for __Host-
    });

    it('should override path for __Host- prefix', () => {
      const result = cookies.set('test', 'value', { 
        prefix: 'host',
        path: '/custom' // Should be overridden to /
      });
      
      expect(result).toContain('Path=/');
      expect(result).not.toContain('Path=/custom');
    });

    it('should remove domain for __Host- prefix', () => {
      const result = cookies.set('test', 'value', { 
        prefix: 'host',
        domain: '.example.com' // Should be removed
      });
      
      expect(result).not.toContain('Domain');
    });
  });

  describe('Validation', () => {
    it('should throw error for maxAge greater than 400 days', () => {
      expect(() => {
        cookies.set('test', 'value', { maxAge: 34560000 + 1 }); // 400 days + 1 second
      }).toThrow('Cookies Max-Age SHOULD NOT be greater than 400 days');
    });

    it('should allow maxAge of exactly 400 days', () => {
      expect(() => {
        cookies.set('test', 'value', { maxAge: 34560000 }); // Exactly 400 days
      }).not.toThrow();
    });

    it('should throw error for expires greater than 400 days in future', () => {
      const farFuture = new Date(Date.now() + (34560000 * 1000) + 1); // 400 days + 1ms
      
      expect(() => {
        cookies.set('test', 'value', { expires: farFuture });
      }).toThrow('Cookies Expires SHOULD NOT be greater than 400 days');
    });

    it('should allow expires of exactly 400 days in future', () => {
      const exactFuture = new Date(Date.now() + 34560000_000); // Exactly 400 days
      
      expect(() => {
        cookies.set('test', 'value', { expires: exactFuture });
      }).not.toThrow();
    });

    it('should not allow domain with __Host- prefix', () => {
      const result = cookies.set('test', 'value', { 
        prefix: 'host',
        domain: '.example.com'
      });
      
      expect(result).not.toContain('Domain');
    });
  });

  describe('Signed Cookies', () => {
    beforeEach(() => {
      // Setup crypto mocks
      mockSubtle.importKey.mockResolvedValue({
        algorithm: { name: 'HMAC', hash: 'SHA-256' },
        extractable: false,
        type: 'secret',
        usages: ['sign']
      } as any);
      mockSubtle.sign.mockResolvedValue(new ArrayBuffer(32));
      mockSubtle.verify.mockResolvedValue(true);
    });

    it('should set signed cookies', async () => {
      const result = await cookies.setSigned('token', 'sensitive-data', 'secret-key');
      
      expect(mockSubtle.importKey).toHaveBeenCalledWith(
        'raw',
        expect.any(Uint8Array),
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign']
      );
      expect(mockSubtle.sign).toHaveBeenCalled();
      expect(result).toContain('token=');
      expect(headers.get('Set-Cookie')).toContain('token=');
    });

    it('should set signed cookies with options', async () => {
      const result = await cookies.setSigned('auth', 'user-data', 'secret', {
        httpOnly: true,
        secure: true,
        maxAge: 3600
      });
      
      expect(result).toContain('HttpOnly');
      expect(result).toContain('Secure');
      expect(result).toContain('Max-Age=3600');
    });

    it('should get and verify signed cookies', async () => {
      // First set a signed cookie
      await cookies.setSigned('token', 'test-value', 'secret-key');
      
      const result = await cookies.getSigned('token', 'secret-key');
      
      expect(mockSubtle.verify).toHaveBeenCalled();
      expect(result).toBe('test-value');
    });

    it('should return null for invalid signed cookie signature', async () => {
      mockSubtle.verify.mockResolvedValue(false);
      
      // Manually set an invalid signed cookie
      cookies.set('invalid', 'test-value.invalid-signature');
      
      const result = await cookies.getSigned('invalid', 'wrong-secret');
      
      expect(result).toBeNull();
    });

    it('should return null for non-existent signed cookie', async () => {
      const result = await cookies.getSigned('nonexistent', 'secret');
      expect(result).toBeNull();
    });

    it('should return null for malformed signed cookie', async () => {
      // Set a cookie without proper signature format
      cookies.set('malformed', 'no-signature-here');
      
      const result = await cookies.getSigned('malformed', 'secret');
      expect(result).toBeNull();
    });

    it('should handle crypto errors gracefully', async () => {
      mockSubtle.importKey.mockRejectedValue(new Error('Crypto error'));
      
      await expect(cookies.setSigned('test', 'value', 'secret')).rejects.toThrow('Crypto error');
    });
  });

  describe('toString Method', () => {
    it('should convert cookies to string representation', () => {
      cookies.set('first', 'value1');
      cookies.set('second', 'value2');
      
      const cookieString = cookies.toString();
      expect(cookieString).toContain('first=value1');
      expect(cookieString).toContain('second=value2');
      expect(cookieString).toContain('; ');
    });

    it('should return empty string for no cookies', () => {
      const cookieString = cookies.toString();
      expect(cookieString).toBe('');
    });

    it('should handle single cookie correctly', () => {
      cookies.set('single', 'value');
      
      const cookieString = cookies.toString();
      expect(cookieString).toBe('single=value');
    });
  });

  describe('Edge Cases', () => {
    it('should handle special characters in cookie values', () => {
      const specialValue = 'test@#$%^&*()';
      cookies.set('special', specialValue);
      
      expect(cookies.get('special')).toBe(specialValue);
    });

    it('should handle unicode characters in cookie values', () => {
      const unicodeValue = '测试-value-🍪';
      cookies.set('unicode', unicodeValue);
      
      expect(cookies.get('unicode')).toBe(unicodeValue);
    });

    it('should handle empty cookie values', () => {
      cookies.set('empty', '');
      
      expect(cookies.get('empty')).toBe('');
      expect(cookies.has('empty')).toBe(true);
    });

    it('should handle very long cookie values', () => {
      const longValue = 'x'.repeat(4000);
      cookies.set('long', longValue);
      
      expect(cookies.get('long')).toBe(longValue);
    });

    it('should handle maxAge of 0', () => {
      const result = cookies.set('expire', 'now', { maxAge: 0 });
      expect(result).toContain('Max-Age=0');
    });

    it('should handle negative maxAge', () => {
      expect(() => {
        cookies.set('negative', 'value', { maxAge: -1 });
      }).not.toThrow(); // Should not throw, but behavior depends on implementation
    });

    it('should handle missing headers gracefully', () => {
      const nullHeaders = new MockHeaders();
      const nullCookies = new IgniterCookie(nullHeaders as any);
      
      expect(nullCookies.getAll().size).toBe(0);
    });
  });

  describe('Performance and Memory', () => {
    it('should handle large number of cookies efficiently', () => {
      const startTime = performance.now();
      
      for (let i = 0; i < 1000; i++) {
        cookies.set(`cookie${i}`, `value${i}`);
      }
      
      for (let i = 0; i < 1000; i++) {
        expect(cookies.get(`cookie${i}`)).toBe(`value${i}`);
      }
      
      const endTime = performance.now();
      expect(endTime - startTime).toBeLessThan(100); // Should be fast
      expect(cookies.getAll().size).toBe(1000);
    });

    it('should not create memory leaks with frequent operations', () => {
      for (let i = 0; i < 100; i++) {
        cookies.set('temp', `value${i}`);
        cookies.delete('temp');
      }
      
      expect(cookies.getAll().size).toBe(0);
    });
  });
}); 