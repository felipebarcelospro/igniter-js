---
agent: Aria
name: Aria Refine Workflow
description: Structured workflow for Aria to analyze and refine the agent ecosystem (agents, prompts, instructions, templates, and artifacts) with comprehensive recommendations.
argument-hint: Analyze and refine the agent ecosystem (agents, prompts, instructions, templates, and artifacts) by conducting deep analysis, identifying gaps, and providing actionable recommendations for improvement.
---

# Workflow: Aria Refine

## Purpose

This workflow enables Aria to analyze the current state of the agent ecosystem (agents, prompts, instructions, templates, and artifacts) and produce a comprehensive refinement proposal. The goal is continuous improvement of the ecosystem's quality, consistency, and effectiveness.

## Prerequisites

- Aria must have read access to all `.github/` and `.artifacts/` directories
- No specific request needed — can be triggered proactively or on-demand

## Input Schema

```xml
<refine_request>
  <!-- OPTIONAL: Focus areas (if not provided, analyze everything) -->
  <scope>
    <include>
      <area>agents | prompts | instructions | templates | artifacts</area>
      <!-- Can include multiple areas -->
    </include>
    <exclude>
      <path>Path to exclude from analysis</path>
    </exclude>
  </scope>
  
  <!-- OPTIONAL: Specific concerns to investigate -->
  <focus>
    <concern>Specific issue or pattern to investigate</concern>
    <!-- Can include multiple concerns -->
  </focus>
  
  <!-- OPTIONAL: Context from recent work -->
  <context>
    <recent_changes>Description of recent changes that might need alignment</recent_changes>
    <feedback>User feedback on current ecosystem</feedback>
  </context>
</refine_request>
```

## Execution Phases

### Phase 1: Inventory Collection
**Action:** Build a complete inventory of all artifacts in scope.

```xml
<phase name="inventory_collection">
  <steps>
    <step priority="critical">
      List all files in .github/agents/
    </step>
    <step priority="critical">
      List all files in .github/prompts/
    </step>
    <step priority="critical">
      List all files in .github/instructions/
    </step>
    <step priority="high">
      List all files in .artifacts/templates/
    </step>
    <step priority="high">
      List all files in .artifacts/proposals/ (recent/active)
    </step>
    <step priority="medium">
      List all files in .artifacts/plans/ (recent/active)
    </step>
  </steps>
  
  <validation>
    Complete inventory of:
    - All agents with names and descriptions
    - All prompts with purposes
    - All instructions with scope
    - All templates with types
  </validation>
  
  <outputs>
    - Categorized file inventory
    - Artifact count by type
  </outputs>
</phase>
```

### Phase 2: Deep Analysis
**Action:** Read and analyze each artifact for quality and consistency.

```xml
<phase name="deep_analysis">
  <steps>
    <step priority="critical">
      Read each artifact and catalog its structure
    </step>
    <step priority="critical">
      Check for pattern consistency across same-type artifacts
    </step>
    <step priority="high">
      Identify missing sections or incomplete content
    </step>
    <step priority="high">
      Check for outdated references or broken links
    </step>
    <step priority="medium">
      Assess documentation quality and clarity
    </step>
    <step priority="medium">
      Check for overlapping responsibilities or gaps
    </step>
  </steps>
  
  <analysis_dimensions>
    <dimension name="structure">
      Does artifact follow type-specific template?
      Are all required sections present?
    </dimension>
    <dimension name="consistency">
      Does naming follow conventions?
      Are patterns consistent with peers?
    </dimension>
    <dimension name="completeness">
      Are examples included?
      Is documentation thorough?
    </dimension>
    <dimension name="accuracy">
      Are references still valid?
      Is content grounded in reality?
    </dimension>
    <dimension name="integration">
      How does this connect to other artifacts?
      Are handoffs clearly defined?
    </dimension>
  </analysis_dimensions>
  
  <validation>
    Each artifact has been assessed on all dimensions
  </validation>
  
  <outputs>
    - Per-artifact analysis report
    - Pattern deviation list
    - Issue catalog
  </outputs>
</phase>
```

### Phase 3: Gap Analysis
**Action:** Identify missing artifacts or capabilities in the ecosystem.

```xml
<phase name="gap_analysis">
  <steps>
    <step priority="critical">
      Map expected capabilities vs. actual capabilities
    </step>
    <step priority="high">
      Identify workflow gaps (no prompt for common tasks)
    </step>
    <step priority="high">
      Identify agent gaps (needed specializations)
    </step>
    <step priority="medium">
      Identify instruction gaps (undocumented behaviors)
    </step>
    <step priority="medium">
      Identify template gaps (common artifacts without templates)
    </step>
  </steps>
  
  <gap_categories>
    <category name="coverage">
      Tasks that should have workflows but don't
    </category>
    <category name="specialization">
      Domains that need dedicated agents
    </category>
    <category name="documentation">
      Behaviors that need explicit instructions
    </category>
    <category name="tooling">
      Templates that would improve efficiency
    </category>
  </gap_categories>
  
  <validation>
    Gap analysis covers all artifact types
  </validation>
  
  <outputs>
    - Gap inventory by category
    - Priority ranking of gaps
  </outputs>
</phase>
```

### Phase 4: Recommendation Synthesis
**Action:** Convert findings into actionable recommendations.

```xml
<phase name="recommendation_synthesis">
  <steps>
    <step priority="critical">
      Prioritize issues by impact and effort
    </step>
    <step priority="critical">
      Group related issues into cohesive changes
    </step>
    <step priority="high">
      Draft specific recommendations for each issue group
    </step>
    <step priority="high">
      Estimate effort for each recommendation
    </step>
    <step priority="medium">
      Identify dependencies between recommendations
    </step>
  </steps>
  
  <recommendation_structure>
    <field name="title">Short description of the change</field>
    <field name="type">update | addition | removal | restructure</field>
    <field name="priority">critical | high | medium | low</field>
    <field name="effort">trivial | small | medium | large</field>
    <field name="artifacts_affected">List of artifacts</field>
    <field name="rationale">Why this change is needed</field>
    <field name="implementation">How to implement</field>
  </recommendation_structure>
  
  <validation>
    Each recommendation is:
    - Actionable
    - Scoped
    - Prioritized
    - Justified
  </validation>
  
  <outputs>
    - Prioritized recommendation list
    - Dependency graph
  </outputs>
</phase>
```

### Phase 5: Proposal Generation
**Action:** Create a formal refinement proposal.

```xml
<phase name="proposal_generation">
  <steps>
    <step priority="critical">
      Generate proposal ID: ARIA-[DATE]-REFINE-[SCOPE]
    </step>
    <step priority="critical">
      Create proposal at .artifacts/proposals/[ID].md
    </step>
    <step priority="high">
      Include full analysis results
    </step>
    <step priority="high">
      Include prioritized recommendations
    </step>
    <step priority="medium">
      Include implementation roadmap
    </step>
  </steps>
  
  <validation>
    Proposal contains:
    - Complete inventory summary
    - Detailed analysis findings
    - Actionable recommendations
    - Clear next steps
  </validation>
  
  <outputs>
    - Proposal file path
    - Proposal ID
  </outputs>
</phase>
```

## Output Schema

```xml
<refine_response>
  <summary>
    High-level summary of refinement analysis
  </summary>
  
  <inventory>
    <agents count="N">
      <agent name="name" status="healthy | needs_update | outdated" />
    </agents>
    <prompts count="N">
      <prompt name="name" status="healthy | needs_update | outdated" />
    </prompts>
    <instructions count="N">
      <instruction name="name" status="healthy | needs_update | outdated" />
    </instructions>
    <templates count="N">
      <template name="name" status="healthy | needs_update | outdated" />
    </templates>
  </inventory>
  
  <findings>
    <finding severity="critical | high | medium | low">
      <description>What was found</description>
      <affected_artifacts>List of artifacts</affected_artifacts>
    </finding>
  </findings>
  
  <gaps>
    <gap priority="critical | high | medium | low">
      <description>What is missing</description>
      <recommendation>What should be created</recommendation>
    </gap>
  </gaps>
  
  <recommendations>
    <recommendation priority="1">
      <title>Short title</title>
      <type>update | addition | removal | restructure</type>
      <effort>trivial | small | medium | large</effort>
      <description>What to do</description>
    </recommendation>
  </recommendations>
  
  <proposal>
    <id>ARIA-YYYY-MM-DD-REFINE-SCOPE</id>
    <path>.artifacts/proposals/[id].md</path>
  </proposal>
  
  <critical_assessment>
    Aria's overall assessment of ecosystem health
  </critical_assessment>
</refine_response>
```

## Error Handling

```xml
<error_handling>
  <error type="empty_scope">
    <condition>No artifacts found in specified scope</condition>
    <action>Return empty inventory with suggestion to create artifacts</action>
  </error>
  
  <error type="read_failure">
    <condition>Unable to read one or more artifact files</condition>
    <action>Report failed files and continue with available artifacts</action>
  </error>
  
  <error type="inconsistent_state">
    <condition>Artifacts reference each other incorrectly</condition>
    <action>Flag as critical finding and prioritize in recommendations</action>
  </error>
</error_handling>
```

## Example Invocation

### Example A: Full Ecosystem Refinement

**Request:**
```xml
<refine_request>
  <!-- No scope specified = analyze everything -->
</refine_request>
```

**Response:**
```markdown
## Aria Refinement Report

### Summary
Analyzed the complete agent ecosystem: 3 agents, 5 prompts, 2 instructions, 4 templates. Found 2 critical issues, 4 medium issues, and identified 3 capability gaps.

### Inventory

| Type | Count | Healthy | Needs Update | Outdated |
|------|-------|---------|--------------|----------|
| Agents | 3 | 2 | 1 | 0 |
| Prompts | 5 | 3 | 2 | 0 |
| Instructions | 2 | 2 | 0 | 0 |
| Templates | 4 | 4 | 0 | 0 |

### Critical Findings

1. **Coder agent missing tool restrictions**
   - Affected: `.github/agents/coder.agent.md`
   - Issue: No explicit list of forbidden paths
   - Risk: Could modify files outside intended scope

2. **Orphaned workflow reference**
   - Affected: `.github/prompts/prepare-pull-request.md`
   - Issue: References `create-tests.prompt.md` which doesn't exist
   - Risk: Workflow will fail at referenced step

### Gaps Identified

1. **No documentation specialist agent** (High)
   - Need: Agent for docs site updates
   - Recommendation: Create Sage agent

2. **No review workflow** (High)
   - Need: Prompt for code review process
   - Recommendation: Create review.prompt.md

3. **No calendar template** (Medium)
   - Need: Template for marketing calendar
   - Recommendation: Create calendar.template.md

### Top Recommendations

| # | Title | Type | Effort | Priority |
|---|-------|------|--------|----------|
| 1 | Fix coder agent scope | Update | Small | Critical |
| 2 | Remove orphaned reference | Update | Trivial | Critical |
| 3 | Create Sage agent | Addition | Medium | High |
| 4 | Create review workflow | Addition | Medium | High |

### Proposal Reference
- **ID:** ARIA-2026-01-20-REFINE-FULL
- **Path:** .artifacts/proposals/ARIA-2026-01-20-REFINE-FULL.md

### Critical Assessment
The ecosystem is in **good health** with clear patterns established. The critical issues are easily fixable. The main opportunity is expanding agent specialization (docs, review) to reduce workload on the orchestrator.
```

### Example B: Focused Refinement

**Request:**
```xml
<refine_request>
  <scope>
    <include>
      <area>agents</area>
    </include>
  </scope>
  <focus>
    <concern>Tool permissions and scope boundaries</concern>
  </focus>
</refine_request>
```

**Response:**
```markdown
## Aria Refinement Report (Focused: Agent Permissions)

### Summary
Analyzed 3 agents focusing on tool permissions and scope boundaries. Found 1 critical issue and 2 medium issues.

### Agent Permission Audit

| Agent | Tools | Scope Defined | Boundaries Clear |
|-------|-------|---------------|------------------|
| Aria | ✅ Complete | ✅ Yes | ✅ Yes |
| Kai (Coder) | ⚠️ Incomplete | ⚠️ Partial | ❌ No |
| Nova (Explorer) | ✅ Complete | ✅ Yes | ✅ Yes |

### Findings

1. **Kai missing forbidden paths** (Critical)
   - No explicit list of paths Kai cannot modify
   - Risk: Could accidentally modify `.github/` or `.artifacts/`

2. **Kai tool list incomplete** (Medium)
   - Missing: `grep_search`, `file_search`
   - May limit effectiveness for context gathering

3. **Aria missing `create_file` tool** (Medium)
   - Has `edit` but not explicit `create_file`
   - May cause issues when creating new artifacts

### Recommendations

1. Add forbidden paths to Kai: `.github/`, `.artifacts/`, `node_modules/`
2. Expand Kai's tool list with search capabilities
3. Clarify Aria's file creation permissions

### Proposal Reference
- **ID:** ARIA-2026-01-20-REFINE-AGENT-PERMS
- **Path:** .artifacts/proposals/ARIA-2026-01-20-REFINE-AGENT-PERMS.md
```

## Success Criteria

- [ ] Complete inventory of artifacts in scope
- [ ] All artifacts analyzed on defined dimensions
- [ ] Issues categorized by severity
- [ ] Gaps identified and prioritized
- [ ] Recommendations are actionable and scoped
- [ ] Proposal generated with full details
- [ ] Critical assessment provides clear direction