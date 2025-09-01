---
alwaysApply: true
---
# Igniter.js Controller & API Development Standards (Optimized for LLMs)

This guide provides a **COMPLETE, ACCURATE, and MANDATORY** reference for creating controllers and actions in Igniter.js. It incorporates established architectural patterns, coding best practices, and lessons learned from real-world implementations, ensuring strict adherence for all future development.

## 🚨 CRITICAL ARCHITECTURAL PRINCIPLES

### 1. Separation of Concerns (SoC)
- **Controllers**: Responsible *only* for handling HTTP requests, validating input, orchestrating business logic (via procedures/repositories), and constructing HTTP responses.
- **Procedures**: Responsible for extending the request context, injecting dependencies (like repositories), handling cross-cutting concerns (e.g., authentication, logging), and pre-processing requests.
- **Repositories**: Responsible *only* for direct data access operations (e.g., Prisma calls). They abstract the database layer from the business logic.
- **Interfaces**: Centralize all shared definitions (constants, Zod schemas, types, interfaces) for a given feature.

### 2. Type Safety & Documentation First
- **End-to-End Type Safety**: Leverage TypeScript and Zod to ensure type consistency from request body to database operations.
- **Comprehensive TSDoc**: All exposed components (controllers, actions, procedures, repositories, interfaces, schemas, types, constants) *MUST* be fully documented with TSDoc in English.

### 3. Immutability & Context Extension
- **Context is Extended, Not Mutated**: Procedures extend the Igniter context by returning an object, which is then shallow-merged. Direct mutation of the `context` object in procedures is forbidden.
- **Special Case: `next()` for Post-Action Processing**: The `next()` function in a procedure's handler should **only** be used if the procedure needs to capture and process the *result* of the subsequent action (e.g., for auditing, performance monitoring, or response modification). In such cases, `await next()` should be called, and the result should then be handled. Otherwise, procedures should either return an object to extend the context (e.g., `{ auth: { session: { user } } }`) or `void` (implicitly or explicit `return;`) to simply allow the request to proceed without modifying the context.
- **Default Behavior: Context Extension or Void Return**: In all other scenarios, procedures should either return an object to extend the context (e.g., `{ auth: { session: { user } } }`) or `void` (implicitly or explicitly `return;`) to simply allow the request to proceed without modifying the context.
- **Auth Procedure Context for Optional Authentication**: When an `authProcedure` is configured with `required: false` (or if authentication fails but is not strictly required), it **MUST** explicitly return an object like `{ auth: { session: { user: null } } }` to maintain consistent context typing, indicating that no authenticated user is present.

### 4. No Modification of Default Igniter Files
- **CRITICAL**: Never modify default Igniter files such as `src/igniter.ts`, `src/igniter.context.ts`, or `src/igniter.router.ts`. These files are designed for automatic type inference and core configuration. Any custom context or setup *MUST* be handled in feature-specific procedures that extend the existing context.

## 🚨 CRITICAL: API Response Patterns - The ONLY Valid API

### ❌ WHAT DOESN'T WORK (Forbidden Methods/Patterns):
```typescript
// ❌ INCORRECT - These methods DO NOT EXIST on the response object
return response.ok(data);                    
return response.error(code, message);        
return response.response(data);              
return new IgniterResponseError({...});     // Use response.error(...) instead

// ❌ INCORRECT - Wrong parameter structure or type
return response.badRequest(code, message);  // Parameter order is (message, data)
return response.unauthorized(code, message); // Parameter order is (message, data)
```

### ✅ WHAT ACTUALLY WORKS (Mandatory Correct API):
- **ALWAYS** finalize the response chain with a method call that returns `Response` (e.g., `.toResponse()`, `.created(data)`, etc.).

```typescript
// ✅ CORRECT - Success responses (Always 2xx status codes)
return response.success(data);           // 200 OK
return response.created(data);           // 201 Created
return response.noContent();             // 204 No Content (No body expected)
return response.json(data);              // Custom JSON response, defaults to 200 OK

// ✅ CORRECT - Error responses (Always 4xx or 5xx status codes)
return response.badRequest(message, data);      // 400 Bad Request
return response.unauthorized(message, data);    // 401 Unauthorized
return response.forbidden(message, data);       // 403 Forbidden
return response.notFound(message, data);        // 404 Not Found

// ✅ CORRECT - Custom status or headers
return response
  .status(418)                    // Set custom HTTP status code
  .setHeader('X-Custom', 'value') // Set custom HTTP header
  .setCookie('session', token, {  // Set HTTP cookie
    httpOnly: true,
    secure: true,
    maxAge: 3600
  })
  .success(data)
  ;                  // MANDATORY: Finalize the response

// ✅ CORRECT - Cache Revalidation (for Next.js App Router)
return response
  .success(data)
  .revalidate(['users', 'posts'])
  ;
```

## 🔍 MANDATORY: Development & Documentation Protocols

### 1. Source Code Analysis First
**BEFORE** implementing any Igniter.js functionality, **YOU MUST**:
1.  **Analyze the source code directly**: Use `explore_source` to understand the actual API. Example:
    ```typescript
    await explore_source({
      filePath: "node_modules/@igniter-js/core/dist/index.d.ts",
      symbol: "IgniterResponseProcessor"
    });
    ```
2.  **Read the complete TSDoc/JSDoc documentation** in the `.d.ts` files.
3.  **Never assume methods exist** based on intuitive naming.
4.  **Test with minimal examples** before full implementation.

### 2. Procedures Naming Convention
- **ALWAYS use concise and clear names** for procedures, matching the file name (e.g., `name: "authProcedure"` for `auth.procedure.ts`). This improves readability, maintainability, and debuggability.

### 3. Documentation Standard for Interfaces, Schemas & Constants (`*.interfaces.ts`)
- **CRITICAL**: All exported constants, Zod schemas, types, and interfaces within `src/features/[feature]/[feature].interfaces.ts` files **MUST** include comprehensive TSDoc comments in English. This promotes clarity, type safety, and auto-generated documentation.

```typescript
// src/features/auth/auth.interfaces.ts (Example)
import { z } from "zod";

/**
 * @constant SALT_ROUNDS
 * @description The number of salt rounds to use when hashing passwords with bcrypt.
 * A higher number increases security but also computation time.
 */
export const SALT_ROUNDS = 10;

/**
 * @schema SignUpBodySchema
 * @description Zod schema for validating the request body when a new user signs up.
 * Ensures name, email, and password meet specified criteria.
 */
export const SignUpBodySchema = z.object({
  name: z.string().min(3, "Name must be at least 3 characters"),
  email: z.string().email("Invalid email format"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

/**
 * @typedef {import("zod").infer<typeof SignUpBodySchema>} SignUpBody
 * @description Type definition for the sign-up request body, inferred from SignUpBodySchema.
 */
export type SignUpBody = z.infer<typeof SignUpBodySchema>;
```

### 4. Inline Comments for Business Logic
- **MANDATORY**: Every significant line of business logic, observation, or rule in controllers, procedures, and repository methods **MUST** be accompanied by an inline comment in English. Use the following structured prefix system:
  - `// Business Rule: [message]` - Explains a specific business requirement, validation, or constraint.
  - `// Observation: [message]` - Notes an observed state, data extraction, or pre-condition.
  - `// Business Logic: [message]` - Describes a core operation, calculation, or data transformation.
  - `// Security Rule: [message]` - Highlights a security-related control, check, or mechanism (e.g., password hashing, JWT).
  - `// Session Management: [message]` - Details actions related to user sessions (e.g., cookie setting/clearing, JWT generation).
  - `// Data Transformation: [message]` - Explains data formatting, mapping, or conversion steps.
  - `// Context Extension: [message]` - Describes how the Igniter context is being extended by a procedure.
  - `// Response: [message]` - Explains the content, status, and side-effects (e.g., cookies) of the HTTP response.

### 5. `zod` Import in Controllers
- **MANDATORY**: Keep `import { z } from "zod";` in controller files, even if the `z` object is not directly used within the handler function. This ensures clarity regarding schema definitions and project consistency.

### 6. `as const` for Path Parameters
- **CRITICAL**: For all action `path` definitions that include parameters (e.g., `/:id`), **ALWAYS** use `as const` (e.g., `path: '/:id' as const`). This enables powerful TypeScript type inference for `request.params` in the handler, preventing `unknown` types and improving code safety.

## ✅ Core Architectural Pattern: Repository Injection via Procedures

This pattern centralizes database interactions and separates concerns, making controllers cleaner and business logic more testable.

### 1. Repository Definition (`src/features/[feature]/repositories/[feature].repository.ts`)
- **Purpose**: Encapsulate all direct Prisma ORM calls related to a specific entity or feature.
- **Location**: `src/features/[feature]/repositories/[feature].repository.ts`
- **TSDoc**: Every repository class and *all* its public methods **MUST** have comprehensive TSDoc comments in English, detailing their purpose, parameters, and return types.

```typescript
// src/features/events/repositories/events.repository.ts (Example)
import { PrismaClient, Event } from "@prisma/client";
import { CreateEventBody, UpdateEventBody } from "../events.interfaces";

/**
 * @class EventsRepository
 * @description Repository for managing event-related data operations with Prisma.
 * Centralizes all direct database interactions for events, providing a clean API for services and controllers.
 */
export class EventsRepository {
  private prisma: PrismaClient;

  /**
   * @param {PrismaClient} prisma - The Prisma client instance for database access.
   */
  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  /**
   * @method create
   * @description Creates a new event record in the database.
   * @param {CreateEventBody & { userId: string }} data - The event data, including title, description, duration, and the ID of the user creating the event.
   * @returns {Promise<Event>} A promise that resolves to the newly created event object.
   */
  async create(data: CreateEventBody & { userId: string }): Promise<Event> {
    // Business Logic: Use Prisma to create a new event record.
    return this.prisma.event.create({ data });
  }

  // ... other repository methods (list, getById, update, delete) ...
}
```

### 2. Procedure for Repository Injection (`src/features/[feature]/procedures/[feature].procedure.ts`)
- **Purpose**: Instantiate the feature's repository and inject it into the Igniter context under a hierarchical structure, making it available to downstream controllers/actions.
- **Location**: `src/features/[feature]/procedures/[feature].procedure.ts`
- **TSDoc**: The procedure's `handler` and its associated `Context` type **MUST** have TSDoc comments.

```typescript
// src/features/events/procedures/events.procedure.ts (Example)
import { igniter } from "@/igniter";
import { EventsRepository } from "../repositories/events.repository";

/**
 * @typedef {object} EventsContext
 * @property {object} features - Feature-specific context container.
 * @property {object} features.events - Events feature context.
 * @property {object} features.events.repository - Events repository instance for database operations.
 */
export type EventsContext = {
  features: {
    events: {
      repository: EventsRepository;
    };
  };
};

/**
 * @const eventsProcedure
 * @description Igniter.js procedure to inject an instance of EventsRepository into the context under a hierarchical structure.
 * This creates a consistent pattern: context.{featureName}.{resourceType}.{resourceName}
 * @returns {EventsContext} An object containing the events repository in hierarchical structure.
 */
export const eventsProcedure = igniter.procedure({
  name: "eventsProcedure", // Adhering to naming convention
  handler: ({ context }) => {
    // Context Extension: Instantiate EventsRepository with the database client from the global context.
    const eventsRepository = new EventsRepository(context.services.database);

    // Context Extension: Return the repository instance in hierarchical structure for consistency.
    return {
      features: {
        events: {
          repository: eventsRepository,
        },
      },
    };
  },
});
```

### 3. Controller Usage (`src/features/[feature]/controllers/[feature].controller.ts`)
- **Purpose**: Use the injected repository methods to perform data operations, keeping the controller focused on request handling and business logic orchestration.
- **`use` property**: The procedure is added to the `use` array of the controller or individual actions.
- **Context Access**: Use the structure `context.{featureName}.{resourceType}.{resourceName}` for consistent access.

```typescript
// src/features/events/controllers/events.controller.ts (Example)
import { igniter } from "@/igniter";
import { z } from "zod"; // MANDATORY: Keep z import as per preference
import { authProcedure } from "../../auth/procedures/auth.procedure";
import { eventsProcedure } from "../procedures/events.procedure";
import { CreateEventBodySchema, UpdateEventBodySchema } from "../events.interfaces";

export const eventsController = igniter.controller({
  name: "events",
  path: "/events",
  description: "Manage user event types",
  actions: {
    create: igniter.mutation({
      name: "Create",
      description: "Create new event type",
      path: "/",
      method: "POST",
      use: [authProcedure({ required: true }), eventsProcedure()], // Injects auth and events repository
      body: CreateEventBodySchema,
      handler: async ({ request, response, context }) => {
        // Observation: Extract event details from the request body.
        const { title, description, duration } = request.body;

        // Authentication: Retrieve the authenticated user's ID from the context.
        const userId = context.auth.session.user!.id;

        // Business Logic: Create a new event using the EventsRepository.
        const event = await context.events.repository.create({
          title,
          description,
          duration,
          userId,
        });

        // Response: Return the newly created event with a 201 status.
        return response.created(event);
      },
    }),
    list: igniter.query({
      name: "List",
      description: "List all user events",
      path: "/",
      use: [authProcedure({ required: true }), eventsProcedure()], // Injects auth and events repository
      handler: async ({ response, context }) => {
        // Authentication: Retrieve the authenticated user's ID from the context.
        const userId = context.auth.session.user!.id;

        // Business Logic: Retrieve all events belonging to the authenticated user using the EventsRepository.
        const events = await context.events.repository.list(userId);

        // Response: Return the list of events with a 200 status.
        return response.success(events);
      },
    }),
    // ... other controller actions (getById, update, delete) ...
  },
});
```


## ✅ Core Architectural Pattern: Service Injection via Procedures

This pattern centralizes external library interactions (e.g., hashing, token generation) and injects them into the Igniter context via procedures, making them readily available to downstream controllers and promoting reusability and testability.

### 1. Service Definition (`src/services/[service-name].service.ts`)
- **Purpose**: Encapsulate all direct external library calls or complex business logic related to a specific domain (e.g., password management, JWT operations, external API integrations).
- **Location**: `src/services/` (or `src/services/[domain]/` for larger projects).
- **TSDoc**: Every service class and *all* its public methods **MUST** have comprehensive TSDoc comments in English, detailing their purpose, parameters, and return types.

```typescript
// src/services/password.service.ts (Example)
import bcrypt from "bcryptjs";
import { SALT_ROUNDS } from "@/features/auth/auth.interfaces";

/**
 * @class PasswordService
 * @description Encapsulates password hashing and comparison logic using bcrypt.
 * Provides a clean interface for securely managing user passwords.
 */
export class PasswordService {
  private readonly saltRounds: number;

  constructor(saltRounds: number = SALT_ROUNDS) {
    this.saltRounds = saltRounds;
  }

  /**
   * @method hashPassword
   * @description Hashes a plain text password using bcrypt.
   * @param {string} password - The plain text password to hash.
   * @returns {Promise<string>} A promise that resolves to the hashed password string.
   */
  async hashPassword(password: string): Promise<string> {
    // Business Logic: Hash the password with the configured salt rounds.
    return bcrypt.hash(password, this.saltRounds);
  }

  /**
   * @method comparePassword
   * @description Compares a plain text password with a hashed password.
   * @param {string} password - The plain text password to compare.
   * @param {string} hash - The hashed password to compare against.
   * @returns {Promise<boolean>} A promise that resolves to true if passwords match, false otherwise.
   */
  async comparePassword(password: string, hash: string): Promise<boolean> {
    // Business Logic: Compare the provided password with the stored hash.
    return bcrypt.compare(password, hash);
  }
}
```

```typescript
// src/services/jwt.service.ts (Example)
import jwt from "jsonwebtoken";
import { JWT_SECRET } from "@/features/auth/auth.interfaces";

/**
 * @class JwtService
 * @description Encapsulates JWT token generation and verification logic.
 * Provides a secure interface for handling authentication tokens.
 */
export class JwtService {
  private readonly secret: string;

  constructor(secret: string = JWT_SECRET) {
    this.secret = secret;
  }

  /**
   * @method generateToken
   * @description Generates a new JWT token.
   * @param {object} payload - The payload to include in the token (e.g., userId).
   * @param {object} [options={ expiresIn: '1h' }] - Options for token generation (e.g., expiration time).
   * @returns {string} The generated JWT token string.
   */
  generateToken(payload: object, options: object = { expiresIn: "1h" }): string {
    // Security Rule: Sign the JWT token with the configured secret and options.
    return jwt.sign(payload, this.secret, options);
  }

  /**
   * @method verifyToken
   * @description Verifies a JWT token.
   * @param {string} token - The JWT token string to verify.
   * @returns {object | string} The decoded payload if verification is successful, or throws an error.
   */
  verifyToken(token: string): object | string {
    // Security Rule: Verify the JWT token with the configured secret.
    return jwt.verify(token, this.secret);
  }
}
```

### 2. Procedure for Service Injection (`src/features/[feature]/procedures/[feature].procedure.ts`)
- **Purpose**: Instantiate the feature's services and inject them into the Igniter context, making them available to downstream controllers/actions.
- **Location**: `src/features/[feature]/procedures/[feature].procedure.ts`
- **TSDoc**: The procedure's `handler` and its associated `Context` type **MUST** have TSDoc comments.

```typescript
// src/features/auth/procedures/auth.procedure.ts (Example - Refactored)
import { igniter } from "@/igniter";
import { User } from "@prisma/client";
import { JWT_SECRET } from "../auth.interfaces";
import { AuthRepository } from "../repositories/auth.repository"; // Import here for instantiation within procedure

// Define the type for the options that can be passed when using the procedure.
/**
 * @typedef {object} AuthProcedureOptions
 * @property {boolean} [required=true] - Indicates if authentication is mandatory for the route.
 */
type AuthProcedureOptions = {
  required?: boolean;
};

// Define the shape of the extended context we are adding.
/**
 * @typedef {object} AuthContext
 * @property {object} features - Features context object.
 * @property {object} features.auth - Authentication context object.
 * @property {object} features.auth.session - User session details.
 * @property {User | null} features.auth.session.user - The authenticated user object or null if unauthenticated.
 * @property {AuthRepository} features.auth.repository - The auth repository for user-related database operations.
 */
type AuthContext = {
  features: {
    auth: {
      session: {
        user: User | null;
      };
      repository: AuthRepository;
    };
  }
};

/**
   * @method handler
   * @description
   * Procedure responsible for authenticating the user by validating the JWT token from the request cookies.
   * Instantiates the AuthRepository and injects it into the context at `auth.repository`.
   * If `options.required` is true, authentication is enforced: if the session token is missing, invalid, or the user is not found, a 401 Unauthorized response is returned.
   * If `options.required` is false, unauthenticated access is allowed and the user in context may be null.
   *
   * @param {AuthProcedureOptions} [options={ required: true }] - Options for the procedure. If `required` is true, authentication is mandatory.
   * @param {object} ctx - The context object provided by Igniter.js.
   * @param {object} ctx.request - The incoming request object.
   * @param {object} ctx.response - The response builder object.
   * @param {object} ctx.context - The current application context.
   * @returns {Promise<AuthContext | Response | void>} Returns the extended context with user info and AuthRepository if authentication passes or is not required, or a 401 response if authentication fails and is required.
   */
export const authProcedure = igniter.procedure({
  name: "authentication",  
  handler: async (options: AuthProcedureOptions = { required: true }, ctx): Promise<AuthContext | Response | void> => {
    const { request, response, context } = ctx;
    
    // Observation: Extract the session token from request cookies.
    const sessionToken = request.cookies.get("sessionToken");

    // Business Rule: Instantiate AuthRepository using the database client from the context.
    const authRepository = new AuthRepository(context.services.database);

    // Security Rule: If authentication is required and there is no session token, return 401 Unauthorized.
    if (options.required && !sessionToken) {
      throw new IgniterResponseError({
        code: "ERR_UNAUTHORIZED",
        message: "Authentication required. Please provide a valid session token.",
      })
    }

    let userId: string | undefined;

    // Security Rule: If a session token exists, attempt to verify it and extract the user ID.
    if (sessionToken) {
      const decoded = context.services.jwt.verifyToken(sessionToken) as { userId: string };
      if (decoded) userId = decoded.userId;
    }

    // Business Rule: Attempt to find the user by ID using the AuthRepository.
    const user = await authRepository.getUserById(userId);

    // Security Rule: If authentication is required but the user is not found, return 401 Unauthorized.
    if (options.required && !user) {
      throw new IgniterResponseError({
        code: "ERR_UNAUTHORIZED",
        message: "Authenticated user not found.",
      })
    }

    // Response: Return the extended context with user session and repository.
    return { auth: { session: { user }, repository: authRepository } };
  },
});
```

### 3. Controller Usage (`src/features/[feature]/controllers/[feature].controller.ts`)
- **Purpose**: Use the injected service methods to perform logic, keeping the controller focused on request handling and business logic orchestration.

```typescript
// src/features/auth/controllers/auth.controller.ts (Example - Refactored)
import { igniter } from "@/igniter";
import { SALT_ROUNDS, JWT_SECRET, SignUpBodySchema, SignInBodySchema } from "../auth.interfaces";
import { authProcedure } from "../procedures/auth.procedure";

export const authController = igniter.controller({
  name: "auth",
  path: "/auth",
  description: "User authentication endpoints including secure sign-up, sign-in, and session management with password hashing and validation.",
  actions: {
    signUp: igniter.mutation({
      name: "SignUp",
      description: "Create new user account",
      path: "/sign-up",
      method: "POST",
      use: [authProcedure({ required: false })],
      body: SignUpBodySchema,
      handler: async ({ request, context, response }) => {
        // Observation: Extract user details from the request body.
        const { name, email, password } = request.body;

        // Business Rule: Check if a user with the provided email already exists.
        const existingUser = await context.auth.repository.getUserByEmail(email);

        // Business Rule: If a user with the email exists, return a bad request response to prevent duplicate accounts.
        if (existingUser) {
          return response.badRequest("User with this email already exists.");
        }

        // Business Logic: Hash the user's password for secure storage.
        const passwordHash = await context.services.password.hash(password);

        // Business Logic: Create a new user record in the database.
        const user = await context.auth.repository.createUser({
          name,
          email,
          passwordHash,
        });

        // Security Rule: Generate a JWT token for the new user, including their ID and setting an expiration.
        const token = context.services.jwt.generateToken({ userId: user.id }, { expiresIn: "1h" });

        // Response: Return the created user's public data and set the session cookie.
        return response
          .setCookie("sessionToken", token, {
            httpOnly: true, // Security Rule: Prevent client-side JavaScript access to the cookie.
            secure: process.env.NODE_ENV === "production", // Security Rule: Only send cookie over HTTPS in production.
            maxAge: 3600 * 1000, // Session Management: Cookie expires in 1 hour.
            path: "/", // Access Control: Cookie is valid for all paths on the domain.
          });
          .created(user)
      },
    }),

    signIn: igniter.mutation({
      name: "SignIn",
      description: "Authenticate user credentials",
      path: "/sign-in",
      method: "POST",
      use: [authProcedure({ required: false })],
      body: SignInBodySchema,
      handler: async ({ request, context, response }) => {
        // Observation: Extract email and password from the request body.
        const { email, password } = request.body;

        // Business Rule: Find the user by their email in the database.
        const user = await context.auth.repository.getUserByEmail(email);

        // Business Rule: If no user is found, return an unauthorized response.
        if (!user) {
          return response.unauthorized("Invalid email or password.");
        }

        // Business Logic: Compare the provided password with the stored hashed password.
        const isPasswordValid = await context.services.password.comparePassword(
          password, 
          user.passwordHash
        );

        // Business Rule: If the password does not match, return a bad request response.
        if (!isPasswordValid) {
          // Note: Changed to badRequest for consistency, as password validation is a bad request scenario
          return response.badRequest("Invalid email or password."); 
        }

        // Observation: Destructure and exclude passwordHash from the user object before sending the response.
        const { passwordHash: _, ...userWithoutPassword } = user;

        // Security Rule: Generate a JWT token for the authenticated user, including their ID and setting an expiration.
        const token = context.services.jwt.generateToken({ userId: user.id }, { expiresIn: "1h" });

        // Response: Return the authenticated user's public data and set the session cookie.
        return response
          .setCookie("sessionToken", token, {
            httpOnly: true, // Security Rule: Prevent client-side JavaScript access to the cookie.
            secure: process.env.NODE_ENV === "production", // Security Rule: Only send cookie over HTTPS in production.
            maxAge: 3600 * 1000, // Session Management: Cookie expires in 1 hour.
            path: "/", // Access Control: Cookie is valid for all paths on the domain.
          });
          .success(userWithoutPassword)
      },
    }),

    signOut: igniter.mutation({
      name: "SignOut",
      description: "Log out user and clear session",
      path: "/sign-out",
      method: "POST",
      handler: async ({ response }) => {
        // Session Management: Clear the session token cookie by setting its maxAge to 0.
        return response
          .setCookie("sessionToken", "", {
            httpOnly: true, // Security Rule: Prevent client-side JavaScript access to the cookie.
            secure: process.env.NODE_ENV === "production", // Security Rule: Only send cookie over HTTPS in production.
            maxAge: 0, // Session Management: Immediately expires the cookie.
            path: "/", // Access Control: Cookie is valid for all paths on the domain.
          });
          .success({ message: "Logged out successfully." })
      },
    }),
  },
});

```

## 7. Best Practices Summary (Refined for LLM Adherence)

1.  **MANDATORY: Follow Architectural Principles**: Adhere strictly to Separation of Concerns, Type Safety, Immutability, and the rule against modifying default Igniter files.
2.  **CRITICAL: TSDoc Everywhere**: Provide comprehensive TSDoc comments (in English) for all controllers, actions, procedures, repositories, interfaces, schemas, types, and constants.
3.  **MANDATORY: Structured Inline Comments**: Use the defined prefix system (Business Rule:, Observation:, etc.) for every significant line of logic in controllers, procedures, and repositories.
4.  **MANDATORY: Centralize Data Definitions**: Store all constants, Zod schemas, types, and interfaces within `src/features/[feature]/[feature].interfaces.ts`.
5.  **MANDATORY: Repository Pattern & Procedure Injection**: Implement repositories for all data access, and **always inject them via dedicated procedures** to make them available in controllers. Do not attempt to inject them directly into `src/igniter.context.ts` or other core Igniter files.
6.  **MANDATORY: Global Service Injection**: Centralize global utility services (e.g., password hashing, JWT operations) by injecting them into `src/igniter.context.ts` under the `services` key. Access these via `context.services.[serviceName]`.
7.  **MANDATORY: Use `as const` for Path Parameters**: Ensure `path: '/:id' as const` for correct type inference.
8.  **MANDATORY: `zod` Import in Controllers**: Keep `import { z } from "zod";` in controller files.
9.  **MANDATORY: Explicit Procedure Handler Return Type**: Always explicitly define the return type for procedure handlers (e.g., `Promise<AuthContext | Response | void>`) for enhanced type safety and clarity.
10. **Use Appropriate HTTP Methods & Status Codes**: Align API actions with standard REST conventions.
11. **Implement Robust Error Handling**: Return meaningful error messages and appropriate HTTP status codes.
12. **Exclude Sensitive Data**: Use `select` statements in Prisma queries to prevent exposing sensitive information (e.g., `passwordHash`).
13. **Validate Input Thoroughly**: Use Zod schemas for all request bodies and query parameters.
14. **Test Endpoints Rigorously**: Verify functionality, schema validation, success/error scenarios, and authentication after every implementation.

This refined guide provides the absolute necessary clarity and detail for LLMs to consistently apply the established development patterns.

## ✅ Core Architectural Pattern: Service and Repository Injection Decision

This pattern defines the intelligent decision-making process for where to inject services and repositories to maintain a clean, organized, and scalable codebase, adhering to dependency injection best practices.

### 1. Decision Criteria
- **Global Services/Repositories**: Dependencies that are used in *multiple features* or are considered *low-level utilities* without strong coupling to a single feature (e.g., `PasswordService`, `JwtService`).
- **Contextual/Feature-Specific Services/Repositories**: Dependencies that are *specific to a single feature* or require *specific procedure state* (e.g., an `EventsRepository` that operates only in the context of events, or the authenticated `user` within the `auth.procedure`). `UserRepository` is also considered a feature-specific repository in this context, instantiated within `auth.procedure` to manage user-related database operations relevant to authentication.

### 2. Injection Locations
- **`src/igniter.context.ts` (Global Injection)**:
  - **Purpose**: For global services that are always needed and are not tied to a specific request context.
  - **Advantages**: Immediate availability throughout the Igniter.js context, guaranteed singletons, easy access from any controller or procedure.
  - **Examples**: `PasswordService`, `JwtService`, `DatabaseService`.

- **Feature-Specific Procedures (`src/features/[feature]/procedures/[feature].procedure.ts`)**:
  - **Purpose**: For contextual or feature-specific dependencies. Instantiated and injected into the context *only when the procedure is used* under a hierarchical structure.
  - **Advantages**: Lazy loading of dependencies (only created if the procedure is executed), encapsulation of complex injection logic, access to request data for instantiation (e.g., `context.services.database` for a repository).
  - **Examples**: `EventsRepository` (injected under `context.events.repository`), `BookingsRepository` (injected under `context.bookings.repository`), `AvailabilityRepository` (injected under `context.availability.repository`).

### 3. Updated Context Structure (Example from `src/igniter.context.ts`)

```typescript
import { database } from "@/services/database";
import { PasswordService } from "@/services/password.service";
import { JwtService } from "@/services/jwt.service";
import { JWT_SECRET, SALT_ROUNDS } from "@/features/auth/auth.interfaces";

export const createIgniterAppContext = () => {
  const passwordService = new PasswordService(SALT_ROUNDS);
  const jwtService = new JwtService(JWT_SECRET);

  return {
    services: { // Global services - always available
      database,
      password: passwordService,
      jwt: jwtService,
    }
    // Note: Feature-specific resources are injected by procedures
    // e.g., context.events.repository (from eventsProcedure)
  }
}

export type IgniterAppContext = ReturnType<typeof createIgniterAppContext>;
```

### 4. Migration Notes

**Note**: The `auth.procedure.ts` maintains the old pattern for backward compatibility with existing authentication flows. New feature procedures (like `events.procedure.ts`, `bookings.procedure.ts`, etc.) should use the direct structure with `context.{featureName}.{resourceType}.{resourceName}`.

### 5. Best Practices for New Patterns

1. **Use Direct Structure**: Always use `context.{featureName}.{resourceType}.{resourceName}` for new features
2. **Global Services**: Keep global services in `context.services.{serviceName}`
3. **Consistent Naming**: Use `repository`, `service`, etc. as resource type names
4. **Lazy Loading**: Feature-specific resources are only loaded when procedures are executed
5. **Type Safety**: Leverage TypeScript's structural typing for better inference

### 6. Complete Migration Example

**Old Pattern (Deprecated):**
```typescript
// Controller
const eventsRepository = context.eventsRepository;
const userId = context.auth.userId;

// Procedure
return {
  eventsRepository,
  auth: { user }
};
```

## 7. Summary of Changes

### New Hierarchical Context Pattern

**Before (Old Pattern):**
```typescript
// Flat structure
context.eventsRepository
context.auth.userId
context.database
context.jwt
```

**After (New Hierarchical Pattern):**
```typescript
// Hierarchical structure
context.events.repository
context.auth.session.user.id
context.services.database
context.services.jwt
```

### Key Improvements

1. **Consistency**: All features follow the same organizational pattern
2. **Scalability**: Easy to add new resource types (services, repositories, etc.)
3. **Type Safety**: Better TypeScript inference with predictable structure
4. **Maintainability**: Clear separation between global and feature-specific resources
5. **Future-Proof**: Extensible structure for complex applications

### Migration Strategy

- **Global Services**: Keep in `context.services.*` (database, password, jwt)
- **Feature Resources**: Move to `context.{feature}.{type}.{name}`
- **Auth Context**: Maintain backward compatibility for existing flows
- **New Features**: Use hierarchical structure from the start

This refined guide provides the absolute necessary clarity and detail for LLMs to consistently apply the established development patterns with the new hierarchical context structure.

**New Pattern (Recommended):**
```typescript
// Controller
const eventsRepository = context.events.repository;
const userId = context.auth.session.user.id;

// Procedure
return {
  features: {
    events: {
      repository: eventsRepository,
    },
  },
  auth: { session: { user } }
};
```

## 7. Summary of Changes

### New Hierarchical Context Pattern

**Before (Old Pattern):**
```typescript
// Flat structure
context.eventsRepository
context.auth.userId
context.database
context.jwt
```

**After (New Hierarchical Pattern):**
```typescript
// Hierarchical structure
context.events.repository
context.auth.session.user.id
context.services.database
context.services.jwt
```

### Key Improvements

1. **Consistency**: All features follow the same organizational pattern
2. **Scalability**: Easy to add new resource types (services, repositories, etc.)
3. **Type Safety**: Better TypeScript inference with predictable structure
4. **Maintainability**: Clear separation between global and feature-specific resources
5. **Future-Proof**: Extensible structure for complex applications

### Migration Strategy

- **Global Services**: Keep in `context.services.*` (database, password, jwt)
- **Feature Resources**: Move to `context.{feature}.{type}.{name}`
- **Auth Context**: Maintain backward compatibility for existing flows
- **New Features**: Use hierarchical structure from the start

This refined guide provides the absolute necessary clarity and detail for LLMs to consistently apply the established development patterns with the new hierarchical context structure.
