import { StarterRegistry } from "@/core/registry/starters/starter-registry";
import { NextJsStarter } from "./nextjs-starter";
import { ExpressStarter } from "./express-starter";
import { DenoStarter } from "./deno-starter";
import { BunApiStarter } from "./bun-api-starter";
import { BunReactStarter } from "./bun-react-starter";
import { TanStackStartStarter } from "./tanstack-start-starter";

/**
 * Starter registry
 */
export const starterRegistry = StarterRegistry.create()
  .register(new NextJsStarter())
  .register(new ExpressStarter())
  .register(new DenoStarter())
  .register(new BunApiStarter())
  .register(new BunReactStarter())
  .register(new TanStackStartStarter())
  .build();