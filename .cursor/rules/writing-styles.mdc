---
alwaysApply: true
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

8. **Verify Before Documenting**  
   **NEVER assume API behavior.** Always check the actual implementation in `packages/` before writing code examples or documentation. Read source code, interfaces, and type definitions to ensure accuracy.

---

### 📘 Documentation (Docs): Writing Style

**Tone:** Clear, technical, and helpful  
**Voice:** An expert engineer sharing knowledge directly

#### ✅ Style Rules:
- **Verify Implementation**: Always check `packages/` source code before documenting APIs
- Use **second person** ("you") to address developers directly
- Keep explanations **focused and concise**
- Start with **working examples**, then explain concepts
- Use **`<Callout>`** for important notes and warnings
- Include **complete, runnable code examples** that match actual APIs
- Structure with **`<Steps>`** for sequential instructions
- Use **`<Tabs>`** for package manager commands (with `groupId="package-manager"`)
- Add **`<TypeTable>`** for API reference documentation
- Show **file structures** with `<Files>`, `<Folder>`, `<File>` components
- **Never assume**: If unsure about an API, search and read the implementation

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

## Step 1: Install the CLI

<Tabs items={['npm', 'pnpm', 'yarn', 'bun']} groupId="package-manager">
  <Tab value="npm">
    ```bash
    npx our-cli
    ```
  </Tab>
</Tabs>

You should now be able to run:

```bash
our-cli --help
```

If that works, let's move on.

...

## Conclusion

You've just built a working [thing]! Next, try our [how-to guide] to add [extra feature].
```

---

## 📚 Learn Course (Tutorial Chapters): Writing Style

**Tone:** Instructional, encouraging, and thorough  
**Voice:** A patient teacher guiding step-by-step

### ✅ Course-Specific Style Rules:

- **Always verify APIs**: Check `packages/` source code before showing any Igniter.js API usage
- **Use ChapterObjectives**: Start every chapter with `<ChapterObjectives>` listing what students will learn
- **Explain then Show**: Explain concepts before showing code (understand → implement)
- **Complete Examples**: Every code block must be complete, executable, and match the real API
- **Business Logic Comments**: Use `// Business Rule:` and `// Observation:` to explain code decisions
- **Understanding Sections**: Include sections like "Understanding the Controller" to deepen learning
- **Add Quizzes**: Use `<Quiz>` components to reinforce key concepts
- **Chapter Navigation**: Always end with `<ChapterNav>` to guide students to the next chapter
- **Show File Structure**: Use `<Files>` frequently to help students navigate the project
- **Success Callouts**: Use `<Callout type="success">` after completing major milestones

### Course Chapter Structure:

```mdx
---
title: "XX: Chapter Title"
description: "What you'll learn"
---

<ChapterObjectives
  objectives={[
    { text: 'First learning objective' },
    { text: 'Second learning objective' }
  ]}
/>

## Introduction

Why this chapter matters and what we're building.

## Step-by-Step Instructions

Complete, verified code examples with explanations.

```typescript
// Business Rule: Why we do this
import { igniter } from "@/igniter";

export const controller = igniter.controller({
  // Complete implementation
});
```

### Understanding the Implementation

Deep dive into what the code does and why.

<Callout type="info" title="Key Concept">
  Important insight about the pattern.
</Callout>

## Testing

How to verify it works.

<Quiz
  question="What does this accomplish?"
  options={[
    { label: 'Wrong', value: 'a' },
    { label: 'Correct', value: 'b', isCorrect: true }
  ]}
  explanation="Why this is correct."
/>

<ChapterNav
  current={{ number: 3, title: "Current Chapter" }}
  next={{
    number: 4,
    title: "Next Chapter",
    description: "What's next",
    href: "/learn/04-next-chapter"
  }}
/>
```

### Code Comment Patterns for Course

When writing code for the course, use these comment types:

- **`// Business Rule:`** - Explains why a business decision was made
- **`// Observation:`** - Highlights what's happening or what to notice
- **Regular comments** - Explain what the code does

---

## 🎨 Visual Structure & DX Enhancement

### Content Flow Best Practices

**Progressive Disclosure Pattern:**
1. **Overview** - What is this? (one paragraph)
2. **Quick Start** - Get it working fast
3. **Understanding** - Deep dive after success
4. **Advanced** - More complex scenarios

**"Understanding..." Pattern:**
After showing code, always explain:
- What each part does
- Why it works this way
- Key concepts to remember

**Section Naming:**
- Use **"Understanding the..."** after code examples
- Use **"Key Concepts"** for summaries
- Use **"Why...?"** for explanations
- Use **"Common Patterns"** for best practices

### Visual Organization

**Breathing Room:**
- Use horizontal rules (`---`) between major sections
- Leave space between concepts
- Group related content visually

**Code Example Context:**
Always provide context before code blocks:
- What the code does
- Where it goes
- Why it's needed

**Emphasis Hierarchy:**
- **Bold** for key concepts
- `Inline code` for technical terms
- **Bold + code** for API emphasis: **`igniter.controller()`**

### Comparison Patterns

Use `<Tabs>` for showing alternatives:

```mdx
<Tabs items={['Option A', 'Option B']}>
  <Tab value="Option A">
    Code example A
  </Tab>
  <Tab value="Option B">
    Code example B
  </Tab>
</Tabs>
```

Use tables for feature comparisons, pros/cons, etc.

### Strategic Callout Usage

- **Before code**: Warnings, prerequisites
- **After code**: Success messages, next steps  
- **Standalone**: Important context, tips

Don't overuse callouts - they lose impact if everything is highlighted.

### Cross-Reference Strategy

Always guide readers:
- Link to prerequisites
- Suggest next steps
- Reference related concepts
- Use descriptive link text

Example:
```mdx
<Callout type="info" title="Prerequisite">
  This builds on [Controllers](/docs/controllers). 
  Review that first if needed.
</Callout>
```
