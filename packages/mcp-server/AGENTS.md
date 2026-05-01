# AGENTS.md - @igniter-js/mcp-server

> **Last Updated:** 2026-01-29
> **Version:** 0.0.63
> **Goal:** This document is the complete operational manual for Code Agents interacting with @igniter-js/mcp-server.

---

## 1. Package Vision & Context

@igniter-js/mcp-server provides a **STDIO-based MCP server** that exposes a verified set of tools for AI agents to work on Igniter.js projects. It is not a framework runtime; it is a **tool bridge** that enables safe, observable, and automatable workflows.

This server focuses on:

- CLI automation for Igniter.js development tasks
- OpenAPI inspection and API request testing
- Documentation fetching and Markdown conversion
- GitHub issue lifecycle management
- File and code analysis utilities
- Memory persistence in MDX files
- Task management and agent delegation
- Debugging and process inspection

The package uses the official MCP SDK (`@modelcontextprotocol/sdk`) and communicates strictly over STDIO to preserve interoperability with a wide range of MCP clients.

---

## I. MAINTAINER GUIDE (Internal Architecture)

### 2. FileSystem Topology (Maintenance)

Below is the full `src/` topology, with responsibilities.

```
src/
	index.ts
	constants/
		index.ts
	toolsets/
		index.ts
		types.ts
		cli.ts
		api-validation.ts
		documentation.ts
		github.ts
		file-analysis.ts
		code-investigation.ts
		memory.ts
		task-management.ts
		agent-delegation.ts
		debugging.ts
	memory/
		manager.ts
		factories.ts
		types.ts
		fs.ts
		parser.ts
	agents/
		executor.ts
		providers.ts
		types.ts
	utils/
		exec.ts
		file-analysis.ts
		ast-parsing.ts
		code-investigation.ts
```

**Key responsibilities:**

- `index.ts` → MCP server initialization and registration
- `toolsets/*` → tool registration grouped by domain
- `memory/*` → MDX-based memory persistence and task management
- `agents/*` → YOLO-mode delegation to native agent CLIs
- `utils/*` → low-level analysis, AST parsing, exec, file system helpers

---

### 3. Architecture Deep-Dive

#### 3.1 MCP Server Lifecycle

1. Initialize dependencies (`Octokit`, `TurndownService`, `MemoryManager`).
2. Create `McpServer` instance with name/version.
3. Build `ToolsetContext` (server + injected dependencies).
4. Register all toolsets (env toggles allow opt-out).
5. Connect `StdioServerTransport`.
6. Initialize memory manager and requeue background jobs.

#### 3.2 Toolset Registration Pattern

Toolsets follow a consistent registration pattern:

- A `registerXTools(context)` function
- A list of `server.registerTool(...)` calls
- Explicit Zod schemas per tool
- Input/output mapping in async handler

Toolsets are registered in `src/toolsets/index.ts` and can be disabled via environment flags.

#### 3.3 Memory System

Memory is persisted as **MDX files** in `.github/lia/memories/`.

Key components:

- `FileSystemService` → atomic IO and directory structure
- `MdxParser` → gray-matter parsing + Zod validation
- `MemoryManager` → orchestration, indexing, relationships, search

#### 3.4 Agent Delegation

Delegation is YOLO-first:

- Gemini CLI (`gemini`)
- Claude Code (`claude`)
- OpenAI Codex CLI (`codex`)

The executor builds a **task prompt**, constructs **provider-specific CLI args**, and executes with YOLO environment variables.

---

### 4. Operational Flow Mapping (Pipelines)

Below is the internal pipeline for each toolset. Each flow is derived from the actual code paths.

#### 4.1 CLI Tools

##### Tool: `start_dev_server`

1. Build command string: `npx @igniter-js/cli@latest dev` + port flags
2. Execute with `execAsync`
3. Return stdout + stderr as tool response

##### Tool: `build_project`

1. Set `NODE_ENV=production` if mode is production
2. Run `npm run build`
3. Return output and errors

##### Tool: `run_tests`

1. Build args (`--filter`, `--watch`)
2. Execute `npm test` with args
3. Return output + errors

##### Tool: `generate_feature`

1. Build command: `npx @igniter-js/cli@latest generate feature <name>`
2. Include `--schema` if provided
3. Execute and return output

##### Tool: `generate_schema`

1. Prepare args (output, watch, docs, docsOutput)
2. Run two commands:
	 - `generate schema`
	 - `generate docs`
3. Return output or error

##### Tool: `add_package_dependency`

1. Detect package manager by lockfile
2. Run `npm install` / `yarn add` / `bun add`
3. Return stdout

##### Tool: `remove_package_dependency`

1. Detect package manager
2. Run `npm uninstall` / `yarn remove` / `bun remove`
3. Return stdout

#### 4.2 API Validation Tools

##### Tool: `get_openapi_spec`

1. Resolve URL (default to local dev docs)
2. Fetch with Axios
3. Return JSON string

##### Tool: `make_api_request`

1. Build Axios config from method/url/headers/body
2. Auto-add `Content-Type` for JSON
3. Execute request
4. Return status/headers/data or structured error

#### 4.3 Documentation Tools

##### Tool: `read_as_markdown`

1. Fetch URL with Axios
2. Convert HTML to Markdown using Turndown
3. Return Markdown string

#### 4.4 GitHub Tools

All GitHub tools use Octokit with a token from `GITHUB_TOKEN`.

##### Tool: `search_github_issues`

1. Build query string with repo scope
2. Call `octokit.rest.search.issuesAndPullRequests`
3. Map response to summary

##### Tool: `create_github_issue`

1. Parse repo owner/name
2. Call `octokit.rest.issues.create`
3. Return issue metadata

##### Tool: `get_github_issue`

1. Parse repo owner/name
2. Call `octokit.rest.issues.get`
3. Return issue metadata

##### Tool: `update_github_issue`

1. Parse repo owner/name
2. Build update payload
3. Call `octokit.rest.issues.update`

##### Tool: `close_github_issue`

1. Parse repo owner/name
2. Set state to closed via `issues.update`

##### Tool: `list_github_issue_comments`

1. Parse repo owner/name
2. Call `issues.listComments`

##### Tool: `create_github_issue_comment`

1. Parse repo owner/name
2. Call `issues.createComment`

##### Tool: `update_github_issue_comment`

1. Parse repo owner/name
2. Call `issues.updateComment`

##### Tool: `delete_github_issue_comment`

1. Parse repo owner/name
2. Call `issues.deleteComment`

##### Tool: `search_github_code`

1. Build search query
2. Call `octokit.rest.search.code`
3. Return result list

##### Tool: `read_github_file`

1. Call `repos.getContent`
2. Decode base64 file content
3. Return raw file contents

##### Tool: `list_github_repository_content`

1. Call `repos.getContent` for dir
2. Return file list metadata

#### 4.5 File Analysis Tools

##### Tool: `analyze_file`

1. Read file content
2. Parse AST structure
3. Run TS diagnostics (if enabled)
4. Compute health summary

##### Tool: `analyze_feature`

1. Resolve feature path and project root
2. Collect files (find + head)
3. Analyze each file with diagnostics
4. Build aggregated stats and recommendations

#### 4.6 Code Investigation Tools

##### Tool: `find_implementation`

1. Parse imports in file
2. Resolve module paths
3. Search for symbol definition
4. Return implementation list

##### Tool: `explore_source`

1. Parse AST structure
2. Analyze specific symbol if provided
3. Return imports/exports/context

##### Tool: `trace_dependency_chain`

1. Resolve project root
2. Trace imports recursively until symbol definition
3. Return hop chain

#### 4.7 Memory Tools

##### Tool: `store_memory`

1. Initialize project root
2. Build frontmatter
3. Generate MDX content
4. Write memory file

##### Tool: `search_memories`

1. Build in-memory index
2. Apply filters (type, tags, confidence)
3. Return scored results

##### Tool: `relate_memories`

1. Load source memory
2. Create relationship record
3. Update frontmatter

##### Tool: `visualize_memory_graph`

1. Traverse relationships (BFS)
2. Emit Mermaid graph

##### Tool: `reflect_on_memories`

1. Create reflection summary
2. Store in reflection memory type

#### 4.8 Task Management Tools

##### Tool: `create_task`

1. Store new task memory with frontmatter
2. Add dependency relationships if provided

##### Tool: `list_tasks`

1. Use optimized `listTasks`
2. Compute summary counts by status/priority/type

##### Tool: `update_task_status`

1. Find task across types
2. Update status + append notes

##### Tool: `get_task_statistics`

1. Aggregate metrics from `listTasks`
2. Provide delegation insights

##### Tool: `delete_task`

1. Check dependency graph
2. Handle cascade/unlink/fail mode
3. Delete task memory

##### Tool: `reorder_tasks`

1. Validate task IDs
2. Update `execution_order` metadata

#### 4.9 Agent Delegation Tools

##### Tool: `delegate_to_agent`

1. Validate agent provider
2. Fetch task memory
3. Configure YOLO mode
4. Execute sync or background
5. Update task status + reports

##### Tool: `check_delegation_status`

1. Read delegation status from task
2. Stream last N lines from log file

##### Tool: `list_active_delegations`

1. Scan tasks for queued/running
2. Optionally include recent

##### Tool: `cancel_delegation`

1. Set status to cancelled (queued)
2. Kill process if running

##### Tool: `find_delegation_candidates`

1. Filter tasks by complexity, tags, dependencies
2. Return sorted candidates

##### Tool: `monitor_agent_tasks`

1. Aggregate task analytics
2. List recent tasks

##### Tool: `check_agent_environment`

1. Validate Node version
2. Check CLI availability
3. Validate API keys

##### Tool: `setup_agent_environment`

1. Generate platform-specific instructions
2. Return Markdown or shell format

#### 4.10 Debugging Tools

##### Tool: `get_process_info`

1. Validate PID with `process.kill(pid, 0)`
2. Run `ps` and `lsof`
3. Return process metadata

##### Tool: `inspect_runtime_variable`

1. Attach with Chrome DevTools Protocol
2. Evaluate expression
3. Return serialized value

##### Tool: `list_processes_on_port`

1. Run `lsof -i` on port
2. Parse output into structured list

---

### 5. Dependency & Type Graph

- `ToolsetContext` injects `McpServer`, `MemoryManager`, `Octokit`, `TurndownService`, `execAsync`.
- `MemoryManager` uses `FileSystemService` and `MdxParser`.
- `MemoryManager` can call `executeWithAgent` for delegation.
- `executeWithAgent` depends on provider configuration (`AGENT_PROVIDERS`).

---

### 6. State & Immutability

- The server itself is stateless, except for memory and task persistence.
- Memory writes are atomic via `FileSystemService.writeFileAtomic`.
- Task delegation state is stored in memory frontmatter (status, progress, timestamps).

---

### 7. Contribution Checklist (Maintainer)

When adding or modifying tools:

1. Add tool registration with clear name and Zod schema.
2. Ensure outputs are plain text or JSON strings.
3. Avoid `stdout` logging in server core.
4. Add error messages that do not break JSON-RPC.
5. Update this AGENTS.md with new tool flows.
6. Update README with new API reference.

---

### 8. Maintainer Troubleshooting

**Symptom:** Tool output breaks MCP JSON-RPC

- Cause: `console.log` or `stdout` writes in server.
- Fix: Use `process.stderr.write` for logs.

**Symptom:** Memory initialization fails

- Cause: `.github/lia/memories` not writable.
- Fix: Ensure project root is writable or adjust permissions.

**Symptom:** Agent delegation stalls

- Cause: CLI not installed or API key missing.
- Fix: Run `check_agent_environment`.

---

## II. CONSUMER GUIDE (Developer Manual)

### 9. Distribution Anatomy (Consumption)

The package ships with:

- `dist/index.js` (main)
- `dist/index.d.ts` (types)
- `bin` entry: `igniter-mcp`

Usage from npm:

- Install package
- Run `igniter-mcp` or `npx @igniter-js/mcp-server`
- Connect MCP client via STDIO

---

### 10. Quick Start & Common Patterns

#### 10.1 Start server

```bash
npx @igniter-js/mcp-server
```

#### 10.2 Fetch OpenAPI spec

```json
{
	"tool": "get_openapi_spec",
	"input": {
		"url": "http://localhost:3000/api/v1/docs/openapi.json"
	}
}
```

#### 10.3 Store a memory

```json
{
	"tool": "store_memory",
	"input": {
		"type": "insight",
		"title": "Use MCP for automation",
		"content": "STDIO keeps transport simple and reliable."
	}
}
```

---

### 11. Real-World Use Case Library

#### Case A: API Regression Testing

```json
{
	"tool": "make_api_request",
	"input": {
		"method": "GET",
		"url": "http://localhost:3000/api/v1/health"
	}
}
```

#### Case B: Automated Issue Triage

```json
{
	"tool": "search_github_issues",
	"input": {
		"query": "broken",
		"state": "open"
	}
}
```

#### Case C: Feature Health Audit

```json
{
	"tool": "analyze_feature",
	"input": {
		"featurePath": "/Users/me/project/src/features/users",
		"projectRoot": "/Users/me/project"
	}
}
```

#### Case D: Task Delegation Playbook

```json
{
	"tool": "create_task",
	"input": {
		"title": "Refactor task manager",
		"content": "Improve listTasks filtering",
		"priority": "high",
		"assignee": "agent"
	}
}
```

```json
{
	"tool": "delegate_to_agent",
	"input": {
		"task_id": "task-refactor-task-manager",
		"agent_type": "gemini"
	}
}
```

#### Case E: Documentation Harvesting

```json
{
	"tool": "read_as_markdown",
	"input": {
		"url": "https://igniterjs.com/docs"
	}
}
```

#### Case F: Runtime Debugging

```json
{
	"tool": "inspect_runtime_variable",
	"input": {
		"process_id": 12345,
		"variable_name": "globalThis.CONFIG",
		"debug_port": 9229
	}
}
```

#### Case G: Knowledge Graph Visualization

```json
{
	"tool": "visualize_memory_graph",
	"input": {
		"center_type": "architectural_decision",
		"center_id": "decision-use-mcp",
		"depth": 2
	}
}
```

#### Case H: Dependency Trace

```json
{
	"tool": "trace_dependency_chain",
	"input": {
		"symbol": "IgniterCollections",
		"startFile": "/Users/me/project/src/index.ts"
	}
}
```

---

### 12. Best Practices & Anti-Patterns

| Practice | Why | Example |
| --- | --- | --- |
| ✅ Use `ENABLE_*` flags | Control tool surface | `ENABLE_GITHUB_TOOLS=false` |
| ✅ Store decisions in memory | Persistent context | `store_memory` with type `architectural_decision` |
| ✅ Use `check_agent_environment` | Avoid delegation failures | Run before delegation |
| ❌ Print to stdout | Breaks JSON-RPC | Use stderr instead |
| ❌ Run YOLO without review | Risky | Always review delegated changes |
| ❌ Store secrets in memory | Unsafe | Keep secrets out of MDX files |

---

### 13. Domain-Specific Guidance

#### 13.1 CI / Automation

- Use `build_project` and `run_tests` from agents
- Use `analyze_file` to capture TypeScript diagnostics

#### 13.2 Documentation Teams

- Use `read_as_markdown` to ingest docs
- Store summaries with `store_memory`

#### 13.3 DevOps

- `get_process_info` and `list_processes_on_port` for infra checks
- Avoid `inspect_runtime_variable` unless process was started with `--inspect`

---

### 14. Exhaustive Error & Troubleshooting Library

#### ERROR: Memory initialization failed

- **Context:** Startup when `.github/lia/memories` cannot be created.
- **Cause:** Permissions or invalid project root.
- **Mitigation:** Ensure repo root is writable.
- **Solution:** Fix permissions, rerun server.

#### ERROR: TypeScript dependency not found

- **Context:** `analyze_file` uses local TypeScript binary.
- **Cause:** Target project missing `typescript`.
- **Mitigation:** Install TypeScript in the project.
- **Solution:** `npm install -D typescript`

#### ERROR: Failed to fetch OpenAPI spec

- **Context:** `get_openapi_spec` network error.
- **Cause:** Server not running or wrong URL.
- **Mitigation:** Confirm local server port.
- **Solution:** Start dev server or correct URL.

#### ERROR: API request failed

- **Context:** `make_api_request` returns 4xx/5xx.
- **Cause:** Authorization or endpoint errors.
- **Mitigation:** Provide headers and correct method.
- **Solution:** Add `Authorization` header or fix payload.

#### ERROR: Permission denied for process info

- **Context:** `get_process_info` on restricted PID.
- **Cause:** OS permission constraints.
- **Mitigation:** Use same user or run with permissions.
- **Solution:** Use `sudo` outside MCP if needed.

#### ERROR: Connection refused (inspect_runtime_variable)

- **Context:** Chrome DevTools connection fails.
- **Cause:** Target process not started with `--inspect`.
- **Mitigation:** Start process with `node --inspect`.
- **Solution:** Restart with correct flag.

#### ERROR: Task not found

- **Context:** `update_task_status` or `delegate_to_agent`.
- **Cause:** Missing task ID.
- **Mitigation:** Use `list_tasks` to find IDs.
- **Solution:** Retry with correct ID.

#### ERROR: Delegation failed

- **Context:** `delegate_to_agent` returns validation failure.
- **Cause:** Missing CLI or API key.
- **Mitigation:** Run `check_agent_environment`.
- **Solution:** Install CLI and set API keys.

#### ERROR: Output file not accessible

- **Context:** Delegation status cannot read log file.
- **Cause:** File deleted or permission change.
- **Mitigation:** Avoid deleting `.github/lia/memories/jobs`.
- **Solution:** Re-run delegation.

---

## III. TECHNICAL REFERENCE & RESILIENCE

### 16. Telemetry & Observability Registry

This package does **not** emit telemetry events. It uses structured tool outputs and logs to stderr.

---

### 17. Security & Compliance Notes

- Never print to stdout in server code.
- Always validate external inputs (Zod schemas are required).
- Avoid storing secrets in memory files.
- Review delegated changes before merging.

---

### 18. Appendix: Memory Types

- code_pattern
- architectural_decision
- user_preference
- insight
- relationship_map
- reflection
- bug_pattern
- performance_insight
- api_mapping
- requirement
- design
- task
- bug_report

---

### 19. Appendix: Relationship Types

- depends_on
- implements
- uses
- similar_to
- contradicts
- extends
- contains
- inspired_by
- supersedes

---

### 20. Appendix: Agent Providers

- gemini (GEMINI_API_KEY)
- claude (ANTHROPIC_API_KEY)
- codex (OPENAI_API_KEY)

---

### 21. Appendix: Environment Flags

- ENABLE_CLI_TOOLS
- ENABLE_API_VALIDATION_TOOLS
- ENABLE_DOCUMENTATION_TOOLS
- ENABLE_GITHUB_TOOLS
- ENABLE_FILE_ANALYSIS_TOOLS
- ENABLE_CODE_INVESTIGATION_TOOLS
- ENABLE_DEBUGGING_TOOLS
- ENABLE_MEMORY_TOOLS
- ENABLE_TASK_MANAGEMENT_TOOLS
- ENABLE_AGENT_DELEGATION_TOOLS

---

### 22. Change Safety Checklist

- [ ] Tool inputs validated with Zod
- [ ] Tool outputs plain JSON/text
- [ ] No stdout logs in server core
- [ ] README updated with API changes
- [ ] AGENTS updated with architecture changes
- [ ] No secrets stored in memory

---

### 23. Glossary

- **MCP:** Model Context Protocol
- **STDIO:** Standard input/output transport
- **YOLO mode:** Fully autonomous agent execution
- **Memory:** MDX-based persistence layer
- **Toolset:** Group of related MCP tools

---

### 24. Maintainer Notes

- Avoid adding tools without clear use-case and Zod schema.
- Keep tool names stable; they are public API.
- Prefer additive changes to avoid breaking client configs.

---

### 25. Consumer FAQ

**Q: Does this server expose HTTP endpoints?**

A: No. It uses STDIO via MCP.

**Q: Where are memories stored?**

A: `.github/lia/memories/` under project root.

**Q: Can I disable GitHub tools?**

A: Yes. Set `ENABLE_GITHUB_TOOLS=false`.

**Q: Does delegation run in a sandbox?**

A: Gemini and Codex support sandboxing; Claude does not.

---

### 26. Maintenance Risks

- **Breaking tool names** will break existing MCP clients.
- **Changing memory layout** can orphan existing MDX files.
- **Adding stdout logs** can corrupt MCP JSON-RPC streams.

---

### 27. Ready-to-Use Snippets

#### Snippet: Disable unsafe tools

```bash
export ENABLE_AGENT_DELEGATION_TOOLS=false
export ENABLE_DEBUGGING_TOOLS=false
```

#### Snippet: Provide GitHub token

```bash
export GITHUB_TOKEN="your-token"
```

#### Snippet: Minimal MCP config

```json
{
	"command": "node",
	"args": ["./node_modules/@igniter-js/mcp-server/dist/index.js"]
}
```

---

### 28. Appendix: Tool Output Expectations

- All outputs are wrapped as MCP `content` arrays.
- Most tools return `type: "text"` payloads.
- JSON payloads are stringified.

---

### 29. Appendix: Performance Considerations

- `analyze_feature` reads up to 50 files by default.
- `search_memories` builds an in-memory index each call.
- Delegation jobs are queued with concurrency 2.

---

### 30. Appendix: Non-Goals

- No HTTP server
- No UI
- No telemetry events
- No database dependencies

---

### 31. Detailed Tool Input Schemas (Field-by-Field)

This appendix is intended for maintainers to verify schema compatibility.

#### `start_dev_server`

- `port`: number (optional)
- `watch`: boolean (optional)

#### `build_project`

- `mode`: "development" | "production" (optional)

#### `run_tests`

- `filter`: string (optional)
- `watch`: boolean (optional)

#### `generate_feature`

- `name`: string (required)
- `schema`: string (optional)

#### `generate_schema`

- `output`: string (optional)
- `watch`: boolean (optional)
- `docs`: boolean (optional)
- `docsOutput`: string (optional)

#### `add_package_dependency`

- `package_name`: string (required)
- `version`: string (optional)
- `dev_dependency`: boolean (optional)

#### `remove_package_dependency`

- `package_name`: string (required)

#### `get_openapi_spec`

- `url`: string (optional)

#### `make_api_request`

- `method`: GET | POST | PUT | DELETE | PATCH
- `url`: string
- `headers`: Record<string,string> (optional)
- `body`: any (optional)
- `timeout`: number (optional)

#### `read_as_markdown`

- `url`: string (required)

#### `search_github_issues`

- `query`: string
- `repository`: string (optional)
- `state`: open | closed | all (optional)
- `labels`: string[] (optional)
- `sort`: created | updated | comments (optional)
- `order`: asc | desc (optional)
- `per_page`: number (optional)

#### `create_github_issue`

- `title`: string
- `body`: string
- `repository`: string (optional)
- `labels`: string[] (optional)
- `assignees`: string[] (optional)

#### `get_github_issue`

- `issueNumber`: number
- `repository`: string (optional)

#### `update_github_issue`

- `issueNumber`: number
- `repository`: string (optional)
- `title`: string (optional)
- `body`: string (optional)
- `labels`: string[] (optional)
- `assignees`: string[] (optional)
- `state`: open | closed (optional)
- `milestone`: number (optional)

#### `close_github_issue`

- `issueNumber`: number
- `repository`: string (optional)

#### `list_github_issue_comments`

- `issueNumber`: number
- `repository`: string (optional)
- `per_page`: number (optional)
- `page`: number (optional)

#### `create_github_issue_comment`

- `issueNumber`: number
- `body`: string
- `repository`: string (optional)

#### `update_github_issue_comment`

- `commentId`: number
- `body`: string
- `repository`: string (optional)

#### `delete_github_issue_comment`

- `commentId`: number
- `repository`: string (optional)

#### `search_github_code`

- `query`: string
- `repository`: string (optional)
- `language`: string (optional)
- `filename`: string (optional)

#### `read_github_file`

- `owner`: string
- `repo`: string
- `path`: string
- `ref`: string (optional)

#### `list_github_repository_content`

- `owner`: string
- `repo`: string
- `path`: string (optional)
- `ref`: string (optional)

#### `analyze_file`

- `filePath`: string
- `includeErrors`: boolean (optional)
- `projectRoot`: string (optional)

#### `analyze_feature`

- `featurePath`: string
- `projectRoot`: string
- `includeStats`: boolean (optional)

#### `find_implementation`

- `symbol`: string
- `filePath`: string
- `projectRoot`: string (optional)

#### `explore_source`

- `filePath`: string
- `symbol`: string (optional)
- `includeContext`: boolean (optional)

#### `trace_dependency_chain`

- `symbol`: string
- `startFile`: string
- `maxDepth`: number (optional)

#### `store_memory`

- `type`: MemoryType (optional)
- `title`: string
- `content`: string
- `category`: string (optional)
- `confidence`: number (optional)
- `tags`: string[] (optional)
- `related_memories`: string[] (optional)

#### `search_memories`

- `text`: string (optional)
- `tags`: string[] (optional)
- `type`: MemoryType (optional)
- `confidence_min`: number (optional)
- `confidence_max`: number (optional)
- `include_sensitive`: boolean (optional)

#### `relate_memories`

- `from_type`: MemoryType
- `from_id`: string
- `to_type`: MemoryType
- `to_id`: string
- `relationship_type`: RelationshipType
- `strength`: number (optional)
- `confidence`: number (optional)

#### `visualize_memory_graph`

- `center_type`: MemoryType
- `center_id`: string
- `depth`: number (optional)

#### `reflect_on_memories`

- `title`: string (optional)
- `content`: string (optional)
- `tags`: string[] (optional)

#### `list_tasks`

- `status`: todo | in_progress | blocked | testing | done | cancelled
- `priority`: low | medium | high | urgent
- `feature_id`: string (optional)
- `assignee`: string (optional)
- `include_subtasks`: boolean (optional)

#### `update_task_status`

- `task_id`: string
- `new_status`: todo | in_progress | blocked | testing | done | cancelled
- `notes`: string (optional)

#### `get_task_statistics`

- `assignee`: string (optional)
- `feature_id`: string (optional)
- `include_delegation_insights`: boolean (optional)

#### `create_task`

- `title`: string
- `content`: string
- `feature_id`: string (optional)
- `priority`: low | medium | high | urgent
- `assignee`: human | agent
- `estimated_hours`: number (optional)
- `due_date`: string (optional)
- `dependencies`: string[] (optional)
- `tags`: string[] (optional)
- `context_files`: string[] (optional)

#### `delete_task`

- `task_id`: string
- `handle_dependencies`: cascade | unlink | fail

#### `reorder_tasks`

- `scope_id`: string
- `task_order`: string[]

#### `delegate_to_agent`

- `task_id`: string
- `agent_type`: gemini | claude | codex
- `execution_mode`: background | sync (optional)
- `execution_config`: object (optional)
- `context`: object (optional)

#### `check_delegation_status`

- `task_id`: string

#### `list_active_delegations`

- `include_recent`: boolean (optional)
- `max_results`: number (optional)

#### `cancel_delegation`

- `task_id`: string

#### `find_delegation_candidates`

- `complexity_threshold`: low | medium | high
- `independence_required`: boolean (optional)
- `max_estimated_hours`: number (optional)
- `assignee_filter`: string (optional)
- `required_tags`: string[] (optional)
- `exclude_tags`: string[] (optional)

#### `monitor_agent_tasks`

- `agent_type`: all | gemini | claude | codex
- `task_filter`: string (optional)
- `include_logs`: boolean (optional)
- `log_lines`: number (optional)
- `include_analytics`: boolean (optional)

#### `check_agent_environment`

- `check_docker`: boolean (optional)
- `check_api_keys`: boolean (optional)
- `check_models`: boolean (optional)
- `detailed_report`: boolean (optional)
- `debug_env`: boolean (optional)

#### `setup_agent_environment`

- `platform`: auto | macos | linux | windows
- `format`: markdown | shell
- `include_docker`: boolean (optional)
- `include_api_setup`: boolean (optional)

#### `get_process_info`

- `process_id`: number

#### `inspect_runtime_variable`

- `process_id`: number
- `variable_name`: string
- `debug_port`: number (optional)
- `file_path`: string (optional)

#### `list_processes_on_port`

- `port`: number
- `protocol`: tcp | udp (optional)

---

### 32. File-by-File Responsibilities (Deep Map)

#### `src/index.ts`

- Instantiates `McpServer` with name/version
- Creates dependencies (Turndown, Octokit, MemoryManager)
- Registers toolsets
- Starts `StdioServerTransport`
- Initializes memory and requeues jobs

#### `src/constants/index.ts`

- Defines memory type lists
- Defines relationship type lists
- Defines task type lists

#### `src/toolsets/index.ts`

- Registers all toolsets
- Checks env toggles for each toolset

#### `src/toolsets/types.ts`

- Defines `ToolsetContext`

#### `src/toolsets/*.ts`

- Each toolset registers tools with MCP server
- Each tool validates input schema with Zod

#### `src/memory/manager.ts`

- Orchestrates memory operations
- Builds search index
- Manages delegation jobs (queue)

#### `src/memory/fs.ts`

- Resolves project root
- Handles atomic writes

#### `src/memory/parser.ts`

- Parses MDX with gray-matter
- Validates frontmatter with Zod

#### `src/agents/executor.ts`

- Builds command and prompt
- Executes agent CLI with YOLO config

#### `src/agents/providers.ts`

- Provider registry for Gemini/Claude/Codex
- Maps permission modes to CLI arguments

#### `src/utils/exec.ts`

- Robust exec helper
- Loads .env files

#### `src/utils/ast-parsing.ts`

- AST parsing for TS/JS
- TypeScript diagnostics parsing

#### `src/utils/code-investigation.ts`

- Import/export extraction
- Symbol search & tracing

---

### 33. Compatibility Notes

- `@modelcontextprotocol/sdk` is required for MCP server.
- `turndown` converts HTML to Markdown in docs tool.
- `octokit` requires valid GitHub token for write actions.

---

### 34. Known Limitations

- `analyze_feature` caps analysis at ~50 files
- `search_memories` rebuilds index on each call
- Delegation logs are stored in `.github/lia/memories/jobs`

---

### 35. Maintenance Checklist (Before Release)

- [ ] Verify tool registration names and schemas
- [ ] Update README and AGENTS
- [ ] Run package tests
- [ ] Confirm no stdout logging


