export type ContextCallback = (...args: any[]) => object | Promise<object>;
export type Unwrap<T> = T extends ContextCallback ? Unwrap<ReturnType<T>> : T;