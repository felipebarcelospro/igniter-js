# @igniter-js/core Type Validation Examples

These examples are **type validation fixtures**, not runtime tests. Each folder exists to compile specific type scenarios that have regressed or are prone to break.

## How to Run

From the package root:

- `npm run typecheck:examples`

This command intentionally performs **type checking only** (no emit). Some examples are expected to fail until their associated type fixes land.

## Adding New Examples

1. Create a new folder under `examples/NN-feature-name/`.
2. Add a local `tsconfig.json` that extends `../tsconfig.base.json`.
3. Keep examples minimal and focused on a single type scenario.
4. Add a short comment in the file describing what it validates.
5. Update this README with the new folder’s purpose.

## What Each Folder Validates

- **01-telemetry-integration**
  - `withTelemetry` accepts an `IgniterTelemetry` manager instance.

- **02-router-builder**
  - Router builder typing does not collapse to `never`.
  - Context generics flow through action handlers.
  - Nested router/controller combinations remain type-safe.

- **03-client-creation**
  - `createIgniterClient` returns a usable client type.
  - Browser/server client creation does not infer `never`.

- **04-hooks-usage**
  - React hooks and query client types resolve to usable client types.
  - Hook helpers are typed correctly for query and mutation actions.
