/**
 * Transforms an object type by making optional properties with undefined union types
 * and required properties without undefined.
 * 
 * @template T - The object type to transform
 * @returns A new type with properly marked optional and required properties
 * 
 * @example
 * ```typescript
 * interface User {
 *   id: string;
 *   name?: string;
 *   email: string | undefined; 
 * }
 * 
 * type TransformedUser = Input<User>;
 * // Results in:
 * // {
 * //   id: string;
 * //   name?: string | undefined;
 * //   email?: string;
 * // }
 * ```
 */
export type Input<T> = Prettify<
	{
		[K in keyof T as T[K] extends never ? never : undefined extends T[K] ? never : K]: T[K];
	} & {
		[K in keyof T as undefined extends T[K] ? K : never]?: T[K];
	}
>;

/**
 * Extracts keys from an object type that are required (not optional or undefined).
 * 
 * @template BaseType - The object type to extract required keys from
 * @returns A union type of all required keys in the object
 * 
 * @example
 * ```typescript
 * interface User {
 *   id: string;
 *   name?: string;
 *   email: string | undefined;
 * }
 * 
 * type Required = RequiredKeysOf<User>; // "id"
 * ```
 */
export type RequiredKeysOf<BaseType extends object> = Exclude<
	{
		[Key in keyof BaseType]: BaseType extends Record<Key, BaseType[Key]> ? Key : never;
	}[keyof BaseType],
	undefined
>;

/**
 * Checks if an object type has any required keys.
 * 
 * @template BaseType - The object type to check
 * @returns `true` if the object has required keys, `false` otherwise
 * 
 * @example
 * ```typescript
 * interface User {
 *   id: string;
 *   name?: string;
 * }
 * 
 * interface OptionalUser {
 *   id?: string;
 *   name?: string;
 * }
 * 
 * type HasRequired = HasRequiredKeys<User>; // true
 * type HasNoRequired = HasRequiredKeys<OptionalUser>; // false
 * ```
 */
export type HasRequiredKeys<BaseType extends object> = RequiredKeysOf<BaseType> extends never
	? false
	: true;

/**
 * Improves type hints by flattening intersection types into a single object type.
 * 
 * @template T - The type to prettify
 * @returns A flattened version of the type with better type hints
 * 
 * @example
 * ```typescript
 * type A = { a: string };
 * type B = { b: number };
 * 
 * type AB = Prettify<A & B>;
 * // Results in: { a: string; b: number }
 * ```
 */
export type Prettify<T> = {
	[K in keyof T]: T[K];
} & {};

/**
 * Filters object types by removing unknown keys while preserving known types.
 * 
 * @template T - The object type to filter
 * @returns An object type with only non-unknown keys
 * 
 * @example
 * ```typescript
 * type Mixed = {
 *   id: string;
 *   data: unknown;
 *   count: number;
 * };
 * 
 * type Filtered = NonUnknownObject<Mixed>;
 * // Results in: { id: string; count: number }
 * ```
 */
export type NonUnknownObject<T> = {
  [K in keyof T as T[K] extends object | Function | string | number | boolean ? K : never]: T[K]
} extends infer O extends Record<string, any> ? (keyof O extends never ? never : O) : never

/**
 * Checks if an object type has no properties.
 * 
 * @template T - The object type to check
 * @returns `true` if the object has no properties, `false` otherwise
 * 
 * @example
 * ```typescript
 * type Empty = {};
 * type NonEmpty = { id: string };
 * 
 * type IsEmpty = IsEmptyObject<Empty>; // true
 * type IsNotEmpty = IsEmptyObject<NonEmpty>; // false
 * ```
 */
export type IsEmptyObject<T> = keyof T extends never ? true : false;

/**
 * Converts a union type into an intersection type.
 * 
 * @template Union - The union type to convert
 * @returns An intersection of all types in the union
 * 
 * @example
 * ```typescript
 * type Union = { a: string } | { b: number };
 * type Intersection = UnionToIntersection<Union>;
 * // Results in: { a: string } & { b: number }
 * ```
 */
export type UnionToIntersection<Union> = (
	Union extends unknown
		? (distributedUnion: Union) => void
		: never
) extends (mergedIntersection: infer Intersection) => void
	? Intersection & Union
	: never;

/**
 * Merges two object types, handling cases where either might be never.
 * 
 * @template T - First object type to merge
 * @template S - Second object type to merge
 * @returns A merged object type combining both inputs
 * 
 * @example
 * ```typescript
 * type A = { a: string };
 * type B = { b: number };
 * type N = never;
 * 
 * type AB = MergeObject<A, B>; // { a: string } & { b: number }
 * type AN = MergeObject<A, N>; // { a: string }
 * ```
 */
export type MergeObject<
	T extends Record<string, any> | never,
	S extends Record<string, any> | never,
> = T extends never ? S : S extends never ? T : T & S;

/**
 * Extracts parameter names from a URL path pattern.
 * 
 * @template Path - The URL path pattern to extract parameters from
 * @returns An object type with parameter names as keys
 * 
 * @example
 * ```typescript
 * type Params1 = InferParamPath<"/users/:id">; // { id: string }
 * type Params2 = InferParamPath<"/users/:id/posts/:postId">;
 * // { id: string; postId: string }
 * ```
 */
export type InferParamPath<Path extends string> =
  Path extends `${infer _Start}:${infer Param}/${infer Rest}`
    ? { [K in Param | keyof InferParamPath<Rest>]: string }
    : Path extends `${infer _Start}:${infer Param}`
      ? { [K in Param]: string }
      : Path extends `${infer _Start}/${infer Rest}`
        ? InferParamPath<Rest>
        : unknown;

/**
 * Extracts wildcard parameter names from a URL path pattern.
 * 
 * @template Path - The URL path pattern with wildcards
 * @returns An object type with wildcard parameter names as keys
 * 
 * @example
 * ```typescript
 * type Params1 = InferParamWildCard<"/files/*:filename">; // { filename: string }
 * type Params2 = InferParamWildCard<"/files/**:path/detail">;
 * // { path: string }
 * ```
 */
export type InferParamWildCard<Path> = Path extends
	| `${infer _Start}/*:${infer Param}/${infer Rest}`
	| `${infer _Start}/**:${infer Param}/${infer Rest}`
	? { [K in Param | keyof InferParamPath<Rest>]: string }
	: Path extends `${infer _Start}/*`
		? { [K in "_"]: string }
		: Path extends `${infer _Start}/${infer Rest}`
			? InferParamPath<Rest>
			: {};

/**
 * Checks if two types are exactly equal.
 * 
 * @template T1 - First type to compare
 * @template T2 - Second type to compare
 * @returns `true` if types are exactly equal, `false` otherwise
 * 
 * @example
 * ```typescript
 * type Same = IsEqual<{ a: string }, { a: string }>; // true
 * type Different = IsEqual<{ a: string }, { a: number }>; // false
 * ```
 */
type IsEqual<T1, T2> = (<G>() => G extends T1 ? 1 : 2) extends (<G>() => G extends T2 ? 1 : 2) ? true : false;

/**
 * Checks if an array type is a tuple type.
 * 
 * @template T - The array type to check
 * @returns `true` if the type is a tuple, `false` if it's an array
 * 
 * @example
 * ```typescript
 * type Tuple = IsTuple<[string, number]>; // true
 * type Array = IsTuple<string[]>; // false
 * ```
 */
type IsTuple<T extends ReadonlyArray<any>> = number extends T['length'] ? false : true;

/**
 * Gets the keys of a tuple type, excluding array prototype keys.
 * 
 * @template T - The tuple type to get keys from
 * @returns A union of the tuple's numeric keys
 * 
 * @example
 * ```typescript
 * type Keys = TupleKeys<[string, number]>; // "0" | "1"
 * ```
 */
type TupleKeys<T extends ReadonlyArray<any>> = Exclude<keyof T, keyof any[]>;

/**
 * Represents a numeric array index type.
 */
type ArrayKey = number;

/**
 * Checks if two types have any equal subtypes.
 * 
 * @template T1 - First type to check
 * @template T2 - Second type to check
 * @returns A union of equal subtypes or never
 */
type AnyIsEqual<T1, T2> = T1 extends T2 ? IsEqual<T1, T2> extends true ? true : never : never;

/**
 * Internal helper type for building dot-notation paths.
 */
type PathImpl<K extends string | number, V, TraversedTypes> = V extends string | number | boolean | null | undefined 
	? `${K}` 
	: true extends AnyIsEqual<TraversedTypes, V> 
		? `${K}` 
		: `${K}` | `${K}.${PathInternal<V, TraversedTypes | V>}`;

/**
 * Internal helper type for processing nested object paths.
 */
type PathInternal<T, TraversedTypes = T> = T extends ReadonlyArray<infer V> 
	? IsTuple<T> extends true 
		? { [K in TupleKeys<T>]-?: PathImpl<K & string, T[K], TraversedTypes> }[TupleKeys<T>] 
		: PathImpl<ArrayKey, V, TraversedTypes> 
	: { [K in keyof T]-?: PathImpl<K & string, T[K], TraversedTypes> }[keyof T];

/**
 * Gets all possible dot-notation paths through an object type.
 * 
 * @template T - The object type to get paths from
 * @returns A union of all possible dot-notation paths
 * 
 * @example
 * ```typescript
 * type User = {
 *   id: string;
 *   profile: {
 *     name: string;
 *     age: number;
 *   }
 * };
 * 
 * type Paths = Path<User>;
 * // "id" | "profile" | "profile.name" | "profile.age"
 * ```
 */
export type Path<T> = T extends any ? PathInternal<T> : never;

/**
 * Conditional type that returns the expected type if target matches, or default type otherwise.
 * 
 * @template TTarget - The type to check
 * @template TExpected - The expected type
 * @template TDefault - The default type to return if no match
 * @returns Either TExpected or TDefault based on the condition
 * 
 * @example
 * ```typescript
 * type StringOrNumber = TypeOf<"hello", string, number>; // string
 * type NumberDefault = TypeOf<true, string, number>; // number
 * ```
 */
export type TypeOf<TTarget, TExpected, TDefault = never> = TTarget extends TExpected ? TExpected : TDefault;

/**
 * Gets the type of a nested field using a dot-notation path.
 * 
 * @template T - The object type to traverse
 * @template K - The dot-notation path to the field
 * @returns The type of the field at the specified path
 * 
 * @example
 * ```typescript
 * type User = {
 *   profile: {
 *     name: string;
 *   }
 * };
 * 
 * type NameType = FieldType<User, "profile.name">; // string
 * ```
 */
export type FieldType<T, K extends Path<T>> =
	K extends `${infer Head}.${infer Tail}`
		? Head extends keyof T
			? FieldType<T[Head], Extract<Tail, Path<T[Head]>>>
			: never
		: K extends keyof T
		? T[K]
		: never;

/**
 * Makes all properties in an object type recursively optional.
 * 
 * @template T - The type to make partially optional
 * @returns A type with all properties recursively optional
 * 
 * @example
 * ```typescript
 * type User = {
 *   id: string;
 *   profile: {
 *     name: string;
 *   }
 * };
 * 
 * type PartialUser = DeepPartial<User>;
 * // {
 * //   id?: string;
 * //   profile?: {
 * //     name?: string;
 * //   }
 * // }
 * ```
 */
export type DeepPartial<T> = T extends object ? {
	[P in keyof T]?: DeepPartial<T[P]>;
} : T;

/**
 * Adds a context property to a payload type.
 * 
 * @template Payload - The payload type to extend
 * @template Context - The context type to add
 * @returns A new type combining the payload and context
 * 
 * @example
 * ```typescript
 * type UserPayload = { name: string };
 * type UserContext = { userId: string };
 * 
 * type WithUserContext = WithContext<UserPayload, UserContext>;
 * // { name: string; context: { userId: string } }
 * ```
 */
export type WithContext<Payload extends any, Context extends any> = Payload & {
	context: Context
}

/**
 * Extracts method names from an object type that match a specific type.
 * 
 * @template T - The object type to extract methods from
 * @template Match - The type to match against
 * @returns A union of matching method names
 * 
 * @example
 * ```typescript
 * class API {
 *   get(): string { return ""; }
 *   post(): void { }
 *   data: string;
 * }
 * 
 * type GetMethods = ExtractMethodsOfType<API, () => string>; // "get"
 * ```
 */
export type ExtractMethodsOfType<T, Match> = {
	[K in keyof T]: T[K] extends Match ? K : never;
}[keyof T];

/**
 * Replaces specified keys in an object type with a new type.
 * 
 * @template T - The object type to modify
 * @template K - The keys to replace
 * @template R - The replacement type
 * @returns A new object type with replaced keys
 * 
 * @example
 * ```typescript
 * type User = {
 *   id: string;
 *   name: string;
 * };
 * 
 * type UserWithNumberId = ReplaceKeys<User, 'id', number>;
 * // { id: number; name: string }
 * ```
 */
export type ReplaceKeys<T, K extends keyof T, R> = {
	[P in keyof T]: P extends K ? R : T[P];
};

/**
 * Creates a flexible object type that preserves the key-value relationships.
 * 
 * @template T - The type to create a dynamic object from
 * @returns A dynamic object type
 * 
 * @example
 * ```typescript
 * type Config = {
 *   api: string;
 *   port: number;
 * };
 * 
 * type DynamicConfig = DynamicObject<Config>;
 * ```
 */
export type DynamicObject<T> = {
	[K in keyof T]: T[K];
};

/**
 * Flattens array types into their element type.
 * 
 * @template T - The type to flatten
 * @returns The element type if T is an array, otherwise T
 * 
 * @example
 * ```typescript
 * type NumberArray = number[];
 * type Flattened = Flatten<NumberArray>; // number
 * 
 * type Single = string;
 * type Same = Flatten<Single>; // string
 * ```
 */
export type Flatten<T> = T extends any[] ? T[number] : T;

/**
 * Resolves a type based on a condition string and a map of types.
 * 
 * @template TCondition - The condition string to match
 * @template TMap - Map of condition strings to types
 * @template TDefault - Default type if no match is found
 * @returns The resolved type from the map or the default
 * 
 * @example
 * ```typescript
 * type TypeMap = {
 *   'string': string;
 *   'number': number;
 * };
 * 
 * type StringType = TypeResolver<'string', TypeMap>; // string
 * type Unknown = TypeResolver<'boolean', TypeMap>; // never
 * ```
 */
export type TypeResolver<
	TCondition extends string, 
	TMap extends Record<string, any>, 
	TDefault = never
> = TCondition extends keyof TMap ? TMap[TCondition] : TDefault;

/**
 * Makes all properties in an object type non-nullable.
 * 
 * @template T - The type to transform
 * @returns A new type with all properties non-nullable
 * 
 * @example
 * ```typescript
 * type User = {
 *   id: string | null;
 *   name?: string;
 * };
 * 
 * type Required = NonNullableKeys<User>;
 * // {
 * //   id: string;
 * //   name: string;
 * // }
 * ```
 */
export type NonNullableKeys<T> = {
	[K in keyof T]: NonNullable<T[K]>;
};
