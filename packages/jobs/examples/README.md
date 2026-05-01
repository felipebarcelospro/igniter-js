# Igniter Jobs Examples

This directory contains examples demonstrating how to use `@igniter-js/jobs` with different adapters.

## Examples

### SQLite Adapter (Local/Desktop/CLI)

The `sqlite-example.ts` demonstrates using the SQLite adapter for local job queues.

**Use cases:**
- Desktop applications (Tauri, Electron)
- Command-line tools (CLIs)
- MCP Servers
- Local development
- Edge/embedded environments

**Run the example:**

```bash
cd packages/jobs
npx tsx examples/sqlite-example.ts
```

### Key Features Demonstrated

1. **Persistent job storage** - Jobs survive process restarts
2. **Priority-based processing** - Higher priority jobs run first
3. **Automatic retries** - Failed jobs are retried automatically
4. **Worker lifecycle hooks** - Track job progress and handle failures
5. **Queue management** - Pause, resume, drain, and clean queues

## Prerequisites

Make sure you have the dependencies installed:

```bash
npm install
```

The examples use `tsx` for TypeScript execution. Install it globally if needed:

```bash
npm install -g tsx
```
