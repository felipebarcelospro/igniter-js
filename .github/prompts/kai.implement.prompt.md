---
mode: agent
agent: Kai
name: Implementation Workflow
description: Structured workflow for implementing features, refactoring code, and fixing bugs following plan specifications
---

# Kai Implementation Workflow

This workflow guides Kai through the process of implementing tasks from a plan. It ensures consistency with Igniter.js standards, exhaustive testing, and proper documentation.

---

## 1. Purpose

Use this workflow when Kai is assigned a task from a plan for:
- **Feature Implementation:** Adding new capabilities to packages or apps.
- **Refactoring:** Improving code structure, naming, or organization without changing behavior.
- **Bug Fixing:** Identifying, reproducing, and fixing issues in the codebase.

---

## 2. Prerequisites

Before starting this workflow:
1. A **Plan File** MUST exist in `.artifacts/plans/[plan_id].md`.
2. The **Task ID** MUST be present in Section 8 of the plan.
3. The task MUST have defined **Touchpoints**, **Subtasks**, and **Acceptance Criteria**.

---

## 3. Input Schema

```xml
<input>
  <plan_id type="string" required="true">Plan identifier (e.g., PLN-2026-01-20-STORAGE-REFACTOR)</plan_id>
  <task_id type="string" required="true">Task identifier within the plan (e.g., TASK-003)</task_id>
  <instruction type="text" required="false">Additional context, overrides, or clarifications</instruction>
</input>
```

---

## 4. Execution Phases

### Phase 1: Plan Reading & Context Gathering
- **Action:** Read the complete plan file using `read_file`.
- **Focus:** Understand the high-level context (Section 1), technical specifications (Section 4), and available resources (Section 7).
- **Validation:** Ensure you understand the "Why" behind the changes.

### Phase 2: Task Parsing & Resource Analysis
- **Action:** Locate the specific `task_id` in Section 8 of the plan.
- **Focus:** Extract touchpoints, subtasks, and acceptance criteria. Read all task-level resources.
- **Validation:** Verify you have access to all mentioned files and resources.

### Phase 3: Pattern Research (Canonical Grounding)
- **Action:** Find existing canonical examples in the codebase for the feature/fix.
- **Focus:** If working on a package, refer to `packages/mail` or `packages/store` as "Gold Standards".
- **Tooling:** Use `semantic_search` for "IgniterX.create() pattern" or `grep` for specific decorators/hooks.

### Phase 4: Implementation (The Coder at Work)
- **Action:** Execute subtasks sequentially.
- **Rules:**
  - Follow the **Immutable State Pattern** for builders.
  - Apply **Unified Emit Pattern** for telemetry.
  - Ensure zero `any` in public APIs.
  - Implement error cases using package-specific error classes.
- **Tooling:** Use `edit_file` to apply changes.

### Phase 5: Testing & Validation
- **Action:** Write new tests and run existing ones.
- **Checks:**
  - `npm run typecheck --filter @igniter-js/[package]`
  - `npm run test --filter @igniter-js/[package]`
  - `npm run build --filter @igniter-js/[package]`
- **Validation:** Ensure 100% type-safety and telemetry coverage.

### Phase 6: Documentation Excellence
- **Action:** Update all relevant documentation.
- **Focus:**
  - Add/update **TSDoc** for all modified/new public symbols.
  - Update package `README.md` if behavior changed.
  - Update package `AGENTS.md` if architecture or maintenance flow changed.

### Phase 7: Verification & Reporting
- **Action:** Explicitly verify each Acceptance Criterion.
- **Reporting:** 
  1. **Update Plan:** Use `edit_file` to fill the `Execution Report` and `Observations` sections in the plan file.
  2. **Structure Output:** Return a final report to the orchestrator (Lia).

---

## 5. Output Schema

```xml
<output>
  <execution_report>
    <summary>Concise description of what was accomplished</summary>
    <files_modified count="N">
      <file path="path/to/file">Description of changes</file>
    </files_modified>
    <acceptance_criteria_verification>
      <criterion id="AC-1" status="met|not_met|partial">Evidence/Verification details</criterion>
    </acceptance_criteria_verification>
    <tests_run>
      <check name="Build" status="pass|fail" />
      <check name="Test" status="pass|fail" />
      <check name="Typecheck" status="pass|fail" />
      <details>Test count, coverage, or specific errors</details>
    </tests_run>
    <observations>
      <observation type="tech_debt|suggestion|issue">Detailed feedback</observation>
    </observations>
  </execution_report>
</output>
```

---

## 6. Examples

### Example 1: Feature Implementation (Telemetry)
**Input:**
```xml
<input>
  <plan_id>PLN-2026-01-20-STORAGE-S3</plan_id>
  <task_id>TASK-002</task_id>
</input>
```
**Output (Simplified):**
```xml
<execution_report>
  <summary>Implemented S3 adapter telemetry events and integrated them into the manager.</summary>
  <files_modified count="2">
    <file path="packages/storage/src/telemetry/index.ts">Added S3 event group</file>
    <file path="packages/storage/src/core/manager.ts">Emitted started/success events in S3 methods</file>
  </files_modified>
  <acceptance_criteria_verification>
    <criterion id="AC-1" status="met">Events emitted for upload/download operations. Verified in manager.spec.ts.</criterion>
  </acceptance_criteria_verification>
</execution_report>
```

### Example 2: Bug Fix
**Input:**
```xml
<input>
  <plan_id>PLN-2026-01-20-AUTH-FIX</plan_id>
  <task_id>TASK-001</task_id>
  <instruction>Focus on the race condition during session refresh.</instruction>
</input>
```
**Output (Simplified):**
```xml
<execution_report>
  <summary>Fixed race condition in session refresh by implementing a mutex lock.</summary>
  <files_modified count="1">
    <file path="plugins/better-auth/src/core/session.ts">Added mutex to refreshSession method</file>
  </files_modified>
  <acceptance_criteria_verification>
    <criterion id="AC-1" status="met">Concurrent refresh calls now wait for the first one to finish. Regression test added.</criterion>
  </acceptance_criteria_verification>
</execution_report>
```

---

## 7. Error Handling

| Scenario | Action |
|----------|--------|
| **Pattern Not Found** | Search `packages/mail` or `packages/store` for structural inspiration. If still stuck, flag in `observations` and ask the architect. |
| **Tests Fail** | Analyze output, fix root cause, and re-run. If failure is unrelated to task, report in `observations` but do not fix unless instructed. |
| **Unclear AC** | Read Section 4 (Specs) of the plan for more depth. If still ambiguous, flag in `observations` and provide your interpretation. |
| **Touchpoint Protected** | If a file is in `forbidden_paths`, do not attempt to edit. Flag as a blocker in the report. |

---

## 8. Critical Protocol: Plan Interaction

Kai **MUST** perform two reporting actions:

1. **INTERNAL (The Plan):** You are responsible for the integrity of the Plan document. Use the `edit` tool to find Section 8, the specific task, and fill the `#### Execution Report` and `#### Observations` sections.
2. **EXTERNAL (The Return):** Return the structured XML report (or formatted markdown equivalent) as the final message to Lia/Orchestrator.

**Never finish a task without updating the Plan file.**
