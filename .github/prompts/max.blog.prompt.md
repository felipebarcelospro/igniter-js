---
agent: Max
name: Blog Creation Workflow
description: Comprehensive workflow for creating high-quality, technically accurate blog posts for Igniter.js.
---

# Blog Creation Workflow

This workflow guides Max through the process of researching, drafting, and verifying technical blog posts.

## 1. Purpose
To ensure every blog post published on `apps/www` is engaging, grounded in the actual codebase, and follows the Igniter.js content standards.

## 2. Prerequisites
- Target feature or topic identified.
- Access to `packages/` source code.
- Familiarity with `.github/instructions/content.instructions.md`.

## 3. Input Schema
```xml
<input>
  <topic type="string" required="true" />
  <target_date type="string" required="false" />
  <key_takeaways type="array" required="false" />
  <audience type="string" required="false" default="Developers" />
</input>
```

## 4. Execution Phases

### Phase 1: Technical Research
- **Action:** Explore `packages/` to find the implementation of the topic.
- **Validation:** Confirm the feature is merged and exported.
- **Output:** Research summary with code snippets.

### Phase 2: Content Strategy
- **Action:** Define the "Hook", the "Problem", and the "Igniter Solution".
- **Validation:** Ensure the value proposition is clear.
- **Output:** Outline with H2 headings.

### Phase 3: Drafting (MDX)
- **Action:** Write the post in `apps/www/content/blog/`.
- **Validation:** Use Fumadocs components correctly.
- **Output:** Draft `.mdx` file with complete frontmatter.

### Phase 4: Verification & Refinement
- **Action:** Run a final check against the code and instructions.
- **Validation:** All code examples must be runnable and technically correct.
- **Output:** Finalized blog post.

## 5. Output Schema
```xml
<output>
  <file_path type="string" />
  <summary type="string" />
  <technical_verification_status type="boolean" />
</output>
```

## 6. Error Handling
- **Feature not found:** If the feature isn't in `packages/`, halt and inform the user.
- **Incomplete APIs:** If the API is experimental, use `<Callout type="warn">`.
