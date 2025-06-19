import type { IgniterAction } from "./action.interface";

export type IgniterControllerConfig<
  TControllerContext extends object, 
  TControllerActions extends Record<string, IgniterAction<TControllerContext, any, any, any, any, any, any, any, any>>
> = {
  name: string;
  path: string;
  actions: TControllerActions;
  [key: string]: any;
}