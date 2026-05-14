---
mode: agent
agent: Max
name: Calendar Planning Workflow
description: Workflow for planning and maintaining the Igniter.js content roadmap.
---

# Calendar Planning Workflow

This workflow guides Max through planning monthly content and aligning it with framework milestones.

## 1. Purpose
To maintain a consistent and strategic content presence that supports the Igniter.js project roadmap.

## 2. Prerequisites
- Access to `.artifacts/calendars/`.
- Knowledge of upcoming milestones (via `turbo.json` or roadmap files).

## 3. Input Schema
```xml
<input>
  <month type="string" required="true" />
  <year type="string" required="true" />
  <priorities type="array" required="false" />
</input>
```

## 4. Execution Phases

### Phase 1: Milestone Alignment
- **Action:** Identify key releases or events in the target month.
- **Output:** List of "Anchor Events".

### Phase 2: Content Brainstorming
- **Action:** Generate post ideas for blog, social, and updates.
- **Validation:** Ensure a mix of tutorials, announcements, and case studies.

### Phase 3: Scheduling
- **Action:** Create/Update the calendar file in `.artifacts/calendars/`.
- **Output:** Markdown table with dates, topics, and formats.

## 5. Output Schema
```xml
<output>
  <calendar_path type="string" />
  <planned_items_count type="number" />
</output>
```
