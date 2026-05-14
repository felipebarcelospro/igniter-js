---
agent: Atlas
name: Planning Workflow
description: Structured workflow for creating rigorous technical execution plans from clarified requirements
---

# Atlas Planning Workflow

## 1. Purpose
This workflow guides Atlas in transforming clarified user requirements into a high-precision technical execution plan. It ensures that every plan is grounded in the actual codebase, accounts for risks, and provides clear guidance for implementation and review.

## 2. Prerequisites
- Clarified user intent and scope from Lia.
- Access to `.artifacts/templates/plan.template.md`.
- Ability to delegate to Nova for exploration.

## 3. Input Schema

```xml
<input>
  <user_intent type="text" required="true">The clarified requirement or objective.</user_intent>
  <scope type="text" required="false">Technical boundaries of the work.</scope>
  <constraints type="array" required="false">Technical, timeline, or architecture constraints.</constraints>
  <context type="text" required="false">Additional context or previous discussion from Lia.</context>
</input>
```

## 4. Execution Phases

### Phase 1: Context Understanding
- Deconstruct the user intent into core technical requirements.
- Identify the primary packages, apps, or plugins affected.
- Define what is explicitly out of scope (Non-Goals).

### Phase 2: Exploration Delegation
- Invoke **Nova** to research the affected areas.
- **Specific instructions for Nova:**
  - Find canonical patterns for the requested feature/refactor.
  - Locate existing implementations to mirror.
  - Identify relevant `AGENTS.md` and architecture docs.
  - Check for existing tests that should be updated or used as templates.

### Phase 3: Exploration Synthesis
- Analyze Nova's report for actionable insights.
- Map internal and external dependencies.
- Identify potential breaking changes in public APIs.
- Select the canonical files/patterns to be used as resources.

### Phase 4: Work Breakdown Structure (WBS)
- Decompose the objective into 2-5 logical tasks.
- For each task:
  - Define **Touchpoints** (files to be created/modified).
  - Create **Subtasks** (3-7 granular steps).
  - Assign specific **Resources** (links to code, docs, or patterns).

### Phase 5: Acceptance Criteria Definition
- Define 3-5 objective, testable criteria for **EACH** task.
- Use the format: "X should Y when Z".
- Ensure criteria are verifiable by Rex using terminal commands or code inspection.

### Phase 6: Risk & Rollback Planning
- Identify the top technical risks (e.g., performance impact, security leaks).
- Define a step-by-step rollback strategy to restore the system to a stable state if implementation fails.
- Estimate the "blast radius" of the proposed changes.

### Phase 7: Plan Generation
- Load `.artifacts/templates/plan.template.md`.
- Fill all sections completely, including Execution Strategy (section 6): Context, Objective, Non-Goals, Specifications, Rollback, Execution Strategy, DoD, Resources, and Tasks.
- Assign a unique Plan ID: `PLN-YYYY-MM-DD-FEATURE-NAME`.
- Save the plan to `.artifacts/plans/`.

### Phase 8: Parallelization & Dependency Analysis

**Objective:** Determine optimal execution strategy with parallel opportunities.

**Actions:**
1. **Identify Dependencies:**
   - For each task, determine if it depends on output from other tasks
   - Mark tasks that block other tasks
   - Identify tasks that are completely independent

2. **Build Dependency Graph:**
   - Create Mermaid syntax graph showing task relationships
   - Use format: `TASK-XXX[Name] --> TASK-YYY[Name]`
   - Ensure graph is valid Mermaid markdown

3. **Calculate Execution Phases:**
   - Group tasks into phases based on dependencies
   - Phase 1: Tasks with no dependencies
   - Phase N: Tasks that depend only on completed phases
   - Tasks in same phase can run in parallel

4. **Estimate Efficiency Gain:**
   - Calculate sequential time (sum of all tasks)
   - Calculate parallel time (longest path through graph)
   - Document time saved

5. **Populate Execution Strategy Section:**
   - Fill section 6.1 with Mermaid graph
   - Fill section 6.2 with phase table
   - Document efficiency gain

**Validation:**
- [ ] All tasks appear in dependency graph
- [ ] No circular dependencies
- [ ] At least one parallelization opportunity identified (if >2 tasks)
- [ ] Mermaid syntax is valid

## 5. Output Schema

```xml
<output>
  <plan_file type="path">Path to the created .md plan file.</plan_file>
  <plan_summary type="text">A concise 2-3 paragraph summary of the approach for Lia.</plan_summary>
  <risk_assessment type="text">Summary of identified risks and mitigations.</risk_assessment>
  <recommendation type="enum" values="go|no-go|research_more">Atlas's technical recommendation.</recommendation>
</output>
```

## 6. Error Handling
- **Exploration Incomplete:** If Nova fails to find relevant patterns, request more specific exploration or flag as a risk.
- **Scope Ambiguity:** If requirements are still too vague to plan, return to Lia with specific questions.
- **Template Mismatch:** Ensure the plan strictly follows the template structure; do not omit mandatory sections.
