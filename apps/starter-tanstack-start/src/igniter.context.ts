/**
 * @description Create the context of the Igniter.js application
 * @see https://github.com/felipebarcelospro/igniter-js
 */
export const createIgniterAppContext = () => {
  // Add application-wide context properties here, like database clients.
  return {};
};

/**
 * @description The context of the Igniter.js application.
 * This type is enhanced by Igniter's built-in features like logger, store, etc.
 * @see https://github.com/felipebarcelospro/igniter-js
 */
export type IgniterAppContext = Awaited<
  ReturnType<typeof createIgniterAppContext>
>;
