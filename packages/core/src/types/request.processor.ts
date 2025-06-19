
import type { RouterContext } from 'rou3'
import type { IgniterAction } from './action.interface'
import type { IgniterRouterConfig } from './router.interface'

export interface RequestProcessorConfig<TConfig extends IgniterRouterConfig<any, any, any, any>> {
  config: TConfig
  router: RouterContext<IgniterAction<any, any, any, any, any, any, any, any, any>>
}

export interface RequestProcessorInterface<TConfig extends IgniterRouterConfig<any, any, any, any>> {
  /**
   * Process an incoming HTTP request
   * @param request The incoming HTTP request
   */
  process(request: Request): Promise<Response>

  /**
   * Make a direct call to a specific controller action
   */
  call<
    TControllerKey extends keyof TConfig['controllers'],
    TActionKey extends keyof TConfig['controllers'][TControllerKey]["actions"],
    TAction extends TConfig['controllers'][TControllerKey]["actions"][TActionKey]
  >(
    controllerKey: TControllerKey,
    actionKey: TActionKey,
    input: TAction['$Infer']['$Input'] & { params?: Record<string, string | number> }
  ): Promise<TAction['$Infer']['$Output']>
}
