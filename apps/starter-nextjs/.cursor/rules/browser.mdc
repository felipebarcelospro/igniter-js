---
description: Provides a comprehensive and mandatory training guide for effectively utilizing browser automation tools, specifically Playwright, for research, debugging, and autonomous validation.
globs: []
alwaysApply: true
---
# Browser Tools: Comprehensive Training & Best Practices

This rule provides a comprehensive and mandatory training guide for effectively utilizing browser automation tools, specifically Playwright, for research, debugging, and autonomous validation. It emphasizes integrating browser capabilities with other MCP tools for a holistic development workflow.

## 1. Core Principles of Browser Tool Usage

### 1.1 Strategic Intent
- **Autonomous Validation**: Browser tools are critical for end-to-end testing of front-end implementations, mimicking user interactions.
- **Dynamic Research**: Access real-time, external information, documentation, and community insights from the web.
- **Interactive Debugging**: Visualize and interact with the application during development, identifying UI/UX issues.
- **Market Analysis**: Stay updated with technology trends, competitor solutions, and best practices.

### 1.2 Browser Environment
- **Isolated Execution**: Each browser session is isolated to prevent interference.
- **Configurable Viewport**: Adjust screen size for responsive testing (e.g., mobile, tablet, desktop) using `browser_resize`.
- **Network Awareness**: Monitor network requests and console messages for debugging using `browser_network_requests` and `browser_console_messages`.
- **Ephemeral Sessions**: Browser sessions can close unexpectedly due to timeouts or internal issues. Always be prepared to re-initialize by navigating to a known URL to regain a stable state.

## 2. Browser Toolset & Core Capabilities

The following Playwright-based tools are available for browser interaction:

| Tool                         | Description                                                                    | Key Use Cases                                                                                                |
| :--------------------------- | :----------------------------------------------------------------------------- | :----------------------------------------------------------------------------------------------------------- |
| `browser_navigate`           | Navigate to a specified URL.                                                   | Access documentation, external websites, specific application pages. Crucial for re-initializing browser state after failures. |
| `browser_snapshot`           | Capture an accessibility snapshot of the current page.                         | Understand page structure, identify actionable elements, verify UI state. Essential for dynamic content.     |
| `browser_click`              | Perform a click on a web element.                                              | Interact with buttons, links, checkboxes, forms. Use `ref` for precision, or descriptive `element` name.     |
| `browser_type`               | Type text into an editable element.                                            | Fill out forms, search bars, input fields. Often combined with `browser_press_key({ key: "Enter" })` for submission. |
| `browser_fill_form`          | Fill multiple form fields efficiently.                                         | Automate complex form submissions.                                                                           |
| `browser_select_option`      | Select an option in a dropdown.                                                | Interact with `<select>` elements.                                                                           |
| `browser_press_key`          | Simulate a key press (e.g., "Enter", "Tab", "ArrowDown").                        | Keyboard navigation, triggering key-based events, submitting forms where explicit buttons are not easily clickable. |
| `browser_hover`              | Hover over a web element.                                                      | Test hover-dependent UI elements (e.g., tooltips, dropdowns).                                                |
| `browser_drag`               | Perform a drag-and-drop action.                                                | Test draggable components.                                                                                   |
| `browser_take_screenshot`    | Capture a screenshot of the current page or specific element.                  | Visual debugging, documenting UI states, visual regression testing.                                          |
| `browser_console_messages`   | Retrieve all console messages (logs, warnings, errors).                        | Debug client-side errors, inspect application logs, understand JavaScript execution issues.                    |
| `browser_network_requests`   | Retrieve all network requests (XHR, fetch, document loads).                    | Analyze API calls, monitor network performance, debug backend communication issues.                            |
| `browser_evaluate`           | Execute JavaScript expression on page or element.                              | Advanced interactions, data extraction from complex DOM structures, inspecting JavaScript variables for debugging. |
| `browser_wait_for`           | Wait for text to appear or disappear, or for a specified time to pass.         | Synchronize actions with dynamic content loading, ensure elements are ready for interaction.                 |
| `browser_resize`             | Resize the browser window to specific dimensions.                              | Responsive design testing across various screen sizes (mobile, tablet, desktop).                             |
| `browser_tabs`               | Manage browser tabs (list, new, close, select).                                | Open new tabs for parallel research, isolate workflows, switch contexts.                                     |
| `browser_handle_dialog`      | Handle browser dialogs (alerts, prompts, confirms).                            | Automate interactions with pop-ups that block normal page interaction.                                       |
| `browser_file_upload`        | Upload one or multiple files to input fields.                                  | Test file upload functionalities.                                                                            |
| `browser_close`              | Close the current page.                                                        | Clean up browser sessions.                                                                                   |

## 3. Browser Workflows & Integration Patterns

### 3.1 Documentation & Research Workflow

**Objective**: Effectively gather information from web documentation, forums, or online resources.

**Workflow Sequence**:
```mermaid
graph TD
    A[Research Query] --> B{search_memories - existing knowledge}
    B --> C{Knowledge exists?}
    C -->|Yes| D[Review & Update Memory]
    C -->|No| E[browser_navigate - to search engine/doc site]
    E --> F[browser_type - search query]
    F --> G[browser_press_key - Enter for search]
    G --> H[browser_snapshot - evaluate results page]
    H --> I{Relevant link identified?}
    I -->|Yes| J[browser_click - navigate to link]
    I -->|No| K[Refine search / browser_navigate - to another source]
    J --> L[browser_evaluate - extract content/code]
    L --> M[store_memory - extracted insights]
    M --> N[relate_memories - to relevant tasks/patterns]
    N --> O[Reflect on learnings]
```

**Key Steps & Tool Combinations** (Based on practical exploration):
1.  **Start with Internal Knowledge**: `search_memories` to leverage existing insights.
2.  **Navigate & Search**: `browser_navigate` to a search engine or specific documentation site (e.g., `https://www.google.com`), then `browser_type` for the query and `browser_press_key({ key: "Enter" })` to submit. This bypasses potential overlay issues with click.
3.  **Evaluate Results**: Use `browser_snapshot` to capture the page's accessibility tree and identify the most relevant links (e.g., a link to `https://www.youtube.com/` after searching for "YouTube").
4.  **Extract Information**: `browser_evaluate` with a JavaScript function to scrape specific text or code snippets. This requires careful inspection of the DOM structure.
5.  **Persist Knowledge**: `store_memory` and `relate_memories` to document findings and connect them to other architectural decisions or code patterns.

**Example Scenario: Finding a Next.js `fetch` pattern**
1.  `search_memories({ text: "Next.js fetch pattern" })`
2.  `browser_navigate({ url: "https://www.google.com" })`
3.  `browser_type({ element: "Search input", ref: "e40", text: "Next.js 14 fetch patterns" })`
4.  `browser_press_key({ key: "Enter" })`
5.  `browser_snapshot({ random_string: "snapshot-after-search" })`
6.  `browser_click({ element: "Relevant Next.js documentation link", ref: "eXXX" })` (replace eXXX with actual ref from snapshot)
7.  `browser_evaluate({ function: "() => document.querySelector('pre code').innerText" })` (to extract code, after verifying selector)
8.  `store_memory({ type: "code_pattern", title: "Next.js Fetch Caching", content: "...", tags: ["nextjs", "fetch", "caching"] })`

### 3.2 Autonomous Front-End Validation Workflow

**Objective**: Perform end-to-end UI testing to ensure functionality, responsiveness, and user experience.

**Workflow Sequence**:
```mermaid
graph TD
    A[New UI Feature/Component] --> B[Server Status Check - API Validation Rule]
    B --> C{Server Running?}
    C -->|No| D[Start Dev Server]
    D --> E[Wait for Init (3s)]
    E --> F[browser_navigate - to feature page]
    F --> G[browser_resize - responsive testing]
    G --> H[browser_snapshot - initial UI state]
    H --> I{Interaction required?}
    I -->|Yes| J[browser_click / browser_type / browser_fill_form - user actions]
    J --> K[browser_wait_for - dynamic content/network]
    K --> L[browser_snapshot - post-interaction UI state]
    L --> M[browser_console_messages / browser_network_requests - debug logs]
    M --> N{Expected behavior confirmed?}
    N -->|No| O[Debug with other tools / browser_take_screenshot]
    N -->|Yes| P[store_memory - successful validation pattern]
    P --> Q[Update task status to 'testing' or 'done']
    O --> F
```

**Key Steps & Tool Combinations** (Based on practical exploration):
1.  **Server Verification**: **MANDATORY** server status check using the `API Validation Workflow` to ensure the application is accessible.
2.  **Navigate & Interact**: `browser_navigate` to the target page (e.g., `http://localhost:3000/auth/login`). Use `browser_click`, `browser_type`, `browser_fill_form`, `browser_select_option` for simulating user interactions.
3.  **Responsive Testing**: `browser_resize` to test UI behavior across different screen dimensions (e.g., `width: 375, height: 667`).
4.  **State Verification**: `browser_snapshot` to capture the DOM for assertion, `browser_wait_for` to handle asynchronous content loading.
5.  **Debugging**: `browser_console_messages` and `browser_network_requests` to inspect client-side errors and API calls. `browser_take_screenshot` for visual regression (e.g., `fullPage: true`).
6.  **Validation & Documentation**: `store_memory` for successful test patterns and `update_task_status`.
7.  **Recovery from Closed Session**: If the browser session closes unexpectedly (`Error: Target page, context or browser has been closed`), re-initialize by using `browser_navigate` to a simple, known URL (e.g., `https://www.example.com`) to bring the browser to a stable state before proceeding with the task.

**Example Scenario: Testing a login form**
1.  `browser_navigate({ url: "http://localhost:3000/auth/login" })`
2.  `browser_fill_form({ fields: [{ name: "Email input", type: "textbox", ref: "...", value: "test@example.com" }, { name: "Password input", "type": "textbox", ref: "...", value: "password123" }] })`
3.  `browser_click({ element: "Login button", ref: "..." })`
4.  `browser_wait_for({ text: "Welcome back!" })` or `browser_navigate({ url: "http://localhost:3000/dashboard" })`
5.  `browser_console_messages({ random_string: "login-console-logs" })` (check for client-side errors)
6.  `store_memory({ type: "code_pattern", title: "Login Flow Validation", content: "...", tags: ["e2e", "authentication", "playwright"] })`

### 3.3 Online Tool Integration Workflow

**Objective**: Utilize online tools (e.g., code formatters, image optimizers, JSON validators) for development tasks.

**Workflow Sequence**:
```mermaid
graph TD
    A[Task Requiring Online Tool] --> B[browser_navigate - to online tool site]
    B --> C[browser_type / browser_fill_form - input data]
    C --> D[browser_click - process button]
    D --> E[browser_wait_for - result to appear]
    E --> F[browser_evaluate - extract processed output]
    F --> G[Edit code with processed output]
    G --> H[store_memory - tool usage pattern]
```

**Key Steps & Tool Combinations** (Based on practical exploration):
1.  **Navigate**: `browser_navigate` to the desired online tool (e.g., `https://jsonformatter.org/`).
2.  **Input Data**: Use `browser_type` or `browser_fill_form` to input the data needing processing.
3.  **Process & Extract**: `browser_click` to trigger the tool's function, `browser_wait_for` for results, then `browser_evaluate` to extract the output.
4.  **Integrate & Document**: Use the output to `edit_file` in the codebase and `store_memory` the workflow.

**Example Scenario: Formatting a JSON snippet**
1.  `browser_navigate({ url: "https://jsonformatter.org/" })`
2.  `browser_type({ element: "JSON input area", ref: "...", text: "{'key':'value', 'nested':{'another':'data'}}" })` (replace ref with actual from snapshot)
3.  `browser_click({ element: "Process button", ref: "..." })` (replace ref with actual from snapshot)
4.  `browser_wait_for({ text: "Formatted JSON output" })` (wait for specific text indicating completion)
5.  `browser_evaluate({ function: "() => document.querySelector('#output-area').innerText" })` (to extract formatted JSON)
6.  `edit_file({ target_file: "...", instructions: "...", code_edit: "..." })`
7.  `store_memory({ type: "code_pattern", title: "JSON Formatting with Online Tool", content: "...", tags: ["online-tool", "json-formatting"] })`

## 4. Best Practices & Advanced Techniques

### 4.1 Robust Element Selection
-   **Prioritize `ref`**: When available from `browser_snapshot`, always use the `ref` for precise targeting.
-   **Descriptive `element`**: Provide a clear, human-readable `element` description for permissions and context (e.g., "Login button", "Email input field").
-   **Retry Logic**: For dynamic content, combine `browser_snapshot` with `browser_wait_for` to ensure elements are present before interaction.

### 4.2 Error Handling & Debugging
-   **Console & Network Logs**: Regularly check `browser_console_messages` and `browser_network_requests` for client-side and API-related issues.
-   **Screenshots**: Use `browser_take_screenshot` for visual debugging, especially after unexpected UI states (e.g., `fullPage: true`).
-   **JS Evaluation**: `browser_evaluate` is powerful for inspecting DOM elements, JavaScript variables, and triggering client-side functions directly for debugging.
-   **Session Recovery**: If a browser session becomes unstable or closes (`Error: Target page, context or browser has been closed`), **immediately use `browser_navigate` to a simple, known URL (e.g., `https://www.example.com`) to re-establish a stable working browser context.**

### 4.3 Multi-Tab & Multi-Window Workflows
-   **`browser_tabs`**: Use `browser_tabs({ action: 'new' })` to open new tabs for parallel research or to isolate workflows.
-   **Context Isolation**: Be mindful that each tab operates in its own context; explicitly switch or close tabs as needed.

### 4.4 Performance & Optimization
-   **Minimize Snapshots**: Only take `browser_snapshot` when necessary to identify new elements or verify major UI changes, as it can be resource-intensive.
-   **Efficient Waiting**: Prefer `browser_wait_for({ text: "..." })` or `browser_wait_for({ time: X })` over arbitrary `sleep` calls for better synchronization.

### 4.5 Security Considerations
-   **Sensitive Data**: Avoid logging or storing sensitive information accessed via browser tools in plain text memories.
-   **Sandbox Environment**: Be aware of the sandbox environment and its limitations when interacting with external sites.

## 5. Integration with Other MCP Tools

### 5.1 With Codebase Search (`codebase_search`)
-   **Bridge External & Internal Knowledge**: Browser research can inform `codebase_search` queries with relevant keywords or architectural patterns found online. Find a solution online, then use `codebase_search` to locate similar implementations within the project.

### 5.2 With Memory Management (`store_memory`, `search_memories`, `relate_memories`)
-   **Knowledge Base Enrichment**: Every significant discovery or validated pattern from browser interactions **MUST** be stored as a memory.
-   **Pattern Learning**: Browser workflows can be documented as `code_pattern` memories for future reuse.

### 5.3 With API Validation (`get_openapi_spec`, `make_api_request`)
-   **Full-Stack Validation**: Use browser tools for front-end validation after `make_api_request` has confirmed backend API functionality.
-   **Debugging Client-API Interaction**: `browser_network_requests` can help debug issues where the front-end is not correctly interacting with the backend API.

### 5.4 With Task Management (`create_task`, `update_task_status`)
-   **Task Creation**: Browser research might reveal new sub-tasks or requirements that can be captured using `create_task`.
-   **Progress Updates**: Successful browser validation directly informs `update_task_status`.

## 6. Mandatory Browser Testing Protocol

**CRITICAL VALIDATION REQUIREMENT:**
-   **ALL implementations must be validated using Playwright browser automation.**
-   **Cannot advance to next task/subtask without successful browser testing.**
-   **Browser testing serves as autonomous validation similar to API testing.**
-   **For both Front-End and Back-End tasks, browser validation is required to ensure complete integration.**
-   **Use browser for research, market analysis, and accessing latest documentation.**
-   **Browser usage is freely allowed for staying updated with current technologies.**

## 7. Future Evolution & Learning

-   **Continuous Refinement**: This rule will evolve based on new browser tool capabilities and successful application patterns.
-   **User Feedback**: User corrections and preferences regarding browser tool usage will directly inform updates to this training guide.
-   **Performance Monitoring**: Monitor the efficiency and effectiveness of browser-based workflows to identify areas for improvement.# Browser Tools: Comprehensive Training & Best Practices

This rule provides a comprehensive and mandatory training guide for effectively utilizing browser automation tools, specifically Playwright, for research, debugging, and autonomous validation. It emphasizes integrating browser capabilities with other MCP tools for a holistic development workflow.

## 1. Core Principles of Browser Tool Usage

### 1.1 Strategic Intent
- **Autonomous Validation**: Browser tools are critical for end-to-end testing of front-end implementations, mimicking user interactions.
- **Dynamic Research**: Access real-time, external information, documentation, and community insights from the web.
- **Interactive Debugging**: Visualize and interact with the application during development, identifying UI/UX issues.
- **Market Analysis**: Stay updated with technology trends, competitor solutions, and best practices.

### 1.2 Browser Environment
- **Isolated Execution**: Each browser session is isolated to prevent interference.
- **Configurable Viewport**: Adjust screen size for responsive testing (e.g., mobile, tablet, desktop) using `browser_resize`.
- **Network Awareness**: Monitor network requests and console messages for debugging using `browser_network_requests` and `browser_console_messages`.
- **Ephemeral Sessions**: Browser sessions can close unexpectedly due to timeouts or internal issues. Always be prepared to re-initialize by navigating to a known URL to regain a stable state.

## 2. Browser Toolset & Core Capabilities

The following Playwright-based tools are available for browser interaction:

| Tool                         | Description                                                                    | Key Use Cases                                                                                                |
| :--------------------------- | :----------------------------------------------------------------------------- | :----------------------------------------------------------------------------------------------------------- |
| `browser_navigate`           | Navigate to a specified URL.                                                   | Access documentation, external websites, specific application pages. Crucial for re-initializing browser state after failures. |
| `browser_snapshot`           | Capture an accessibility snapshot of the current page.                         | Understand page structure, identify actionable elements, verify UI state. Essential for dynamic content.     |
| `browser_click`              | Perform a click on a web element.                                              | Interact with buttons, links, checkboxes, forms. Use `ref` for precision, or descriptive `element` name.     |
| `browser_type`               | Type text into an editable element.                                            | Fill out forms, search bars, input fields. Often combined with `browser_press_key({ key: "Enter" })` for submission. |
| `browser_fill_form`          | Fill multiple form fields efficiently.                                         | Automate complex form submissions.                                                                           |
| `browser_select_option`      | Select an option in a dropdown.                                                | Interact with `<select>` elements.                                                                           |
| `browser_press_key`          | Simulate a key press (e.g., "Enter", "Tab", "ArrowDown").                        | Keyboard navigation, triggering key-based events, submitting forms where explicit buttons are not easily clickable. |
| `browser_hover`              | Hover over a web element.                                                      | Test hover-dependent UI elements (e.g., tooltips, dropdowns).                                                |
| `browser_drag`               | Perform a drag-and-drop action.                                                | Test draggable components.                                                                                   |
| `browser_take_screenshot`    | Capture a screenshot of the current page or specific element.                  | Visual debugging, documenting UI states, visual regression testing.                                          |
| `browser_console_messages`   | Retrieve all console messages (logs, warnings, errors).                        | Debug client-side errors, inspect application logs, understand JavaScript execution issues.                    |
| `browser_network_requests`   | Retrieve all network requests (XHR, fetch, document loads).                    | Analyze API calls, monitor network performance, debug backend communication issues.                            |
| `browser_evaluate`           | Execute JavaScript expression on page or element.                              | Advanced interactions, data extraction from complex DOM structures, inspecting JavaScript variables for debugging. |
| `browser_wait_for`           | Wait for text to appear or disappear, or for a specified time to pass.         | Synchronize actions with dynamic content loading, ensure elements are ready for interaction.                 |
| `browser_resize`             | Resize the browser window to specific dimensions.                              | Responsive design testing across various screen sizes (mobile, tablet, desktop).                             |
| `browser_tabs`               | Manage browser tabs (list, new, close, select).                                | Open new tabs for parallel research, isolate workflows, switch contexts.                                     |
| `browser_handle_dialog`      | Handle browser dialogs (alerts, prompts, confirms).                            | Automate interactions with pop-ups that block normal page interaction.                                       |
| `browser_file_upload`        | Upload one or multiple files to input fields.                                  | Test file upload functionalities.                                                                            |
| `browser_close`              | Close the current page.                                                        | Clean up browser sessions.                                                                                   |

## 3. Browser Workflows & Integration Patterns

### 3.1 Documentation & Research Workflow

**Objective**: Effectively gather information from web documentation, forums, or online resources.

**Workflow Sequence**:
```mermaid
graph TD
    A[Research Query] --> B{search_memories - existing knowledge}
    B --> C{Knowledge exists?}
    C -->|Yes| D[Review & Update Memory]
    C -->|No| E[browser_navigate - to search engine/doc site]
    E --> F[browser_type - search query]
    F --> G[browser_press_key - Enter for search]
    G --> H[browser_snapshot - evaluate results page]
    H --> I{Relevant link identified?}
    I -->|Yes| J[browser_click - navigate to link]
    I -->|No| K[Refine search / browser_navigate - to another source]
    J --> L[browser_evaluate - extract content/code]
    L --> M[store_memory - extracted insights]
    M --> N[relate_memories - to relevant tasks/patterns]
    N --> O[Reflect on learnings]
```

**Key Steps & Tool Combinations** (Based on practical exploration):
1.  **Start with Internal Knowledge**: `search_memories` to leverage existing insights.
2.  **Navigate & Search**: `browser_navigate` to a search engine or specific documentation site (e.g., `https://www.google.com`), then `browser_type` for the query and `browser_press_key({ key: "Enter" })` to submit. This bypasses potential overlay issues with click.
3.  **Evaluate Results**: Use `browser_snapshot` to capture the page's accessibility tree and identify the most relevant links (e.g., a link to `https://www.youtube.com/` after searching for "YouTube").
4.  **Extract Information**: `browser_evaluate` with a JavaScript function to scrape specific text or code snippets. This requires careful inspection of the DOM structure.
5.  **Persist Knowledge**: `store_memory` and `relate_memories` to document findings and connect them to other architectural decisions or code patterns.

**Example Scenario: Finding a Next.js `fetch` pattern**
1.  `search_memories({ text: "Next.js fetch pattern" })`
2.  `browser_navigate({ url: "https://www.google.com" })`
3.  `browser_type({ element: "Search input", ref: "e40", text: "Next.js 14 fetch patterns" })`
4.  `browser_press_key({ key: "Enter" })`
5.  `browser_snapshot({ random_string: "snapshot-after-search" })`
6.  `browser_click({ element: "Relevant Next.js documentation link", ref: "eXXX" })` (replace eXXX with actual ref from snapshot)
7.  `browser_evaluate({ function: "() => document.querySelector('pre code').innerText" })` (to extract code, after verifying selector)
8.  `store_memory({ type: "code_pattern", title: "Next.js Fetch Caching", content: "...", tags: ["nextjs", "fetch", "caching"] })`

### 3.2 Autonomous Front-End Validation Workflow

**Objective**: Perform end-to-end UI testing to ensure functionality, responsiveness, and user experience.

**Workflow Sequence**:
```mermaid
graph TD
    A[New UI Feature/Component] --> B[Server Status Check - API Validation Rule]
    B --> C{Server Running?}
    C -->|No| D[Start Dev Server]
    D --> E[Wait for Init (3s)]
    E --> F[browser_navigate - to feature page]
    F --> G[browser_resize - responsive testing]
    G --> H[browser_snapshot - initial UI state]
    H --> I{Interaction required?}
    I -->|Yes| J[browser_click / browser_type / browser_fill_form - user actions]
    J --> K[browser_wait_for - dynamic content/network]
    K --> L[browser_snapshot - post-interaction UI state]
    L --> M[browser_console_messages / browser_network_requests - debug logs]
    M --> N{Expected behavior confirmed?}
    N -->|No| O[Debug with other tools / browser_take_screenshot]
    N -->|Yes| P[store_memory - successful validation pattern]
    P --> Q[Update task status to 'testing' or 'done']
    O --> F
```

**Key Steps & Tool Combinations** (Based on practical exploration):
1.  **Server Verification**: **MANDATORY** server status check using the `API Validation Workflow` to ensure the application is accessible.
2.  **Navigate & Interact**: `browser_navigate` to the target page (e.g., `http://localhost:3000/auth/login`). Use `browser_click`, `browser_type`, `browser_fill_form`, `browser_select_option` for simulating user interactions.
3.  **Responsive Testing**: `browser_resize` to test UI behavior across different screen dimensions (e.g., `width: 375, height: 667`).
4.  **State Verification**: `browser_snapshot` to capture the DOM for assertion, `browser_wait_for` to handle asynchronous content loading.
5.  **Debugging**: `browser_console_messages` and `browser_network_requests` to inspect client-side errors and API calls. `browser_take_screenshot` for visual regression (e.g., `fullPage: true`).
6.  **Validation & Documentation**: `store_memory` for successful test patterns and `update_task_status`.
7.  **Recovery from Closed Session**: If the browser session closes unexpectedly (`Error: Target page, context or browser has been closed`), re-initialize by using `browser_navigate` to a simple, known URL (e.g., `https://www.example.com`) to bring the browser to a stable state before proceeding with the task.

**Example Scenario: Testing a login form**
1.  `browser_navigate({ url: "http://localhost:3000/auth/login" })`
2.  `browser_fill_form({ fields: [{ name: "Email input", type: "textbox", ref: "...", value: "test@example.com" }, { name: "Password input", "type": "textbox", ref: "...", value: "password123" }] })`
3.  `browser_click({ element: "Login button", ref: "..." })`
4.  `browser_wait_for({ text: "Welcome back!" })` or `browser_navigate({ url: "http://localhost:3000/dashboard" })`
5.  `browser_console_messages({ random_string: "login-console-logs" })` (check for client-side errors)
6.  `store_memory({ type: "code_pattern", title: "Login Flow Validation", content: "...", tags: ["e2e", "authentication", "playwright"] })`

### 3.3 Online Tool Integration Workflow

**Objective**: Utilize online tools (e.g., code formatters, image optimizers, JSON validators) for development tasks.

**Workflow Sequence**:
```mermaid
graph TD
    A[Task Requiring Online Tool] --> B[browser_navigate - to online tool site]
    B --> C[browser_type / browser_fill_form - input data]
    C --> D[browser_click - process button]
    D --> E[browser_wait_for - result to appear]
    E --> F[browser_evaluate - extract processed output]
    F --> G[Edit code with processed output]
    G --> H[store_memory - tool usage pattern]
```

**Key Steps & Tool Combinations** (Based on practical exploration):
1.  **Navigate**: `browser_navigate` to the desired online tool (e.g., `https://jsonformatter.org/`).
2.  **Input Data**: Use `browser_type` or `browser_fill_form` to input the data needing processing.
3.  **Process & Extract**: `browser_click` to trigger the tool's function, `browser_wait_for` for results, then `browser_evaluate` to extract the output.
4.  **Integrate & Document**: Use the output to `edit_file` in the codebase and `store_memory` the workflow.

**Example Scenario: Formatting a JSON snippet**
1.  `browser_navigate({ url: "https://jsonformatter.org/" })`
2.  `browser_type({ element: "JSON input area", ref: "...", text: "{'key':'value', 'nested':{'another':'data'}}" })` (replace ref with actual from snapshot)
3.  `browser_click({ element: "Process button", ref: "..." })` (replace ref with actual from snapshot)
4.  `browser_wait_for({ text: "Formatted JSON output" })` (wait for specific text indicating completion)
5.  `browser_evaluate({ function: "() => document.querySelector('#output-area').innerText" })` (to extract formatted JSON)
6.  `edit_file({ target_file: "...", instructions: "...", code_edit: "..." })`
7.  `store_memory({ type: "code_pattern", title: "JSON Formatting with Online Tool", content: "...", tags: ["online-tool", "json-formatting"] })`

## 4. Best Practices & Advanced Techniques

### 4.1 Robust Element Selection
-   **Prioritize `ref`**: When available from `browser_snapshot`, always use the `ref` for precise targeting.
-   **Descriptive `element`**: Provide a clear, human-readable `element` description for permissions and context (e.g., "Login button", "Email input field").
-   **Retry Logic**: For dynamic content, combine `browser_snapshot` with `browser_wait_for` to ensure elements are present before interaction.

### 4.2 Error Handling & Debugging
-   **Console & Network Logs**: Regularly check `browser_console_messages` and `browser_network_requests` for client-side and API-related issues.
-   **Screenshots**: Use `browser_take_screenshot` for visual debugging, especially after unexpected UI states (e.g., `fullPage: true`).
-   **JS Evaluation**: `browser_evaluate` is powerful for inspecting DOM elements, JavaScript variables, and triggering client-side functions directly for debugging.
-   **Session Recovery**: If a browser session becomes unstable or closes (`Error: Target page, context or browser has been closed`), **immediately use `browser_navigate` to a simple, known URL (e.g., `https://www.example.com`) to re-establish a stable working browser context.**

### 4.3 Multi-Tab & Multi-Window Workflows
-   **`browser_tabs`**: Use `browser_tabs({ action: 'new' })` to open new tabs for parallel research or to isolate workflows.
-   **Context Isolation**: Be mindful that each tab operates in its own context; explicitly switch or close tabs as needed.

### 4.4 Performance & Optimization
-   **Minimize Snapshots**: Only take `browser_snapshot` when necessary to identify new elements or verify major UI changes, as it can be resource-intensive.
-   **Efficient Waiting**: Prefer `browser_wait_for({ text: "..." })` or `browser_wait_for({ time: X })` over arbitrary `sleep` calls for better synchronization.

### 4.5 Security Considerations
-   **Sensitive Data**: Avoid logging or storing sensitive information accessed via browser tools in plain text memories.
-   **Sandbox Environment**: Be aware of the sandbox environment and its limitations when interacting with external sites.

## 5. Integration with Other MCP Tools

### 5.1 With Codebase Search (`codebase_search`)
-   **Bridge External & Internal Knowledge**: Browser research can inform `codebase_search` queries with relevant keywords or architectural patterns found online. Find a solution online, then use `codebase_search` to locate similar implementations within the project.

### 5.2 With Memory Management (`store_memory`, `search_memories`, `relate_memories`)
-   **Knowledge Base Enrichment**: Every significant discovery or validated pattern from browser interactions **MUST** be stored as a memory.
-   **Pattern Learning**: Browser workflows can be documented as `code_pattern` memories for future reuse.

### 5.3 With API Validation (`get_openapi_spec`, `make_api_request`)
-   **Full-Stack Validation**: Use browser tools for front-end validation after `make_api_request` has confirmed backend API functionality.
-   **Debugging Client-API Interaction**: `browser_network_requests` can help debug issues where the front-end is not correctly interacting with the backend API.

### 5.4 With Task Management (`create_task`, `update_task_status`)
-   **Task Creation**: Browser research might reveal new sub-tasks or requirements that can be captured using `create_task`.
-   **Progress Updates**: Successful browser validation directly informs `update_task_status`.

## 6. Mandatory Browser Testing Protocol

**CRITICAL VALIDATION REQUIREMENT:**
-   **ALL implementations must be validated using Playwright browser automation.**
-   **Cannot advance to next task/subtask without successful browser testing.**
-   **Browser testing serves as autonomous validation similar to API testing.**
-   **For both Front-End and Back-End tasks, browser validation is required to ensure complete integration.**
-   **Use browser for research, market analysis, and accessing latest documentation.**
-   **Browser usage is freely allowed for staying updated with current technologies.**

## 7. Future Evolution & Learning

-   **Continuous Refinement**: This rule will evolve based on new browser tool capabilities and successful application patterns.
-   **User Feedback**: User corrections and preferences regarding browser tool usage will directly inform updates to this training guide.
-   **Performance Monitoring**: Monitor the efficiency and effectiveness of browser-based workflows to identify areas for improvement.