---
mode: agent
agent: Nova
name: Exploration Workflow
description: Structured workflow for code exploration, pattern research, and context gathering
---

# Workflow: Nova Explore

## Purpose

This workflow enables Nova to perform structured code exploration, pattern research, and context gathering within the Igniter.js monorepo. Use it when you need to understand how a feature is implemented, identify recurring architectural patterns, or build context before starting a new task.

## Prerequisites

- An exploration goal must be clearly defined.
- Access to the codebase via search and read tools.
- (Optional) A `plan_id` or `task_id` for contextual grounding.

## Input Schema

```xml
<input>
  <!-- OPTIONAL -->
  <plan_id type="string" required="false">Optional plan ID for context</plan_id>
  <task_id type="string" required="false">Optional task ID</task_id>
  
  <!-- REQUIRED -->
  <exploration_goal type="text" required="true">What to explore and why</exploration_goal>
  
  <!-- OPTIONAL -->
  <scope type="array" required="false">
    <item>packages/package-name</item>
    <item>apps/app-name</item>
  </scope>
  <resources type="array" required="false">
    <item>path/to/specific/file.ts</item>
    <item>https://external-resource-url.com</item>
  </resources>
</input>
```

## Execution Phases

### Phase 1: Context Gathering
**Action:** Understand the request and align with the project's current state.

```xml
<phase name="context_gathering">
  <steps>
    <step priority="critical">
      Read the provided exploration_goal and identify core concepts.
    </step>
    <step priority="high">
      If plan_id is provided, read the plan to understand the broader context.
    </step>
    <step priority="medium">
      Read relevant instructions (e.g., packages.instructions.md) if the goal touches standardized areas.
    </step>
  </steps>
  
  <validation>
    Nova can state the objective, success criteria, and any known constraints.
  </validation>
</phase>
```

### Phase 2: Strategy Formation
**Action:** Decide on the most efficient search and analysis approach.

```xml
<phase name="strategy_formation">
  <steps>
    <step priority="high">
      Identify relevant keywords for semantic and grep search.
    </step>
    <step priority="high">
      Map out which packages or folders are most likely to contain the answers.
    </step>
    <step priority="medium">
      Determine if a broad search or a deep-dive into specific files is better.
    </step>
  </steps>
  
  <validation>
    Nova has a prioritized list of search queries and a target file list.
  </validation>
</phase>
```

### Phase 3: Exploration Execution
**Action:** Perform the actual search and reading of the codebase.

```xml
<phase name="exploration_execution">
  <steps>
    <step priority="critical">
      Execute semantic_search and grep_search to find relevant symbols and files.
    </step>
    <step priority="critical">
      Read identified files, focusing on interfaces, public APIs, and core logic.
    </step>
    <step priority="high">
      Follow cross-package imports to understand dependencies and integrations.
    </step>
    <step priority="medium">
      Verify implementation against documentation (if available).
    </step>
  </steps>
  
  <validation>
    Nova has gathered enough factual information to answer the exploration goal.
  </validation>
</phase>
```

### Phase 4: Pattern Identification
**Action:** Synthesize findings and extract recurring patterns.

```xml
<phase name="pattern_identification">
  <steps>
    <step priority="high">
      Compare different implementations to find commonalities.
    </step>
    <step priority="high">
      Identify architectural choices (e.g., Builder pattern, Manager pattern).
    </step>
    <step priority="medium">
      Note any deviations from the official standards.
    </step>
  </steps>
  
  <validation>
    Nova can describe at least one recurring pattern or a consistent implementation logic.
  </validation>
</phase>
```

### Phase 5: Report Generation
**Action:** Produce the structured exploration report.

```xml
<phase name="report_generation">
  <steps>
    <step priority="critical">
      Summarize high-level findings.
    </step>
    <step priority="high">
      Document detailed discoveries with file references.
    </step>
    <step priority="high">
      List identified patterns and missing information (gaps).
    </step>
    <step priority="medium">
      Provide actionable recommendations for next steps.
    </step>
  </steps>
  
  <validation>
    The report follows the output schema and is easy for another agent/human to digest.
  </validation>
</phase>
```

## Output Schema

```xml
<output>
  <exploration_report>
    <summary>
      A concise summary of what was found and whether the goal was met.
    </summary>
    
    <findings count="N">
      <finding>
        <description>Description of the discovery</description>
        <reference>path/to/file.ts:line</reference>
      </finding>
      <!-- ... -->
    </findings>
    
    <patterns>
      <pattern>
        <name>Pattern Name</name>
        <description>How it works across the codebase</description>
        <examples>
          <file>path/to/example.ts</file>
        </examples>
      </pattern>
    </patterns>
    
    <gaps>
      <gap>Missing information or areas that require further research</gap>
    </gaps>
    
    <recommendations>
      <recommendation>Next logical step (e.g., "Implement X following Y pattern")</recommendation>
    </recommendations>
  </exploration_report>
</output>
```

## Examples

### Example 1: Contextual Exploration (with plan_id)

**Input:**
```xml
<input>
  <plan_id>PLAN-2026-01-20-AUTH-FIX</plan_id>
  <exploration_goal>Understand how telemetry is integrated into the better-auth plugin</exploration_goal>
  <scope>
    <item>plugins/better-auth</item>
  </scope>
</input>
```

**Nova's Output:**
```markdown
## Nova Exploration Report

### Summary
Successfully identified the telemetry integration pattern in the `better-auth` plugin. It follows the `@igniter-js/telemetry` unified emit pattern.

### Findings
- Found `withTelemetry` method in `src/builders/auth.builder.ts`.
- Identified event definitions in `src/telemetry/index.ts`.
- Verified emission in `src/core/auth-manager.ts`.

### Patterns
- **Unified Emit Pattern:** Combines internal hooks and telemetry events into a single private method call.

### Recommendations
- Proceed with adding the new "session_created" event in `src/telemetry/index.ts` before implementing the manager logic.
```

### Example 2: Direct Research

**Input:**
```xml
<input>
  <exploration_goal>Find all occurrences of server-only shim.ts and how they are registered in package.json</exploration_goal>
</input>
```

**Nova's Output:**
```markdown
## Nova Exploration Report

### Summary
Explored the monorepo for `shim.ts` patterns. Found consistent registration in `packages/mail`, `packages/store`, and `packages/storage`.

### Findings
- `src/shim.ts` always throws "Server-only" error.
- `package.json` uses `browser` field to point to the shim.
- `exports` field includes `./shim` entry.

### Gaps
- `packages/caller` does not have a shim, as it is client-safe. This should be explicitly documented in its AGENTS.md.

### Recommendations
- Use `packages/mail/package.json` as the template for any new package requiring server-side protection.
```

## Error Handling

```xml
<error_handling>
  <error type="missing_resources">
    <condition>Requested files or URLs in resources do not exist or are unreachable</condition>
    <action>Log the failure, attempt to find alternatives via search, and proceed with what's available while flagging the gap.</action>
  </error>
  
  <error type="scope_too_broad">
    <condition>The exploration goal is too vague or the scope covers the entire repo without specific filters</condition>
    <action>Start with a high-level semantic search, identify the most relevant 2-3 packages, and refine the scope before deep-diving.</action>
  </error>
  
  <error type="pattern_mismatch">
    <condition>The goal expects a specific pattern that is not found or is implemented inconsistently</condition>
    <action>Document the inconsistency clearly in the "Gaps" section and propose a standardization path in "Recommendations".</action>
  </error>
</error_handling>
```
