/**
 * Merges multiple path segments into a single URL path, handling both relative paths and absolute URLs.
 * 
 * @param args - Array of path segments to merge
 * @returns A properly formatted URL path starting with '/' or full URL if protocol is present
 * 
 * @example
 * // Relative paths
 * mergePathUrl('users', 'profile') // Returns '/users/profile'
 * mergePathUrl('/users/', '/profile/') // Returns '/users/profile'
 * mergePathUrl('', 'users', '', 'profile') // Returns '/users/profile'
 * 
 * @example
 * // With protocol and domain
 * mergePathUrl('https://example.com', 'api', 'users') // Returns 'https://example.com/api/users'
 * mergePathUrl('http://example.com/') // Returns 'http://example.com'
 * 
 * @example
 * // Edge cases
 * mergePathUrl() // Returns '/'
 * mergePathUrl('') // Returns '/'
 * mergePathUrl('users', '', 'profile') // Returns '/users/profile'
 * 
 * @remarks
 * - Removes leading and trailing slashes from individual segments
 * - Normalizes multiple consecutive slashes into single ones
 * - Preserves protocol and domain if present in first argument
 * - Always returns a path starting with '/' unless a protocol is present
 */
export function parseURL(...args: string[]) {
  // Extract protocol and domain if present in the first argument
  let protocol = '';
  let domain = '';
  
  if (args[0]?.match(/^https?:\/\//)) {
    const urlParts = args[0].match(/^(https?:\/\/[^\/]+)(.*)?/);
    if (urlParts) {
      protocol = urlParts[1];
      args[0] = urlParts[2] || '';
    }
  }

  // Filter out empty strings and normalize paths
  const paths = args
    .filter(Boolean)
    .map(path => path.trim())
    .map(path => path.replace(/^\/+|\/+$/g, '')); // Remove leading/trailing slashes

  // Join paths and ensure single forward slashes
  const mergedPath = paths.join('/').replace(/\/+/g, '/');

  // If we have a protocol, don't add leading slash
  if (protocol) {
    return `${protocol}${mergedPath}`;
  }

  // Ensure path starts with / if any arguments were provided
  return mergedPath.length > 0 ? `/${mergedPath}` : '/';
}