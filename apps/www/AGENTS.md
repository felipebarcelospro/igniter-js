# AGENTS.md - Igniter.js Website (apps/www)

> **Last Updated:** 2025-01-01  
> **Version:** 2.0  
> **Application:** Official Documentation Website  
> **Framework:** Next.js 16 + Fumadocs  
> **Language:** All documentation must be in English

---

## 1. Overview

### What is apps/www?

`apps/www` is the **official documentation website for Igniter.js**, built with Next.js 16 and Fumadocs. This application serves multiple purposes:

- **Documentation Hub** - Complete framework documentation
- **Blog Platform** - Articles, tutorials, and announcements
- **Learning Platform** - Interactive step-by-step course
- **Template Showcase** - Gallery of templates and starters
- **Community Showcase** - Projects built with Igniter.js
- **Changelog** - Version updates and release notes
- **AI Chat Interface** - Lia, the integrated AI assistant

### Key Technologies

| Technology | Version | Purpose |
|---|---|---|
| **Next.js** | 16.0.0 | Web framework and SSR |
| **React** | 19.2.0 | UI library |
| **Fumadocs** | 16.0.2 (UI), 13.0.0 (MDX) | Documentation system |
| **Fumadocs Core** | 16.0.2 | Content API |
| **TypeScript** | 5.9.3 | Programming language |
| **Tailwind CSS** | 4.1.15 | Styling framework |
| **Vercel AI SDK** | 5.0.82 | AI integration |
| **Google AI (Gemini)** | 2.0.25 | LLM for Lia |
| **Upstash Redis** | 1.35.6 | Rate limiting |
| **Radix UI** | Multiple | Accessible UI components |
| **Zod** | 4.1.12 | Schema validation |

### Purpose & Mission

1. **Educate** - Teach developers to use Igniter.js effectively
2. **Document** - Provide complete API and features reference
3. **Showcase** - Demonstrate framework capabilities with real examples
4. **Support** - Assist users with Lia, the integrated AI assistant
5. **Engage** - Build community through blog and showcase

---

## 2. Project Architecture

### Directory Structure

```
apps/www/
├── src/
│   ├── ai/                     # AI/LLM integration (Lia chat)
│   │   ├── agents/            # AI agent definitions
│   │   │   ├── lia.ts         # Lia AI assistant
│   │   │   └── shared.ts      # Shared agent utilities
│   │   └── tools/             # AI tools (search, content access)
│   │
│   ├── app/                    # Next.js App Router
│   │   ├── (home)/            # Landing page route group
│   │   ├── api/               # API routes
│   │   │   ├── chat/          # Lia chat API
│   │   │   ├── search/        # Documentation search
│   │   │   ├── metadata/      # Dynamic metadata
│   │   │   └── showcase/      # Showcase screenshots
│   │   ├── blog/              # Blog pages
│   │   ├── changelog/         # Changelog/updates
│   │   ├── docs/              # Documentation
│   │   ├── learn/             # Learning course
│   │   ├── showcase/          # Community showcase
│   │   ├── templates/         # Template gallery
│   │   ├── og/                # Open Graph images
│   │   ├── rss/               # RSS feeds
│   │   ├── sitemap.xml/       # Sitemap generation
│   │   ├── llms.txt/          # LLM-friendly content index
│   │   ├── llms-full.txt/     # Full LLM content export
│   │   └── llms.mdx/          # MDX content for LLMs
│   │
│   ├── components/             # React components
│   │   ├── ai-elements/       # AI/workflow visualization components
│   │   ├── icons/             # Custom icon components
│   │   ├── learn/             # Course-specific components
│   │   ├── lia-chat/          # Lia chat interface
│   │   ├── site/              # Site-wide components
│   │   └── ui/                # Reusable UI components (shadcn/ui)
│   │
│   ├── configs/                # Application configuration
│   │   ├── application.tsx    # Site metadata, features, FAQ
│   │   └── types.ts           # Config type definitions
│   │
│   ├── hooks/                  # React hooks
│   │   └── use-mobile.ts      # Mobile detection hook
│   │
│   ├── lib/                    # Utility libraries
│   │   ├── content-manager.ts # Content source manager
│   │   ├── llms.ts            # LLM content generation
│   │   ├── rss.ts             # RSS feed generation
│   │   ├── sitemap.ts         # Sitemap generation
│   │   ├── metadata.ts        # SEO metadata utilities
│   │   ├── rate-limiter.ts    # Rate limiting (Upstash)
│   │   └── lia-chat/          # Lia chat utilities
│   │
│   ├── instrumentation.ts      # Next.js instrumentation
│   ├── instrumentation.node.ts # Node.js runtime instrumentation
│   ├── instrumentation.edge.ts # Edge runtime instrumentation
│   └── mdx-components.tsx      # MDX component mapping
│
├── content/                    # MDX content files (ALL IN ENGLISH)
│   ├── blog/                  # Blog posts (.mdx)
│   ├── docs/                  # Documentation (.mdx + meta.json)
│   ├── learn/                 # Course chapters (.mdx)
│   ├── showcase/              # Community projects (.mdx)
│   ├── templates/             # Template showcases (.mdx)
│   └── updates/               # Changelog entries (.mdx)
│
├── public/                     # Static assets
│   ├── logo-*.svg             # Brand assets
│   ├── og-image.png           # Default OG image
│   └── templates/             # Template preview images
│
├── .source/                    # Auto-generated by Fumadocs
├── .next/                      # Next.js build output
├── package.json                # Dependencies
├── next.config.mjs             # Next.js configuration
├── source.config.ts            # Fumadocs configuration
├── tsconfig.json               # TypeScript configuration
├── components.json             # shadcn/ui configuration
└── cli.json                    # Fumadocs CLI configuration
```

---

## 3. Content Management System

### 3.1. Content Types

The site manages **6 content types**, each with its own schema and purpose:

| Type | Location | Schema File | Purpose |
|---|---|---|---|
| **docs** | `content/docs/` | `source.config.ts` | Technical documentation |
| **blog** | `content/blog/` | `source.config.ts` | Blog posts and articles |
| **learn** | `content/learn/` | `source.config.ts` | Interactive course |
| **templates** | `content/templates/` | `source.config.ts` | Template showcases |
| **showcase** | `content/showcase/` | `source.config.ts` | Community projects |
| **updates** | `content/updates/` | `source.config.ts` | Changelog/releases |

**CRITICAL: All content must be written in English.**

### 3.2. Fumadocs Configuration (`source.config.ts`)

#### Docs Schema
```typescript
export const docs = defineDocs({
  dir: 'content/docs',
  docs: {
    schema: frontmatterSchema, // title, description
    postprocess: {
      includeProcessedMarkdown: true,
    },
  },
  meta: {
    schema: metaSchema, // Navigation structure
  },
});
```

**Navigation Structure:**
- Uses `meta.json` files in each docs section
- Defines page order and hierarchy
- Example: `content/docs/core/meta.json`

#### Blog Schema
```typescript
export const blog = defineDocs({
  dir: 'content/blog',
  docs: {
    schema: frontmatterSchema.extend({
      cover: z.string().url().optional(),
      tags: z.array(z.string()).optional(),
    }),
  },
});
```

**Frontmatter Example:**
```yaml
---
title: "Introducing Igniter.js"
description: "The first AI-native TypeScript framework"
cover: "https://example.com/cover.jpg"
tags: ["announcement", "typescript"]
---
```

#### Templates Schema
```typescript
export const templates = defineDocs({
  dir: 'content/templates',
  docs: {
    schema: frontmatterSchema.extend({
      framework: z.string(),
      demo: z.url(),
      repository: z.url().optional(),
      stack: z.array(z.string()),
      cover: z.string(),
      useCases: z.array(z.string()),
      creator: z.object({
        username: z.string(),
        name: z.string().optional(),
        avatar: z.url().optional(),
      }),
    }),
  },
});
```

#### Showcase Schema
```typescript
export const showcase = defineDocs({
  dir: 'content/showcase',
  docs: {
    schema: frontmatterSchema.extend({
      image: z.string(),
      url: z.url(),
      repository: z.url().optional(),
      tech: z.array(z.string()),
      author: z.string(),
      featured: z.boolean().optional(),
      category: z.enum(['saas', 'ecommerce', 'enterprise', 'open-source', 'education', 'other']).optional(),
    }),
  },
});
```

### 3.3. ContentManager (`src/lib/content-manager.ts`)

**Central hub for all content operations.**

#### Key Responsibilities:
- Load and organize all content types
- Provide unified API for RSS, sitemap, LLM content
- Generate page metadata
- Manage content sources

#### Usage Example:
```typescript
import { contentManager } from '@/lib/content-manager';

// Get all blog posts
const blogPosts = contentManager.getPages('blog');

// Get page data for RSS
const pageData = await contentManager.getPageData(page);

// Get LLM-friendly text
const llmText = await contentManager.getLLMText(page);
```

---

## 4. AI Integration (Lia Chat)

### 4.1. Architecture Overview

Lia is an **integrated AI assistant** that helps users navigate documentation and answer questions about Igniter.js.

**Tech Stack:**
- **LLM:** Google Gemini Flash 2.0 (via Vercel AI SDK)
- **Framework:** Vercel AI SDK Agents (`@ai-sdk-tools/agents`)
- **Memory:** Vercel AI Store (`@ai-sdk-tools/store`)
- **Rate Limiting:** Upstash Redis
- **Storage:** Upstash Redis (chat history)

### 4.2. Lia Agent (`src/ai/agents/lia.ts`)

#### System Prompt Strategy

Lia has explicit instructions to:
1. **Always Check Essential Docs First:**
   - `/docs/core` - Core introduction
   - `/docs/core/quick-start` - Quick start guide
2. **Use Tools Strategically:**
   - `searchDocs` - Primary research tool
   - `getPageContent` - Deep dive into specific pages
   - `listPages` - Discovery and navigation
3. **Response Guidelines:**
   - Search first, don't guess
   - Provide complete code examples
   - Reference documentation sources
   - Respond in user's language

#### Tool Workflow Patterns

**Pattern 1: Specific Question**
```
User: "How do I create a controller?"
1. searchDocs("create controller")
2. getPageContent(path_from_search)
3. Answer with complete code examples
```

**Pattern 2: Troubleshooting**
```
User: "My Redis connection is failing"
1. searchDocs("Redis connection configuration error")
2. searchDocs("Redis troubleshooting")
3. getPageContent() for setup guides
4. Provide step-by-step solution
```

### 4.3. AI Tools (`src/ai/tools/`)

#### 1. **searchDocs** (`search-docs.ts`)
- Searches all documentation using Fumadocs search API
- Returns: `SortedResult[]` with content, breadcrumbs, URL
- Use for: Finding relevant sections quickly

#### 2. **getPageContent** (`get-page-content.ts`)
- Retrieves complete page content in markdown
- Returns: Full processed markdown with metadata
- Use for: Deep dives and comprehensive answers

#### 3. **listPages** (`list-pages.ts`)
- Lists all available pages by category
- Returns: Page list with titles and paths
- Use for: Discovery and navigation guidance

### 4.4. Chat API (`src/app/api/chat/route.ts`)

**Endpoint:** `POST /api/chat`

**Features:**
- Rate limiting (Upstash Redis)
- Context awareness (current page, attached pages)
- Streaming responses
- Chat history persistence
- Timezone support

**Request Body:**
```typescript
{
  message: string;
  id: string;             // Chat ID
  currentPage?: string;   // User's current page
  attachedPages?: string[]; // Pages user wants to reference
  timezone?: string;      // User's timezone
}
```

**Rate Limiting:**
- IP-based rate limiting
- Headers: `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`

### 4.5. Chat UI Components (`src/components/lia-chat/`)

| Component | Purpose |
|---|---|
| `chat-interface.tsx` | Main chat container with Vercel AI SDK integration |
| `chat-layout.tsx` | Global chat layout wrapper |
| `chat-messages.tsx` | Message list renderer |
| `chat-input.tsx` | User input with textarea and send button |
| `message.tsx` | Individual message component (user/assistant) |
| `chat-sidebar.tsx` | Chat history sidebar |
| `suggested-prompts.tsx` | Quick suggestion pills |
| `empty-state.tsx` | Initial state before conversation starts |

---

## 5. Routing & Page Structure

### 5.1. Route Groups

Next.js App Router with organized route groups:

#### (home) - Landing Page
- **Path:** `/`
- **Components:** Hero, features, FAQ, blog grid, ecosystem
- **Layout:** HomeLayout from Fumadocs UI

#### docs - Documentation
- **Path:** `/docs/**`
- **Dynamic:** `[[...slug]]`
- **Layout:** DocsLayout with sidebar navigation
- **Source:** `content/docs/` + `meta.json` structure

#### blog - Blog Posts
- **Path:** `/blog`, `/blog/[slug]`
- **Dynamic:** Slug-based routing
- **Source:** `content/blog/*.mdx`

#### learn - Course Platform
- **Path:** `/learn`, `/learn/course/**`
- **Dynamic:** `[[...slug]]`
- **Special Components:** ChapterNav, ChapterObjectives, Quiz
- **Source:** `content/learn/*.mdx`

#### templates - Template Gallery
- **Path:** `/templates`, `/templates/[id]`
- **Features:** Filtering, search, detailed view
- **Source:** `content/templates/*.mdx`

#### showcase - Community Projects
- **Path:** `/showcase`
- **Features:** Project cards, filtering by category
- **Source:** `content/showcase/*.mdx`

#### changelog - Version Updates
- **Path:** `/changelog`
- **Features:** Timeline view of version updates
- **Source:** `content/updates/*.mdx`

### 5.2. API Routes

#### `/api/chat` - Lia Chat API
- **Method:** POST (send message), GET (fetch history)
- **Rate Limiting:** Yes (Upstash Redis)
- **Streaming:** Yes (Vercel AI SDK)

#### `/api/search` - Documentation Search
- **Method:** POST
- **Query:** Fuzzy search across all content
- **Returns:** Fumadocs SortedResult[]

#### `/api/metadata` - Dynamic Metadata
- **Method:** GET
- **Purpose:** Generate dynamic OG images metadata

#### `/api/showcase/screenshot` - Showcase Screenshots
- **Method:** GET
- **Purpose:** Generate showcase project screenshots

### 5.3. Special Routes

#### LLM-Friendly Routes
- `/llms.txt` - LLM content index
- `/llms-full.txt` - Complete content dump
- `/llms/[type]/full.txt` - Content by type (blog, docs, etc.)
- `/[section]/[path].mdx` - Raw MDX access for any page

#### Feeds & Metadata
- `/rss` - RSS feed (all content)
- `/rss/[type]` - RSS feed by content type
- `/sitemap.xml` - Dynamic sitemap generation

#### Open Graph Images
- `/og/home` - Homepage OG image
- `/og/blog/[slug]` - Blog post OG image
- `/og/docs/[...slug]` - Documentation OG image
- `/og/templates` - Templates page OG image
- `/og/showcase` - Showcase page OG image

---

## 6. UI Component System

### 6.1. Fumadocs Components (`mdx-components.tsx`)

Available in all MDX content:

| Component | Usage | Example |
|---|---|---|
| **Callout** | Highlight important info | `<Callout type="warn">...</Callout>` |
| **Steps** | Step-by-step instructions | `<Steps><Step>...</Step></Steps>` |
| **Tabs** | Tabbed content | `<Tabs items={['npm', 'pnpm']}>` |
| **Accordion** | Collapsible sections | `<Accordion title="FAQ">...</Accordion>` |
| **Files** | File tree visualization | `<Files><Folder>...</Folder></Files>` |
| **TypeTable** | API documentation table | `<TypeTable type={{...}} />` |
| **CodeBlock** | Enhanced code blocks | Automatic with syntax highlighting |

### 6.2. Custom Components

#### Learn Course Components (`src/components/learn/`)
- **ChapterObjectives** - Learning objectives at chapter start
- **ChapterNav** - Navigation between chapters
- **Quiz** - Interactive quiz questions

#### Icon Components (`src/components/icons/`)
- Framework icons: NextJs, Vite, Remix, Astro, Express, Bun, Deno
- Package manager icons: NPM, PNPM, Yarn

#### AI Elements (`src/components/ai-elements/`)
Complete set of workflow visualization components:
- Artifacts, Branches, Canvas, Chains of Thought
- Nodes, Edges, Connections
- Code blocks, Messages, Responses
- Tools, Plans, Queues

### 6.3. shadcn/ui Components (`src/components/ui/`)

57 pre-built UI components from shadcn/ui:
- **Forms:** Button, Input, Select, Checkbox, Radio, Switch
- **Layout:** Card, Separator, Tabs, Accordion
- **Overlays:** Dialog, Sheet, Popover, Tooltip, Alert
- **Feedback:** Toast, Alert, Badge, Progress
- **Navigation:** Dropdown, Menu, Navigation Menu
- **Data:** Table, Calendar, Date Picker

**Configuration:** `components.json`
- Style: new-york
- Base color: zinc
- CSS Variables: enabled
- Icon Library: lucide-react

---

## 7. Styling & Design System

### 7.1. Tailwind CSS Configuration

**Version:** 4.1.15 (latest)

**Key Features:**
- CSS Variables for theming
- Dark mode support (class-based)
- Custom animations (`tw-animate-css`)
- Responsive breakpoints
- Custom color palette

**Global Styles:** `src/app/global.css`
- CSS custom properties for colors
- Typography styles
- Base component styles
- Animation definitions

### 7.2. Theme System

**Powered by:** `next-themes`

**Modes:**
- Light mode (default)
- Dark mode
- System preference

**Color Scheme:**
- Base: Zinc
- Customizable via CSS variables
- Consistent across all components

### 7.3. Typography

**Font:** Inter (Google Fonts)
- Subset: Latin
- Applied globally via `layout.tsx`

---

## 8. SEO & Metadata

### 8.1. Metadata Generation (`src/lib/metadata.ts`)

**Default Metadata:**
```typescript
{
  title: "Igniter.js",
  description: "The first AI-native TypeScript framework...",
  openGraph: { ... },
  twitter: { ... },
  icons: { ... }
}
```

**Dynamic Metadata:**
- Docs pages: Auto-generated from frontmatter
- Blog posts: Custom OG images
- Templates: Framework-specific metadata

### 8.2. Sitemap (`src/lib/sitemap.ts`)

**Route:** `/sitemap.xml`

**Includes:**
- All documentation pages
- All blog posts
- All course chapters
- All templates
- All showcase projects
- Static pages

**Features:**
- Last modified dates
- Priority levels
- Change frequency

### 8.3. RSS Feeds (`src/lib/rss.ts`)

**Routes:**
- `/rss` - All content
- `/rss/blog` - Blog only
- `/rss/docs` - Docs only
- `/rss/learn` - Course only
- `/rss/templates` - Templates only
- `/rss/changelog` - Updates only

**Format:** RSS 2.0 (using `feed` library)

### 8.4. LLM-Friendly Content (`src/lib/llms.ts`)

**Purpose:** Make all documentation accessible to LLMs

**Routes:**
- `/llms.txt` - Index of all content with links
- `/llms-full.txt` - Complete content dump
- `/llms/[type]/full.txt` - Content by type
- `/[section]/[path].mdx` - Raw MDX for any page

**Features:**
- Full markdown preservation
- Metadata included
- Hierarchical structure
- Easy to parse

---

## 9. Performance & Optimization

### 9.1. Build Optimization

**Next.js 16 Features:**
- App Router with React Server Components
- Automatic code splitting
- Image optimization (`next/image`)
- Font optimization (`next/font`)

**Static Generation:**
- Docs pages: Pre-rendered at build time
- Blog posts: Pre-rendered at build time
- Templates/Showcase: Static generation

**Dynamic Routes:**
- Chat API: Edge runtime
- Search API: Edge runtime
- OG images: On-demand generation

### 9.2. Caching Strategy

**Next.js Cache:**
- Static pages: Cached indefinitely
- Dynamic routes: Revalidate on demand
- API routes: No cache (real-time)

**Redis Cache:**
- Rate limiting data
- Chat history
- User sessions

### 9.3. Rate Limiting (`src/lib/rate-limiter.ts`)

**Strategy:** Sliding window with Upstash Redis

**Limits:**
- Chat API: 20 requests per 60 seconds per IP
- Configurable per route

**Response Headers:**
```
X-RateLimit-Limit: 20
X-RateLimit-Remaining: 15
X-RateLimit-Reset: 1234567890
```

---

## 10. Development Workflow

### 10.1. Getting Started

```bash
# Install dependencies
bun install

# Start development server
bun dev

# Build for production
bun build

# Start production server
bun start

# Generate Fumadocs MDX
bun postinstall
```

**Dev Server:** http://localhost:3000

### 10.2. Content Editing

**CRITICAL: All content must be written in English.**

#### Adding Documentation
1. Create MDX file in `content/docs/[section]/`
2. Add frontmatter (title, description) in English
3. Update `meta.json` in section directory
4. Write content using Fumadocs components (in English)
5. Test locally with `bun dev`

#### Adding Blog Post
1. Create MDX file in `content/blog/`
2. Add frontmatter (title, description, cover, tags) in English
3. Write content in English
4. Images go in `public/blog/` (if needed)

#### Adding Course Chapter
1. Create MDX file in `content/learn/`
2. Number it sequentially (e.g., `08-new-chapter.mdx`)
3. Add `<ChapterObjectives>` at the start
4. Include `<Quiz>` for key concepts
5. End with `<ChapterNav>` for navigation
6. All content must be in English

#### Adding Template
1. Create template project in `apps/` directory
2. Create MDX file in `content/templates/`
3. Add complete frontmatter (framework, demo, stack, etc.)
4. Add preview image to `public/templates/`
5. All descriptions must be in English

### 10.3. Code Organization

**Follow these patterns:**

1. **Component Structure:**
```typescript
// Component file structure
export interface ComponentProps {
  // Props with JSDoc (in English)
}

export function Component({ ...props }: ComponentProps) {
  // Component implementation
}
```

2. **API Route Structure:**
```typescript
export const runtime = 'edge'; // or 'nodejs'
export const maxDuration = 60;

export async function GET(request: NextRequest) {
  // GET handler
}

export async function POST(request: NextRequest) {
  // POST handler
}
```

3. **Content Source Structure:**
```typescript
export const source = loader({
  baseUrl: '/section',
  source: definedDocs.toFumadocsSource(),
});
```

---

## 11. Testing & Quality

### 11.1. Type Safety

**TypeScript Strict Mode:** Enabled

**Key Checks:**
```bash
# Type checking
bun run typecheck

# Lint
bun run lint
```

### 11.2. Content Validation

**Fumadocs MDX:**
- Validates frontmatter schemas
- Checks MDX syntax
- Verifies component usage

**Zod Schemas:**
- All content types have Zod validation
- Defined in `source.config.ts`

### 11.3. Error Handling

**Global Error Boundaries:**
- `not-found.tsx` - 404 pages
- Error boundaries in layout components

**API Error Responses:**
- Structured JSON error responses
- HTTP status codes
- Error messages

---

## 12. Deployment

### 12.1. Vercel Deployment

**Recommended Platform:** Vercel (optimal for Next.js 16)

**Configuration:**
- Framework: Next.js
- Build Command: `bun build`
- Output Directory: `.next`
- Install Command: `bun install`

**Environment Variables:**
```bash
# Required
NEXT_PUBLIC_BASE_URL=https://igniterjs.com
NEXT_PUBLIC_GA_ID=G-XXXXXXXXXX

# AI/Lia
GOOGLE_GENERATIVE_AI_API_KEY=your_key

# Rate Limiting (Upstash Redis)
UPSTASH_REDIS_REST_URL=https://...
UPSTASH_REDIS_REST_TOKEN=your_token

# Telegram Bot (optional)
TELEGRAM_BOT_TOKEN=your_token
```

### 12.2. Build Process

```bash
# 1. Install dependencies
bun install

# 2. Generate Fumadocs sources
bun postinstall

# 3. Build Next.js app
bun build
```

**Output:**
- `.next/` - Next.js build
- `.source/` - Fumadocs generated sources

### 12.3. Production Checklist

- [ ] Environment variables configured
- [ ] Google Analytics ID set
- [ ] Rate limiting configured (Upstash)
- [ ] AI API key configured
- [ ] OG images generating correctly
- [ ] Sitemap accessible
- [ ] RSS feeds working
- [ ] LLM routes accessible
- [ ] Mobile responsive
- [ ] Dark mode working
- [ ] All MDX content valid
- [ ] All content is in English

---

## 13. AI Agent Guidelines

### 13.1. When Working on Content

**ALWAYS:**
1. Write all content in English
2. Read existing content structure first
3. Check `source.config.ts` for schema requirements
4. Verify MDX component availability in `mdx-components.tsx`
5. Follow content type guidelines from root `AGENTS.md`
6. Test locally before committing

**NEVER:**
1. Write content in languages other than English
2. Create MDX without proper frontmatter
3. Use components not in `mdx-components.tsx`
4. Break navigation structure in `meta.json`
5. Assume API behavior without checking implementation

### 13.2. When Working on Features

**Before implementing:**
1. Check if feature affects Lia chat system
2. Verify rate limiting requirements
3. Consider SEO/metadata implications
4. Test in both light and dark modes

**After implementing:**
1. Update relevant documentation (in English)
2. Test with actual content
3. Verify mobile responsiveness
4. Check accessibility

### 13.3. When Working on AI/Lia

**Critical Rules:**
1. NEVER change Lia's core instructions without approval
2. Always test new tools thoroughly
3. Verify rate limiting works
4. Check chat history persistence
5. Test error handling

**Tool Development:**
- Add new tools to `src/ai/tools/`
- Register in `src/ai/tools/index.ts`
- Add to Lia agent in `src/ai/agents/lia.ts`
- Document in tool JSDoc (in English)

---

## 14. Common Patterns & Solutions

### 14.1. Adding a New Content Type

1. **Define in `source.config.ts`:**
```typescript
export const newType = defineDocs({
  dir: 'content/new-type',
  docs: {
    schema: frontmatterSchema.extend({
      // Custom fields
    }),
  },
});
```

2. **Add to ContentManager:**
```typescript
this.sources.set('newType', {
  type: 'newType',
  source: loader({
    baseUrl: '/new-type',
    source: newType.toFumadocsSource(),
  }),
  baseUrl: '/new-type',
  title: 'New Type',
  description: 'Description',
});
```

3. **Create route in app:**
```typescript
// app/new-type/page.tsx
// app/new-type/[slug]/page.tsx
```

### 14.2. Creating a New AI Tool

1. **Create tool file:**
```typescript
// src/ai/tools/my-tool.ts
import { tool } from '@ai-sdk-tools/agents';

export const myTool = tool({
  name: 'myTool',
  description: 'What this tool does',
  parameters: z.object({
    query: z.string(),
  }),
  execute: async ({ query }) => {
    // Implementation
    return result;
  },
});
```

2. **Export in index:**
```typescript
// src/ai/tools/index.ts
export const liaTools = {
  searchDocs,
  getPageContent,
  listPages,
  myTool, // Add here
};
```

3. **Update Lia instructions if needed**

### 14.3. Customizing UI Components

**Using shadcn/ui CLI:**
```bash
bunx shadcn@latest add [component-name]
```

**Manual Addition:**
1. Create file in `src/components/ui/`
2. Import and use in your component
3. Follow existing patterns

---

## 15. Troubleshooting

### 15.1. Common Issues

**MDX not rendering:**
- Check frontmatter syntax
- Verify schema in `source.config.ts`
- Run `bun postinstall` to regenerate sources

**Fumadocs components not working:**
- Check import in `mdx-components.tsx`
- Verify component is exported
- Check component props

**Lia chat not responding:**
- Verify API key in environment
- Check rate limiting
- Inspect browser console for errors
- Check Upstash Redis connection

**Build fails:**
- Check TypeScript errors
- Verify all imports
- Check MDX syntax errors
- Run `bun postinstall` first

### 15.2. Debug Checklist

- [ ] Environment variables loaded
- [ ] Dependencies installed (`bun install`)
- [ ] Fumadocs sources generated (`bun postinstall`)
- [ ] TypeScript compiles (`bun typecheck`)
- [ ] No lint errors (`bun lint`)
- [ ] Dev server running (`bun dev`)

---

## 16. Key Files Reference

| File | Purpose | When to Edit |
|---|---|---|
| `source.config.ts` | Fumadocs content schemas | Adding/changing content types |
| `next.config.mjs` | Next.js configuration | Changing build settings, rewrites |
| `src/mdx-components.tsx` | MDX component registry | Adding custom MDX components |
| `src/lib/content-manager.ts` | Content source manager | Managing content sources |
| `src/ai/agents/lia.ts` | Lia AI assistant | Changing Lia behavior |
| `src/configs/application.tsx` | Site configuration | Updating site metadata |
| `src/app/layout.tsx` | Root layout | Global app changes |
| `src/app/layout.shared.tsx` | Shared layout options | Navigation, links |

---

## 17. External Resources

### Documentation
- **Fumadocs:** https://fumadocs.dev
- **Next.js 16:** https://nextjs.org/docs
- **Vercel AI SDK:** https://sdk.vercel.ai/docs
- **Tailwind CSS:** https://tailwindcss.com/docs

### Tools
- **shadcn/ui:** https://ui.shadcn.com
- **Radix UI:** https://www.radix-ui.com
- **Lucide Icons:** https://lucide.dev

### Services
- **Upstash Redis:** https://upstash.com/docs/redis
- **Google AI:** https://ai.google.dev/docs

---

## 18. Version History

### v2.0 (2025-01-01)
- Complete rewrite of AGENTS.md in English
- Added comprehensive content management documentation
- Documented AI/Lia integration architecture
- Added detailed routing and component documentation
- Included troubleshooting and common patterns
- Structured for AI agent understanding
- **Language Policy:** All documentation must be in English

### v1.0 (Previous)
- Basic README-style documentation

---

## 19. Quick Commands Reference

```bash
# Development
bun dev                  # Start dev server
bun build               # Build for production
bun start               # Start production server
bun typecheck           # Check TypeScript
bun lint                # Lint code

# Content Management
bun postinstall         # Generate Fumadocs sources

# Component Management
bunx shadcn@latest add button  # Add shadcn component
```

---

## 20. Emergency Contacts & Support

**When something breaks:**
1. Check TypeScript errors first
2. Verify environment variables
3. Check Upstash Redis status
4. Review build logs
5. Check Fumadocs documentation

**For questions:**
- GitHub Issues: https://github.com/felipebarcelospro/igniter-js/issues
- Discord: https://discord.com/invite/JKGEQpjvJ6
- Documentation: https://igniterjs.com/docs

---

**Remember:** This AGENTS.md is your guide to understanding and maintaining `apps/www`. Always read relevant sections before making changes. Keep documentation updated as the project evolves.

**Language Policy:** ALL documentation, content, and code comments must be written in English. This ensures consistency, accessibility, and maintainability across the entire project.

**Always verify implementation before documenting.** Never assume API behavior - check the actual code in `src/` directories.
