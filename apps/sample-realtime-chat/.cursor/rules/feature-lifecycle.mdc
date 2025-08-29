---
description: |
  Defines the complete feature development lifecycle, from initial research and requirement gathering to design, planning, and task creation. This rule integrates documentation research, community feedback via GitHub, and memory-backed planning into a cohesive workflow.
alwaysApply: false
---

# Feature Development Lifecycle

This document outlines the structured workflow for developing new features, ensuring that every stage—from conception to implementation planning—is systematic, well-researched, and aligned with project goals.

## Phase 1: Requirement Gathering & Research

This initial phase focuses on defining *what* needs to be built. It integrates research from documentation and community feedback to create a solid foundation.

### 1.1. Initial Research
- **Explore Documentation:** Use `get_documentation` to understand existing patterns and APIs relevant to the proposed feature.
- **Community Insights:** Use `search_github_issues` to find related feature requests, bug reports, or discussions. This helps validate the problem and gather context from the community.
- **Memory Search:** Use `search_memories` to find internal knowledge, past decisions, or similar features.

### 1.2. Defining Requirements
- **Store Requirements:** Create a memory (`type: "insight"`, `category: "requirements"`) for the feature.
- **Content Format:**
    - **Introduction:** A brief summary of the feature.
    - **User Stories:** "As a [role], I want [feature], so that [benefit]."
    - **Acceptance Criteria (EARS format):**
        - `WHEN [event] THEN [system] SHALL [response]`
        - `IF [precondition] THEN [system] SHALL [response]`
- **Iteration and Approval:**
    1.  I will generate the initial requirements based on our discussion.
    2.  I will then ask for your feedback: "Do the requirements look good? If so, we can move on to the design."
    3.  This process will be repeated until you give explicit approval. I will not proceed without it.

## Phase 2: Design & Architecture

Once requirements are approved, this phase defines *how* the feature will be built.

### 2.1. Technical Design
- **Store Design:** Create an `architectural_decision` memory for the feature design.
- **Core Sections:**
    1.  **Overview:** High-level summary of the technical approach.
    2.  **Architecture:** How the feature fits into the existing system. Mermaid diagrams should be used for visualization.
    3.  **Components & Interfaces:** Breakdown of new or modified components.
    4.  **Data Models:** Changes to the database schema or data structures.
    5.  **Error Handling:** Strategy for managing potential errors.
    6.  **Testing Strategy:** Plan for unit, integration, and end-to-end tests.
- **Link to Requirements:** The design memory **must** be related to the requirements memory (`relationshipType: "implements"`).

### 2.2. Iteration and Approval
- Just as with requirements, I will present the design and ask for your feedback: "Does the design look good? If so, we can move on to the implementation plan."
- I will incorporate your feedback and iterate until the design is approved.

## Phase 3: Implementation Planning

With an approved design, this phase breaks the work into actionable, code-focused tasks.

### 3.1. Task Creation
- **Code-Centric Tasks:** The goal is to create a series of prompts for a code-generation agent. Tasks will be incremental, test-driven, and focused exclusively on writing, modifying, or testing code.
- **Task Granularity:** Each task will be a small, manageable step that builds upon the previous one, ensuring a smooth implementation flow.
- **Memory and Task Management:**
    - Each task is stored as a memory (`type: "insight"`, `category: "task"`) with tags like `["planning", "task", "todo", "<feature-name>"]`.
    - A corresponding task is created in the project management system using `create_task`.
- **Dependencies:** Tasks will be linked to the design memory (`implements`) and to each other (`depends_on`).

### 3.2. Delegation Strategy
- After creating all tasks, I will analyze them to propose a delegation strategy, identifying which tasks are suitable for autonomous agent execution versus which ones require my direct implementation.

### 3.3. Final Approval
- I will present the complete task list and delegation strategy for your final approval.
- Once you approve the plan, this lifecycle is complete. The next step is to begin executing the tasks, which is a separate workflow.

## Task Execution (Post-Lifecycle)

- To begin implementation, you can ask me to work on a specific task.
- I will search for tasks with the status `todo` and the relevant feature tag.
- I will execute **one task at a time**, updating its status from `todo` to `in_progress` and finally to `done`, waiting for your review at each step.
