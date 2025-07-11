# CLI: The Interactive Dev Server `igniter dev`

The `igniter dev` command is your primary tool for running your application during development. It starts a powerful, file-watching development server that automatically reloads your application when you make changes to the code.

While it can be run standalone, its most powerful feature is the **interactive mode**.

## The Interactive Dashboard (`--interactive`)

Running the dev server with the `--interactive` flag launches a terminal-based dashboard that gives you a real-time, comprehensive view of your entire application stack.

**Key Features of the Dashboard:**

-   **Multi-Process View:** It manages and displays the output of multiple processes in a single, non-scrolling interface. This typically includes the core Igniter.js watcher and the dev server for your chosen frontend framework (e.g., Next.js).
-   **API Request Monitor:** A dedicated panel logs every incoming API request to your Igniter.js backend in real-time. It shows the HTTP method, path, status code, and response time, making debugging incredibly fast.
-   **Clear Status Indicators:** Each process has a clear status indicator (e.g., `● Running`, `○ Stopped`), so you always know the state of your application at a glance.

## How to Use

To start the interactive development server, run the following command from the root of your project:

```bash
igniter dev --interactive
```

### Integrating with a Frontend Framework

If your Igniter.js backend is part of a full-stack application (like with Next.js), you can tell the Igniter dev server to manage the frontend dev server process for you.

```bash
igniter dev --interactive --framework nextjs
```

This command will start both the Igniter.js process and the `next dev` process, displaying both in the interactive dashboard.

## Dashboard Interface Example

The interactive dashboard provides a clean, static view that does not scroll away, making it easy to monitor activity.

```text
Igniter.js Interactive Dashboard
Uptime: 2m 45s | Press h for help

● 1. Igniter  ○ 2. Next.js  ● 3. API Requests

Status: Running | PID: 12345 | Last: 14:30:25
────────────────────────────────────────────────────────
14:30:23 GET  /api/v1/users           200 45ms
14:30:24 POST /api/v1/auth/login      201 120ms
14:30:25 GET  /api/v1/health          200 12ms

1-5: Switch process | Tab: Next | c: Clear logs | r: Refresh | h: Help | q: Quit
```

### Navigating the Dashboard

-   **`1-5` keys:** Switch between the logs of different processes.
-   **`Tab`:** Cycle to the next process view.
-   **`c`:** Clear the logs for the currently selected process.
-   **`r`:** Restart the currently selected process.
-   **`h`:** Show a help menu with available commands.
-   **`q`:** Quit the interactive dashboard and stop all processes.

Using the `igniter dev` interactive mode streamlines the development workflow by consolidating all necessary information into a single, easy-to-read terminal window.