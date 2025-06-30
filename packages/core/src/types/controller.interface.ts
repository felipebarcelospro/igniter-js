import type { IgniterAction } from "./action.interface";
import type { IgniterBaseContext } from "./context.interface";
import type { IgniterPlugin } from "./plugin.interface";
import type { HTTPMethod, IgniterActionHandler } from "./action.interface";

/**
 * Constraint que valida estrutura de action sem achatar tipos específicos
 */
export type IgniterControllerBaseAction = {
  name?: string;
  type: "query" | "mutation";
  path: string;
  method: HTTPMethod;
  description?: string;
  body?: any;
  query?: any;
  use?: readonly any[];
  handler: IgniterActionHandler<any, any>;
  $Infer: any; // Esta é a chave - preservamos o tipo específico aqui
};

/**
 * Constraint inteligente que valida sem perder tipos
 */
type ValidateActions<T> = {
  [K in keyof T]: T[K] extends IgniterControllerBaseAction 
    ? T[K]  // ✅ Mantém o tipo específico se é válido
    : never // ❌ Erro se não é uma action válida
};

export type IgniterControllerConfig<
  TControllerActions extends Record<string, IgniterControllerBaseAction> // 🔄 Nova constraint
> = {
  name: string;
  path: string;
  description?: string;
  actions: ValidateActions<TControllerActions>; // 🔄 Validação com preservação de tipos
}