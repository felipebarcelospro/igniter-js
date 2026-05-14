---
agent: Aria
name: Aria Propose Workflow
description: Structured workflow for Aria to propose new artifacts (agents, prompts, instructions, templates) with critical analysis and alternative approaches.
argument-hint: Propose new artifacts (agents, prompts, instructions, templates) by analyzing needs, researching patterns, designing solutions, and providing critical evaluations.
---

# Workflow: Aria Propose

## Purpose

This workflow enables Aria to receive a request for creating a new artifact (agent, prompt, instruction, or template) and produce a comprehensive proposal with critical analysis and alternative approaches.

## Prerequisites

- Request must specify the type of artifact to create
- Request must include enough context to understand the need
- Aria must have access to read existing artifacts for pattern matching

## Input Schema

```xml
<propose_request>
  <!-- REQUIRED -->
  <artifact_type>agent | prompt | instruction | template</artifact_type>
  <name>Descriptive name for the artifact</name>
  <purpose>What this artifact should accomplish</purpose>
  
  <!-- OPTIONAL -->
  <context>
    <background>Why this is needed</background>
    <constraints>Any limitations or requirements</constraints>
    <references>
      <file>path/to/reference.md</file>
    </references>
  </context>
  
  <preferences>
    <style>Preferred style or patterns</style>
    <integration>How it should integrate with existing artifacts</integration>
  </preferences>
</propose_request>
```

## Execution Phases

### Phase 1: Context Gathering
**Action:** Read and understand the current state of relevant artifacts.

```xml
<phase name="context_gathering">
  <steps>
    <step priority="critical">
      Read .github/instructions/prompting.instructions.md for XML patterns
    </step>
    <step priority="critical">
      List and scan existing artifacts of the same type
    </step>
    <step priority="high">
      Read root AGENTS.md for repository conventions
    </step>
    <step priority="medium">
      Read any referenced files from the request
    </step>
  </steps>
  
  <validation>
    Aria can articulate:
    - Current patterns used in similar artifacts
    - Gaps or needs in the current ecosystem
    - How the new artifact fits the overall structure
  </validation>
  
  <outputs>
    - Pattern catalog from existing artifacts
    - Gap analysis
    - Integration points identified
  </outputs>
</phase>
```

### Phase 2: Research
**Action:** Gather additional knowledge needed for the proposal.

```xml
<phase name="research">
  <steps>
    <step priority="high">
      Search codebase for related patterns or implementations
    </step>
    <step priority="medium">
      Search web for best practices if applicable
    </step>
    <step priority="medium">
      Identify potential conflicts or overlaps with existing artifacts
    </step>
  </steps>
  
  <validation>
    Aria has sufficient knowledge to:
    - Design a complete artifact
    - Anticipate integration challenges
    - Propose alternatives
  </validation>
  
  <outputs>
    - Research findings
    - Best practices identified
    - Potential issues flagged
  </outputs>
</phase>
```

### Phase 3: Design
**Action:** Design the artifact following established patterns.

```xml
<phase name="design">
  <steps>
    <step priority="critical">
      Define artifact structure following type-specific standards
    </step>
    <step priority="critical">
      Define scope, capabilities, and boundaries
    </step>
    <step priority="high">
      Create at least one usage example
    </step>
    <step priority="high">
      Identify at least one alternative approach
    </step>
  </steps>
  
  <validation>
    Design is:
    - Consistent with existing patterns
    - Complete (no missing required sections)
    - Grounded (references only real capabilities)
  </validation>
  
  <outputs>
    - Complete artifact design
    - Alternative approaches documented
    - Integration plan
  </outputs>
</phase>
```

### Phase 4: Critical Analysis
**Action:** Evaluate the proposed design critically.

```xml
<phase name="critical_analysis">
  <steps>
    <step priority="critical">
      Identify strengths of the proposal
    </step>
    <step priority="critical">
      Identify weaknesses and limitations
    </step>
    <step priority="high">
      Assess risks and dependencies
    </step>
    <step priority="high">
      Compare with alternatives objectively
    </step>
  </steps>
  
  <validation>
    Analysis is:
    - Objective (not biased toward own proposal)
    - Actionable (weaknesses can be addressed)
    - Complete (covers all major dimensions)
  </validation>
  
  <outputs>
    - Strengths list
    - Weaknesses list
    - Risk assessment
    - Recommendation with reasoning
  </outputs>
</phase>
```

### Phase 5: Proposal Generation
**Action:** Create the formal proposal document.

```xml
<phase name="proposal_generation">
  <steps>
    <step priority="critical">
      Generate proposal ID: ARIA-[YYYY-MM-DD]-[NAME]
    </step>
    <step priority="critical">
      Create proposal file at .artifacts/proposals/[ID].md
    </step>
    <step priority="critical">
      Fill all sections of the proposal template
    </step>
    <step priority="high">
      Include full artifact content in the proposal
    </step>
  </steps>
  
  <validation>
    Proposal file:
    - Exists at correct path
    - Has complete frontmatter
    - All template sections filled
    - Artifact content included
  </validation>
  
  <outputs>
    - Proposal file path
    - Proposal ID
  </outputs>
</phase>
```

## Output Schema

```xml
<propose_response>
  <summary>
    Brief description of the proposal
  </summary>
  
  <proposal>
    <id>ARIA-YYYY-MM-DD-NAME</id>
    <path>.artifacts/proposals/[id].md</path>
    <artifact_type>agent | prompt | instruction | template</artifact_type>
    <artifact_name>Name of the proposed artifact</artifact_name>
  </proposal>
  
  <critical_opinion>
    Aria's expert assessment of the proposal, including:
    - Whether it should be approved
    - Key strengths
    - Key concerns
    - Alternative approaches worth considering
  </critical_opinion>
  
  <recommendation>approve | approve_with_changes | reconsider</recommendation>
  
  <next_steps>
    What should happen after review
  </next_steps>
</propose_response>
```

## Error Handling

```xml
<error_handling>
  <error type="insufficient_context">
    <condition>Request lacks enough information to create meaningful proposal</condition>
    <action>Return clarifying questions before proceeding</action>
  </error>
  
  <error type="conflicting_artifact">
    <condition>Proposed artifact would conflict with existing one</condition>
    <action>Document conflict and propose resolution options</action>
  </error>
  
  <error type="scope_violation">
    <condition>Request asks for artifact outside Aria's scope</condition>
    <action>Explain scope limitation and suggest appropriate agent</action>
  </error>
  
  <error type="pattern_not_found">
    <condition>No existing pattern to follow for this artifact type</condition>
    <action>Propose new pattern with extra justification</action>
  </error>
</error_handling>
```

## Example Invocation

**Request:**
```
Create a new agent specialized in code review with focus on TypeScript and security best practices.
```

**Aria's Response:**
```markdown
## Aria Proposal Report

### Summary
Proposed new agent "Rex" (The Code Reviewer) specialized in TypeScript code review with security focus.

### Proposal
- **ID:** ARIA-2026-01-20-REX-REVIEWER
- **Path:** .artifacts/proposals/ARIA-2026-01-20-REX-REVIEWER.md
- **Type:** Agent
- **Name:** Rex

### Critical Opinion
This proposal addresses a clear gap in the current agent ecosystem. Currently, code review is handled ad-hoc without specialized patterns for security or TypeScript-specific concerns.

**Strengths:**
- Fills identified gap in review capabilities
- Follows established agent patterns
- Clear scope boundaries prevent overlap with Kai (coder)

**Concerns:**
- May need refinement of security checklist based on actual codebase patterns
- Integration with existing prompts (prepare-pull-request) should be defined

**Alternative Considered:**
Extending Kai's capabilities to include review. Rejected because it violates single-responsibility principle and would blur the write/review boundary.

### Recommendation
**Approve** — The proposal is well-structured and addresses a real need.

### Next Steps
1. Review proposal at .artifacts/proposals/ARIA-2026-01-20-REX-REVIEWER.md
2. If approved, invoke `aria.execute` to create the agent
3. Update orchestrator.instructions.md to include Rex in the workflow
```

## Success Criteria

- [ ] Proposal file created at correct path
- [ ] All template sections completed
- [ ] At least one alternative approach documented
- [ ] Critical analysis is objective and actionable
- [ ] Recommendation is clear with reasoning
- [ ] Artifact design follows established patterns