# @igniter-js/mcp-server

<div align="center">

[![npm version](https://img.shields.io/npm/v/@igniter-js/mcp-server)](https://www.npmjs.com/package/@igniter-js/mcp-server)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue)](https://www.typescriptlang.org/)
[![MCP](https://img.shields.io/badge/MCP-Model%20Context%20Protocol-purple)](https://modelcontextprotocol.io/)

**MCP server for Igniter.js automation**  
STDIO-first MCP server that exposes CLI, code analysis, memory, delegation, and debugging tools to AI agents.

[Quick Start](#-quick-start) • [Toolsets](#-toolsets) • [Examples](#-real-world-examples) • [API Reference](#-api-reference)

</div>

---

## ✨ Why @igniter-js/mcp-server?

When you're building or maintaining Igniter.js projects, you want an AI agent to do real work, not just chat. This server exposes **verified, real tools** that let an agent:

- ✅ **Run real CLI commands** (dev server, build, tests, generators)
- ✅ **Inspect OpenAPI specs and call APIs** in live environments
- ✅ **Read documentation from the web** and convert it to Markdown
- ✅ **Manage structured memory** in `.github/lia/memories`
- ✅ **Track and delegate tasks** with full metadata and status
- ✅ **Perform code investigation** (imports, symbol trace, dependency chain)
- ✅ **Analyze file health** using local TypeScript diagnostics
- ✅ **Integrate with GitHub** for issues and repo content
- ✅ **Inspect running processes** and runtime variables

If you want reliable automation and repeatable workflows, this package gives you **first-class tooling** that matches the actual Igniter.js ecosystem.

---

## 🚀 Quick Start

### Installation

```bash
  "tool": "search_github_code",
  "input": {
    "query": "IgniterCollections.create",
    "language": "typescript",
    "repository": "felipebarcelospro/igniter-js"
  }
}
```

**Read GitHub file**

```json
{
  "tool": "read_github_file",
  "input": {
    "owner": "felipebarcelospro",
    "repo": "igniter-js",
    "path": "README.md"
  }
}
    "platform": "macos",
    "format": "markdown"
  }
}
```

### 10) Debugging Tools

**Get process info**

```json
{
  "tool": "get_process_info",
  "input": {
    "process_id": 12345
  }
}
```

**Inspect runtime variable**

```json
{
  "tool": "inspect_runtime_variable",
  "input": {
    "process_id": 12345,
    "variable_name": "globalThis.__APP_STATE__",
    "debug_port": 9229
  }
}
```

**List processes on port**

```json
{
  "tool": "list_processes_on_port",
  "input": {
    "port": 3000,
    "protocol": "tcp"
  }
}
```

---

## 🌍 Real-World Examples

### 1) API Regression Triage

```json
{
  "tool": "get_openapi_spec",
  "input": {
    "url": "http://localhost:3000/api/v1/docs/openapi.json"
  }
}
```

```json
{
  "tool": "make_api_request",
  "input": {
    "method": "GET",
    "url": "http://localhost:3000/api/v1/users",
    "timeout": 5000
  }
}
```

### 2) Automated Issue Review

```json
{
  "tool": "search_github_issues",
  "input": {
    "query": "broken build",
    "state": "open"
  }
}
```

```json
{
  "tool": "create_github_issue_comment",
  "input": {
    "issueNumber": 101,
    "body": "Investigating. Will update with diagnostics soon."
  }
}
```

### 3) Codebase Investigation

```json
{
  "tool": "find_implementation",
  "input": {
    "symbol": "IgniterStore",
    "filePath": "/Users/me/project/src/index.ts"
  }
}
```

```json
{
  "tool": "trace_dependency_chain",
  "input": {
    "symbol": "IgniterStore",
    "startFile": "/Users/me/project/src/index.ts"
  }
}
```

### 4) Persistent Team Memory

```json
{
  "tool": "store_memory",
  "input": {
    "type": "architectural_decision",
    "title": "Use MCP for agent tooling",
    "content": "We chose MCP because of STDIO-first interoperability.",
    "tags": ["architecture", "mcp"]
  }
}
```

```json
{
  "tool": "search_memories",
  "input": {
    "text": "MCP",
    "type": "architectural_decision"
  }
}
```

### 5) Delegated Refactor with Monitoring

```json
{
  "tool": "delegate_to_agent",
  "input": {
    "task_id": "task-refactor-mcp",
    "agent_type": "codex",
    "execution_mode": "background"
  }
}
```

```json
{
  "tool": "check_delegation_status",
  "input": {
    "task_id": "task-refactor-mcp"
  }
}
```

---

## 🧠 Memory System Overview

The memory system writes MDX files to `.github/lia/memories/`.

**Memory types:**

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

**Relationships:** depends_on, implements, uses, similar_to, contradicts, extends, contains, inspired_by, supersedes

---

## 🔐 Security & Permissions

- Delegation tools run in **YOLO mode** (full autonomy).
- Use sandboxing when supported (`gemini`, `codex`).
- Always review delegated changes before merging.
- Use `ENABLE_*` flags to disable any toolset you don't want to expose.

---

## ⚙️ Configuration

### Environment Variables

| Variable | Purpose |
| --- | --- |
| GITHUB_TOKEN | Auth for GitHub tools via Octokit |
| ENABLE_CLI_TOOLS | Enable/disable CLI tools (default: true) |
| ENABLE_API_VALIDATION_TOOLS | Enable/disable API validation tools |
| ENABLE_DOCUMENTATION_TOOLS | Enable/disable documentation tools |
| ENABLE_GITHUB_TOOLS | Enable/disable GitHub tools |
| ENABLE_FILE_ANALYSIS_TOOLS | Enable/disable file analysis tools |
| ENABLE_CODE_INVESTIGATION_TOOLS | Enable/disable code investigation tools |
| ENABLE_DEBUGGING_TOOLS | Enable/disable debugging tools |
| ENABLE_MEMORY_TOOLS | Enable/disable memory tools |
| ENABLE_TASK_MANAGEMENT_TOOLS | Enable/disable task management tools |
| ENABLE_AGENT_DELEGATION_TOOLS | Enable/disable agent delegation tools |

### Agent API Keys

| Provider | Env Var |
| --- | --- |
| Gemini | GEMINI_API_KEY |
| Claude | ANTHROPIC_API_KEY |
| Codex | OPENAI_API_KEY |

---

## 🧪 Testing

From repo root:

```bash
npm run test --filter @igniter-js/mcp-server
```

From package directory:

```bash
cd packages/mcp-server
npm run test
```

---

## 🛠️ Troubleshooting

### "Memory initialization failed"

- The server logs this to **stderr** to avoid breaking JSON-RPC.
- Ensure `.github/lia/memories/` is writable.

### "Process with PID not found"

- `get_process_info` returns this when PID is stale.
- Re-run with a valid PID.

### "Connection refused" for runtime inspection

- `inspect_runtime_variable` requires the process to start with `--inspect`.

### "TypeScript dependency not found"

- `analyze_file` uses the local TypeScript binary. Ensure `typescript` is installed in the project.

---

## 📚 API Reference

Every tool below is registered in `src/toolsets/*`.

### CLI Tools

| Tool | Inputs |
| --- | --- |
| start_dev_server | port?, watch? |
| build_project | mode? |
| run_tests | filter?, watch? |
| generate_feature | name, schema? |
| generate_schema | output?, watch?, docs?, docsOutput? |
| add_package_dependency | package_name, version?, dev_dependency? |
| remove_package_dependency | package_name |

### API Validation Tools

| Tool | Inputs |
| --- | --- |
| get_openapi_spec | url? |
| make_api_request | method, url, headers?, body?, timeout? |

### Documentation Tools

| Tool | Inputs |
| --- | --- |
| read_as_markdown | url |

### GitHub Tools

| Tool | Inputs |
| --- | --- |
| search_github_issues | query, repository?, state?, labels?, sort?, order?, per_page? |
| create_github_issue | title, body, repository?, labels?, assignees? |
| get_github_issue | issueNumber, repository? |
| update_github_issue | issueNumber, repository?, title?, body?, labels?, assignees?, state?, milestone? |
| close_github_issue | issueNumber, repository? |
| list_github_issue_comments | issueNumber, repository?, per_page?, page? |
| create_github_issue_comment | issueNumber, body, repository? |
| update_github_issue_comment | commentId, body, repository? |
| delete_github_issue_comment | commentId, repository? |
| search_github_code | query, repository?, language?, filename? |
| read_github_file | owner, repo, path, ref? |
| list_github_repository_content | owner, repo, path?, ref? |

### File Analysis Tools

| Tool | Inputs |
| --- | --- |
| analyze_file | filePath, includeErrors?, projectRoot? |
| analyze_feature | featurePath, projectRoot, includeStats? |

### Code Investigation Tools

| Tool | Inputs |
| --- | --- |
| find_implementation | symbol, filePath, projectRoot? |
| explore_source | filePath, symbol?, includeContext? |
| trace_dependency_chain | symbol, startFile, maxDepth? |

### Memory Tools

| Tool | Inputs |
| --- | --- |
| store_memory | type?, title, content, category?, confidence?, tags?, related_memories? |
| search_memories | text?, tags?, type?, confidence_min?, confidence_max?, include_sensitive? |
| relate_memories | from_type, from_id, to_type, to_id, relationship_type, strength?, confidence? |
| visualize_memory_graph | center_type, center_id, depth? |
| reflect_on_memories | title?, content?, tags? |

### Task Management Tools

| Tool | Inputs |
| --- | --- |
| list_tasks | status?, priority?, feature_id?, assignee?, include_subtasks? |
| update_task_status | task_id, new_status, notes? |
| get_task_statistics | assignee?, feature_id?, include_delegation_insights? |
| create_task | title, content, feature_id?, priority?, assignee?, estimated_hours?, due_date?, dependencies?, tags?, context_files? |
| delete_task | task_id, handle_dependencies? |
| reorder_tasks | scope_id, task_order |

### Agent Delegation Tools

| Tool | Inputs |
| --- | --- |
| delegate_to_agent | task_id, agent_type, execution_mode?, execution_config?, context? |
| check_delegation_status | task_id |
| list_active_delegations | include_recent?, max_results? |
| cancel_delegation | task_id |
| find_delegation_candidates | complexity_threshold?, independence_required?, max_estimated_hours?, assignee_filter?, required_tags?, exclude_tags? |
| monitor_agent_tasks | agent_type?, task_filter?, include_logs?, log_lines?, include_analytics? |
| check_agent_environment | check_docker?, check_api_keys?, check_models?, detailed_report?, debug_env? |
| setup_agent_environment | platform?, format?, include_docker?, include_api_setup? |

### Debugging Tools

| Tool | Inputs |
| --- | --- |
| get_process_info | process_id |
| inspect_runtime_variable | process_id, variable_name, debug_port?, file_path? |
| list_processes_on_port | port, protocol? |

---

## ✅ Best Practices

### Do

- ✅ Use `ENABLE_*` flags to scope available tools
- ✅ Use `store_memory` for long-term architectural decisions
- ✅ Use `get_task_statistics` before delegation planning
- ✅ Use sandbox-enabled agents for sensitive environments

### Don’t

- ❌ Run YOLO-mode delegation in production directories without review
- ❌ Store secrets in memory content
- ❌ Disable toolsets without updating your MCP client config

---

## 🧩 Framework Integration

### Next.js (local dev)

```json
{
  "tool": "start_dev_server",
  "input": { "port": 3000 }
}
```

### Express API testing

```json
{
  "tool": "make_api_request",
  "input": {
    "method": "GET",
    "url": "http://localhost:4000/health"
  }
}
```

### Monorepo task checks

```json
{
  "tool": "run_tests",
  "input": {
    "filter": "@igniter-js/*"
  }
}
```

---

## 🧾 License

MIT © Igniter.js Team

---

## 🤝 Contributing

See the root [CONTRIBUTING.md](../../CONTRIBUTING.md).

---

## 🔗 Related Packages

- @igniter-js/cli
- @igniter-js/core
- @igniter-js/store
- @igniter-js/telemetry

---

## 📚 Tool Schemas (Detailed)

This section lists the **exact input fields** for each tool.

### CLI Tools — Input Fields

#### `start_dev_server`

- `port` (number, optional) — Port to run server on.
- `watch` (boolean, optional) — Enable file watching.

#### `build_project`

- `mode` (`development` | `production`, optional) — Build mode.

#### `run_tests`

- `filter` (string, optional) — Filter by package or pattern.
- `watch` (boolean, optional) — Run tests in watch mode.

#### `generate_feature`

- `name` (string, required) — Feature name in kebab-case.
- `schema` (string, optional) — Experimental schema provider.

#### `generate_schema`

- `output` (string, optional)
- `watch` (boolean, optional)
- `docs` (boolean, optional)
- `docsOutput` (string, optional)

#### `add_package_dependency`

- `package_name` (string, required)
- `version` (string, optional)
- `dev_dependency` (boolean, optional)

#### `remove_package_dependency`

- `package_name` (string, required)

---

### API Validation Tools — Input Fields

#### `get_openapi_spec`

- `url` (string, optional) — OpenAPI spec URL

#### `make_api_request`

- `method` (GET | POST | PUT | DELETE | PATCH)
- `url` (string)
- `headers` (Record<string,string>, optional)
- `body` (any, optional)
- `timeout` (number, optional)

---

### Documentation Tools — Input Fields

#### `read_as_markdown`

- `url` (string, required)

---

### GitHub Tools — Input Fields

#### `search_github_issues`

- `query` (string, required)
- `repository` (string, optional)
- `state` (open | closed | all, optional)
- `labels` (string[], optional)
- `sort` (created | updated | comments, optional)
- `order` (asc | desc, optional)
- `per_page` (number, optional)

#### `create_github_issue`

- `title` (string)
- `body` (string)
- `repository` (string, optional)
- `labels` (string[], optional)
- `assignees` (string[], optional)

#### `get_github_issue`

- `issueNumber` (number)
- `repository` (string, optional)

#### `search_github_code`

- `query` (string)
- `repository` (string, optional)
- `language` (string, optional)
- `filename` (string, optional)

#### `read_github_file`

- `owner` (string)
- `repo` (string)
- `path` (string)
- `ref` (string, optional)

#### `list_github_repository_content`

- `owner` (string)
- `repo` (string)
- `path` (string, optional)
- `ref` (string, optional)

#### `update_github_issue`

- `issueNumber` (number)
- `repository` (string, optional)
- `title` (string, optional)
- `body` (string, optional)
- `labels` (string[], optional)
- `assignees` (string[], optional)
- `state` (open | closed, optional)
- `milestone` (number, optional)

#### `close_github_issue`

- `issueNumber` (number)
- `repository` (string, optional)

#### `list_github_issue_comments`

- `issueNumber` (number)
- `repository` (string, optional)
- `per_page` (number, optional)
- `page` (number, optional)

#### `create_github_issue_comment`

- `issueNumber` (number)
- `body` (string)
- `repository` (string, optional)

#### `update_github_issue_comment`

- `commentId` (number)
- `body` (string)
- `repository` (string, optional)

#### `delete_github_issue_comment`

- `commentId` (number)
- `repository` (string, optional)

---

### File Analysis Tools — Input Fields

#### `analyze_file`

- `filePath` (string)
- `includeErrors` (boolean, optional)
- `projectRoot` (string, optional)

#### `analyze_feature`

- `featurePath` (string)
- `projectRoot` (string)
- `includeStats` (boolean, optional)

---

### Code Investigation Tools — Input Fields

#### `find_implementation`

- `symbol` (string)
- `filePath` (string)
- `projectRoot` (string, optional)

#### `explore_source`

- `filePath` (string)
- `symbol` (string, optional)
- `includeContext` (boolean, optional)

#### `trace_dependency_chain`

- `symbol` (string)
- `startFile` (string)
- `maxDepth` (number, optional)

---

### Memory Tools — Input Fields

#### `store_memory`

- `type` (MemoryType, optional)
- `title` (string)
- `content` (string)
- `category` (string, optional)
- `confidence` (number, optional)
- `tags` (string[], optional)
- `related_memories` (string[], optional)

#### `search_memories`

- `text` (string, optional)
- `tags` (string[], optional)
- `type` (MemoryType, optional)
- `confidence_min` (number, optional)
- `confidence_max` (number, optional)
- `include_sensitive` (boolean, optional)

#### `relate_memories`

- `from_type` (MemoryType)
- `from_id` (string)
- `to_type` (MemoryType)
- `to_id` (string)
- `relationship_type` (RelationshipType)
- `strength` (number, optional)
- `confidence` (number, optional)

#### `visualize_memory_graph`

- `center_type` (MemoryType)
- `center_id` (string)
- `depth` (number, optional)

#### `reflect_on_memories`

- `title` (string, optional)
- `content` (string, optional)
- `tags` (string[], optional)

---

### Task Management Tools — Input Fields

#### `list_tasks`

- `status` (todo | in_progress | blocked | testing | done | cancelled)
- `priority` (low | medium | high | urgent)
- `feature_id` (string, optional)
- `assignee` (string, optional)
- `include_subtasks` (boolean, optional)

#### `update_task_status`

- `task_id` (string)
- `new_status` (todo | in_progress | blocked | testing | done | cancelled)
- `notes` (string, optional)

#### `get_task_statistics`

- `assignee` (string, optional)
- `feature_id` (string, optional)
- `include_delegation_insights` (boolean, optional)

#### `create_task`

- `title` (string)
- `content` (string)
- `feature_id` (string, optional)
- `priority` (low | medium | high | urgent)
- `assignee` (human | agent)
- `estimated_hours` (number, optional)
- `due_date` (string, optional)
- `dependencies` (string[], optional)
- `tags` (string[], optional)
- `context_files` (string[], optional)

#### `delete_task`

- `task_id` (string)
- `handle_dependencies` (cascade | unlink | fail)

#### `reorder_tasks`

- `scope_id` (string)
- `task_order` (string[])

---

### Agent Delegation Tools — Input Fields

#### `delegate_to_agent`

- `task_id` (string)
- `agent_type` (gemini | claude | codex)
- `execution_mode` (background | sync, optional)
- `execution_config` (object, optional)
- `context` (object, optional)

#### `check_delegation_status`

- `task_id` (string)

#### `list_active_delegations`

- `include_recent` (boolean, optional)
- `max_results` (number, optional)

#### `cancel_delegation`

- `task_id` (string)

#### `find_delegation_candidates`

- `complexity_threshold` (low | medium | high)
- `independence_required` (boolean, optional)
- `max_estimated_hours` (number, optional)
- `assignee_filter` (string, optional)
- `required_tags` (string[], optional)
- `exclude_tags` (string[], optional)

#### `monitor_agent_tasks`

- `agent_type` (all | gemini | claude | codex)
- `task_filter` (string, optional)
- `include_logs` (boolean, optional)
- `log_lines` (number, optional)
- `include_analytics` (boolean, optional)

#### `check_agent_environment`

- `check_docker` (boolean, optional)
- `check_api_keys` (boolean, optional)
- `check_models` (boolean, optional)
- `detailed_report` (boolean, optional)
- `debug_env` (boolean, optional)

#### `setup_agent_environment`

- `platform` (auto | macos | linux | windows)
- `format` (markdown | shell)
- `include_docker` (boolean, optional)
- `include_api_setup` (boolean, optional)

---

### Debugging Tools — Input Fields

#### `get_process_info`

- `process_id` (number)

#### `inspect_runtime_variable`

- `process_id` (number)
- `variable_name` (string)
- `debug_port` (number, optional)
- `file_path` (string, optional)

#### `list_processes_on_port`

- `port` (number)
- `protocol` (tcp | udp, optional)

---

## 📌 Extended Example Library

### Example: Safe API probe with timeout

```json
{
  "tool": "make_api_request",
  "input": {
    "method": "GET",
    "url": "http://localhost:3000/api/v1/health",
    "timeout": 2000
  }
}
```

### Example: Create a dependency graph

```json
{
  "tool": "visualize_memory_graph",
  "input": {
    "center_type": "design",
    "center_id": "design-auth",
    "depth": 3
  }
}
```

### Example: Investigate a symbol in node_modules

```json
{
  "tool": "explore_source",
  "input": {
    "filePath": "/Users/me/project/node_modules/zod/lib/index.js",
    "symbol": "z"
  }
}
```

### Example: List tasks with filters

```json
{
  "tool": "list_tasks",
  "input": {
    "status": "blocked",
    "priority": "urgent",
    "include_subtasks": true
  }
}
```

### Example: Add memory relationships

```json
{
  "tool": "relate_memories",
  "input": {
    "from_type": "design",
    "from_id": "design-auth",
    "to_type": "task",
    "to_id": "task-auth-impl",
    "relationship_type": "implements",
    "strength": 0.9,
    "confidence": 0.9
  }
}
```

### Example: Debug a Node process

```json
{
  "tool": "get_process_info",
  "input": { "process_id": 43210 }
}
```

### Example: Environment diagnostics

```json
{
  "tool": "check_agent_environment",
  "input": { "detailed_report": true }
}
```

---

## 🧭 FAQ

**Q: Is this a server with HTTP endpoints?**

A: No. It is STDIO-only and requires an MCP client.

**Q: Can I disable toolsets for security?**

A: Yes. Use `ENABLE_*` environment variables.

**Q: Are memory files safe to commit?**

A: Memory files live in `.github/lia/memories/`. Treat them as sensitive project artifacts.

---

## 🧪 Playbooks (Step-by-Step)

### Playbook: Full API Audit

1) Start the dev server

```json
{
  "tool": "start_dev_server",
  "input": { "port": 3000 }
}
```

2) Retrieve OpenAPI

```json
{
  "tool": "get_openapi_spec",
  "input": { "url": "http://localhost:3000/api/v1/docs/openapi.json" }
}
```

3) Probe a critical endpoint

```json
{
  "tool": "make_api_request",
  "input": { "method": "GET", "url": "http://localhost:3000/api/v1/health" }
}
```

4) Store audit outcome

```json
{
  "tool": "store_memory",
  "input": {
    "type": "insight",
    "title": "API audit",
    "content": "Health endpoint responded 200 OK."
  }
}
```

---

### Playbook: Delegated Task Execution

1) Create task

```json
{
  "tool": "create_task",
  "input": {
    "title": "Refactor CLI tool",
    "content": "Simplify input schema and docs",
    "priority": "medium",
    "assignee": "agent"
  }
}
```

2) Delegate

```json
{
  "tool": "delegate_to_agent",
  "input": {
    "task_id": "task-refactor-cli",
    "agent_type": "gemini",
    "execution_mode": "background"
  }
}
```

3) Monitor status

```json
{
  "tool": "check_delegation_status",
  "input": { "task_id": "task-refactor-cli" }
}
```

---

### Playbook: Memory Knowledge Graph

1) Store design memory

```json
{
  "tool": "store_memory",
  "input": {
    "type": "design",
    "title": "Design: MCP tools",
    "content": "Toolsets grouped by domain."
  }
}
```

2) Store requirement

```json
{
  "tool": "store_memory",
  "input": {
    "type": "requirement",
    "title": "Requirement: Add new tool",
    "content": "Provide a new analysis tool"
  }
}
```

3) Relate memories

```json
{
  "tool": "relate_memories",
  "input": {
    "from_type": "requirement",
    "from_id": "requirement-add-new-tool",
    "to_type": "design",
    "to_id": "design-mcp-tools",
    "relationship_type": "depends_on"
  }
}
```

4) Visualize graph

```json
{
  "tool": "visualize_memory_graph",
  "input": {
    "center_type": "design",
    "center_id": "design-mcp-tools",
    "depth": 2
  }
}
```

---

## 🧯 Troubleshooting Matrix

| Symptom | Likely Cause | Fix |
| --- | --- | --- |
| Tool returns permission error | OS restrictions | Run with proper user permissions |
| `inspect_runtime_variable` fails | Missing `--inspect` | Restart process with `--inspect` |
| GitHub tool fails | Missing `GITHUB_TOKEN` | Set token in env |
| TypeScript diagnostics fail | `typescript` missing | Install `typescript` locally |
| Delegation fails | Agent CLI missing | Install agent CLI |
| Memory not found | Wrong ID | Use `search_memories` or `list_tasks` |
| API request fails | Wrong URL or auth | Verify endpoint and headers |

---

## 🗂️ Memory File Format (Example)

```md
---
id: insight-mcp-usage
type: insight
confidence: 0.9
created_at: 2026-01-29T00:00:00.000Z
updated_at: 2026-01-29T00:00:00.000Z
tags:
  - mcp
  - tooling
source: user_input
project_root: /Users/me/project
---

# MCP usage

We use MCP tools for reliable automation.
```

---

## 🧩 Additional Tool Examples

### Find symbol across project

```json
{
  "tool": "find_implementation",
  "input": {
    "symbol": "createMemoryManager",
    "filePath": "/Users/me/project/src/index.ts"
  }
}
```

### Analyze TypeScript file without diagnostics

```json
{
  "tool": "analyze_file",
  "input": {
    "filePath": "/Users/me/project/src/index.ts",
    "includeErrors": false
  }
}
```

### Generate docs-only schema

```json
{
  "tool": "generate_schema",
  "input": {
    "docs": true,
    "docsOutput": "docs"
  }
}
```

### Search memories by tag

```json
{
  "tool": "search_memories",
  "input": {
    "tags": ["architecture", "mcp"]
  }
}
```

### Update task with notes

```json
{
  "tool": "update_task_status",
  "input": {
    "task_id": "task-refactor-cli",
    "new_status": "testing",
    "notes": "Waiting on CI pass"
  }
}
```

### List processes on a port

```json
{
  "tool": "list_processes_on_port",
  "input": {
    "port": 9229
  }
}
```

---

## ✅ Final Checklist

- [ ] MCP client can spawn `igniter-mcp`
- [ ] Required env vars set
- [ ] Toolsets enabled as needed
- [ ] Memory directory writable

