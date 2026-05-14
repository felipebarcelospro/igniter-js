---
mode: agent
agent: Rex
name: Review Workflow
description: Structured workflow for reviewing completed work, verifying acceptance criteria, and ensuring quality standards
---

# Workflow: Rex Review

## Purpose

This workflow enables Rex to perform structured code reviews after an agent (usually Kai) completes a task. It ensures that all work meets the quality standards of the Igniter.js monorepo, acceptance criteria are independently verified, and documentation is up to date.

## Prerequisites

- The task must have an **Execution Report** filled by the implementing agent in the plan file.
- Rex must have access to the plan file and all modified files.

## Input Schema

```xml
<input>
  <plan_id type="string" required="true">Plan identifier (e.g., PLN-2026-01-20-FEATURE)</plan_id>
  <task_id type="string" required="true">Task identifier to review (e.g., TASK-001)</task_id>
  <instruction type="text" required="false">Specific areas or concerns to focus on during review</instruction>
</input>
```

## Execution Phases

### Phase 1: Plan Reading
**Action:** Read the plan to understand the context, specifications, and goals.

```xml
<phase name="plan_reading">
  <steps>
    <step priority="critical">
      Read `.artifacts/plans/[plan_id].md`.
    </step>
    <step priority="high">
      Review Section 1 (Context) and Section 4 (Specifications).
    </step>
    <step priority="medium">
      Review Section 7 (Resources) to identify relevant files and instructions.
    </step>
  </steps>
  <validation>
    Rex understands the "What" and "Why" of the entire plan.
  </validation>
</phase>
```

### Phase 2: Task Locating
**Action:** Find the specific task to be reviewed.

```xml
<phase name="task_locating">
  <steps>
    <step priority="critical">
      Locate [task_id] within Section 8 (Tasks) of the plan.
    </step>
    <step priority="high">
      Read Task Objective, Touchpoints, and Acceptance Criteria.
    </step>
  </steps>
  <validation>
    Rex has identified the exact scope and success criteria for this specific task.
  </validation>
</phase>
```

### Phase 3: Execution Report Reading
**Action:** Read what the implementing agent claims to have done.

```xml
<phase name="execution_report_reading">
  <steps>
    <step priority="critical">
      Read the "Execution Report" section for the task.
    </step>
    <step priority="high">
      Note all files modified and any specific comments from the agent.
    </step>
  </steps>
  <validation>
    Rex knows what changes were supposedly made and why.
  </validation>
</phase>
```

### Phase 4: File Reading
**Action:** Read the actual code changes.

```xml
<phase name="file_reading">
  <steps>
    <step priority="critical">
      Read ALL modified files mentioned in the Execution Report or Touchpoints.
    </step>
    <step priority="high">
      Focus on the changes and how they integrate with adjacent code.
    </step>
  </steps>
  <validation>
    Rex has a complete understanding of the actual implementation.
  </validation>
</phase>
```

### Phase 5: Acceptance Criteria Verification
**Action:** Independently verify that each success criterion is met.

```xml
<phase name="acceptance_criteria_verification">
  <steps>
    <step priority="critical">
      For EACH acceptance criterion, find direct evidence in the code.
    </step>
    <step priority="critical">
      Do NOT trust the agent's claims; verify logic manually.
    </step>
    <step priority="high">
      Verify edge cases and error handling requirements.
    </step>
  </steps>
  <validation>
    Rex has confirmed (or refuted) that every single criterion is satisfied.
  </validation>
</phase>
```

### Phase 6: Quality Checks
**Action:** Run automated tools to verify code integrity.

```xml
<phase name="quality_checks">
  <steps>
    <step priority="critical">
      Run `npm run typecheck --filter @igniter-js/[package]` (if applicable).
    </step>
    <step priority="critical">
      Run `npm run test --filter @igniter-js/[package]` to verify logic and regressions.
    </step>
    <step priority="high">
      Run `npm run lint --filter @igniter-js/[package]` (if applicable).
    </step>
  </steps>
  <validation>
    Rex has proof that the code compiles, passes tests, and follows linting rules.
  </validation>
</phase>
```

### Phase 7: Documentation Assessment
**Action:** Ensure documentation reflects the current state.

```xml
<phase name="documentation_assessment">
  <steps>
    <step priority="high">
      Check TSDoc on all public symbols (methods, classes, types).
    </step>
    <step priority="high">
      Review README.md for necessary updates.
    </step>
    <step priority="high">
      Review package AGENTS.md for architecture or maintenance updates.
    </step>
    <step priority="medium">
      Assess if site documentation in `apps/www` needs updates.
    </step>
  </steps>
  <validation>
    Rex knows exactly what documentation is missing or outdated.
  </validation>
</phase>
```

### Phase 8: Verdict Determination
**Action:** Synthesize findings and decide on the verdict.

```xml
<phase name="verdict_determination">
  <steps>
    <step priority="critical">
      Choose one: `approved`, `approved_with_changes`, or `needs_rework`.
    </step>
    <step priority="critical">
      Fill the **Review Report** section in the plan file.
    </step>
    <step priority="high">
      List specific required changes for non-approved verdicts.
    </step>
  </steps>
  <validation>
    A clear, actionable verdict is recorded in the plan and ready to be reported.
  </validation>
</phase>
```

## Output Schema

```xml
<output>
  <review_report>
    <verdict type="enum">approved | approved_with_changes | needs_rework</verdict>
    <summary>Overall assessment of the implementation</summary>
    
    <acceptance_criteria_verification count="N">
      <criterion>
        <text>Criterion text from plan</text>
        <status>met | not_met | partial</status>
        <evidence>File path and description of evidence found</evidence>
      </criterion>
    </acceptance_criteria_verification>
    
    <code_quality_assessment>
      <check name="patterns">Compliance with codebase patterns</check>
      <check name="typescript">Type safety and generic correctness</check>
      <check name="linting">Linting status</check>
    </code_quality_assessment>
    
    <testing_assessment>
      <status>pass | fail</status>
      <output>Brief test results (count, time)</output>
      <coverage>Adequacy of happy/unhappy path tests</coverage>
    </testing_assessment>
    
    <documentation_assessment>
      <item name="tsdoc">Status of TSDoc</item>
      <item name="readme">Status of README</item>
      <item name="agents_md">Status of AGENTS.md</item>
      <item name="site_docs">Status of site documentation</item>
    </documentation_assessment>
    
    <required_changes count="N">
      <change>Specific instruction for fix</change>
    </required_changes>
  </review_report>
</output>
```

## Examples

### Example 1: Verdict Approved

**Scenario:** Bug fix for race condition in `IgniterStore`.

**Output:**
```xml
<review_report>
  <verdict>approved</verdict>
  <summary>Race condition fixed correctly using mutex. Regression test added and verified.</summary>
  <acceptance_criteria_verification count="1">
    <criterion>
      <text>Concurrent set operations must not cause data loss</text>
      <status>met</status>
      <evidence>packages/store/src/core/manager.ts:L142 implements mutex locking</evidence>
    </criterion>
  </acceptance_criteria_verification>
  <testing_assessment>
    <status>pass</status>
    <output>10 tests passed (including new concurrent stress test)</output>
  </testing_assessment>
  <required_changes count="0" />
</review_report>
```

### Example 2: Approved with Changes

**Scenario:** Feature implementation with minor documentation gap.

**Output:**
```xml
<review_report>
  <verdict>approved_with_changes</verdict>
  <summary>Feature is complete and functional. Minor TSDoc missing on new public method.</summary>
  <acceptance_criteria_verification count="2">
    <criterion>
      <text>Support for batch operations</text>
      <status>met</status>
      <evidence>Verified batchSet and batchGet in manager.ts</evidence>
    </criterion>
  </acceptance_criteria_verification>
  <required_changes count="1">
    <change>Add @param and @returns TSDoc to batchDelete() in manager.ts</change>
  </required_changes>
</review_report>
```

### Example 3: Needs Rework

**Scenario:** Agent claimed tests pass, but they fail on verification.

**Output:**
```xml
<review_report>
  <verdict>needs_rework</verdict>
  <summary>Implementation fails integration tests. Agent claimed tests passed, but local run shows regression.</summary>
  <acceptance_criteria_verification count="1">
    <criterion>
      <text>All existing tests must pass</text>
      <status>not_met</status>
      <evidence>npm run test failed with 2 errors in storage/manager.spec.ts</evidence>
    </criterion>
  </acceptance_criteria_verification>
  <required_changes count="2">
    <change>Fix regression in storage provider initialization</change>
    <change>Ensure tests pass locally before submitting for review</change>
  </required_changes>
</review_report>
```

## Error Handling

```xml
<error_handling>
  <error type="plan_not_found">
    <condition>Plan file at .artifacts/plans/[plan_id].md does not exist</condition>
    <action>Report error to Lia and request correct plan ID.</action>
  </error>
  
  <error type="execution_report_missing">
    <condition>Task exists but Execution Report section is empty or missing</condition>
    <action>Return to implementing agent for completion of execution report.</action>
  </error>
  
  <error type="test_failure">
    <condition>Tests fail during verification phase</condition>
    <action>Mark as needs_rework, cite failing tests, and provide output snippets.</action>
  </error>
</error_handling>
```
