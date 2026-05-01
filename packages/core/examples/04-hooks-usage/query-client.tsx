// Validates: useIgniterQueryClient returns a usable query client type.
import { client } from './browser-client';

export function Component() {
  type ClientType = typeof client;

  const useQuery = client.todos.list.useQuery({
    query: { searchTerm: 'example' },
  });

  return null;
}
