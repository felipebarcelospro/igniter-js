---
name: A Comprehensive Guide with Best Pratices for Prompting Engineering for Code Agents
description: ALWAYS fully read this document provides an in-depth guide on how to effectively use XML prompting techniques to delegate complex coding tasks to LLM-based code agents. It covers foundational concepts, advanced patterns, and best practices for creating structured prompts and tools that enhance agent performance and reliability.
---

# Prompting for Instructions for Delegating Tasks to Code Agents: A Comprehensive SKILL Guide

## Introduction & Fundamentals

### Why XML Prompting Matters for Code Agents

XML prompting has emerged as the most robust structured prompting technique for modern LLM-based code agents. Unlike freeform natural language prompts, XML provides:

- **Semantic Clarity**: Tags define logical boundaries between instruction, context, and expected output
- **Token Efficiency**: Rich bracket structures create strong visual boundaries that help models avoid context mixing
- **Hierarchical Structure**: Nested tags represent complex relationships and nested tasks
- **Machine Parseable Format**: Outputs are deterministic and easy to validate programmatically
- **Hallucination Reduction**: Clear boundaries significantly reduce the model's tendency to mix contexts or fabricate information

### The Core Principle

XML prompting works because LLMs don't "parse" XML in the traditional sense—they predict tokens. However, the abundance of angle brackets and closing tags creates such strong distinct boundaries that models learn to respect these semantic divisions. This is fundamentally different from Markdown or natural language, where context can blur across sections.

---

## XML Prompting Architecture

### Foundational XML Structure

The most basic XML prompt structure for code agents follows this pattern:

```xml
<task>
  <objective>Clearly state what needs to be accomplished</objective>
  <context>
    <codebase>Description of relevant code structure</codebase>
    <constraints>List constraints and requirements</constraints>
  </context>
  <instructions>
    <step priority="1">First step</step>
    <step priority="2">Second step</step>
  </instructions>
  <output_format>
    <structure>Describe expected output structure</structure>
    <validation>How to validate correctness</validation>
  </output_format>
</task>
```

### The Five-Layer XML Architecture

For complex tasks, use this hierarchical structure:

```xml
<agent_task>
  <!-- LAYER 1: Identity & Scope -->
  <meta>
    <agent_role>Describe what agent is being invoked</agent_role>
    <task_id>unique-identifier-2026-01-18</task_id>
    <complexity_level>simple|intermediate|advanced|enterprise</complexity_level>
  </meta>

  <!-- LAYER 2: Context & Knowledge -->
  <context>
    <project_structure>
      <!-- Relevant file tree and architecture -->
    </project_structure>
    <domain_knowledge>
      <technology_stack>Node.js, TypeScript, PostgreSQL</technology_stack>
      <patterns_used>Repository pattern, dependency injection, event sourcing</patterns_used>
      <key_constraints>Immutability required, no breaking changes to public API</key_constraints>
    </domain_knowledge>
  </context>

  <!-- LAYER 3: Instructions with Hierarchy -->
  <instructions>
    <phase name="exploration" required="true">
      <action>Read and understand relevant files</action>
      <files_to_examine>src/services/*, src/models/*</files_to_examine>
      <validation>Confirm understanding of current implementation</validation>
    </phase>
    <phase name="planning" required="true">
      <action>Plan the approach before implementation</action>
      <deliverable>Detailed plan with step-by-step approach</deliverable>
    </phase>
    <phase name="implementation" required="true">
      <action>Execute the implementation</action>
      <guidelines>
        <guideline priority="critical">Always maintain backward compatibility</guideline>
        <guideline priority="high">Write tests alongside code</guideline>
        <guideline priority="medium">Add inline documentation for complex logic</guideline>
      </guidelines>
    </phase>
  </instructions>

  <!-- LAYER 4: Quality & Validation -->
  <quality>
    <assertions>
      <assert type="code_style">Must follow ESLint config from repo</assert>
      <assert type="testing">Minimum 80% code coverage required</assert>
      <assert type="performance">Must not exceed 500ms execution time</assert>
    </assertions>
    <verification>
      <check>Run linter and fix violations</check>
      <check>Run full test suite</check>
      <check>Check for TypeScript errors</check>
    </verification>
  </quality>

  <!-- LAYER 5: Output & Handoff -->
  <output>
    <format>
      <structure>
        <section name="summary">Concise summary of changes</section>
        <section name="files_modified">List of modified files</section>
        <section name="testing">Test results and coverage</section>
        <section name="notes">Any gotchas or considerations</section>
      </structure>
    </format>
    <validation_checklist>
      <item>[ ] Code compiles without errors</item>
      <item>[ ] All tests pass</item>
      <item>[ ] No breaking changes introduced</item>
      <item>[ ] Documentation updated</item>
    </validation_checklist>
  </output>
</agent_task>
```

### XML Tag Best Practices

#### 1. **Use Semantic Tags**

Good: `<deployment_constraints>`, `<performance_requirement>`, `<security_consideration>`

Bad: `<info>`, `<data>`, `<thing>`

#### 2. **Nesting = Hierarchy**

```xml
<!-- Use nesting to show relationships -->
<module name="authentication">
  <responsibility>Handle user login and token generation</responsibility>
  <dependencies>
    <external>bcryptjs, jsonwebtoken</external>
    <internal>UserRepository, EmailService</internal>
  </dependencies>
  <interfaces>
    <method name="authenticate">Verify credentials and return token</method>
    <method name="refresh">Generate new token from refresh token</method>
  </interfaces>
</module>
```

#### 3. **Use Attributes for Classification**

```xml
<step priority="critical" phase="implementation" complexity="high">
  Implementation step with clear metadata
</step>

<constraint type="security" severity="critical">
  No plaintext passwords in logs or error messages
</constraint>
```

#### 4. **Close All Tags Properly**

```xml
<!-- CORRECT -->
<instruction>
  <action>Do something</action>
  <validation>Verify result</validation>
</instruction>

<!-- WRONG - Don't leave unclosed tags -->
<instruction>
  <action>Do something
  <validation>Verify result
</instruction>
```

---

## Simple Task Delegation

### Pattern 1: Code Review Task

For delegating code review to an agent:

```xml
<code_review_task>
  <objective>Review the submitted pull request for code quality, security, and best practices</objective>
  
  <scope>
    <files_to_review>
      <file path="src/services/PaymentService.ts">Payment processing logic</file>
      <file path="src/models/Transaction.ts">Transaction data model</file>
    </files_to_review>
    <lines_of_change>approximately 250 lines added/modified</lines_of_change>
  </scope>

  <review_criteria>
    <criterion category="code_quality">
      <check>Does code follow ESLint rules?</check>
      <check>Are variable names clear and descriptive?</check>
      <check>Is code DRY (Don't Repeat Yourself)?</check>
      <check>Are functions single-responsibility?</check>
    </criterion>
    
    <criterion category="security">
      <check>No SQL injection vulnerabilities?</check>
      <check>No XSS vulnerabilities?</check>
      <check>Proper input validation?</check>
      <check>No hardcoded secrets?</check>
    </criterion>
    
    <criterion category="performance">
      <check>No N+1 query problems?</check>
      <check>Reasonable time complexity?</check>
      <check>No unnecessary computations in loops?</check>
    </criterion>
    
    <criterion category="testing">
      <check>Are changes covered by tests?</check>
      <check>Are edge cases tested?</check>
      <check>Test coverage above 80%?</check>
    </criterion>
  </review_criteria>

  <output_format>
    <sections>
      <section name="summary" mandatory="true">Overall assessment in 2-3 sentences</section>
      <section name="positive_aspects" mandatory="true">What was done well (at least 2 points)</section>
      <section name="issues" mandatory="true">
        <issue_format>
          <line_number>File:Line</line_number>
          <severity>critical|high|medium|low</severity>
          <description>What the issue is</description>
          <suggestion>How to fix it</suggestion>
        </issue_format>
      </section>
      <section name="recommendation" mandatory="true">Approve, Request Changes, or Comment</section>
    </sections>
  </output_format>
</code_review_task>
```

### Pattern 2: Bug Fix Task

```xml
<bug_fix_task>
  <bug_description>
    <title>Payment processing fails for international credit cards</title>
    <severity>critical</severity>
    <affected_users>Approximately 2,000 international customers</affected_users>
  </bug_description>

  <context>
    <error_message>
      ValidationError: Card number validation failed for BIN 4532
    </error_message>
    <reproduction_steps>
      <step>1. Use international credit card with BIN starting with 4532</step>
      <step>2. Attempt payment through checkout</step>
      <step>3. Payment fails with validation error</step>
    </reproduction_steps>
    <expected_behavior>
      Payment should process successfully for all valid credit cards
    </expected_behavior>
  </context>

  <constraints>
    <constraint priority="critical">
      Cannot modify payment validation library (third-party dependency)
    </constraint>
    <constraint priority="high">
      Must maintain backward compatibility with existing card processors
    </constraint>
    <constraint priority="medium">
      No database migrations allowed (stateless fix preferred)
    </constraint>
  </constraints>

  <investigation_guide>
    <files_to_examine>
      <file path="src/payment/validators.ts">Card validation logic</file>
      <file path="src/payment/processors/*.ts">Payment processors</file>
      <file path="tests/payment/*.test.ts">Existing payment tests</file>
    </files_to_examine>
    
    <questions_to_answer>
      <question>Why does BIN 4532 specifically fail?</question>
      <question>What is the root cause - validation rule or processor issue?</question>
      <question>Are there other BINs affected?</question>
      <question>Is this a regression or existing issue?</question>
    </questions_to_answer>
  </investigation_guide>

  <implementation_requirements>
    <requirement priority="critical">
      Must fix the underlying validation issue, not work around it
    </requirement>
    <requirement priority="high">
      Add regression tests for BIN 4532 and similar BINs
    </requirement>
    <requirement priority="high">
      Document the fix for future reference
    </requirement>
    <requirement priority="medium">
      Update error messages to be more helpful
    </requirement>
  </implementation_requirements>

  <validation>
    <test_scenario>
      <input>Credit card with BIN 4532</input>
      <expected_output>Payment processes successfully</expected_output>
    </test_scenario>
    <regression_check>Verify existing tests still pass</regression_check>
  </validation>
</bug_fix_task>
```

### Pattern 3: Feature Implementation Task

```xml
<feature_implementation_task>
  <feature>
    <name>User Profile Photo Upload</name>
    <description>Allow users to upload and crop their profile photos</description>
    <acceptance_criteria>
      <criterion>Users can select image files up to 5MB</criterion>
      <criterion>Users can crop the image before uploading</criterion>
      <criterion>Uploaded photos are stored on S3</criterion>
      <criterion>Profile displays the photo in circular frame</criterion>
      <criterion>Old photos are cleaned up from storage</criterion>
    </acceptance_criteria>
  </feature>

  <technical_specifications>
    <api>
      <endpoint method="POST" path="/api/profiles/photo">
        <description>Upload and process profile photo</description>
        <input_format>multipart/form-data with image file and crop coordinates</input_format>
        <output_format>JSON with photo URL and metadata</output_format>
      </endpoint>
    </api>
    
    <storage>
      <provider>AWS S3</provider>
      <bucket>user-uploads-production</bucket>
      <folder_structure>profiles/{userId}/{timestamp}.jpg</folder_structure>
      <image_optimization>Resize to 500x500, compress to 100KB max</image_optimization>
    </storage>
    
    <ui_requirements>
      <component>File upload input with drag-and-drop</component>
      <component>Image preview with crop tool</component>
      <component>Upload progress indicator</component>
      <component>Error handling for invalid files</component>
    </ui_requirements>
  </technical_specifications>

  <constraints>
    <constraint priority="critical">
      No storing of unoptimized images to save storage costs
    </constraint>
    <constraint priority="high">
      Must handle concurrent uploads from same user gracefully
    </constraint>
    <constraint priority="high">
      File uploads must timeout after 30 seconds
    </constraint>
    <constraint priority="medium">
      Maintain backward compatibility - old code should work with new API
    </constraint>
  </constraints>

  <implementation_phases>
    <phase name="backend">
      <files_to_modify>
        <file>src/services/PhotoService.ts</file>
        <file>src/controllers/ProfileController.ts</file>
        <file>src/config/s3.ts</file>
      </files_to_modify>
      <tests_required>PhotoService unit tests, integration tests</tests_required>
    </phase>
    
    <phase name="frontend">
      <files_to_modify>
        <file>src/components/ProfilePhotoUpload.tsx</file>
        <file>src/hooks/usePhotoUpload.ts</file>
        <file>src/styles/profile.css</file>
      </files_to_modify>
      <tests_required>Component tests, integration tests</tests_required>
    </phase>
  </implementation_phases>

  <quality_gates>
    <gate name="tests">
      <check>Backend tests pass with 80%+ coverage</check>
      <check>Frontend tests pass</check>
      <check>Integration tests verify end-to-end flow</check>
    </gate>
    <gate name="performance">
      <check>Photo upload completes within 5 seconds on 4G connection</check>
      <check>S3 operations don't block main thread</check>
    </gate>
    <gate name="security">
      <check>Only image files accepted (verified by magic bytes, not extension)</check>
      <check>File size validated before upload</check>
      <check>S3 bucket has proper access controls</check>
    </gate>
  </quality_gates>
</feature_implementation_task>
```

---

## Advanced Task Delegation

### Pattern 4: Multi-Step Refactoring Task

For complex refactoring across multiple files:

```xml
<refactoring_task>
  <objective>
    Refactor the authentication module from callback-based to async/await pattern
    while maintaining 100% backward compatibility
  </objective>

  <scope>
    <impact_analysis>
      <files_affected>
        <file>src/auth/AuthService.ts</file>
        <file>src/auth/TokenManager.ts</file>
        <file>src/auth/strategies/*.ts</file>
        <file>src/middleware/authMiddleware.ts</file>
      </files_affected>
      <estimated_files_to_modify>8-12 files</estimated_files_to_modify>
      <estimated_lines_changed>500-800 lines</estimated_lines_changed>
    </impact_analysis>

    <dependency_map>
      <module name="AuthService">
        <depends_on>TokenManager, Database, Cache</depends_on>
        <used_by>Controllers, Middleware, Services</used_by>
      </module>
      <module name="TokenManager">
        <depends_on>Crypto, Database</depends_on>
        <used_by>AuthService, Sessions</used_by>
      </module>
    </dependency_map>
  </scope>

  <refactoring_strategy>
    <approach>Incremental refactoring with compatibility layer</approach>
    
    <phase name="preparation" order="1">
      <actions>
        <action>
          Create wrapper functions that accept both callbacks and promises
        </action>
        <action>
          Write comprehensive tests for all authentication scenarios
        </action>
        <action>
          Document current callback-based API thoroughly
        </action>
      </actions>
      <deliverable>
        Test suite covering all current behavior, compatibility wrapper skeleton
      </deliverable>
      <validation>
        All tests pass with current implementation
      </validation>
    </phase>

    <phase name="refactoring" order="2">
      <actions>
        <action>
          Refactor TokenManager to async/await (lowest-level dependency)
        </action>
        <action>
          Update AuthService to use new TokenManager API
        </action>
        <action>
          Refactor middleware to use new async API
        </action>
        <action>
          Add compatibility layer for backward compatibility
        </action>
      </actions>
      <guidelines>
        <guideline priority="critical">
          Never break existing callback-based API
        </guideline>
        <guideline priority="critical">
          Refactor one file at a time, testing after each change
        </guideline>
        <guideline priority="high">
          Keep new async code and old callback code separate initially
        </guideline>
        <guideline priority="medium">
          Add migration guide for consumers
        </guideline>
      </guidelines>
    </phase>

    <phase name="verification" order="3">
      <actions>
        <action>Run entire test suite</action>
        <action>Check for TypeScript errors</action>
        <action>Run linter</action>
        <action>Verify performance hasn't degraded</action>
        <action>Check backward compatibility with old API</action>
      </actions>
      <validation_checklist>
        <item>All unit tests pass</item>
        <item>All integration tests pass</item>
        <item>No TypeScript errors</item>
        <item>No ESLint violations</item>
        <item>Performance metrics stable or improved</item>
        <item>Old API still works for consumers</item>
      </validation_checklist>
    </phase>
  </refactoring_strategy>

  <common_pitfalls_to_avoid>
    <pitfall priority="critical">
      Don't remove callback-based functions until all consumers are migrated
    </pitfall>
    <pitfall priority="high">
      Don't assume all calling code handles promises correctly
    </pitfall>
    <pitfall priority="high">
      Don't forget error handling in async contexts
    </pitfall>
    <pitfall priority="medium">
      Don't create performance regressions with unnecessary awaits
    </pitfall>
  </common_pitfalls_to_avoid>

  <success_criteria>
    <criterion>All new code is async/await based</criterion>
    <criterion>Old callback API still works (backward compatible)</criterion>
    <criterion>Test coverage maintained or improved</criterion>
    <criterion>No performance degradation</criterion>
    <criterion>Documentation updated</criterion>
    <criterion>Migration guide provided for consumers</criterion>
  </success_criteria>
</refactoring_task>
```

### Pattern 5: Database Migration with Code Changes

```xml
<database_migration_task>
  <objective>
    Migrate user_preferences table to support JSON-based preferences instead of 
    individual columns, maintaining backward compatibility during rollout
  </objective>

  <migration_details>
    <current_schema>
      <table name="user_preferences">
        <column name="user_id" type="uuid" primary="true"/>
        <column name="theme" type="varchar"/>
        <column name="language" type="varchar"/>
        <column name="timezone" type="varchar"/>
        <column name="notifications_enabled" type="boolean"/>
        <column name="email_digest_frequency" type="varchar"/>
      </table>
    </current_schema>

    <target_schema>
      <table name="user_preferences">
        <column name="user_id" type="uuid" primary="true"/>
        <column name="settings" type="jsonb" default="{}"/>
        <column name="created_at" type="timestamp"/>
        <column name="updated_at" type="timestamp"/>
      </table>
    </target_schema>
  </migration_details>

  <implementation_strategy>
    <step number="1" name="create_new_column">
      <sql>ALTER TABLE user_preferences ADD COLUMN settings JSONB DEFAULT '{}';</sql>
      <rationale>Add new column without removing old ones</rationale>
      <reversible>true</reversible>
    </step>

    <step number="2" name="migrate_data">
      <sql>
        UPDATE user_preferences SET settings = jsonb_build_object(
          'theme', theme,
          'language', language,
          'timezone', timezone,
          'notifications_enabled', notifications_enabled,
          'email_digest_frequency', email_digest_frequency
        ) WHERE settings = '{}';
      </sql>
      <rationale>Migrate existing data to new JSON format</rationale>
      <reversible>true</reversible>
      <testing>
        SELECT COUNT(*) FROM user_preferences WHERE settings != '{}';
        Should match count of non-null theme values
      </testing>
    </step>

    <step number="3" name="update_code">
      <description>
        Update PreferencesService to read from settings column while maintaining
        fallback to old columns for backward compatibility
      </description>
      <files_to_modify>
        <file>src/services/PreferencesService.ts</file>
        <file>src/repositories/PreferencesRepository.ts</file>
      </files_to_modify>
      <compatibility_pattern>
        When reading, check settings column first, fallback to old columns if empty
        When writing, write to both settings and old columns initially
      </compatibility_pattern>
    </step>

    <step number="4" name="deprecate_columns">
      <timeline>
        <event>Week 1-4: Run in dual-write mode (write to both old and new)</event>
        <event>Week 4-8: Monitor and verify all data is being written correctly</event>
        <event>Week 8+: Remove old columns after verifying no consumers read from them</event>
      </timeline>
      <rationale>Gradual migration reduces risk of data loss or inconsistency</rationale>
    </step>

    <step number="5" name="cleanup">
      <description>After sufficient time, remove old columns and dual-write code</description>
      <sql>
        ALTER TABLE user_preferences 
        DROP COLUMN theme,
        DROP COLUMN language,
        DROP COLUMN timezone,
        DROP COLUMN notifications_enabled,
        DROP COLUMN email_digest_frequency;
      </sql>
      <reversible>false</reversible>
    </step>
  </implementation_strategy>

  <rollback_procedures>
    <procedure for_step="1">
      <sql>ALTER TABLE user_preferences DROP COLUMN settings;</sql>
      <time_to_execute>Seconds</time_to_execute>
    </procedure>
    <procedure for_step="2">
      <description>Data already exists in old columns, nothing to restore</description>
      <time_to_execute>Instant</time_to_execute>
    </procedure>
    <procedure for_step="3">
      <description>Revert code changes to original PreferencesService</description>
      <time_to_execute>Minutes (includes deployment)</time_to_execute>
    </procedure>
  </rollback_procedures>

  <testing_strategy>
    <unit_tests>
      <test>PreferencesService reads theme from JSON correctly</test>
      <test>PreferencesService falls back to old column if JSON empty</test>
      <test>PreferencesService writes to both old and new columns</test>
    </unit_tests>
    
    <integration_tests>
      <test>End-to-end preference read/write cycle</test>
      <test>Concurrent updates to preferences don't cause data loss</test>
      <test>Old code can still read preferences during dual-write period</test>
    </integration_tests>

    <data_validation>
      <query>SELECT COUNT(*) FROM user_preferences WHERE settings IS NULL;</query>
      <expected>0 (all rows should have settings)</expected>
      
      <query>
        SELECT COUNT(*) FROM user_preferences WHERE 
        settings->>'theme' != theme OR 
        settings->>'language' != language;
      </query>
      <expected>0 (data should match during dual-write)</expected>
    </data_validation>
  </testing_strategy>

  <monitoring>
    <metric name="migration_completion">Track percentage of old data migrated</metric>
    <metric name="error_rate">Monitor errors during data migration</metric>
    <metric name="query_performance">Verify JSON queries are as fast as old columns</metric>
    <alert trigger="any_errors_in_migration">
      Stop migration immediately and investigate
    </alert>
  </monitoring>
</database_migration_task>
```

---

## Creating Agent-Driven Workflows (AGENTS.md)

### The AGENTS.md Structure

When building complex agent workflows, create an AGENTS.md file to define how multiple agents collaborate:

```markdown
# AGENTS.md - Agent Orchestration Configuration

## Agent Definitions

### 1. Code Explorer Agent
- **Purpose**: Read and analyze codebase structure
- **Scope**: Can execute `read_file`, `list_files` commands
- **Context Window**: 100K tokens
- **Responsibilities**:
  - Map project structure
  - Understand dependencies
  - Identify relevant files for tasks

### 2. Code Implementer Agent
- **Purpose**: Write and modify code
- **Scope**: Can execute `create_file`, `edit_file`, `run_command` (limited)
- **Context Window**: 120K tokens
- **Responsibilities**:
  - Implement new features
  - Fix bugs
  - Refactor code

### 3. Code Reviewer Agent
- **Purpose**: Review code for quality and security
- **Scope**: Read-only access
- **Context Window**: 80K tokens
- **Responsibilities**:
  - Code quality review
  - Security audit
  - Performance analysis
  - Test coverage verification

### 4. Testing Agent
- **Purpose**: Write and run tests
- **Scope**: Can execute `run_tests`, `create_test_file`
- **Context Window**: 100K tokens
- **Responsibilities**:
  - Write unit tests
  - Write integration tests
  - Verify test coverage
  - Run test suite

## Workflow: Complete Feature Implementation

```
User Request
    ↓
Code Explorer (Analyze codebase) → Context
    ↓
Code Implementer (Implement feature) → Implementation
    ↓
Testing Agent (Write tests) → Test Suite
    ↓
Code Reviewer (Review all changes) → Review Report
    ↓
User (Review and approve)
```

## Agent Communication Protocol

### Message Format

```json
{
  "from_agent": "code-explorer",
  "to_agent": "code-implementer",
  "message_type": "hand_off",
  "context": {
    "files_relevant": ["src/services/UserService.ts", "src/models/User.ts"],
    "structure": "Service pattern used throughout",
    "patterns": ["Dependency injection", "Repository pattern"]
  },
  "task": "Implement new feature based on the provided context"
}
```

### Agent Suspension Points

Define where agents hand off to next agents:

```
POINT A: Code Explorer finishes understanding codebase
  ├─ Output: File map, dependency tree, architecture overview
  └─ Trigger: Sufficient understanding achieved

POINT B: Code Implementer finishes implementation
  ├─ Output: Modified files, implementation summary
  └─ Trigger: All requirements met, code compiles

POINT C: Testing Agent finishes test suite
  ├─ Output: Test files, coverage report
  └─ Trigger: Coverage threshold met, tests pass

POINT D: Code Reviewer finishes review
  ├─ Output: Review report with issues and approvals
  └─ Trigger: Review complete or critical issues found
```

## Handling Agent Failures

Define fallback procedures for each agent:

```
If Code Explorer fails to understand structure:
  → Re-try with specific file pointers
  → Fall back to manual guidance from user

If Code Implementer produces compilation errors:
  → Testing Agent identifies errors
  → Code Implementer receives error details and retries

If Testing Agent cannot reach coverage threshold:
  → Code Implementer receives coverage gap report
  → Implements additional tests as needed

If Code Reviewer flags critical security issues:
  → Pause workflow
  → Code Implementer fixes identified issues
  → Code Reviewer re-reviews
```
```

### XML Format for AGENTS.md Configuration

```xml
<agents>
  <agent name="code-explorer" model="claude-opus-4.5">
    <description>Analyzes and maps codebase structure</description>
    <capabilities>
      <capability>read_file</capability>
      <capability>list_files</capability>
      <capability>analyze_structure</capability>
    </capabilities>
    <constraints>
      <constraint type="readonly">Cannot modify files</constraint>
      <constraint type="context">Max 100K tokens</constraint>
      <constraint type="scope">Project scope only</constraint>
    </constraints>
    <handoff_to>code-implementer</handoff_to>
  </agent>

  <agent name="code-implementer" model="claude-opus-4.5">
    <description>Implements features and fixes bugs</description>
    <capabilities>
      <capability>create_file</capability>
      <capability>edit_file</capability>
      <capability>run_command</capability>
    </capabilities>
    <constraints>
      <constraint type="readonly">Cannot delete files</constraint>
      <constraint type="context">Max 120K tokens</constraint>
      <constraint type="execution">Limited command execution</constraint>
    </constraints>
    <requires_context_from>code-explorer</requires_context_from>
    <handoff_to>testing-agent</handoff_to>
  </agent>

  <agent name="code-reviewer" model="claude-opus-4.5">
    <description>Reviews code for quality and security</description>
    <capabilities>
      <capability>read_file</capability>
      <capability>analyze_code</capability>
      <capability>check_security</capability>
    </capabilities>
    <constraints>
      <constraint type="readonly">Read-only access</constraint>
      <constraint type="context">Max 80K tokens</constraint>
    </constraints>
    <requires_context_from>code-implementer, testing-agent</requires_context_from>
    <approval_gates>
      <gate type="code_quality">Must pass linting</gate>
      <gate type="test_coverage">Must have 80%+ coverage</gate>
      <gate type="security">Must not have critical vulnerabilities</gate>
    </approval_gates>
  </agent>

  <agent name="testing-agent" model="claude-sonnet-4.5">
    <description>Writes and runs tests</description>
    <capabilities>
      <capability>create_test_file</capability>
      <capability>run_tests</capability>
      <capability>check_coverage</capability>
    </capabilities>
    <constraints>
      <constraint type="context">Max 100K tokens</constraint>
      <constraint type="scope">Test code only</constraint>
    </constraints>
    <requires_context_from>code-implementer</requires_context_from>
    <handoff_to>code-reviewer</handoff_to>
  </agent>

  <workflow name="feature-implementation">
    <phase order="1" agent="code-explorer">
      <task>Analyze project structure and identify relevant files</task>
      <output>
        <item>File map</item>
        <item>Dependency tree</item>
        <item>Architecture overview</item>
      </output>
      <validation>Understanding confirmed, no critical information missing</validation>
    </phase>

    <phase order="2" agent="code-implementer">
      <task>Implement feature based on requirements and context</task>
      <input_from>code-explorer</input_from>
      <output>
        <item>Modified files</item>
        <item>Implementation summary</item>
        <item>Any gotchas encountered</item>
      </output>
      <validation>Code compiles without errors</validation>
    </phase>

    <phase order="3" agent="testing-agent">
      <task>Write comprehensive tests for implementation</task>
      <input_from>code-implementer</input_from>
      <output>
        <item>Test files</item>
        <item>Coverage report</item>
        <item>Test results</item>
      </output>
      <validation>All tests pass, coverage >= 80%</validation>
    </phase>

    <phase order="4" agent="code-reviewer">
      <task>Review code for quality, security, and performance</task>
      <input_from>code-implementer, testing-agent</input_from>
      <output>
        <item>Code review report</item>
        <item>Issues found</item>
        <item>Approval status</item>
      </output>
      <validation>No critical issues, all gates passed</validation>
      
      <failure_handling>
        <if_status>critical_issues_found</if_status>
        <then>Report back to code-implementer for fixes</then>
        <then>Re-run testing</then>
        <then>Re-run review</then>
      </failure_handling>
    </phase>

    <completion>All phases completed successfully, ready for merge</completion>
  </workflow>
</agents>
```

---

## Context Management & Large Codebases

### Challenge: The Context Limitation

Modern LLMs have large context windows (100K+ tokens for Claude), but large codebases can still exceed these limits. For a typical codebase:

- **Small codebase** (10K LOC): ~40K tokens
- **Medium codebase** (50K LOC): ~200K tokens  
- **Large codebase** (500K+ LOC): ~2M+ tokens

Managing context efficiently is critical for agent performance on large projects.

### Strategy 1: Hierarchical File Indexing

Create a detailed file structure index that agents consult before loading full files:

```xml
<codebase_index>
  <module name="authentication" priority="high">
    <description>Handles user authentication and token management</description>
    <files>
      <file path="src/auth/AuthService.ts" importance="critical">
        <exports>
          <export>AuthService class with authenticate, refresh methods</export>
          <export>generateToken function</export>
        </exports>
        <dependencies>TokenManager, UserRepository, CacheService</dependencies>
        <lines_of_code>450</lines_of_code>
        <key_patterns>Dependency injection, async/await</key_patterns>
      </file>
      <file path="src/auth/TokenManager.ts" importance="high">
        <exports>
          <export>TokenManager class</export>
          <export>TokenPayload interface</export>
        </exports>
        <dependencies>Crypto, Database</dependencies>
        <lines_of_code>280</lines_of_code>
      </file>
    </files>
    <interfaces>
      <interface name="IAuthService">
        <method>authenticate(username: string, password: string)</method>
        <method>refresh(token: string)</method>
        <method>validate(token: string)</method>
      </interface>
    </interfaces>
    <related_tests>tests/auth/*.test.ts</related_tests>
  </module>

  <module name="user_management" priority="high">
    <description>Manages user profiles, preferences, and data</description>
    <files>
      <file path="src/services/UserService.ts" importance="critical">
        <exports>
          <export>UserService class</export>
          <export>User type definitions</export>
        </exports>
        <dependencies>UserRepository, AuthService, EmailService</dependencies>
        <lines_of_code>320</lines_of_code>
      </file>
    </files>
    <related_tests>tests/user/*.test.ts</related_tests>
  </module>

  <module name="database" priority="medium">
    <description>Database models and migrations</description>
    <files>
      <file path="src/models/User.ts">User database model</file>
      <file path="src/models/Session.ts">Session database model</file>
    </files>
  </module>
</codebase_index>
```

### Strategy 2: Smart File Selection for Agents

Create a delegation strategy that selects only relevant files:

```xml
<agent_task id="implement_feature_large_codebase">
  <objective>Implement new feature: User profile picture upload</objective>

  <context_strategy>
    <phase name="discovery">
      <action>Load codebase_index.xml to understand structure</action>
      <files_to_load>
        <file>codebase_index.xml</file>
      </files_to_load>
      <tokens_used>~2K</tokens_used>
    </phase>

    <phase name="analysis">
      <action>Identify which modules are relevant</action>
      <relevant_modules>
        <module>user_management (profile data)</module>
        <module>file_storage (file upload)</module>
        <module>api (endpoints)</module>
      </relevant_modules>
    </phase>

    <phase name="detailed_context">
      <action>Load specific files from relevant modules</action>
      <files_to_load>
        <file priority="critical">src/services/UserService.ts</file>
        <file priority="critical">src/services/FileStorageService.ts</file>
        <file priority="high">src/controllers/UserController.ts</file>
        <file priority="medium">src/models/User.ts</file>
        <file priority="medium">tests/user/*.test.ts</file>
      </files_to_load>
      <tokens_used>~30K</tokens_used>
      <total_context_used>~32K of 100K available</total_context_used>
    </phase>

    <phase name="implementation">
      <action>Implement feature with full context</action>
      <context_remaining>~68K tokens for implementation</context_remaining>
    </phase>
  </context_strategy>

  <query_optimization>
    <technique>Use specific line ranges instead of whole files</technique>
    <example>
      Instead of loading entire User.ts (300 lines),
      request lines 1-50 (imports and class definition)
    </example>
  </query_optimization>

  <architectural_assumptions>
    <assumption>Project uses dependency injection pattern</assumption>
    <assumption>Services handle business logic, controllers handle HTTP</assumption>
    <assumption>Tests are co-located with implementation (adjacent .test.ts files)</assumption>
  </architectural_assumptions>
</agent_task>
```

### Strategy 3: Codebase Partitioning

For very large codebases, partition into logical domains:

```xml
<domain_partition>
  <domain name="core">
    <description>Core business logic shared by all domains</description>
    <modules>
      <module>authentication</module>
      <module>user_management</module>
      <module>database</module>
    </modules>
    <estimated_tokens>50K</estimated_tokens>
    <critical>true</critical>
  </domain>

  <domain name="ecommerce">
    <description>E-commerce specific functionality</description>
    <modules>
      <module>products</module>
      <module>shopping_cart</module>
      <module>orders</module>
      <module>payments</module>
    </modules>
    <estimated_tokens>120K</estimated_tokens>
    <critical>false</critical>
    <dependent_on>core</dependent_on>
  </domain>

  <domain name="analytics">
    <description>Analytics and reporting</description>
    <modules>
      <module>event_tracking</module>
      <module>reports</module>
      <module>dashboards</module>
    </modules>
    <estimated_tokens>80K</estimated_tokens>
    <critical>false</critical>
    <dependent_on>core</dependent_on>
  </domain>

  <domain name="admin">
    <description>Admin and management interfaces</description>
    <modules>
      <module>user_admin</module>
      <module>content_admin</module>
      <module>system_admin</module>
    </modules>
    <estimated_tokens>60K</estimated_tokens>
    <critical>false</critical>
    <dependent_on>core</dependent_on>
  </domain>

  <agent_delegation>
    <rule>
      <if>Task is within single domain</if>
      <then>Load that domain + core domain + interfaces</then>
      <context_budget>~80K tokens</context_budget>
    </rule>
    <rule>
      <if>Task spans multiple domains</if>
      <then>Load affected domains + interfaces + minimal core</then>
      <context_budget>~100K tokens</context_budget>
      <alternative>Split into multiple tasks delegated to different agents</alternative>
    </rule>
    <rule>
      <if>Task requires all domains</if>
      <then>Create multiple subtasks, delegate to different agents</then>
      <agents_needed>One per domain, plus coordinator</agents_needed>
    </rule>
  </agent_delegation>
</domain_partition>
```

### Strategy 4: Incremental Code Loading

Instead of loading entire files, load incrementally as needed:

```xml
<incremental_loading_pattern>
  <phase name="initial_load">
    <load>File headers, imports, type definitions (first 50 lines)</load>
    <purpose>Understand API and dependencies</purpose>
    <tokens>~3K</tokens>
  </phase>

  <phase name="as_needed">
    <trigger>When specific function or class is referenced</trigger>
    <load>Specific function/class definition (usually 20-50 lines)</load>
    <purpose>Understand implementation details</purpose>
    <example>
      Agent asks about UserService.updateProfile method
      → Load just that method from UserService.ts
      → Tokens: ~500
    </example>
  </phase>

  <phase name="full_context">
    <trigger>Only if implementation requires deep understanding</trigger>
    <load>Complete file</load>
    <purpose>Implement change that affects overall structure</purpose>
    <example>
      Refactoring UserService entirely
      → Load full UserService.ts
      → Tokens: ~8K
    </example>
  </phase>
</incremental_loading_pattern>
```

---

## Hallucination Prevention & Assertiveness

### What Causes Hallucinations in Code Agents?

1. **Insufficient Context**: Agent doesn't have enough information to make correct decisions
2. **Conflicting Instructions**: Contradictory guidelines confuse the model
3. **Ambiguous Requirements**: Vague or incomplete specifications
4. **Knowledge Gaps**: Code patterns the model doesn't understand
5. **Context Pollution**: Too much irrelevant information mixed with relevant information

### XML Pattern for Hallucination Prevention

```xml
<hallucination_prevention>
  <principle name="explicit_over_implicit">
    <!-- WRONG: Implicit expectation -->
    <bad_example>
      <instruction>
        Update the database when user saves settings
      </instruction>
    </bad_example>

    <!-- CORRECT: Explicit requirements -->
    <good_example>
      <instruction>
        <action>Update the database when user saves settings</action>
        <specific_details>
          <database>PostgreSQL (not MongoDB)</database>
          <table>user_preferences</table>
          <operation>UPDATE or INSERT depending on existing record</operation>
          <transaction>Must be within a transaction with rollback on error</transaction>
          <validation>Verify all required fields are present before updating</validation>
        </specific_details>
      </instruction>
    </good_example>
  </principle>

  <principle name="concrete_over_abstract">
    <!-- WRONG: Abstract -->
    <bad_example>
      <instruction>Make the code more efficient</instruction>
    </bad_example>

    <!-- CORRECT: Concrete -->
    <good_example>
      <instruction>
        <target>The queryDatabase function in UserRepository.ts (lines 45-60)</target>
        <current_performance>Executes 3 sequential queries, takes ~500ms</current_performance>
        <goal>Reduce to single query using JOIN, target <100ms</goal>
        <constraint>Cannot modify database schema</constraint>
        <validation>
          <test>Performance test must show <100ms execution</test>
          <test>Results must match original 3-query approach</test>
        </validation>
      </instruction>
    </good_example>
  </principle>

  <principle name="grounding_in_facts">
    <!-- WRONG: Speculative -->
    <bad_example>
      <context>We probably use bcryptjs for password hashing</context>
      <instruction>Hash the password with our encryption library</instruction>
    </bad_example>

    <!-- CORRECT: Grounded in fact -->
    <good_example>
      <context>
        <fact source="src/auth/AuthService.ts:line 3">
          import bcrypt from 'bcryptjs' is the password hashing library used
        </fact>
        <fact source="src/auth/AuthService.ts:line 125-130">
          Password hashing pattern: bcrypt.hash(password, 10)
        </fact>
      </context>
      <instruction>
        <action>Hash the password</action>
        <library>bcryptjs (confirmed import in AuthService.ts)</library>
        <pattern>Use bcrypt.hash(password, 10) as shown in line 127</pattern>
      </instruction>
    </good_example>
  </principle>

  <principle name="read_before_write">
    <requirement priority="critical">
      ALWAYS read and understand relevant files before proposing code edits
    </requirement>
    <implementation>
      <instruction>
        <objective>Implement new validation for user email</objective>
        <required_actions>
          <action priority="1">Read current validation logic in src/validation/validators.ts</action>
          <action priority="2">Read how validators are used in src/services/UserService.ts</action>
          <action priority="3">Check existing tests in tests/validation/</action>
          <action priority="4">Only after reading all files, propose changes</action>
        </required_actions>
        <validation>Agent must cite specific lines/files when proposing changes</validation>
      </instruction>
    </implementation>
  </principle>

  <principle name="bounded_scope">
    <!-- WRONG: Unbounded -->
    <bad_example>
      <task>Improve the application</task>
    </bad_example>

    <!-- CORRECT: Bounded scope -->
    <good_example>
      <task>
        <scope_limited_to>
          <module>Authentication module only</module>
          <files>src/auth/*.ts (exclude external integrations)</files>
          <changes_allowed>AuthService.ts, TokenManager.ts, validation rules</changes_allowed>
          <changes_forbidden>Database schema, external APIs, admin systems</changes_forbidden>
        </scope_limited_to>
        <objective>Improve token refresh mechanism to reduce failed refreshes by 50%</objective>
        <success_metric>Failed refresh requests drop from 2% to 1%</success_metric>
      </task>
    </good_example>
  </principle>

  <verification_checklist>
    <check>
      <question>Can the agent cite specific lines/files for each claim made?</question>
      <criterion>Agent must reference file names and line numbers when discussing code</criterion>
      <if_failed>Hallucination risk - agent is speculating about code it hasn't seen</if_failed>
    </check>

    <check>
      <question>Does every instruction have explicit acceptance criteria?</question>
      <criterion>Testable success criteria defined, not subjective</criterion>
      <if_failed>Hallucination risk - agent may make incorrect assumptions about success</if_failed>
    </check>

    <check>
      <question>Are all assumptions explicitly stated and validated?</question>
      <criterion>No "probably" or "likely" statements without facts</criterion>
      <if_failed>Hallucination risk - agent may make wrong assumptions</if_failed>
    </check>

    <check>
      <question>Is the scope clearly bounded and understood?</question>
      <criterion>Agent confirms it understands what's in and out of scope</criterion>
      <if_failed>Hallucination risk - agent may modify things it shouldn't</if_failed>
    </check>

    <check>
      <question>Are there clear, testable validation procedures?</question>
      <criterion>How will we verify the agent succeeded?</criterion>
      <if_failed>Hallucination risk - no way to detect if agent made mistakes</if_failed>
    </check>
  </verification_checklist>
</hallucination_prevention>
```

### Building Assertiveness Through Explicit Proactivity

```xml
<assertiveness_framework>
  <definition>
    Assertiveness = Agent takes appropriate action without excessive hedging or over-asking for confirmation
  </definition>

  <proactive_behavior>
    <behavior name="informed_decision_making">
      <pattern>
        Instead of: "Should I update this file?"
        Use: "Based on the requirements, I'll update this file because [reasons]"
      </pattern>
      <implementation>
        <when>Agent has sufficient information and clear requirements</when>
        <confidence_threshold>90%+</confidence_threshold>
        <action>Proceed with implementation</action>
      </implementation>
    </behavior>

    <behavior name="context_driven_inference">
      <pattern>
        When codebase clearly shows a pattern, follow it without second-guessing
      </pattern>
      <example>
        If all service classes extend BaseService with standard methods,
        new service should follow same pattern without asking permission
      </example>
    </behavior>

    <behavior name="assumption_documentation">
      <pattern>
        Make reasonable assumptions based on context, but document them
      </pattern>
      <template>
        I'm assuming [assumption] based on [evidence from codebase].
        If this is incorrect, please clarify and I'll adjust.
      </template>
    </behavior>
  </proactive_behavior>

  <decision_framework>
    <decision_level name="level_1_no_approval_needed">
      <when>Implementing exact specification with clear requirements</when>
      <examples>
        - Fix bug with obvious root cause
        - Implement feature with detailed acceptance criteria
        - Add test for existing functionality
      </examples>
      <agent_behavior>Proceed immediately, report results</agent_behavior>
    </decision_level>

    <decision_level name="level_2_inform_user">
      <when>Making reasonable architectural decisions</when>
      <examples>
        - Adding new utility function to support feature
        - Refactoring for clarity
        - Updating error messages
      </examples>
      <agent_behavior>
        Proceed, but clearly explain decision rationale
        Make it easy for user to override if desired
      </agent_behavior>
    </decision_level>

    <decision_level name="level_3_ask_before_proceeding">
      <when>Decision significantly impacts architecture or scope</when>
      <examples>
        - Changing public API
        - Adding new database table
        - Changing authentication mechanism
        - Modifying system-wide configuration
      </examples>
      <agent_behavior>
        Clearly explain options and recommendation
        Ask user to confirm before proceeding
      </agent_behavior>
    </decision_level>

    <decision_level name="level_4_escalate_to_human">
      <when>Decision is out of scope or requires domain expertise</when>
      <examples>
        - Product decisions
        - Complex architectural changes
        - Security decisions
        - Compliance requirements
      </examples>
      <agent_behavior>
        Do not proceed
        Clearly explain why human input is needed
        Provide detailed analysis to help human decide
      </agent_behavior>
    </decision_level>
  </decision_framework>

  <xml_implementation>
    <instruction>
      <objective>Add new caching layer to UserService</objective>
      
      <assertiveness level="proactive">
        <required_files_to_read>
          <file>src/services/UserService.ts</file>
          <file>src/cache/CacheService.ts</file>
          <file>tests/services/UserService.test.ts</file>
        </required_files_to_read>
        
        <after_reading_assume>
          <!-- Agent reads files and makes informed decisions -->
          <assumption reason="codebase_pattern">
            If CacheService is already used elsewhere in codebase,
            agent should use it the same way for UserService
          </assumption>
          <assumption reason="naming_convention">
            If methods are named getCachedUser, setCachedUser elsewhere,
            follow same convention here
          </assumption>
        </after_reading_assume>

        <proceed_with_confidence>
          <action priority="critical">
            Read UserService current implementation
          </action>
          <action priority="high">
            Identify which methods are frequently called (cache candidates)
          </action>
          <action priority="high">
            Add cache layer for top 3 methods
          </action>
          <action priority="high">
            Update tests to verify caching works correctly
          </action>
          <reporting>
            "I've added caching to UserService based on the pattern I found in [OtherService].
            Cache keys follow convention [pattern].
            Cache TTL set to [value] based on [configuration file].
            Tests updated to verify cache hits and misses.
            Results: [metrics]"
          </reporting>
        </proceed_with_confidence>
      </assertiveness>
    </instruction>
  </xml_implementation>
</assertiveness_framework>
```

---

## Sub-Agent Orchestration

### Advanced Sub-Agent Patterns

```xml
<sub_agent_orchestration>
  <pattern name="pipeline_orchestration">
    <description>
      Tasks flow through specialized agents in sequence, each handling their domain.
      Output from one agent becomes input to next agent.
    </description>

    <example name="code_quality_pipeline">
      <stage number="1" agent="code-explorer">
        <task>Analyze current code and identify improvement areas</task>
        <output>
          <item>Code quality assessment</item>
          <item>List of specific issues with line numbers</item>
          <item>Prioritized improvement suggestions</item>
        </output>
      </stage>

      <stage number="2" agent="code-implementer" depends_on="code-explorer">
        <input_from>code-explorer</input_from>
        <task>Fix issues identified by code-explorer, starting with highest priority</task>
        <output>
          <item>Fixed code</item>
          <item>Summary of changes</item>
          <item>Any issues encountered</item>
        </output>
      </stage>

      <stage number="3" agent="testing-agent" depends_on="code-implementer">
        <input_from>code-implementer</input_from>
        <task>Verify fixes didn't break tests, add tests for improved code</task>
        <output>
          <item>Test suite status</item>
          <item>Coverage metrics</item>
          <item>Any new tests added</item>
        </output>
      </stage>

      <stage number="4" agent="code-reviewer" depends_on="testing-agent">
        <input_from>testing-agent, code-implementer</input_from>
        <task>Final review of all changes</task>
        <output>
          <item>Approval or issues found</item>
          <item>Final quality assessment</item>
        </output>
      </stage>

      <handoff_protocol>
        <from agent="code-explorer" to="code-implementer">
          Issues must be specific (file, line number, description)
          Severity must be assigned (critical/high/medium/low)
          Suggested fix should be provided if known
        </from>
        <from agent="code-implementer" to="testing-agent">
          List of files modified
          Summary of changes per file
          Any known edge cases tested
        </from>
        <from agent="testing-agent" to="code-reviewer">
          Full test results
          Coverage metrics
          Any tests that failed
        </from>
      </handoff_protocol>
    </example>
  </pattern>

  <pattern name="parallel_execution">
    <description>
      Independent agents work in parallel on separate tasks, then results are merged.
      Useful when tasks don't depend on each other.
    </description>

    <example name="parallel_documentation_generation">
      <task>Generate documentation for three separate modules</task>

      <parallel_agents>
        <agent_instance id="doc-writer-1">
          <agent_type>documentation-writer</agent_type>
          <assignment>API documentation for UserService</assignment>
        </agent_instance>

        <agent_instance id="doc-writer-2">
          <agent_type>documentation-writer</agent_type>
          <assignment>API documentation for PaymentService</assignment>
        </agent_instance>

        <agent_instance id="doc-writer-3">
          <agent_type>documentation-writer</agent_type>
          <assignment>API documentation for NotificationService</assignment>
        </agent_instance>
      </parallel_agents>

      <merge_phase>
        <agent>documentation-coordinator</agent>
        <task>
          Combine documentation from three modules into single cohesive guide
          Ensure consistent style and formatting across all modules
          Create cross-references between modules
          Build table of contents
        </task>
      </merge_phase>

      <benefits>
        <benefit>Faster execution (parallel vs sequential)</benefit>
        <benefit>Better specialization (each agent focuses on one module)</benefit>
        <benefit>Easier to verify each piece independently</benefit>
      </benefits>
    </example>
  </pattern>

  <pattern name="hierarchical_delegation">
    <description>
      Top-level agent breaks complex task into subtasks,
      delegates to specialized agents, coordinates results.
    </description>

    <example name="feature_implementation_with_hierarchy">
      <orchestrator agent="project-manager">
        <task>Implement user analytics feature</task>
        <analysis>
          This requires: backend APIs, database changes, frontend UI, testing
          Delegate each to specialized agent
        </analysis>

        <delegated_tasks>
          <subtask id="task-1">
            <assign_to agent="backend-implementer">
              Create analytics APIs that collect and store user events
            </assign_to>
            <success_criteria>
              <criterion>APIs implemented and documented</criterion>
              <criterion>Tests pass</criterion>
              <criterion>Database schema supports event storage</criterion>
            </success_criteria>
          </subtask>

          <subtask id="task-2">
            <assign_to agent="frontend-implementer">
              Create analytics dashboard showing user activity
            </assign_to>
            <depends_on>task-1 (APIs must be ready)</depends_on>
            <success_criteria>
              <criterion>Dashboard displays real-time data</criterion>
              <criterion>Responsive design works on mobile</criterion>
              <criterion>Component tests pass</criterion>
            </success_criteria>
          </subtask>

          <subtask id="task-3">
            <assign_to agent="integration-tester">
              Verify end-to-end analytics flow
            </assign_to>
            <depends_on>task-1, task-2</depends_on>
            <success_criteria>
              <criterion>Events collected correctly</criterion>
              <criterion>Dashboard reflects data in real-time</criterion>
              <criterion>Performance acceptable under load</criterion>
            </success_criteria>
          </subtask>
        </delegated_tasks>

        <coordination>
          <task-1-output>API endpoint URLs, event schema, authentication requirements</task-1-output>
          <pass_to>task-2 (frontend needs to know API endpoints)</pass_to>

          <task-2-output>Frontend component interfaces, expected data formats</task-2-output>
          <pass_to>task-1 (backend may need to adjust APIs)</pass_to>

          <synchronization>
            Backend and frontend must be synchronized on data schema
            Use shared interface definitions in src/types/analytics.ts
            Both agents must update this file as needed
          </synchronization>
        </coordination>

        <result_assembly>
          Collect results from all subtasks
          Verify all integration points work
          Generate summary report
        </result_assembly>
      </orchestrator>
    </example>
  </pattern>

  <failure_recovery>
    <scenario name="subtask_fails">
      <when>One agent fails to complete its task</when>
      <recovery>
        <step>Orchestrator detects failure</step>
        <step>Retry failed task with agent (maybe with additional context)</step>
        <step>If retry fails, escalate to human with detailed error report</step>
        <step>Do not proceed with dependent tasks until failure resolved</step>
      </recovery>
    </scenario>

    <scenario name="dependency_conflict">
      <when>Task A produces output that conflicts with Task B requirements</when>
      <recovery>
        <step>Coordinator detects conflict</step>
        <step>Create merged task for both agents to resolve</step>
        <step>Provide explicit resolution guidelines</step>
        <step>Re-execute both tasks with resolved requirements</step>
      </recovery>
    </scenario>

    <scenario name="context_exhaustion">
      <when>Agent runs out of context while executing task</when>
      <recovery>
        <step>Agent reports context limit approaching</step>
        <step>Split task into smaller subtasks</step>
        <step>Create checkpoint with current progress</step>
        <step>Resume in new agent instance with checkpoint context</step>
      </recovery>
    </scenario>
  </failure_recovery>
</sub_agent_orchestration>
```

---

## Real-World Production Patterns

### Pattern: Production Deployment Task

```xml
<production_deployment_task>
  <objective>Deploy new payment system changes to production safely</objective>
  <risk_level>critical</risk_level>

  <pre_deployment>
    <verification agent="code-reviewer">
      <task>
        <check>All code changes reviewed and approved</check>
        <check>No security vulnerabilities found</check>
        <check>All tests passing locally</check>
        <check>No breaking API changes</check>
      </task>
      <gate>Must approve before proceeding</gate>
    </verification>

    <staging_deployment agent="devops-agent">
      <task>
        <action>Deploy to staging environment</action>
        <action>Run smoke tests</action>
        <action>Verify database migrations run successfully</action>
        <action>Check memory and CPU usage</action>
      </task>
      <gate>Staging must be healthy before production</gate>
    </staging_deployment>

    <load_testing agent="performance-agent">
      <task>
        <action>Run load tests on staging</action>
        <action>Verify no performance regression</action>
        <action>Check database query performance</action>
        <action>Verify payment processing handles load</action>
      </task>
      <acceptance_criteria>
        <criterion>p99 latency < 500ms</criterion>
        <criterion>Error rate < 0.1%</criterion>
        <criterion>Database CPU < 70%</criterion>
      </acceptance_criteria>
    </load_testing>
  </pre_deployment>

  <production_deployment>
    <strategy>Blue-Green Deployment</strategy>
    
    <blue_green_setup>
      <blue>Current production serving traffic</blue>
      <green>New version deployed, not serving traffic</green>
    </blue_green_setup>

    <deployment_steps>
      <step number="1">
        <action>Deploy new version to green environment</action>
        <agent>devops-agent</agent>
        <verification>Green environment healthy and ready</verification>
      </step>

      <step number="2">
        <action>Run database migrations</action>
        <agent>devops-agent</agent>
        <verification>All migrations successful, no rollbacks needed</verification>
        <rollback_plan>If failed, rollback green environment</rollback_plan>
      </step>

      <step number="3">
        <action>Canary traffic shift: 5% to green</action>
        <agent>traffic-manager-agent</agent>
        <monitoring>
          <metric>Error rate for green traffic</metric>
          <metric>Response time for green traffic</metric>
          <metric>Business metrics (payment success rate, etc.)</metric>
        </monitoring>
        <duration>15 minutes</duration>
        <rollback_trigger>Any error rate spike or anomaly</rollback_trigger>
      </step>

      <step number="4">
        <action>If canary healthy, shift 50% traffic to green</action>
        <agent>traffic-manager-agent</agent>
        <monitoring>Continue monitoring all metrics</monitoring>
        <duration>30 minutes</duration>
        <rollback_trigger>Any issues detected</rollback_trigger>
      </step>

      <step number="5">
        <action>Complete traffic shift to green</action>
        <agent>traffic-manager-agent</agent>
        <verification>All traffic on green, blue still running</verification>
        <idle_time_before_decommission>1 hour</idle_time_before_decommission>
      </step>

      <step number="6">
        <action>Decommission blue environment</action>
        <agent>devops-agent</agent>
        <timing>After 1 hour of successful green operation</timing>
      </step>
    </deployment_steps>
  </production_deployment>

  <monitoring>
    <agent name="monitoring-agent">
      <responsibilities>
        <responsibility>Continuous health monitoring</responsibility>
        <responsibility>Alert on anomalies</responsibility>
        <responsibility>Track business metrics</responsibility>
        <responsibility>Trigger rollback if needed</responsibility>
      </responsibilities>

      <metrics_to_watch>
        <metric name="error_rate" threshold="1%" trigger="alert"/>
        <metric name="payment_success_rate" threshold="99%" trigger="alert"/>
        <metric name="average_response_time" threshold="500ms" trigger="alert"/>
        <metric name="database_connection_pool" threshold="90%" trigger="alert"/>
        <metric name="redis_memory_usage" threshold="80%" trigger="alert"/>
      </metrics_to_watch>

      <alerting>
        <trigger condition="error_rate exceeds 1%">
          <action>Immediate Slack alert to team</action>
          <action>If sustained for 5 minutes, trigger rollback</action>
        </trigger>
        <trigger condition="payment_success_rate drops below 99%">
          <action>Page on-call engineer</action>
          <action>Investigate before proceeding with deployment</action>
        </trigger>
      </alerting>
    </agent>
  </monitoring>

  <rollback_procedure>
    <trigger>Any critical metric exceeds threshold for 5 minutes</trigger>
    <steps>
      <step number="1">
        <action>Shift traffic back to blue</action>
        <agent>traffic-manager-agent</agent>
        <duration>Immediate (within seconds)</duration>
      </step>

      <step number="2">
        <action>Monitor blue traffic health</action>
        <agent>monitoring-agent</agent>
        <duration>10 minutes</duration>
      </step>

      <step number="3">
        <action>If blue healthy, keep blue as primary</action>
        <action>Investigate what went wrong with green</action>
        <action>Schedule post-mortem</action>
      </step>

      <step number="4">
        <action>Decommission green environment</action>
        <agent>devops-agent</agent>
        <timing>After investigation starts</timing>
      </step>
    </steps>

    <success_criteria>
      <criterion>Traffic successfully shifted back to blue</criterion>
      <criterion>Error rate returns to normal</criterion>
      <criterion>Payment processing stable</criterion>
    </success_criteria>
  </rollback_procedure>

  <post_deployment>
    <phase name="immediate" duration="1_hour">
      <agent>monitoring-agent</agent>
      <task>
        <action>Monitor all critical metrics continuously</action>
        <action>Check logs for errors</action>
        <action>Verify analytics events flowing correctly</action>
      </task>
    </phase>

    <phase name="short_term" duration="24_hours">
      <agent>monitoring-agent</agent>
      <task>
        <action>Verify no memory leaks</action>
        <action>Check long-running test success rates</action>
        <action>Verify customer feedback (no complaints)</action>
      </task>
    </phase>

    <phase name="post_mortem" when="any_issues_occurred">
      <agent>team-lead</agent>
      <task>
        <action>Document what went wrong</action>
        <action>Create action items to prevent recurrence</action>
        <action>Update deployment procedures if needed</action>
      </task>
    </phase>
  </post_deployment>

  <success_completion>
    <criteria>
      <criterion>No errors detected for 24 hours</criterion>
      <criterion>Payment processing metrics all green</criterion>
      <criterion>Customer reports positive or neutral</criterion>
      <criterion>Database performance stable</criterion>
    </criteria>
    <completion_message>Deployment successful, monitoring ongoing</completion_message>
  </success_completion>
</production_deployment_task>
```

---

## Advanced Techniques & Optimization

### Technique 1: Structured Output with JSON

```xml
<structured_output_enforcement>
  <problem>
    Agents sometimes provide useful information in unstructured text format,
    making it hard for downstream processes to parse and use the information.
  </problem>

  <solution>
    Mandate JSON output format with explicit schema validation.
  </solution>

  <example name="code_review_output">
    <request>
      Review the following code and provide structured feedback
    </request>

    <required_output_format>
      <schema>
        {
          "review_summary": {
            "overall_quality": "APPROVED|APPROVED_WITH_COMMENTS|REQUEST_CHANGES|REJECTED",
            "confidence": 0.95,  // 0-1 scale
            "reasoning": "Short summary of overall assessment"
          },
          "issues": [
            {
              "severity": "CRITICAL|HIGH|MEDIUM|LOW",
              "type": "security|performance|readability|bug|style",
              "location": "filename:line_number",
              "title": "Issue title",
              "description": "Detailed description",
              "suggestion": "How to fix",
              "code_example": "Optional code showing the fix"
            }
          ],
          "positive_aspects": [
            {
              "title": "Good practice spotted",
              "description": "Why this is good",
              "location": "filename:line_number"
            }
          ],
          "recommendations": {
            "should_approve": boolean,
            "blocks_merge": [CRITICAL or HIGH issues found],
            "estimated_review_time": "human readable time estimate"
          },
          "test_coverage": {
            "percentage": 85,
            "missing_coverage": ["EdgeCase1", "ErrorScenario"]
          }
        }
      </schema>
    </required_output_format>

    <validation>
      <step>Parse output as JSON</step>
      <step>Validate against schema</step>
      <step>Check all required fields present</step>
      <step>Verify severity levels are valid</step>
      <step>Cross-reference line numbers against actual files</step>
    </validation>

    <error_handling>
      <if condition="invalid JSON">
        Request agent to reformat output as valid JSON
      </if>
      <if condition="missing required fields">
        Request agent to provide missing information
      </if>
      <if condition="invalid line numbers">
        Request agent to verify line numbers match actual code
      </if>
    </error_handling>
  </example>
</structured_output_enforcement>
```

### Technique 2: Chain-of-Thought Prompting for Complex Tasks

```xml
<chain_of_thought_prompting>
  <definition>
    Ask agent to think through problem step-by-step before providing answer.
    Significantly improves accuracy on complex reasoning tasks.
  </definition>

  <example name="architecture_decision">
    <bad_prompt>
      What architecture should we use for the new notification system?
    </bad_prompt>

    <good_prompt>
      Let's think through the notification system architecture step by step.

      First, please analyze:
      1. Current system constraints:
         - 100K+ users
         - Peak 1000 notifications/second
         - Must deliver within 30 seconds
         - 99.99% uptime requirement

      2. Notification types:
         - Real-time (in-app)
         - Email digests (batch)
         - Push notifications (mobile)
         - SMS (critical only)

      3. Technical considerations:
         - Current infrastructure (Kafka queue, Redis cache)
         - Team expertise (Node.js, PostgreSQL)
         - Budget constraints (keep under $500/month)

      Then, for each architecture option, evaluate:
      - Can handle 1000 notifs/sec? Y/N
      - Fits within $500/month budget? Y/N
      - Team can implement in 2 weeks? Y/N
      - Achieves 99.99% uptime? Y/N

      Finally, recommend the best architecture with reasoning.
    </good_prompt>

    <reasoning_template>
      Step 1: I'll analyze the constraints
      - [Analysis]

      Step 2: I'll consider each option
      - Option A: [Pros/Cons]
      - Option B: [Pros/Cons]
      - Option C: [Pros/Cons]

      Step 3: I'll evaluate against criteria
      - Option A vs Criteria: [Results]
      - Option B vs Criteria: [Results]
      - Option C vs Criteria: [Results]

      Step 4: Based on analysis, my recommendation is [Option]
      Reasoning: [Why this option best meets criteria]
    </reasoning_template>
  </example>
</chain_of_thought_prompting>
```

### Technique 3: Few-Shot Prompting for Consistency

```xml
<few_shot_prompting>
  <purpose>
    Provide examples of desired behavior so agent produces consistent output
  </purpose>

  <example name="commit_message_generation">
    <instruction>
      Generate commit messages following this pattern:
    </instruction>

    <examples>
      <example_1>
        <input>
          Files modified: src/auth/AuthService.ts, tests/auth/AuthService.test.ts
          Change: Added token refresh mechanism with exponential backoff
        </input>
        <output>
          feat(auth): Add token refresh with exponential backoff

          - Implement refresh token mechanism for expired access tokens
          - Add exponential backoff to prevent retry storms
          - Update tests to cover refresh scenarios
          - Maintain backward compatibility with old token format

          Fixes #1234
        </output>
      </example_1>

      <example_2>
        <input>
          Files modified: src/payment/PaymentService.ts, tests/payment/PaymentService.test.ts
          Change: Fixed bug where international cards were rejected
        </input>
        <output>
          fix(payment): Allow international credit card processing

          - Fix BIN validation to accept international card BINs
          - Update card validator to check against current standards
          - Add tests for international card validation
          - No breaking changes to existing API

          Fixes #2456
        </output>
      </example_2>

      <example_3>
        <input>
          Files modified: src/config/database.ts
          Change: Updated connection pool settings for performance
        </input>
        <output>
          perf(db): Optimize connection pool settings

          - Increase pool size from 5 to 10 for better concurrency
          - Add connection timeout to prevent hanging connections
          - Monitor pool metrics to detect future bottlenecks

          Improves query performance under load
        </output>
      </example_3>
    </examples>

    <pattern>
      [type]([scope]): [short description]

      - Bullet point 1
      - Bullet point 2
      - Bullet point 3

      [Related issue/note]
    </pattern>
  </example>
</few_shot_prompting>
```

---

## Conclusion

Mastering advanced XML prompting for code agents requires:

1. **Clarity**: Explicit requirements, not implicit assumptions
2. **Structure**: Hierarchical XML organization mirrors task complexity
3. **Context**: Efficient context management for large codebases
4. **Validation**: Concrete success criteria and verification procedures
5. **Assertiveness**: Empowering agents to make informed decisions
6. **Orchestration**: Multi-agent workflows for complex projects
7. **Production Readiness**: Safe deployment patterns with comprehensive monitoring

The techniques in this guide enable you to:
- ✅ Delegate complex tasks confidently to code agents
- ✅ Prevent hallucinations through explicit prompting
- ✅ Scale to large codebases through smart context management
- ✅ Build robust multi-agent workflows
- ✅ Achieve high assertiveness while maintaining safety
- ✅ Deploy production changes with confidence

---

**Version**: 1.0 | **Last Updated**: January 18, 2026 | **Maintained by**: Code Agent Architecture Team
