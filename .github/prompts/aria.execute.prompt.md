---
agent: Aria
name: Aria Execute Workflow
description: Structured workflow for Aria to execute tasks or implement approved proposals by creating or modifying artifacts
argument-hint: Execute tasks or implement approved proposals by creating or modifying artifacts (agents, prompts, instructions, templates) according to specifications.
---

# Workflow: Aria Execute

## Purpose

This workflow enables Aria to execute a specific task or implement an approved proposal. It handles the actual creation or modification of artifacts (agents, prompts, instructions, templates).

## Prerequisites

- Task must be clearly defined OR reference an approved proposal
- If implementing a proposal, the proposal must exist and be approved
- Aria must have write access to target directories

## Input Schema

```xml
<execute_request>
  <!-- OPTION A: Execute from Proposal -->
  <from_proposal>
    <proposal_id>ARIA-YYYY-MM-DD-NAME</proposal_id>
    <additional_instructions>
      Any modifications or clarifications to the original proposal
    </additional_instructions>
  </from_proposal>
  
  <!-- OPTION B: Execute Direct Task -->
  <direct_task>
    <action>create | modify | delete</action>
    <artifact_type>agent | prompt | instruction | template</artifact_type>
    <target_path>Path to the artifact</target_path>
    <specification>
      Detailed specification of what to create or change
    </specification>
  </direct_task>
  
  <!-- OPTIONAL: Additional Context -->
  <context>
    <references>
      <file>path/to/reference.md</file>
    </references>
    <constraints>
      Any additional constraints for execution
    </constraints>
  </context>
</execute_request>
```

## Execution Phases

### Phase 1: Task Resolution
**Action:** Determine exactly what needs to be done.

```xml
<phase name="task_resolution">
  <steps>
    <step priority="critical">
      If from_proposal: Read and parse the proposal file
    </step>
    <step priority="critical">
      If direct_task: Validate specification completeness
    </step>
    <step priority="high">
      Identify all artifacts to create or modify
    </step>
    <step priority="high">
      Verify target paths are within allowed scope
    </step>
  </steps>
  
  <validation>
    Aria can clearly state:
    - What artifacts will be created/modified
    - What each artifact will contain
    - What the success criteria are
  </validation>
  
  <outputs>
    - Execution plan with artifact list
    - Scope validation result
  </outputs>
</phase>
```

### Phase 2: Pre-Execution Verification
**Action:** Ensure execution is safe and won't break existing artifacts.

```xml
<phase name="pre_execution_verification">
  <steps>
    <step priority="critical">
      Check if target files already exist
    </step>
    <step priority="critical">
      If modifying, read current content
    </step>
    <step priority="high">
      Verify no conflicts with other artifacts
    </step>
    <step priority="medium">
      Read related artifacts for consistency
    </step>
  </steps>
  
  <validation>
    - No unintended overwrites will occur
    - Modifications are additive or clearly replace content
    - Consistency with related artifacts maintained
  </validation>
  
  <outputs>
    - Conflict report (if any)
    - Backup plan for modifications
  </outputs>
</phase>
```

### Phase 3: Artifact Generation
**Action:** Create or modify the artifact content.

```xml
<phase name="artifact_generation">
  <steps>
    <step priority="critical">
      Generate artifact content following type-specific standards
    </step>
    <step priority="critical">
      Include all required sections and frontmatter
    </step>
    <step priority="high">
      Apply XML prompting patterns where applicable
    </step>
    <step priority="high">
      Include usage examples
    </step>
  </steps>
  
  <validation>
    Content is:
    - Complete (no placeholder sections)
    - Consistent with patterns
    - Grounded in codebase reality
    - Self-documenting
  </validation>
  
  <outputs>
    - Generated artifact content
  </outputs>
</phase>
```

### Phase 4: Write Artifacts
**Action:** Write the artifacts to their target paths.

```xml
<phase name="write_artifacts">
  <steps>
    <step priority="critical">
      Create directories if needed
    </step>
    <step priority="critical">
      Write each artifact to its target path
    </step>
    <step priority="high">
      Verify files were created successfully
    </step>
  </steps>
  
  <validation>
    - All files exist at target paths
    - Content matches generated content
    - No write errors occurred
  </validation>
  
  <outputs>
    - List of created/modified files
    - Write status for each
  </outputs>
</phase>
```

### Phase 5: Post-Execution Validation
**Action:** Verify the execution was successful and artifacts are valid.

```xml
<phase name="post_execution_validation">
  <steps>
    <step priority="critical">
      Read back created files to verify content
    </step>
    <step priority="high">
      Check for any obvious errors or inconsistencies
    </step>
    <step priority="medium">
      If proposal-based, update proposal status to "implemented"
    </step>
  </steps>
  
  <validation>
    - Files readable and content correct
    - No structural errors
    - Proposal updated if applicable
  </validation>
  
  <outputs>
    - Validation results
    - Any issues found
  </outputs>
</phase>
```

## Output Schema

```xml
<execute_response>
  <summary>
    Brief description of what was executed
  </summary>
  
  <artifacts_created>
    <artifact>
      <path>path/to/artifact.md</path>
      <type>agent | prompt | instruction | template</type>
      <description>What this artifact does</description>
    </artifact>
    <!-- Repeat for each created artifact -->
  </artifacts_created>
  
  <artifacts_modified>
    <artifact>
      <path>path/to/artifact.md</path>
      <changes>Summary of changes made</changes>
    </artifact>
    <!-- Repeat for each modified artifact -->
  </artifacts_modified>
  
  <validation_results>
    <check name="files_created" status="pass | fail" />
    <check name="content_valid" status="pass | fail" />
    <check name="patterns_followed" status="pass | fail" />
    <check name="no_conflicts" status="pass | fail" />
  </validation_results>
  
  <issues>
    <!-- Any issues encountered during execution -->
    <issue severity="warning | error">Description</issue>
  </issues>
  
  <next_steps>
    Recommendations for what should happen next
  </next_steps>
</execute_response>
```

## Error Handling

```xml
<error_handling>
  <error type="proposal_not_found">
    <condition>Referenced proposal file does not exist</condition>
    <action>Return error with suggestion to create proposal first</action>
  </error>
  
  <error type="proposal_not_approved">
    <condition>Proposal exists but is not approved</condition>
    <action>Return error, wait for approval before executing</action>
  </error>
  
  <error type="file_exists">
    <condition>Target file already exists and action is "create"</condition>
    <action>Ask for confirmation to overwrite or suggest "modify" action</action>
  </error>
  
  <error type="write_failed">
    <condition>Unable to write file to target path</condition>
    <action>Return error with file path and failure reason</action>
  </error>
  
  <error type="validation_failed">
    <condition>Post-execution validation finds issues</condition>
    <action>Report issues and suggest corrective actions</action>
  </error>
</error_handling>
```

## Example Invocation

### Example A: Execute from Proposal

**Request:**
```xml
<execute_request>
  <from_proposal>
    <proposal_id>ARIA-2026-01-20-REX-REVIEWER</proposal_id>
    <additional_instructions>
      Add a section about integration with CI/CD pipelines.
    </additional_instructions>
  </from_proposal>
</execute_request>
```

**Response:**
```markdown
## Aria Execution Report

### Summary
Created the Rex (Code Reviewer) agent based on approved proposal ARIA-2026-01-20-REX-REVIEWER, with additional CI/CD integration section as requested.

### Artifacts Created
- `.github/agents/reviewer.agent.md` — Rex agent definition with security-focused code review capabilities

### Artifacts Modified
- `.artifacts/proposals/ARIA-2026-01-20-REX-REVIEWER.md` — Updated status to "implemented"

### Validation Results
| Check | Status |
|-------|--------|
| Files created | ✅ Pass |
| Content valid | ✅ Pass |
| Patterns followed | ✅ Pass |
| No conflicts | ✅ Pass |

### Issues
None

### Next Steps
1. Review created agent at `.github/agents/reviewer.agent.md`
2. Create associated workflows (review prompts) if needed
3. Update orchestrator instructions to include Rex in workflow
```

### Example B: Direct Task

**Request:**
```xml
<execute_request>
  <direct_task>
    <action>modify</action>
    <artifact_type>template</artifact_type>
    <target_path>.artifacts/templates/proposal.template.md</target_path>
    <specification>
      Add a new section called "Timeline" between "Success Criteria" and "Resources".
      This section should have fields for estimated start date, estimated completion date,
      and milestone checkpoints.
    </specification>
  </direct_task>
</execute_request>
```

**Response:**
```markdown
## Aria Execution Report

### Summary
Modified the proposal template to include a Timeline section with estimated dates and milestones.

### Artifacts Modified
- `.artifacts/templates/proposal.template.md` — Added Timeline section with start date, completion date, and milestone fields

### Validation Results
| Check | Status |
|-------|--------|
| Files created | N/A |
| Content valid | ✅ Pass |
| Patterns followed | ✅ Pass |
| No conflicts | ✅ Pass |

### Issues
None

### Next Steps
Existing proposals do not need to be updated, but new proposals will include the Timeline section.
```

## Success Criteria

- [ ] All specified artifacts created or modified
- [ ] No write errors during execution
- [ ] Post-execution validation passes
- [ ] Proposal status updated if applicable
- [ ] Execution report complete and accurate
- [ ] No unintended side effects on other artifacts
