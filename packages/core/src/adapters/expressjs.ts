/**
 * Creates an Express middleware adapter that converts incoming Express requests
 * into standard Fetch API Request objects, passes them to the provided handler,
 * and then translates the Fetch API Response back into an Express response.
 *
 * This is designed to allow Express to interoperate with handlers written for
 * Igniter.js or other Fetch-compatible APIs.
 *
 * @param handler - An async function that takes a Fetch API Request and returns a Fetch API Response.
 * @returns An Express middleware function.
 *
 * @example
 * app.use(expressAdapter(async (request) => {
 *   // Handle the request using Fetch API semantics
 *   return new Response('Hello world');
 * }));
 */
export const expressAdapter = (
  handler: (request: Request) => Promise<Response>
) => {
  /**
   * Express middleware function that adapts Express requests to Fetch API requests.
   *
   * @param req - The Express request object.
   * @param res - The Express response object.
   * @param next - The next middleware function in the Express stack.
   */
  return async (
    req: any,
    res: any,
    next: any
  ) => {
    try {
      // Construct the full URL from Express request properties
      const url = new URL(req.originalUrl, `${req.protocol}://${req.get('host')}`);

      // Convert Express headers object to a standard Headers object
      const headers = new Headers();
      for (const [key, value] of Object.entries(req.headers)) {
        if (typeof value === 'string') {
          headers.set(key, value);
        } else if (Array.isArray(value)) {
          // Handle cases where a header might have multiple values (e.g., Set-Cookie)
          for (const v of value) {
            headers.append(key, v);
          }
        }
      }

      // Determine the request body. For GET/HEAD, body should be undefined.
      // For other methods, pass the Express request object itself as the body stream.
      const body = ['GET', 'HEAD'].includes(req.method.toUpperCase()) ? undefined : req;

      // Create a new standard Request object compatible with Igniter.js
      const request = new Request(url.toString(), {
        method: req.method,
        headers: headers,
        body: body as any, // Cast to any because Express.Request is not a standard ReadableStream, but Node.js can handle it
        // @ts-ignore - 'duplex' is a standard property in Node.js 18+ for streaming bodies
        duplex: 'half'
      });

      // Pass the standard request to the Igniter handler
      const response = await handler(request);

      // Translate the standard Response back to Express's response object
      res.status(response.status);
      // Collect headers, preserving multiple Set-Cookie values
      const setCookieValues: string[] = [];
      response.headers.forEach((value, key) => {
        if (key.toLowerCase() === 'set-cookie') {
          setCookieValues.push(value);
        } else {
          res.setHeader(key, value);
        }
      });
      if (setCookieValues.length > 0) {
        res.setHeader('Set-Cookie', setCookieValues);
      }

      if (response.body) {
        // @ts-expect-error - Stream the response body back to the Express response
        for await (const chunk of response.body) {
          res.write(chunk);
        }
      }
      res.end(); // End the Express response
    } catch (error) {
      // Pass any errors to Express's error handling middleware
      next(error);
    }
  };
};
