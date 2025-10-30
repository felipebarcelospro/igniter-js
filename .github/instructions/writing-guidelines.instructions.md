---
applyTo: '**'
---
# Writing Guidelines for Humans and LLMs

This guide ensures consistent, high-quality documentation across all Igniter.js content types (blog, docs, templates, updates). It's designed for both human authors and AI agents to produce excellent developer experiences.

## Core Style Principles

| Principle | Definition | Example: Good | Example: Bad |
|-----------|------------|--------------|-------------|
| Clear Language | Use simple, direct language with short words and sentences. Avoid unnecessary jargon. | "Click save to store your changes." | "Initiate the persistence process by activating the storage mechanism." |
| Developer-Focused | Write in a professional but approachable tone that addresses the reader directly. | "You can configure this option in the settings panel." | "Users might want to adjust configuration parameters." |
| Example-Driven | Include practical code examples for all key concepts. | "Use the `useState` hook: `const [count, setCount] useState(0)`" | "State management is an important React concept." |
| Active Voice | Make the subject perform the action rather than receive it. | "React renders the component." | "The component is rendered by React." |
| Success-First | Show working examples before explaining theory. | "First, create a component: `function Button() {...}`. Now let's understand how it works..." | "The component lifecycle has several phases which you must understand before implementation..." |
| Transparent | Be honest about limitations and challenges. | "This approach works well for small datasets but may cause performance issues with larger ones." | "This is the optimal solution for data management." |
| Consistent Terms | Use the same terminology throughout to refer to the same concepts. | "Route" consistently or "endpoint" consistently, not both interchangeably. | Mixing "callback function" and "handler" for the same concept. |

---

## Fumadocs-Specific Guidelines

Igniter.js documentation uses **Fumadocs**, a modern documentation framework with MDX support and powerful components.

### Available MDX Components

Always use these components from `mdx-components.tsx` when appropriate:

#### Content Organization
- **`<Callout />`** - Highlight important information (types: `info`, `warn`, `error`, `success`)
- **`<Accordions />` + `<Accordion />`** - Collapsible content sections
- **`<Tabs />` + `<Tab />`** - Tabbed content (supports persistence with `groupId`)
- **`<Steps />` + `<Step />`** - Step-by-step instructions

#### Code & Files
- **`<CodeBlock />`** - Enhanced code blocks with syntax highlighting
- **`<Files />`, `<Folder />`, `<File />`** - File structure visualization
- **`<TypeTable />`** - API/type documentation tables

#### Other Components
- **`<Banner />`** - Page-level announcements
- **`<Card />`, `<Cards />`** - Content cards for links/features

### Component Usage Examples

```mdx
<!-- Callout for warnings -->
<Callout type="warn" title="Important">
  Make sure to configure your environment variables before deployment.
</Callout>

<!-- Steps for tutorials -->
<Steps>
  <Step>
    ### Install Dependencies
    Run `npm install @igniter-js/core`
  </Step>
  
  <Step>
    ### Configure
    Create a `igniter.config.ts` file
  </Step>
</Steps>

<!-- Tabs for multiple options -->
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

## For LLM Content Generation

### Formatting Instructions

When generating content with an LLM, ensure the following:

1. **Structured Data**: Present information in well-defined structures like tables, numbered lists, and hierarchical headings
2. **Explicit Examples**: Always include contrastive examples (good vs. bad)
3. **Clear Boundaries**: Use explicit section markers and consistent formatting patterns
4. **Context-Awareness**: Begin with the most critical information for the document type
5. **Pattern Consistency**: Maintain consistent patterns throughout similar sections
6. **Component Usage**: Use Fumadocs components appropriately for the content type

### LLM Content Templates

For each document type, LLMs should structure content as follows:

```yaml
DocumentType: [Tutorial|HowTo|Reference|Explanation|BlogPost|Update]
Audience: [Beginner|Intermediate|Advanced]
PrimaryGoal: "Single sentence describing document purpose"
Sections:
  - Name: "Introduction"
    Content: "Clear goal statement with outcomes"
  - Name: "Prerequisites"
    Content: "Bulleted list of requirements"
  - Name: "MainContent"
    Content: "Follows appropriate structure for document type"
  - Name: "Conclusion"
    Content: "Summary and next steps"
```


## Document Types and Their Styles

### Documentation (Docs)

**Purpose**: Comprehensive technical documentation for Igniter.js features, APIs, and concepts
**Location**: `apps/docs/content/docs/`

#### Frontmatter Schema
```yaml
---
title: "Feature Name"
description: "Brief description of the feature or concept"
---
```

#### Writing Rules
- Start with H2 headings (never H1 - title from frontmatter is H1)
- Use `<Callout>` for important notes, warnings, and tips
- Include working code examples for every concept
- Use `<TypeTable>` for API documentation
- Add `<Steps>` for setup instructions
- Use `<Tabs>` for package manager commands with `groupId="package-manager"`

#### Structure Template
```mdx
---
title: "Feature Name"
description: "What this feature does in one sentence"
---

## Introduction

Brief overview of what this feature solves.

<Callout type="info">
  Important context or prerequisite knowledge.
</Callout>

## Installation

<Tabs items={['npm', 'pnpm', 'yarn', 'bun']} groupId="package-manager">
  <Tab value="npm">
    ```bash
    npm install package-name
    ```
  </Tab>
  <!-- Other package managers -->
</Tabs>

## Basic Usage

Simple example showing the feature in action:

```typescript
// Complete, runnable example
import { feature } from '@igniter-js/core';

const result = feature();
```

## API Reference

<TypeTable type={{
  propName: {
    type: 'string',
    description: 'What this prop does',
    required: true
  }
}} />

## Advanced Usage

More complex scenarios and edge cases.

## Troubleshooting

Common issues and solutions.
```

### Blog Posts

**Purpose**: Announcements, tutorials, and thought leadership
**Location**: `apps/docs/content/blog/`

#### Frontmatter Schema
```yaml
---
title: "Post Title"
description: "Engaging description for SEO and previews"
cover: "https://example.com/cover.jpg" # Optional
tags: ["tutorial", "announcement"] # Optional
---
```

#### Writing Rules
- Use engaging, conversational tone
- Include real-world examples and use cases
- Add visual elements (images, diagrams) when helpful
- Use `<Callout>` for key takeaways
- Include code examples with syntax highlighting
- End with clear next steps or call-to-action

#### Structure Template
```mdx
---
title: "Introducing Feature X"
description: "How Feature X revolutionizes your workflow"
tags: ["announcement", "feature"]
---

## The Problem

Describe the pain point this addresses.

## The Solution

How Igniter.js solves this problem.

```typescript
// Show the feature in action
const example = createFeature({
  // ...
});
```

<Callout type="success" title="Key Benefit">
  Highlight the main advantage.
</Callout>

## How It Works

Deeper explanation with examples.

## Getting Started

<Steps>
  <Step>
    ### Install
    Installation instructions
  </Step>
  <Step>
    ### Configure
    Configuration steps
  </Step>
</Steps>

## What's Next

Future plans and how to get involved.
```

### Templates

**Purpose**: Showcase starter templates and their features
**Location**: `apps/docs/content/templates/`

#### Frontmatter Schema
```yaml
---
title: "Template Name"
description: "What this template provides"
framework: "Next.js" # or "Bun", "Express", etc.
demo: "https://demo-url.com"
repository: "https://github.com/repo" # Optional
stack: ["TypeScript", "Prisma", "Redis"]
useCases: ["Full-Stack", "API"]
creator:
  username: "github-username"
  name: "Display Name" # Optional
  avatar: "https://avatar-url" # Optional
---
```

#### Writing Rules
- Focus on what the template provides out-of-the-box
- Use `<Files>` component to show project structure
- Include quick start instructions with `<Steps>`
- Show key features with code examples
- Add deployment instructions
- Use `<Callout>` for important setup notes

#### Structure Template
```mdx
---
title: "Next.js Full-Stack Starter"
description: "Production-ready Next.js app with Igniter.js"
framework: "Next.js"
demo: "https://demo.vercel.app"
stack: ["Next.js", "TypeScript", "Prisma", "Tailwind CSS"]
useCases: ["Full-Stack"]
creator:
  username: "felipebarcelospro"
---

## Overview

What this template includes and who it's for.

## Features

- ✅ Feature 1
- ✅ Feature 2
- ✅ Feature 3

## Project Structure

<Files>
  <Folder name="src" defaultOpen>
    <Folder name="features">
      <File name="users.controller.ts" />
    </Folder>
    <File name="igniter.ts" />
  </Folder>
</Files>

## Quick Start

<Steps>
  <Step>
    ### Clone and Install
    ```bash
    git clone repo-url
    npm install
    ```
  </Step>
  
  <Step>
    ### Configure Environment
    ```bash
    cp .env.example .env
    ```
  </Step>
  
  <Step>
    ### Run Development Server
    ```bash
    npm run dev
    ```
  </Step>
</Steps>

<Callout type="info">
  Important configuration notes.
</Callout>

## Key Features Explained

### Feature 1

Code example showing the feature.

## Deployment

Instructions for deploying to production.
```

### Updates (Changelog)

**Purpose**: Version updates and changelog entries
**Location**: `apps/docs/content/updates/`

#### Frontmatter Schema
```yaml
---
title: "v1.2.0 - Feature Release"
description: "What's new in this version"
cover: "cover-image-url" # Optional
---
```

#### Writing Rules
- Start with version number and release date
- Group changes by category (Features, Bug Fixes, Breaking Changes)
- Use bullet points for individual changes
- Link to relevant documentation
- Include migration guides for breaking changes
- Use `<Callout type="warn">` for breaking changes

#### Structure Template
```mdx
---
title: "v1.2.0 - Real-Time Features"
description: "Added SSE support and real-time data synchronization"
---

Released on October 28, 2025

## 🎉 Features

- **Real-Time Updates**: Added SSE-based real-time data synchronization
- **New Adapter**: Redis adapter for caching and pub/sub
- **Improved DX**: Better TypeScript inference for controllers

## 🐛 Bug Fixes

- Fixed type inference issue in nested controllers
- Resolved memory leak in job queue

## ⚠️ Breaking Changes

<Callout type="warn" title="Migration Required">
  The `createController` function signature has changed.
</Callout>

### Before
```typescript
createController({ path: '/users' })
```

### After
```typescript
igniter.controller({ path: '/users' })
```

## 📚 Documentation

- Updated [Controller Guide](/docs/controllers)
- New [Real-Time Guide](/docs/real-time)

## 🔗 Links

- [Full Changelog](https://github.com/org/repo/releases/tag/v1.2.0)
- [Migration Guide](/docs/migration/v1.2)
```

---

## MDX Documentation Formatting Rules

### Document Structure

1. **Frontmatter requirements**:
   ```mdx
   ---
   title: "Component Name"
   description: "A brief single-paragraph description of the component or feature."
   ---
   ```

2. **Heading hierarchy**:
   - Never use H1 - the title from frontmatter serves as H1
   - Start document structure with H2
   - Maintain proper nesting of headings (H2 → H3 → H4)


3. **Code formatting**:
   - Inline code: Use backticks for properties, functions, variables: `useState`
   - Code blocks: Use triple backticks with language identifier
     ```jsx
     function Example() {
       return <div>Example component</div>;
     }
     ```

4. **Terminology consistency**:
   - Define terms on first use: "Content Delivery Network (CDN)"
   - Use the same term throughout the document

### Machine-Readable Patterns for LLMs

When writing documentation that will be processed by LLMs, follow these additional patterns:

1. **Explicit section markers**: Use clear heading patterns and consistent depth
2. **Pattern-based formatting**: Keep similar content in predictable structures
3. **Numbered instructions**: Use explicit numbers for sequential steps
4. **Key-value patterns**: Format properties, parameters and configurations as distinct key-value pairs
5. **Contrastive examples**: Always provide both correct and incorrect examples
6. **Semantic indicators**: Use formatting (bold, italics, code blocks) consistently for semantic meaning

---

## Content Quality Checklist

### For All Content Types

- [ ] Frontmatter is complete with required fields
- [ ] No H1 headings in document body (title from frontmatter)
- [ ] Code examples are complete and runnable
- [ ] Inline code uses backticks for technical terms
- [ ] Links are valid and properly formatted
- [ ] Images have alt text
- [ ] Terminology is consistent throughout

### For Documentation

- [ ] Installation instructions use `<Tabs>` with `groupId="package-manager"`
- [ ] Important notes use `<Callout>` with appropriate type
- [ ] Setup instructions use `<Steps>` component
- [ ] API documentation uses `<TypeTable>` when appropriate
- [ ] File structures use `<Files>`, `<Folder>`, `<File>` components
- [ ] Code blocks specify language for syntax highlighting

### For Blog Posts

- [ ] Has engaging title and description
- [ ] Includes practical examples
- [ ] Has clear introduction and conclusion
- [ ] Tags are relevant and helpful
- [ ] Contains call-to-action or next steps

### For Templates

- [ ] All frontmatter schema fields are present
- [ ] Project structure uses `<Files>` component
- [ ] Quick start uses `<Steps>` component
- [ ] Demo and repository links are valid
- [ ] Stack and use cases are clearly defined

### For Updates

- [ ] Version number in title
- [ ] Changes grouped by category
- [ ] Breaking changes use warning callouts
- [ ] Migration guides included when needed
- [ ] Links to relevant documentation

---

## Fumadocs Component Reference

### Quick Reference Table

| Component | Use Case | Required Props | Example |
|-----------|----------|----------------|---------|
| `<Callout>` | Highlights, warnings, tips | `type` | `<Callout type="warn">...</Callout>` |
| `<Steps>` | Sequential instructions | None | `<Steps><Step>...</Step></Steps>` |
| `<Tabs>` | Alternative options | `items`, `groupId` (optional) | `<Tabs items={['npm', 'pnpm']}>` |
| `<Accordion>` | Collapsible content | `title` | `<Accordion title="FAQ">...</Accordion>` |
| `<Files>` | File structure | None | `<Files><Folder>...</Folder></Files>` |
| `<TypeTable>` | API documentation | `type` | `<TypeTable type={{...}} />` |
| `<Card>` | Feature highlights | `title`, `href` (optional) | `<Card title="Feature">...</Card>` |

### Callout Types and When to Use

```mdx
<!-- Information and tips -->
<Callout type="info" title="Good to Know">
  Additional context that helps understanding.
</Callout>

<!-- Warnings and cautions -->
<Callout type="warn" title="Important">
  Something that could cause issues if ignored.
</Callout>

<!-- Errors and critical issues -->
<Callout type="error" title="Breaking Change">
  Something that will break existing code.
</Callout>

<!-- Success and achievements -->
<Callout type="success" title="Pro Tip">
  Best practices and optimizations.
</Callout>
```

### Package Manager Tabs (Standard Pattern)

Always use this exact pattern for package installation:

```mdx
<Tabs items={['npm', 'pnpm', 'yarn', 'bun']} groupId="package-manager">
  <Tab value="npm">
    ```bash
    npm install package-name
    ```
  </Tab>
  <Tab value="pnpm">
    ```bash
    pnpm add package-name
    ```
  </Tab>
  <Tab value="yarn">
    ```bash
    yarn add package-name
    ```
  </Tab>
  <Tab value="bun">
    ```bash
    bun add package-name
    ```
  </Tab>
</Tabs>
```

### File Structure Pattern

```mdx
<Files>
  <Folder name="src" defaultOpen>
    <Folder name="features">
      <File name="users.controller.ts" />
      <File name="posts.controller.ts" />
    </Folder>
    <Folder name="lib">
      <File name="database.ts" />
    </Folder>
    <File name="igniter.ts" />
  </Folder>
  <File name="package.json" />
</Files>
```

---

## Common Patterns and Examples

### Feature Documentation Pattern

```mdx
---
title: "Feature Name"
description: "What it does in one sentence"
---

## Introduction

Brief overview and use case.

<Callout type="info">
  Important prerequisite or context.
</Callout>

## Installation

<Tabs items={['npm', 'pnpm', 'yarn', 'bun']} groupId="package-manager">
  <Tab value="npm">
    ```bash
    npm install @igniter-js/package
    ```
  </Tab>
  <!-- Other package managers -->
</Tabs>

## Quick Start

<Steps>
  <Step>
    ### Step Title
    Instructions and code example
  </Step>
  
  <Step>
    ### Next Step
    More instructions
  </Step>
</Steps>

## Examples

### Basic Example

```typescript
// Complete, runnable example
```

### Advanced Example

```typescript
// More complex scenario
```

## API Reference

<TypeTable type={{
  propName: {
    type: 'string',
    description: 'Description',
    required: true
  }
}} />
```

### Tutorial Pattern

```mdx
---
title: "Building X with Igniter.js"
description: "Learn how to build X from scratch"
tags: ["tutorial"]
---

## What You'll Build

Description and screenshot/demo of final result.

## Prerequisites

- Node.js 18+
- Basic TypeScript knowledge
- Igniter.js installed

## Project Setup

<Steps>
  <Step>
    ### Create Project
    ```bash
    npx create-igniter-app my-app
    ```
  </Step>
  
  <Step>
    ### Install Dependencies
    <Tabs items={['npm', 'pnpm']} groupId="package-manager">
      <Tab value="npm">
        ```bash
        npm install
        ```
      </Tab>
    </Tabs>
  </Step>
</Steps>

## Implementation

### Part 1: Feature Setup

Code and explanation.

<Callout type="success">
  Checkpoint: You should now see...
</Callout>

### Part 2: Adding Functionality

More code and explanation.

## Testing

How to verify it works.

## Next Steps

- Try adding feature Y
- Read about concept Z
- Deploy to production
```

---

## Migration Guide: Converting Existing Content

### From Old Blog to Fumadocs Blog

1. Extract frontmatter from Next.js page structure
2. Move MDX content to `apps/docs/content/blog/`
3. Update frontmatter to match schema
4. Convert components to Fumadocs equivalents
5. Test rendering in new structure

### From App Templates to Template Docs

1. Create MDX file in `apps/docs/content/templates/`
2. Fill frontmatter with template metadata
3. Add project structure with `<Files>` component
4. Include quick start with `<Steps>`
5. Link to live demo and repository

### Changelog to Updates

1. Group commits by version
2. Create update file per version
3. Categorize changes (Features, Fixes, Breaking)
4. Add migration guides for breaking changes
5. Link to relevant documentation

---

## Advanced Documentation Patterns

This section covers advanced patterns and conventions developed specifically for Igniter.js documentation. These patterns ensure consistent, high-quality documentation with excellent developer experience.

### Conversational Introduction Paragraphs

**Always include detailed, conversational introduction paragraphs** at the beginning of major sections. These paragraphs should:

- Explain **what** the section covers
- Explain **why** it matters and when to use it
- Provide context about **how** it fits into the broader picture
- Use a conversational, friendly tone as if talking to a colleague

**Example:**

```mdx
## Pre-Process Hooks

Pre-process hooks run **before** middleware, making them perfect for enriching the context with data that your middleware or command handlers need. These hooks execute at the very start of the processing pipeline, allowing you to load user sessions, fetch permissions, gather channel metadata, or perform any other context enrichment before any middleware runs.

Understanding when to use pre-process hooks versus middleware is important. Pre-process hooks are ideal for data loading that doesn't need to block processing—if the data load fails, you might want to continue with default values. They're also perfect for operations that should happen regardless of middleware logic, ensuring context is always enriched consistently.
```

### Using Accordions for Lists

**Convert lists into Accordions** when the list items:
- Have multiple items (3+)
- Contain detailed explanations
- Represent distinct concepts or patterns
- Appear in sections like "Best Practices", "Limitations", "Common Use Cases", "Examples"

**Pattern:**

```mdx
## Best Practices

Following these practices ensures your middleware integrates smoothly with the bot core and performs reliably. Good middleware is predictable, efficient, and resilient to errors. It enhances your bot's functionality without introducing complexity or bugs.

<Accordions>
  <Accordion title="Always call next()">
    Unless blocking intentionally, always call `next()` to continue the middleware chain. Skipping `next()` stops processing, which is only appropriate when you're intentionally blocking a request (like authentication failures). For most middleware, you want to process the request and then continue to the next handler.
  </Accordion>
  
  <Accordion title="Handle errors gracefully">
    Don't let middleware errors crash the bot. Wrap risky operations in try-catch blocks and handle errors appropriately. If middleware fails, the bot should continue functioning—consider logging the error and calling `next()` to allow other handlers to process the request.
  </Accordion>
</Accordions>
```

**Each Accordion item should include:**
- A clear, descriptive title
- A detailed explanation (2-4 sentences)
- Context about when and why to follow the practice
- Practical considerations or examples when helpful

### Steps Component Patterns

**When using `<Steps>` component:**

1. **Wrap Steps in Cards for better visual organization** when the steps represent a complete tutorial or guide:
   ```mdx
   <Card title="Quick Start Guide">
     <Steps>
       <Step>
         ### Step Title
         Content here
       </Step>
     </Steps>
   </Card>
   ```

2. **Include detailed introductory paragraphs** before the Steps component explaining what the guide accomplishes and what concepts it demonstrates.

3. **Add context paragraphs** within each Step when the step needs explanation beyond just instructions.

### Complete Example Sections

**Always expand "Complete Example" sections** with:

1. **An introductory paragraph** that explains:
   - What the example demonstrates
   - When you would use this pattern
   - What concepts it showcases
   - List of key points the example demonstrates

2. **Example format:**
   ```mdx
   ## Complete Example
   
   Here's a complete example that demonstrates dynamic command loading from a directory. This pattern is ideal for production bots where you want to organize commands in separate files and load them automatically. The example shows how to scan a commands directory, import each command module, and register them dynamically.
   
   This example demonstrates:
   - **Dynamic Loading**: Scanning a directory and loading commands automatically
   - **Command Organization**: Keeping commands in separate files for better maintainability
   - **Initialization Pattern**: Loading commands before starting the bot
   
   ```typescript
   // Code example here
   ```
   ```

### Removing "Next Steps" Sections

**DO NOT include "Next Steps" sections** in documentation articles. Instead:

- Link to related concepts naturally within the content
- Use `<Callout>` components to guide readers to related documentation
- End articles with the most important information, not navigation links

**Exception:** Blog posts and tutorials may include "Next Steps" or "What's Next" sections as they serve a different purpose (calls-to-action, future plans).

### Using Cards for Visual Organization

**Use `<Card>` components** to:
- Wrap `<Steps>` components for tutorials (with `title` prop)
- Group related content visually
- Create visual separation between major sections

**Example:**
```mdx
<Card title="Quick Start Guide">
  <Steps>
    <!-- Steps here -->
  </Steps>
</Card>
```

### Common Use Cases and Patterns in Accordions

**When documenting common patterns, use cases, or examples:**

1. **Add an introductory paragraph** explaining:
   - What these patterns/use cases are
   - When you would use them
   - Why they're valuable

2. **Convert each pattern into an Accordion** with:
   - Descriptive title
   - Introduction paragraph explaining the pattern
   - Complete code example
   - Concluding paragraph with benefits and considerations

**Example:**
```mdx
## Common Use Cases

Here are common middleware patterns you'll use in production bots. Each example uses `Bot.middleware()` for validation and type safety. Understanding these patterns helps you build robust, production-ready bots with proper authentication, logging, rate limiting, and more:

<Accordions>
  <Accordion title="Authentication">
    Restrict commands to authorized users by checking permissions before allowing requests to proceed. This middleware runs early in the pipeline, blocking unauthorized users before any command logic executes. It's essential for bots that handle sensitive operations or provide different features to different user tiers.
    
    ```typescript
    // Code example
    ```
    
    Authentication middleware should typically be placed early in your middleware array—ideally first or second—so unauthorized users are blocked before expensive operations run. This improves security and reduces unnecessary processing.
  </Accordion>
</Accordions>
```

### Section Introduction Best Practices

**Every major section (H2) should have:**

1. **A conversational introduction paragraph** (2-4 sentences) that:
   - Explains what the section covers
   - Provides context about why it matters
   - Connects it to the broader topic

2. **Additional context paragraphs** when needed to explain:
   - When to use the feature/concept
   - How it fits into the larger picture
   - Important considerations or trade-offs

**Example:**
```mdx
## Error Handling

Understanding how errors work in hooks is crucial for building robust bots. Pre-process hooks have different error behavior than post-process hooks, and knowing these differences helps you write hooks that fail gracefully without breaking your bot.

**Pre-process hooks**: Errors thrown in pre-process hooks stop the entire processing pipeline and emit an error event. This means if a pre-process hook throws, middleware and command handlers never run. Use this behavior intentionally—if loading critical data fails, you might want to stop processing.

**Post-process hooks**: Only run if processing succeeded (no errors thrown). If any middleware or command handler throws an error, post-process hooks are skipped entirely. This ensures you don't save state or send analytics for failed operations.
```

### Platform-Specific or Variant Sections

**When documenting multiple platforms or variants** (e.g., Telegram vs WhatsApp, Simple vs Advanced):

1. **Use Accordions** to organize each platform/variant
2. **Include detailed setup instructions** within each Accordion
3. **Add platform-specific notes** or limitations within each Accordion

**Example:**
```mdx
## Platform-Specific Setup

Each messaging platform has unique requirements and setup procedures. Choose the platform(s) you want to support and follow the instructions below:

<Accordions>
  <Accordion title="Telegram">
    Telegram bots require a bot token obtained from BotFather. The setup process is straightforward and only takes a few minutes.
    
    **Setup Steps:**
    1. Message @BotFather on Telegram
    2. Use `/newbot` command
    3. Follow the prompts
    
    **Environment Variables:**
    ```bash
    TELEGRAM_TOKEN=your_bot_token_here
    ```
    
    **Notes:** Telegram supports webhooks and polling. Webhooks are recommended for production.
  </Accordion>
  
  <Accordion title="WhatsApp Cloud API">
    WhatsApp Cloud API requires a Meta Business account and app. The setup is more complex but provides enterprise-grade messaging capabilities.
    
    <!-- Detailed instructions -->
  </Accordion>
</Accordions>
```

---

## AI Agent Documentation Checklist

When creating or updating documentation articles, ensure:

- [ ] Every major section (H2) has a conversational introduction paragraph
- [ ] Lists in "Best Practices" or "Limitations" sections are converted to Accordions
- [ ] "Common Use Cases" or "Examples" sections use Accordions
- [ ] "Complete Example" sections have expanded introductory paragraphs
- [ ] No "Next Steps" sections in documentation articles (only in blog posts/tutorials)
- [ ] Steps components are wrapped in Cards when representing complete guides
- [ ] Code examples are complete and runnable
- [ ] Introduction paragraphs explain the "what", "why", and "how" of each section
- [ ] Platform-specific content is organized in Accordions
- [ ] Visual hierarchy is clear with proper use of Cards, Accordions, and Callouts

---