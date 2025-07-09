/**
 * Merges multiple path segments into a single URL path, handling both relative paths and absolute URLs.
 * 
 * @param args - Array of path segments to merge
 * @returns A properly formatted URL path starting with '/' or full URL if protocol is present
 * 
 * @example
 * // Relative paths
 * parseURL('users', 'profile') // Returns '/users/profile'
 * parseURL('/users/', '/profile/') // Returns '/users/profile'
 * parseURL('', 'users', '', 'profile') // Returns '/users/profile'
 * 
 * @example
 * // With protocol and domain
 * parseURL('https://example.com', 'api', 'users') // Returns 'https://example.com/api/users'
 * parseURL('http://example.com/') // Returns 'http://example.com'
 * 
 * @example
 * // Edge cases
 * parseURL() // Returns '/'
 * parseURL('') // Returns '/'
 * parseURL('users', '', 'profile') // Returns '/users/profile'
 * 
 * @remarks
 * - Removes leading and trailing slashes from individual segments
 * - Normalizes multiple consecutive slashes into single ones
 * - Preserves protocol and domain if present in first argument
 * - Always returns a path starting with '/' unless a protocol is present
 */
export function parseURL(...args: string[]) {
  let protocol = '';
  
  if (args[0]?.match(/^https?:\/\//)) {
    const urlParts = args[0].match(/^(https?:\/\/[^\/]+)(.*)?/);
    if (urlParts) {
      protocol = urlParts[1]; // http://localhost:3000
      args[0] = urlParts[2] || ''; // '/' ou vazio
    }
  }

  const paths = args
    .filter(Boolean)
    .map(path => path.trim())
    .map(path => path.replace(/^\/+|\/+$/g, ''));

  const mergedPath = paths.join('/').replace(/\/+/g, '/');

  if (protocol) {
    // Adiciona '/' antes de mergedPath, se ele não estiver vazio
    return mergedPath ? `${protocol}/${mergedPath}` : protocol;
  }

  return mergedPath.length > 0 ? `/${mergedPath}` : '/';
}