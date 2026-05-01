// Validates: useIgniterQueryClient exposes mutation hooks with proper typing.
import { client } from './browser-client'

export function Component() {
  type ClientType = typeof client;
  const typedClient: ClientType = client;

  const useMutation = client.todos.create.useMutation({
    body: { title: 'New Todo' },
  })

  void typedClient;
  void useMutation;

  return null;
}
