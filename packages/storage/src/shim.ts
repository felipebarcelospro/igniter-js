/**
 * @fileoverview Browser/client-side shim for @igniter-js/storage
 * @module @igniter-js/storage/shim
 *
 * @description
 * This module prevents @igniter-js/storage from being used in browser environments.
 * The storage package depends on server-only APIs (cloud SDKs, filesystem, credentials)
 * and should not be bundled into client-side code.
 */

const SERVER_ONLY_ERROR = `
================================================================================
@igniter-js/storage: Server-Only Package
================================================================================

This package cannot be used in browser/client environments.

@igniter-js/storage is designed exclusively for server-side usage because it:
- Uses server-side storage SDKs (S3, GCS, etc.)
- Requires credentials and server-only access keys
- Handles file buffers and streams not available in the browser

SOLUTIONS:

1. Next.js App Router:
   - Use Server Components (default in app/ directory)
   - Use Server Actions with "use server" directive
   - Use API routes (app/api/*)

2. Next.js Pages Router:
   - Use getServerSideProps
   - Use API routes (pages/api/*)

3. Other Frameworks:
   - Move storage logic to server-side endpoints
   - Use server-side workers or background jobs

For documentation, visit: https://igniterjs.com/docs/storage

================================================================================
`;

function throwServerOnlyError(): never {
  throw new Error(SERVER_ONLY_ERROR);
}

export const IgniterStorage = {
  create: throwServerOnlyError,
};

export const IgniterStorageBuilder = {
  create: throwServerOnlyError,
};

export const IgniterStorageManager = {
  create: throwServerOnlyError,
};

export const IgniterStorageAdapter = {
  create: throwServerOnlyError,
};

export const IgniterS3Adapter = {
  create: throwServerOnlyError,
};

export const IgniterGoogleAdapter = {
  create: throwServerOnlyError,
};

export const MockStorageAdapter = {
  create: throwServerOnlyError,
};

export const IgniterStorageTelemetryEvents = new Proxy(
  {},
  {
    get() {
      return throwServerOnlyError();
    },
  },
);

export class IgniterStorageError extends Error {
  constructor() {
    super(SERVER_ONLY_ERROR);
    this.name = "IgniterStorageError";
  }
}
