---
applyTo: '**'
---

# Content Creation Manual for Igniter.js Documentation

> **Last Updated:** 2025-12-23  
> **Version:** 2.0  
> **Audience:** AI agents (Lia) and human contributors  
> **Purpose:** Produce world-class developer documentation and educational content

---

## 0. Read This First

This manual governs **all content creation** for Igniter.js: documentation, blog posts, tutorials, templates, updates, and learning materials.

**Before creating any content:**

1. Read this file completely
2. Verify implementation in `packages/` (never assume APIs)
3. Review Fumadocs components in `apps/www/src/mdx-components.tsx`
4. Check existing content for patterns and voice

---

## 1. Core Principles (Non-Negotiable)

### 1.1 Implementation-First Rule

**NEVER document fictional APIs. ALWAYS verify the actual implementation.**

Before writing ANY code example:

1. **Search** `packages/` for the feature
2. **Read** source code (function signatures, types, JSDoc)
3. **Check** interfaces and type definitions
4. **Review** existing usage in tests/docs
5. **Verify** imports, exports, and method names

**Why this matters:**
- Prevents breaking developer trust
- Ensures TypeScript type safety
- Maintains framework integrity

### 1.2 Language Policy

- **All content:** Write in English
- **Code comments:** English only
- **User communication:** Match the user's language

### 1.3 Style Pillars

| Principle | Definition | Example (Good) | Example (Bad) |
|-----------|------------|----------------|---------------|
| **Clear Language** | Simple, direct, short sentences | "Click save to store changes." | "Initiate the persistence process..." |
| **Developer-Focused** | Professional but approachable | "You can configure this option." | "Users might want to adjust parameters." |
| **Example-Driven** | Show real, working code | `` `const [count, setCount] = useState(0)` `` | "State management is important." |
| **Active Voice** | Subject performs action | "React renders the component." | "Component is rendered by React." |
| **Success-First** | Working example before theory | "First, create: `function Button()...`" | "Understand lifecycle phases first..." |
| **Transparent** | Honest about limitations | "Works for small datasets; may slow with large." | "This is the optimal solution." |
| **Consistent Terms** | Same word for same concept | Always "route" or always "endpoint" | Mixing "route" and "endpoint" |

---

## 2. Fumadocs Framework Integration

Igniter.js docs use **Fumadocs**, a modern MDX-based documentation framework.

### 2.1 Available Components

Learn all components from `apps/www/src/mdx-components.tsx` before writing.

#### Content Organization
- `<Callout />` — Info, warnings, errors, success messages
- `<Accordions />` + `<Accordion />` — Collapsible sections
- `<Tabs />` + `<Tab />` — Multi-option content (package managers, frameworks)
- `<Steps />` + `<Step />` — Sequential instructions

#### Code & Files
- `<CodeBlock />` — Syntax-highlighted code
- `<Files />` + `<Folder />` + `<File />` — Directory structures
- `<TypeTable />` — API/type documentation

#### Other
- `<Banner />` — Page-level announcements
- `<Card />` + `<Cards />` — Feature highlights

### 2.2 Component Usage Examples

```mdx
<!-- Warning callout -->
<Callout type="warn" title="Important">
  Configure environment variables before deployment.
</Callout>

<!-- Step-by-step guide -->
<Steps>
  <Step>
    ### Install Dependencies
    ```bash
    npm install @igniter-js/core
    ```
  </Step>
  <Step>
    ### Configure
    Create `igniter.config.ts`
  </Step>
</Steps>

<!-- Package manager tabs (ALWAYS use this pattern) -->
<Tabs items={['npm', 'pnpm', 'yarn', 'bun']} groupId="package-manager">
  <Tab value="npm">
    ```bash
    npm install @igniter-js/core
    ```
  </Tab>
  <Tab value="pnpm">
    ```bash
    pnpm add @igniter-js/core
    ```
  </Tab>
  <!-- ... -->
</Tabs>

<!-- File structure -->
<Files>
  <Folder name="src" defaultOpen>
    <Folder name="features">
      <File name="users.controller.ts" />
    </Folder>
    <File name="igniter.ts" />
  </Folder>
</Files>
```

---

## 3. Content Types & Schemas

### 3.1 Documentation (Docs)

**Location:** `apps/www/content/docs/`

**Frontmatter:**
```yaml
---
title: "Feature Name"
description: "Brief description of the feature"
---
```

**Structure:**
- H2 headings only (title from frontmatter = H1)
- Use `<Callout>` for notes/warnings
- Include runnable code examples
- Use `<TypeTable>` for API docs
- Add `<Steps>` for setup guides

**Template:**
```mdx
---
title: "Feature Name"
description: "What this feature does"
---

## Introduction
Brief overview.

<Callout type="info">
  Important context.
</Callout>

## Installation
<Tabs items={['npm', 'pnpm', 'yarn', 'bun']} groupId="package-manager">
  <Tab value="npm">
    ```bash
    npm install package-name
    ```
  </Tab>
</Tabs>

## Basic Usage
```typescript
// Complete, verified example
import { feature } from '@igniter-js/core';
const result = feature();
```

## API Reference
<TypeTable type={{
  propName: {
    type: 'string',
    description: 'What this does',
    required: true
  }
}} />

## Troubleshooting
Common issues and solutions.
```

### 3.2 Blog Posts

**Location:** `apps/www/content/blog/`

**Frontmatter:**
```yaml
---
title: "Post Title"
description: "SEO-friendly description"
cover: "https://example.com/cover.jpg" # Optional
tags: ["tutorial", "announcement"]     # Optional
---
```

**Guidelines:**
- Engaging, conversational tone
- Real-world examples
- Visual elements (images, diagrams)
- Key takeaways in callouts
- Clear next steps/CTA

### 3.3 Templates

**Location:** `apps/www/content/templates/`

**Frontmatter:**
```yaml
---
title: "Template Name"
description: "What this provides"
framework: "Next.js"
demo: "https://demo-url.com"
repository: "https://github.com/repo"
stack: ["TypeScript", "Prisma", "Redis"]
useCases: ["Full-Stack", "API"]
creator:
  username: "github-username"
  name: "Display Name"
  avatar: "https://avatar-url"
---
```

**Structure:**
- Show file structure with `<Files>`
- Quick start with `<Steps>`
- Key features with code examples
- Deployment instructions

### 3.4 Learn Course (Tutorial Chapters)

**Location:** `apps/www/content/learn/`

**Frontmatter:**
```yaml
---
title: "XX: Chapter Title"
description: "What you'll learn"
---
```

**Course-Specific Components:**
- `<ChapterObjectives />` — Learning goals
- `<Quiz />` — Interactive questions
- `<ChapterNav />` — Chapter navigation

**Code Comment Patterns:**
```typescript
// Business Rule: Why this business decision was made
// Observation: What's happening / what to notice
```

**Template:**
```mdx
---
title: "03: Your First Feature"
description: "Generate your first Igniter.js feature"
---

<ChapterObjectives
  objectives={[
    { text: 'Use CLI to generate feature' },
    { text: 'Understand feature structure' }
  ]}
/>

## Introduction
Context about what we're building.

## Step-by-Step
```typescript
// Business Rule: Why we do this
import { igniter } from "@/igniter";
export const controller = igniter.controller({
  // Complete implementation
});
```

### Understanding the Code
Deep dive explanation.

<Quiz
  question="What does this accomplish?"
  options={[
    { label: 'Option A', value: 'a' },
    { label: 'Correct', value: 'b', isCorrect: true }
  ]}
  explanation="Why this is correct."
/>

<ChapterNav
  current={{ number: 3, title: "Your First Feature" }}
  next={{
    number: 4,
    title: "Next Chapter",
    href: "/learn/04-next"
  }}
/>
```

### 3.5 Updates (Changelog)

**Location:** `apps/www/content/updates/`

**Frontmatter:**
```yaml
---
title: "v1.2.0 - Feature Release"
description: "What's new"
cover: "cover-url" # Optional
---
```

**Structure:**
- Version + release date
- Categories: Features, Bug Fixes, Breaking Changes
- Migration guides for breaking changes
- Links to docs

---

## 4. Writing Best Practices

### 4.1 Document Structure

**Frontmatter requirements:**
```mdx
---
title: "Component Name"
description: "Single-paragraph description"
---
```

**Heading hierarchy:**
- Never H1 (title from frontmatter)
- Start with H2
- Nest properly: H2 → H3 → H4

**Code formatting:**
- Inline: `` `useState` ``
- Blocks: Triple backticks with language
```jsx
function Example() {
  return <div>Example</div>;
}
```

### 4.2 Progressive Disclosure

Structure content: **what** → **why** → **how**

```mdx
## Overview
High-level explanation.

## Quick Start
Get something working immediately.

## Understanding the Concepts
Deeper explanation after hands-on.

## Advanced Usage
Complex scenarios and edge cases.
```

### 4.3 Code Example Patterns

**Complete vs. Snippets:**
- Tutorials/course: Complete examples
- Reference docs: Focused snippets
- Always include necessary imports

**Progressive examples:**
```mdx
### Basic Example
```typescript
// Minimal working example
```

### Adding Features
```typescript
// Builds on basic
```

### Production Ready
```typescript
// With error handling
```
```

**Before/After comparisons:**
```mdx
<Tabs items={['Without Feature', 'With Feature']}>
  <Tab value="Without Feature">
    ```typescript
    // Old way
    ```
  </Tab>
  <Tab value="With Feature">
    ```typescript
    // New way - better!
    ```
  </Tab>
</Tabs>
```

### 4.4 Callout Strategy

Use callouts strategically:

- `<Callout type="info">` — Context, prerequisites
- `<Callout type="warn">` — Potential issues
- `<Callout type="success">` — Wins, checkpoints
- `<Callout type="error">` — Critical errors

**Placement:**
- Before code: Warnings, prerequisites
- After code: Success messages, next steps
- Standalone: Important context

### 4.5 Visual Organization

**Section length:** 200-400 words ideal

**Heading depth:**
- H2 for major sections
- H3 for subsections
- H4 sparingly
- Never skip levels

**Emphasis hierarchy:**
- **Bold** for key concepts
- *Italic* for sentence emphasis
- `` `Code` `` for technical terms
- **`` `Bold + Code` ``** for API highlights

---

## 5. Content Quality Checklist

### 5.1 Universal Checks

- [ ] Frontmatter complete with required fields
- [ ] No H1 in body (title from frontmatter)
- [ ] Code examples complete and runnable
- [ ] Inline code uses backticks
- [ ] Links valid and properly formatted
- [ ] Images have alt text
- [ ] Terminology consistent throughout
- [ ] Visual hierarchy clear
- [ ] Callouts used strategically
- [ ] Related content cross-referenced

### 5.2 Documentation-Specific

- [ ] Installation uses `<Tabs>` with `groupId="package-manager"`
- [ ] Important notes use `<Callout>`
- [ ] Setup uses `<Steps>`
- [ ] API docs use `<TypeTable>`
- [ ] File structures use `<Files>` components
- [ ] Code blocks specify language

### 5.3 Blog-Specific

- [ ] Engaging title and description
- [ ] Practical examples included
- [ ] Clear intro and conclusion
- [ ] Relevant tags
- [ ] Call-to-action or next steps

### 5.4 Template-Specific

- [ ] All frontmatter fields present
- [ ] Project structure uses `<Files>`
- [ ] Quick start uses `<Steps>`
- [ ] Demo/repo links valid
- [ ] Stack and use cases defined

### 5.5 Update-Specific

- [ ] Version number in title
- [ ] Changes grouped by category
- [ ] Breaking changes use warnings
- [ ] Migration guides included
- [ ] Links to docs

---

## 6. Memory System (Content Consistency)

Lia must maintain a **living content memory** to ensure consistency, remember feedback, and maintain a long-term content roadmap.

### 6.1 Content Memory Philosophy

**Core principles:**
- Content memory ensures consistency across all docs
- Captures user feedback on content quality
- Maintains editorial voice and preferences
- Tracks content roadmap and priorities

### 6.2 What to Remember (Content-Specific)

**High-Priority:**
- User feedback on specific content pieces
- Preferred explanations that worked well
- Content gaps identified by users
- Editorial style preferences (voice, tone, structure)
- Content roadmap and priorities

**Medium-Priority:**
- Successful content patterns
- Topics that need updating
- Community requests for content
- Seasonal/event-based content plans

**Never Remember:**
- Draft content (unless explicitly approved)
- Experimental approaches that failed
- One-off content requests without validation

### 6.3 Content Memory Structure

```
/memories/content/
├── feedback/          # User feedback on docs/blog/tutorials
├── voice/             # Editorial voice and style preferences
├── roadmap/           # Content planning and priorities
├── patterns/          # Successful content patterns
└── updates/           # Content update tracking
```

### 6.4 Content Memory Workflow

**After creating content:**

1. **Capture** (Immediate)
   - What content was created?
   - What approach was used?
   - Any user feedback received?

2. **Categorize** (Within 3 pieces)
   - Is this a new pattern or refinement?
   - Does this feedback contradict previous preferences?
   - Should this influence future content?

3. **Write** (Concise & Actionable)
   ```md
   ## [Date] - [Content Type]: [Title]
   **Topic:** What the content covered
   **Approach:** How it was structured
   **Feedback:** What users said (if any)
   **Learnings:** What to apply next time
   **Source:** Link to published content
   ```

4. **Review** (Every 10 pieces)
   - Are content patterns still effective?
   - Has editorial voice drifted?
   - Is roadmap still relevant?

### 6.5 Content Memory Update Triggers

**Update memory when:**
- User praises/criticizes content structure
- Pattern emerges across multiple pieces
- Editorial preference changes
- Roadmap priorities shift
- API changes require content updates

**Example trigger flow:**
```
User: "This tutorial was too theoretical"
  ↓
Capture: "User prefers hands-on examples first"
  ↓
Categorize: feedback/tutorials.md
  ↓
Write: "Start tutorials with working code, then explain"
  ↓
Apply: Use in all future tutorials
```

### 6.6 Content Roadmap Management

**Maintain a living roadmap:**

```md
## Content Roadmap

### Q1 2025: Core Documentation
- [ ] Complete package API references
- [ ] Add troubleshooting guides
- [ ] Update all code examples to v2.0

### Q2 2025: Educational Content
- [ ] Build complete course (10 chapters)
- [ ] Create video tutorials
- [ ] Add interactive examples

### Ongoing:
- Monitor feedback weekly
- Update stale content monthly
- Add new features immediately
```

### 6.7 Content Memory Examples

**Good Content Memory:**
```md
## 2025-12-23 - Tutorial: Authentication Guide
**Topic:** Building auth with Better Auth plugin
**Approach:** Success-first (working example, then explanation)
**Feedback:** "Best tutorial I've read - clear and practical"
**Learnings:** Users love seeing working code immediately
**Pattern:** Apply to all future tutorials
**Source:** apps/www/content/docs/auth/getting-started.mdx
```

**Bad Content Memory:**
```md
## Wrote some docs
Made documentation.
```
(No actionable insights, no pattern to apply)

### 6.8 Content Consistency Checks

**Before creating content:**
1. Query memory: "What patterns work for [content-type]?"
2. Check feedback: "What did users say about similar content?"
3. Review roadmap: "Is this content prioritized?"
4. Verify voice: "What's the preferred tone for this?"

**After creating content:**
1. Update memory with approach and outcomes
2. Note any new patterns discovered
3. Adjust roadmap if priorities changed
4. Capture immediate feedback

---

## 7. Subagent Delegation (Content Tasks)

Use subagents to parallelize content research and planning.

### 7.1 When to Delegate (Content)

- **Research phase:** "Find all existing docs on X feature"
- **API verification:** "Search packages/ for X implementation"
- **Content audit:** "List all docs that mention deprecated API Y"
- **Pattern analysis:** "Analyze structure of top 5 tutorials"

### 7.2 Content Delegation Examples

**Example 1: API verification**
```text
Prompt to subagent:
"Search packages/store for the IgniterStore.create() implementation.
Return: complete function signature, all builder methods, telemetry integration pattern.
Include: file paths, JSDoc, and usage examples from tests."
```

**Example 2: Content audit**
```text
Prompt to subagent:
"Find all documentation files that reference @igniter-js/adapter-redis.
Return: list of files, specific line numbers, context of usage.
Goal: Identify content that needs updating after package deprecation."
```

**Example 3: Pattern research**
```text
Prompt to subagent:
"Analyze the structure of packages/mail/README.md and packages/store/README.md.
Return: common sections, order of presentation, code example patterns.
Goal: Establish template for new package README files."
```

### 7.3 Subagent Integration Workflow

1. **Identify parallelizable work**
   - Research, verification, audits

2. **Craft specific prompts**
   - Clear goal
   - Expected output format
   - Constraints

3. **Integrate results**
   - Verify findings against source
   - Synthesize into content
   - Update memory with patterns

---

## 8. Implementation Verification Workflow

**CRITICAL:** Never skip this process.

### 8.1 Pre-Writing Verification

Before documenting ANY feature:

1. **Find Implementation**
   ```bash
   # Search for the feature in packages/
   grep -r "IgniterStorage.create" packages/
   ```

2. **Read Source**
   - Open file where it's defined
   - Check function signatures
   - Read JSDoc comments
   - Review type definitions

3. **Check Usage**
   - Look for tests in `packages/*/tests/`
   - Check existing documentation
   - Review examples in `apps/`

4. **Verify Example**
   - Ensure imports are correct
   - Parameter names match interface
   - Return types are accurate
   - Method names are current

5. **Test Compilation**
   - TypeScript types correct
   - Code would compile
   - No missing dependencies

### 8.2 Verification Checklist

- [ ] Found implementation in `packages/`
- [ ] Read source code and interfaces
- [ ] Verified all imports/exports
- [ ] Checked type definitions
- [ ] Reviewed existing usage examples
- [ ] Ensured examples compile correctly

---

## 9. AI Agent Workflow (Complete Process)

### 9.1 Content Generation Process

```
1. Identify content type (docs/blog/template/update/learn)
   ↓
2. VERIFY IMPLEMENTATION: Search packages/ + read source
   ↓
3. Read relevant schemas and rules from this file
   ↓
4. Query memory: patterns, feedback, preferences
   ↓
5. Delegate research if needed (subagents)
   ↓
6. Create frontmatter with all required fields
   ↓
7. Structure content using appropriate pattern
   ↓
8. Add Fumadocs components for better UX
   ↓
9. Include verified code examples
   ↓
10. Review against quality checklist
   ↓
11. Ensure all links/references valid
   ↓
12. Update memory with approach and outcomes
   ↓
13. For course: Add ChapterObjectives, Quiz, ChapterNav
```

### 9.2 Feedback Integration Loop

**When receiving feedback:**

1. **Analyze:** What specifically did the user correct/praise?
2. **Categorize:** Is this a pattern, preference, or one-off?
3. **Memorize:** Update relevant memory file
4. **Apply:** Use in next content piece
5. **Verify:** Did it improve the outcome?

### 9.3 Continuous Improvement

**Every 5 content pieces:**
- Review memory for patterns
- Check if voice is consistent
- Verify roadmap alignment

**Every 20 content pieces:**
- Deep audit of content quality
- Update style guide if patterns changed
- Reorganize memory if needed

---

## 10. Common Patterns Library

### 10.1 Feature Documentation Pattern

```mdx
---
title: "Feature Name"
description: "One sentence"
---

## Introduction
Brief overview and use case.

<Callout type="info">
  Important prerequisite.
</Callout>

## Installation
<Tabs items={['npm', 'pnpm', 'yarn', 'bun']} groupId="package-manager">
  <!-- ... -->
</Tabs>

## Quick Start
<Steps>
  <Step>
    ### Step Title
    Instructions and verified code
  </Step>
</Steps>

## Examples

### Basic
```typescript
// Complete, runnable example
```

### Advanced
```typescript
// More complex scenario
```

## API Reference
<TypeTable type={{...}} />

## Troubleshooting
Common issues and solutions.
```

### 10.2 Tutorial Pattern

```mdx
---
title: "Building X with Igniter.js"
description: "Learn how to build X from scratch"
tags: ["tutorial"]
---

## What You'll Build
Description and demo.

## Prerequisites
- Node.js 18+
- TypeScript knowledge
- Igniter.js installed

## Project Setup
<Steps>
  <Step>
    ### Create Project
    ```bash
    npx create-igniter-app my-app
    ```
  </Step>
</Steps>

## Implementation

### Part 1: Setup
Code and explanation.

<Callout type="success">
  Checkpoint: You should now see...
</Callout>

## Testing
How to verify it works.

## Next Steps
- Try feature Y
- Read about Z
- Deploy to production
```

---

## 11. Quick Reference

### 11.1 Fumadocs Components

| Component | Use Case | Example |
|-----------|----------|---------|
| `<Callout>` | Highlights, warnings | `<Callout type="warn">...</Callout>` |
| `<Steps>` | Sequential instructions | `<Steps><Step>...</Step></Steps>` |
| `<Tabs>` | Alternative options | `<Tabs items={['npm', 'pnpm']}>` |
| `<Files>` | File structure | `<Files><Folder>...</Folder></Files>` |
| `<TypeTable>` | API docs | `<TypeTable type={{...}} />` |
| `<Card>` | Feature highlights | `<Card title="Feature">...</Card>` |

### 11.2 Content Types

| Type | Location | Frontmatter | Special Components |
|------|----------|-------------|-------------------|
| Docs | `content/docs/` | title, description | TypeTable, Steps |
| Blog | `content/blog/` | title, description, tags, cover | N/A |
| Templates | `content/templates/` | title, framework, demo, stack | Files, Steps |
| Learn | `content/learn/` | title, description | ChapterObjectives, Quiz, ChapterNav |
| Updates | `content/updates/` | title, description, cover | Callout (for breaking changes) |

---

**Remember:** Always verify implementation first. Never document fictional APIs. Use memory to maintain consistency. Delegate research when appropriate. Iterate based on feedback.
