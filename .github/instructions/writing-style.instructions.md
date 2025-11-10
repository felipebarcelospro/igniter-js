---
applyTo: '**'
---
## ✍️ Unified Documentation Style Guide (for LLMs & Authors)

This guide defines the writing standards for all Igniter.js content: documentation, blog posts, templates, and updates.

### 🎯 Core Style Principles (Applies to All Documentation)

1. **Clarity Over Cleverness**  
   Use simple, direct language. Favor short words and short sentences. Avoid jargon unless it's essential—and if it is, define it once.

2. **Speak Developer**  
   Write the way you'd speak to a smart, curious engineer sitting next to you. Friendly, confident, and precise.

3. **Show, Don't Just Tell**  
   Use examples liberally. Explain ideas with real code, not abstract theory. Every key concept should be backed by a working snippet.

4. **Write in Active Voice**  
   ✅ "Click the button to save your changes."  
   ❌ "The button should be clicked in order for changes to be saved."

5. **Present First, Explain Later**  
   Get the reader to success as quickly as possible. After they've seen something work, then explain how/why it works.

6. **Be Honest and Human**  
   If something is tricky, say so. If you're recommending a workaround, explain why. Transparency builds trust.

7. **Use consistent terminology**  
   Always refer to concepts, components, and APIs by the same name. Don't mix "endpoint" and "route" if they mean the same thing.

---

### 📘 Documentation (Docs): Writing Style

**Tone:** Clear, technical, and helpful  
**Voice:** An expert engineer sharing knowledge directly

#### ✅ Style Rules:
- Use **second person** ("you") to address developers directly
- **Always include conversational introduction paragraphs** at the start of major sections explaining what, why, and how
- Keep explanations **focused and concise** but provide enough context
- Start with **working examples**, then explain concepts
- Use **`<Callout>`** for important notes and warnings
- Include **complete, runnable code examples**
- Structure with **`<Steps>`** for sequential instructions (wrap in `<Card>` when representing complete guides)
- Use **`<Tabs>`** for package manager commands (with `groupId="package-manager"`)
- Add **`<TypeTable>`** for API reference documentation
- Show **file structures** with `<Files>`, `<Folder>`, `<File>` components
- **Convert lists to Accordions** for "Best Practices", "Limitations", "Common Use Cases", and similar sections
- **Never include "Next Steps"** sections in documentation articles (only in blog posts/tutorials)
- **Expand "Complete Example" sections** with detailed introductory paragraphs explaining what the example demonstrates

#### 📝 Example Structure:
```mdx
---
title: "Feature Name"
description: "Brief description of what this feature does"
---

## Introduction

What problem does this solve? One paragraph maximum.

<Callout type="info">
  Important context or prerequisite.
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
    ### Install and Configure
    Complete code example that works.
  </Step>
  
  <Step>
    ### Use the Feature
    Another working example.
  </Step>
</Steps>

## API Reference

<TypeTable type={{
  propertyName: {
    type: 'string',
    description: 'What this does',
    required: true
  }
}} />
```

---

### 📗 Blog Posts: Writing Style

**Tone:** Engaging, conversational, and inspiring  
**Voice:** A developer sharing insights and experiences

#### ✅ Style Rules:
- Use **first person** ("I", "we") or **second person** ("you")
- Tell a **story** - what's the journey or insight?
- Include **real-world examples** and use cases
- Use **visual elements** (images, diagrams, demos)
- Add **`<Callout>`** for key takeaways
- Include **working code examples** with context
- End with **clear next steps** or call-to-action
- Use **tags** to categorize content

#### 📝 Example Structure:
```mdx
---
title: "Introducing Real-Time Features in Igniter.js"
description: "How we built SSE-based real-time updates that just work"
tags: ["announcement", "feature", "real-time"]
cover: "https://example.com/cover.jpg"
---

## The Challenge

Developers told us real-time features were too complex...

## Our Solution

We built SSE-based real-time updates that work out of the box:

```typescript
// One line of code for real-time
export const posts = igniter.query({
  stream: true, // That's it!
  handler: async () => { /* ... */ }
});
```

<Callout type="success" title="Key Benefit">
  Real-time updates with zero configuration.
</Callout>

## How It Works

Deep dive into the implementation...

## Getting Started

<Steps>
  <Step>
    ### Install the Package
    Installation code
  </Step>
</Steps>

## What's Next

We're working on WebSocket support, GraphQL subscriptions...
```

---

### 📙 Templates: Writing Style

**Tone:** Practical, clear, and motivating  
**Voice:** A guide showing what's possible

#### ✅ Style Rules:
- Focus on **what's included** out-of-the-box
- Use **`<Files>`** to visualize project structure
- Add **`<Steps>`** for quick start instructions
- Show **key features** with code examples
- Include **deployment instructions**
- Use **`<Callout>`** for important setup notes
- Link to **live demo** and **repository**
- Specify **tech stack** clearly

#### 📝 Example Structure:
```mdx
---
title: "Next.js Full-Stack Starter"
description: "Production-ready Next.js app with Igniter.js, Prisma, and Redis"
framework: "Next.js"
demo: "https://demo.vercel.app"
repository: "https://github.com/user/repo"
stack: ["Next.js", "TypeScript", "Prisma", "Redis", "Tailwind CSS"]
useCases: ["Full-Stack", "SaaS"]
creator:
  username: "felipebarcelospro"
  name: "Felipe Barcelos"
---

## Overview

This template provides everything you need to build a production-ready full-stack application.

## Features

- ✅ Type-safe API with Igniter.js
- ✅ Database with Prisma ORM
- ✅ Caching with Redis
- ✅ Authentication ready
- ✅ Tailwind CSS styling

## Project Structure

<Files>
  <Folder name="src" defaultOpen>
    <Folder name="features">
      <File name="users.controller.ts" />
      <File name="posts.controller.ts" />
    </Folder>
    <File name="igniter.ts" />
  </Folder>
</Files>

## Quick Start

<Steps>
  <Step>
    ### Clone and Install
    ```bash
    git clone https://github.com/user/repo
    cd repo
    npm install
    ```
  </Step>
  
  <Step>
    ### Configure Environment
    ```bash
    cp .env.example .env
    # Edit .env with your settings
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
  Make sure PostgreSQL and Redis are running locally.
</Callout>

## Deployment

Deploy to Vercel with one click...
```

---

### 📕 Updates (Changelog): Writing Style

**Tone:** Clear, factual, and organized  
**Voice:** Release notes with helpful context

#### ✅ Style Rules:
- Start with **version number** and **release date**
- Group changes by **category** (Features, Bug Fixes, Breaking Changes)
- Use **bullet points** for individual changes
- Use **`<Callout type="warn">`** for breaking changes
- Include **migration guides** when needed
- Link to **relevant documentation**
- Show **before/after** code for breaking changes

#### 📝 Example Structure:
```mdx
---
title: "v1.2.0 - Real-Time Features"
description: "Added SSE support and real-time synchronization"
---

Released on October 28, 2025

## 🎉 Features

- **Real-Time Updates**: SSE-based data synchronization
- **Redis Adapter**: New caching and pub/sub adapter
- **Better Types**: Improved TypeScript inference

## 🐛 Bug Fixes

- Fixed type inference in nested controllers
- Resolved memory leak in job queue

## ⚠️ Breaking Changes

<Callout type="warn" title="Migration Required">
  The controller API has changed in this release.
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

- Updated Controller Guide
- New Real-Time Guide

## 🔗 Links

- Full Changelog on GitHub
- Migration Guide
```

---

### 🧩 Additional Style Conventions

| Rule | Example |
|------|---------|
| ✅ Use inline code for technical terms | `fetchData()`, `useState`, `@igniter-js/core` |
| ✅ Use fenced code blocks for multi-line code | \`\`\`ts ... \`\`\` |
| ✅ Use bold for emphasis | **important concept** |
| ✅ Use emojis sparingly in updates/blog | ✅, 🎉, 🐛, ⚠️ |
| ✅ Spell out acronyms on first use | "Server-Sent Events (SSE)" |
| ❌ Avoid ellipses in instructions | Don't use "Click Save..." |
| ✅ Use present tense for documentation | "returns" not "will return" |
| ✅ Use past tense for changelogs | "Fixed", "Added", "Removed" |

---

# 📄 MDX-First Documentation Rules

When documenting projects that utilize Fumadocs, it's essential to adhere to specific conventions to maintain consistency and clarity. Below are key guidelines to follow:

**1. Use MDX for Documentation**

Always author documentation using MDX (Markdown for JSX). MDX combines the simplicity of Markdown with the power of JSX, allowing for the inclusion of interactive components within your documentation. This approach enhances the readability and functionality of the documentation. Fumadocs provides extensive support for MDX, making it the preferred choice for creating comprehensive and interactive documentation.

**2. Frontmatter Configuration**

At the beginning of each MDX document, include a frontmatter section to define metadata such as the title and description. This metadata is crucial for organizing and presenting the documentation effectively. An example of a frontmatter section is:

```mdx
---
title: MySQL Adapter
description: The MySQL adapter provides integration with MySQL and MariaDB, widely-used relational database systems known for reliability, performance, and broad compatibility.
---
```

The `description` field serves as an introductory paragraph and should be placed immediately after the frontmatter. This ensures that readers receive a concise overview of the document's content right from the start.

**3. Heading Structure**

Do not use an H1 heading at the beginning of the document. The `title` defined in the frontmatter is automatically rendered as the main heading of the page. Starting with an H1 heading would duplicate the title and disrupt the document's structure. Instead, begin with an H2 or appropriate subheading to introduce sections within the document.

**4. Consistent Writing Style**

- **Clarity and Conciseness**: Use clear and concise language to convey information effectively.
- **Active Voice**: Prefer active voice over passive voice to make sentences more direct and vigorous.
- **Consistent Terminology**: Use consistent terminology throughout the documentation to avoid confusion.
- **Code Blocks**: For code examples, use fenced code blocks with appropriate language identifiers for syntax highlighting. For example:

  ```js
  console.log('Hello, World!');
  ```

### 🧩 Example Template for Tutorial

```md
# Getting Started with [Product]

In this tutorial, you'll build a simple [thing] using [product/tool]. By the end, you'll have a working [result] and understand the basics of how it works.

## Prerequisites
- Node.js v18+
- A basic understanding of JavaScript

## Quick Start

<Card title="Quick Start Guide">
  <Steps>
    <Step>
      ### Install the CLI
      Installation instructions here with detailed context about what this accomplishes.
      
      <Tabs items={['npm', 'pnpm', 'yarn', 'bun']} groupId="package-manager">
        <Tab value="npm">
          ```bash
          npx our-cli
          ```
        </Tab>
      </Tabs>
    </Step>
    
    <Step>
      ### Verify Installation
      You should now be able to run:
      
      ```bash
      our-cli --help
      ```
    </Step>
  </Steps>
</Card>

...

## Conclusion

You've just built a working [thing]! Next, try our [how-to guide] to add [extra feature].
```

---

## 📋 Documentation Article Patterns

### Conversational Tone Requirements

**Every documentation article must use a conversational, friendly tone** throughout. Write as if explaining to a colleague who is smart but new to the concept. This means:

- **Use natural language** - avoid overly formal or academic tone
- **Explain the "why"** - don't just describe what something does, explain why it matters
- **Provide context** - connect concepts to real-world usage
- **Be helpful** - anticipate questions and answer them proactively

### Section Introduction Pattern

**Every major section (H2) requires:**

1. **A conversational introduction paragraph** (2-4 sentences) that:
   - Explains what the section covers
   - Explains why it matters
   - Provides context about when/how to use it
   - Connects to the broader topic

2. **Example of good section introduction:**
   ```mdx
   ## Pre-Process Hooks
   
   Pre-process hooks run **before** middleware, making them perfect for enriching the context with data that your middleware or command handlers need. These hooks execute at the very start of the processing pipeline, allowing you to load user sessions, fetch permissions, gather channel metadata, or perform any other context enrichment before any middleware runs.
   
   Understanding when to use pre-process hooks versus middleware is important. Pre-process hooks are ideal for data loading that doesn't need to block processing—if the data load fails, you might want to continue with default values. They're also perfect for operations that should happen regardless of middleware logic, ensuring context is always enriched consistently.
   ```

### Accordion Usage for Lists

**Convert bullet lists to Accordions when:**

- The list has 3+ items
- Items contain detailed explanations
- Items represent distinct concepts/patterns
- Appearing in sections like:
  - "Best Practices"
  - "Limitations"
  - "Common Use Cases"
  - "Examples"
  - "Patterns"
  - "Use Cases"

**Each Accordion item must include:**
- Descriptive title
- 2-4 sentence introduction explaining the concept
- Code example (if applicable)
- Concluding paragraph with benefits/considerations

### Complete Example Pattern

**"Complete Example" sections must:**

1. Start with an expanded introductory paragraph explaining:
   - What the example demonstrates
   - When you would use this pattern
   - What concepts it showcases
   - List of key points (using bullet points)

2. Example format:
   ```mdx
   ## Complete Example
   
   Here's a complete example that demonstrates dynamic command loading from a directory. This pattern is ideal for production bots where you want to organize commands in separate files and load them automatically. The example shows how to scan a commands directory, import each command module, and register them dynamically.
   
   This example demonstrates:
   - **Dynamic Loading**: Scanning a directory and loading commands automatically
   - **Command Organization**: Keeping commands in separate files for better maintainability
   - **Initialization Pattern**: Loading commands before starting the bot
   
   ```typescript
   // Complete code example here
   ```
   ```

### Steps Component Best Practices

**When using `<Steps>`:**

1. **Wrap in `<Card>`** when steps represent a complete tutorial/guide:
   ```mdx
   <Card title="Quick Start Guide">
     <Steps>
       <!-- Steps here -->
     </Steps>
   </Card>
   ```

2. **Add introductory paragraph** before Steps explaining what the guide accomplishes

3. **Include context** within each Step when needed

### No "Next Steps" in Documentation

**DO NOT include "Next Steps" sections** in documentation articles. Instead:
- Link to related concepts naturally within content
- Use `<Callout>` components for related documentation
- End with the most important information

**Exception:** Blog posts and tutorials may include "Next Steps" as calls-to-action.

### Platform/Variant Organization

**When documenting multiple platforms or variants:**

- Use `<Accordions>` with one `<Accordion>` per platform/variant
- Include detailed setup instructions within each Accordion
- Add platform-specific notes or limitations within each Accordion
- Provide an introductory paragraph explaining the differences/choices
