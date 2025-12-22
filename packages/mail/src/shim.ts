/**
 * @fileoverview Browser/client-side shim for @igniter-js/mail
 * @module @igniter-js/mail/shim
 *
 * @description
 * This module prevents @igniter-js/mail from being used in browser environments.
 * The mail package depends on server-only APIs (email providers, queues) and
 * should not be bundled into client-side code.
 */

const SERVER_ONLY_ERROR = `
================================================================================
@igniter-js/mail: Server-Only Package
================================================================================

This package cannot be used in browser/client environments.

@igniter-js/mail is designed exclusively for server-side usage because it:
- Uses server-side email provider APIs and credentials
- May integrate with job queues
- Should never run in browser bundles

SOLUTIONS:

1. Next.js App Router:
   - Use Server Components (default in app/ directory)
   - Use Server Actions with "use server" directive
   - Use API routes (app/api/*)

2. Next.js Pages Router:
   - Use getServerSideProps
   - Use API routes (pages/api/*)

3. Other Frameworks:
   - Move email logic to server-side endpoints
   - Use server-side workers or background jobs

For documentation, visit: https://igniterjs.com/docs/mail

================================================================================
`;

function throwServerOnlyError(): never {
  throw new Error(SERVER_ONLY_ERROR);
}

export const IgniterMail = {
  create: throwServerOnlyError,
};

export const IgniterMailBuilder = {
  create: throwServerOnlyError,
};

export const IgniterMailTemplate = {
  create: throwServerOnlyError,
};

export const IgniterMailManager = {
  create: throwServerOnlyError,
};

export const ResendMailAdapter = {
  create: throwServerOnlyError,
};

export const PostmarkMailAdapter = {
  create: throwServerOnlyError,
};

export const SendGridMailAdapter = {
  create: throwServerOnlyError,
};

export const SmtpMailAdapter = {
  create: throwServerOnlyError,
};

export const MockMailAdapter = {
  create: throwServerOnlyError,
};

export class IgniterMailError extends Error {
  constructor() {
    super(SERVER_ONLY_ERROR);
    this.name = 'IgniterMailError';
  }
}
