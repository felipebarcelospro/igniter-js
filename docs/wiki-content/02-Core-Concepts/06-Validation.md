# Validation: Ensuring Data Integrity and Business Rules

In any robust API, validation is a critical, non-negotiable step. It protects your application from invalid data, prevents unexpected errors, and enforces your business rules. Igniter.js treats validation as a first-class citizen and provides a powerful, two-layer approach to handle it cleanly and efficiently.

1.  **Schema Validation**: Validating the **shape and type** of incoming data (`body`, `query parameters`).
2.  **Business Logic Validation**: Validating **runtime conditions and business rules** (e.g., "does this user have permission?").

## 1. Schema Validation with Zod

For validating the structure of incoming data, Igniter.js has built-in, first-class support for **Zod**. You define a Zod schema for your action's `body` or `query` properties, and Igniter.js handles the rest automatically.

**How it works:**
Before your action's `handler` is ever executed, Igniter.js intercepts the incoming request and validates its body and query parameters against the Zod schemas you provided.

*   **On Success:** The data is guaranteed to be valid. TypeScript correctly infers the types, and the parsed, type-safe data is made available to you in `request.body` and `request.query`.
*   **On Failure:** The validation fails. Igniter.js immediately halts the request and sends a detailed `400 Bad Request` response to the client, specifying which fields are invalid and why. Your handler is never called.

### Example: Validating a Mutation Body

Let's create a `mutation` to create a new product, with strict validation rules for the request body.

```typescript
import { igniter } from '@/igniter';
import { z } from 'zod';

export const productController = igniter.controller({
  path: '/products',
  actions: {
    create: igniter.mutation({
      path: '/',
      method: 'POST',

      // Define the validation schema for the request body
      body: z.object({
        name: z.string().min(3, "Name must be at least 3 characters long."),
        price: z.number().positive("Price must be a positive number."),
        category: z.enum(['electronics', 'books', 'clothing']),
        stock: z.number().int().nonnegative().default(0),
      }),

      handler: async ({ request, response, context }) => {
        // If the code reaches here, the data is valid.
        // `request.body` is fully typed as:
        // { name: string; price: number; category: "electronics" | "books" | "clothing"; stock: number; }
        const { name, price, category, stock } = request.body;

        const product = await context.database.product.create({
          data: { name, price, category, stock }
        });

        return response.created(product);
      },
    }),
  },
});
```

With this setup, you never have to write `if (!body.name)` or `if (typeof body.price !== 'number')` inside your handler. The framework guarantees data integrity before your logic runs.

## 2. Business Logic Validation with `Ensure`

Schema validation is perfect for checking data shapes, but what about rules that depend on your application's state? For example:

*   Does the user with this ID actually exist in the database?
*   Does the current user have the 'admin' role?
*   Is the product we're trying to add to the cart in stock?

This is where the **Igniter.js Ensure** service comes in. `Ensure` is a utility that provides a clean, declarative, and type-safe way to assert business rules, replacing messy `if/throw` blocks.

### The Problem: Repetitive `if/throw`

Without a utility like `Ensure`, your code can become cluttered with repetitive validation logic:

```typescript
// The "old" way with if/throw
handler: async ({ request, context, response }) => {
  const { productId } = request.body;

  const product = await context.database.product.findUnique({
    where: { id: productId },
  });

  // Repetitive check
  if (!product) {
    // Manually throwing an error
    return response.notFound({ message: `Product with ID ${productId} not found.` });
  }

  const currentUser = context.auth.user;

  // Another repetitive check
  if (currentUser.role !== 'admin') {
    return response.forbidden({ message: 'You do not have permission.' });
  }

  // Now, TypeScript still thinks `product` can be `null` here without extra work.
  // ... rest of the logic
}
```

### The Solution: Declarative Assertions with `Ensure`

The `Ensure` service replaces these blocks with single, readable lines. It also provides powerful type-narrowing.

```typescript
// The "new" way with Ensure
handler: async ({ request, context, response }) => {
  const { productId } = request.body;

  const product = await context.database.product.findUnique({
    where: { id: productId },
  });

  // 1. Assert that the product must exist.
  // If not, it throws a formatted Not Found error automatically.
  context.$plugins.ensure.toBeDefined(product, `Product with ID ${productId} not found.`);
  
  // After this line, TypeScript knows `product` CANNOT be null. Its type is narrowed.

  // 2. Assert a boolean condition is true.
  context.$plugins.ensure.toBeTrue(
    context.auth.user.role === 'admin',
    'You do not have permission to perform this action.' // This throws a Forbidden error.
  );

  // Your business logic is clean and only runs if all assertions pass.
  // ... rest of the logic
}
```
*Note: `Ensure` is typically added as a plugin to be available on the context.*

### Key `Ensure` Methods

| Method                        | Description                                                                                               |
| :---------------------------- | :-------------------------------------------------------------------------------------------------------- |
| `toBeDefined(value, msg)`     | Ensures a value is not `null` or `undefined`. Narrows the type.                                           |
| `toBeNotEmpty(value, msg)`    | Ensures a string is not empty, `null`, or `undefined`.                                                    |
| `toBeTrue(condition, msg)`    | Ensures a boolean condition is `true`.                                                                    |
| `toBeFalse(condition, msg)`   | Ensures a boolean condition is `false`.                                                                   |
| `toBeOneOf(value, array, msg)`| Checks if a value is present in a given array of options.                                                 |
| `toMatchPattern(val, regex, msg)`| Validates a string against a regular expression.                                                       |

### When to Use Which Validation

-   **Use Zod Schemas for:** The **shape and type** of data sent by the client. This is your first line of defense at the entry point of your API.
-   **Use `Ensure` for:** **Business rules and runtime conditions** that require access to your application's state (database, user session, etc.) inside your handlers.

By combining these two layers, you can build extremely robust, readable, and maintainable APIs with Igniter.js.