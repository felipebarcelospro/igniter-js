import { createBetterAuthController } from "./controller";

/**
 * Create a BetterAuth integration for Igniter.js by passing only the `auth` instance.
 * Returns a pair containing:
 * - `plugin`: a minimal Igniter plugin (for PluginManager, events, etc.)
 * - `controllers`: an `auth` controller with strongly-typed actions inferred from `auth.api`
 */
export function createBetterAuthPlugin<
  TAuth extends { api: Record<string, unknown> },
>(auth: TAuth) {
  const controllers = { auth: createBetterAuthController(auth) };

  return {
    name: "better-auth",
    $meta: {
      title: "BetterAuth Plugin",
      description: "Expose BetterAuth API as Igniter controllers",
    },
    $config: {},
    $actions: {},
    $controllers: controllers, // we attach typed controllers directly to router, not via plugin path
    $events: { emits: {}, listens: {} },
    registration: {
      discoverable: true,
      version: "0.0.0",
      requiresFramework: "0.2.0",
      category: ["auth", "security"],
      author: "Igniter.js Contributors",
    },
    dependencies: { requires: [], optional: [], conflicts: [] },
    hooks: {},
    middleware: { global: [], routes: {} },
    resources: { resources: [], cleanup: () => {} },
  };
}

export { createBetterAuthController } from "./controller";
