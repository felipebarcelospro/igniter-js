---
description: |
  Provides practical workflows for using specialized MCP tools. This rule covers the code investigation protocol for debugging and understanding code, and the memory management protocol for persistent knowledge capture and retrieval.
alwaysApply: true
---

# Tool Usage Patterns

This document provides standardized patterns for using specialized tools to investigate code and manage the project's knowledge base.

## 1. Code Investigation Protocol

This protocol should be followed whenever you encounter TypeScript errors, unknown APIs, or need to understand the implementation of a specific part of the codebase.

### When to Investigate
- **TypeScript Errors:** "Property does not exist," "Cannot find name," etc.
- **Import Errors:** "Module not found," "Export does not exist."
- **API Understanding:** Learning how a new library or internal module works.
- **Debugging:** Tracing unexpected behavior.

### Investigation Workflow
The investigation process is a funnel, moving from broad discovery to deep analysis.

1.  **Locate the Symbol (`find_implementation`):** This is your starting point. When you encounter an unknown symbol, use this tool to find where it's defined.
    ```json
    {
      "tool": "find_implementation",
      "args": { "symbol": "symbolName", "filePath": "path/to/current/file.ts" }
    }
    ```

2.  **Analyze the Source (`explore_source`):** Once you have the file path from `find_implementation`, use this tool to get a deep understanding of the source code, especially for code in `node_modules`.
    ```json
    {
      "tool": "explore_source",
      "args": { "filePath": "/path/to/implementation.ts", "symbol": "symbolName" }
    }
    ```

3.  **Trace Complex Dependencies (`trace_dependency_chain`):** If an import is complex (e.g., re-exported through multiple files), use this tool to map the entire chain back to its origin.
    ```json
    {
      "tool": "trace_dependency_chain",
      "args": { "symbol": "symbolName", "startFile": "path/to/current/file.ts" }
    }
    ```

### Strategic Pattern: Error Resolution
1.  Run `analyze_file` on the file with the error.
2.  Use `find_implementation` on the symbol causing the error.
3.  Use `explore_source` on the file where the implementation is located.
4.  After resolving the issue, **ALWAYS** use `store_memory` to document the solution as a `bug_pattern`. This prevents solving the same problem twice.

## 2. Knowledge Management Protocol

Investigation is only half the battle. Capturing what you learn is critical for long-term efficiency. This is done through the memory system.

### When to Store a Memory
- **ALWAYS** after solving a problem or completing an investigation.
- **ALWAYS** when making an architectural decision.
- **ALWAYS** when discovering a reusable code pattern.
- **ALWAYS** when receiving a direct preference or correction from the user.

### How to Store Memories
1.  **Choose the Right Type:** Select the appropriate memory type to categorize the knowledge.
    *   `architectural_decision`: For high-level design choices.
    *   `code_pattern`: For reusable implementation strategies.
    *   `bug_pattern`: For documenting a bug and its solution.
    *   `insight`: For general learnings and observations.
    *   `user_preference`: For user-specific requests and feedback.

2.  **Write a Clear Title and Content:** The title should be a concise summary, and the content should provide enough detail to be actionable in the future.

3.  **Tag Consistently:** Use relevant tags to make the memory discoverable. Good tags include the technology (`igniter-js`, `next-js`), the concept (`authentication`, `data-table`), and the memory's purpose (`pattern`, `decision`).

4.  **Create Relationships:** After storing a memory, think about what other knowledge it connects to. Use `relate_memories` to build a knowledge graph. For example, a `task` memory `implements` an `architectural_decision`.

### How to Retrieve and Use Memories
- **Search Before You Act:** Before starting any significant task, **ALWAYS** use `search_memories` to look for existing knowledge.
- **Filter Effectively:** Use a combination of text search and tags to narrow down results.
- **Build on Existing Knowledge:** Reference past decisions and patterns in your responses and plans. Don't reinvent the wheel.
- **Update and Evolve:** Knowledge evolves. If you find a better way to do something, update the existing memory or create a new one that supersedes it.
