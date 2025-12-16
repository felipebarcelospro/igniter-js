/**
 * @fileoverview Internal state types for @igniter-js/jobs runtime
 * @module @igniter-js/jobs/types/internal
 */

import type { IgniterJobsAdapter } from "./adapter";
import type { IgniterJobsConfig } from "./config";

/**
 * Internal state maintained by the IgniterJobs runtime.
 * Encapsulates configuration, the active adapter, and registration status.
 */
export type IgniterJobsInternalState<
  TConfig extends IgniterJobsConfig<any, any, any> = IgniterJobsConfig<
    any,
    any,
    any
  >,
> = {
  config: TConfig;
  adapter: IgniterJobsAdapter;
  registered: boolean;
};
