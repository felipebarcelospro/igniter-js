---
description: Use when working on UI/UX tasks, user experience design, interface components, and user journey optimization - provides comprehensive UX workflow with design systems integration.
alwaysApply: false
---
# UX/UI Workflow & Design System

This rule provides comprehensive guidance for UI/UX development in Igniter.js + Next.js + Shadcn UI projects, ensuring consistent design systems, user experience optimization, and seamless integration with existing workflows.

## 1. Design System Integration Protocol

### 1.1 Mandatory Design Token Usage
**CRITICAL**: Always use design tokens from `globals.css` instead of hardcoded values. This ensures consistency across the application and proper theme support.

**Available Design Tokens:**
```css
/* Background & Surface */
--background: oklch(1 0 0);                    /* Main background */
--card: oklch(0.21 0.006 285.885);           /* Card backgrounds */
--popover: oklch(0.21 0.006 285.885);        /* Popover backgrounds */
--muted: oklch(0.967 0.001 286.375);         /* Muted backgrounds */

/* Foreground & Text */
--foreground: oklch(0.141 0.005 285.823);    /* Primary text */
--card-foreground: oklch(0.985 0 0);         /* Card text */
--muted-foreground: oklch(0.552 0.016 285.938); /* Muted text */

/* Interactive Elements */
--primary: oklch(0.21 0.006 285.885);        /* Primary actions */
--primary-foreground: oklch(0.985 0 0);      /* Primary text */
--secondary: oklch(0.967 0.001 286.375);     /* Secondary actions */
--accent: oklch(0.967 0.001 286.375);        /* Accent elements */

/* Interactive States */
--ring: oklch(0.705 0.015 286.067);          /* Focus rings */
--border: oklch(0.92 0.004 286.32);          /* Borders */
--input: oklch(0.92 0.004 286.32);           /* Input backgrounds */

/* Sidebar System */
--sidebar: oklch(0.985 0 0);                 /* Sidebar background */
--sidebar-foreground: oklch(0.141 0.005 285.823); /* Sidebar text */
--sidebar-primary: oklch(0.488 0.243 264.376); /* Sidebar accents */
--sidebar-accent: oklch(0.274 0.006 286.033); /* Sidebar hover states */
--sidebar-border: oklch(1 0 0 / 10%);       /* Sidebar borders */
```

**Usage Pattern:**
```tsx
// ✅ CORRECT - Using design tokens
<div className="bg-background text-foreground border border-border">
  <button className="bg-primary text-primary-foreground hover:bg-primary/90">
    Action
  </button>
</div>

// ❌ INCORRECT - Hardcoded values
<div className="bg-white text-gray-900 border border-gray-200">
  <button className="bg-blue-600 text-white hover:bg-blue-700">
    Action
  </button>
</div>
```

### 1.2 Component Architecture Patterns
**Presentation Layer Structure:**
```
src/features/[feature]/presentation/
├── components/           # UI components
│   ├── [component].tsx
│   └── [component].tsx
├── hooks/               # Component-specific hooks
│   ├── use-[component].tsx
│   └── use-[component]-context.tsx
├── contexts/            # React contexts for state management
├── utils/              # Component utilities
└── types/              # Component-specific types
```

**Component Naming Convention:**
- **Base Components**: `Button`, `Input`, `Card`
- **Feature Components**: `[Feature][Component]` (e.g., `BoardCard`, `AuthForm`)
- **Layout Components**: `[Purpose]Layout` (e.g., `DashboardLayout`, `SidebarLayout`)
- **Page Components**: `[Page]Page` (e.g., `BoardsPage`, `DashboardPage`)

## 2. Shadcn UI Integration Protocol

### 2.1 Component Usage Guidelines
**Import Pattern:**
```tsx
// ✅ CORRECT - Direct from @/components/ui
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { SidebarProvider } from "@/components/ui/sidebar"
```

**Props Pattern:**
```tsx
// ✅ CORRECT - Using component variants
<Button variant="default" size="sm">
  Click me
</Button>

// ❌ INCORRECT - Overriding with custom classes
<Button className="bg-blue-500 text-white px-4 py-2">
  Click me
</Button>
```

### 2.2 Block-Based Development
**Key Shadcn UI Blocks for Igniter Tasks:**
- **Sidebar Blocks**: `sidebar-01`, `sidebar-07`, `sidebar-03`
- **Authentication**: `login-03`, `login-04`
- **Dashboard**: `dashboard-01`, `dashboard-05`
- **Forms**: `form-01`, `form-02`
- **Modals**: `dialog-01`, `dialog-02`

**Block Implementation Pattern:**
```tsx
// 1. Install block
npx shadcn add dashboard-01

// 2. Analyze generated components
await analyze_file({
  filePath: "src/components/app-sidebar.tsx",
  includeErrors: true
});

// 3. Adapt to project structure
// Move to appropriate feature directory
// Update with project-specific styling
// Integrate with Igniter.js patterns
```

## 3. User Experience Optimization Protocol

### 3.1 Loading States & Skeleton Patterns
**Mandatory Loading Implementation:**
```tsx
// ✅ CORRECT - Using Skeleton components
import { Skeleton } from "@/components/ui/skeleton"

function BoardCardSkeleton() {
  return (
    <Card>
      <CardContent className="p-6">
        <Skeleton className="h-4 w-3/4 mb-2" />
        <Skeleton className="h-3 w-1/2" />
      </CardContent>
    </Card>
  )
}

// ❌ INCORRECT - Basic spinner
<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
```

**Loading State Hierarchy:**
1. **Skeleton Loaders**: For content-heavy components
2. **Progressive Loading**: Load critical content first
3. **Optimistic Updates**: Immediate UI feedback for user actions

### 3.2 Error Handling & Recovery
**Error Boundary Pattern:**
```tsx
// ✅ CORRECT - Comprehensive error handling
import { Alert, AlertDescription } from "@/components/ui/alert"

function BoardError({ error, retry }) {
  return (
    <Alert variant="destructive">
      <AlertDescription>
        Failed to load boards.{" "}
        <Button variant="link" onClick={retry}>
          Try again
        </Button>
      </AlertDescription>
    </Alert>
  )
}
```

**Error Recovery Strategies:**
- **Retry Mechanisms**: Automatic retry for network failures
- **Fallback UI**: Graceful degradation for failed components
- **User Guidance**: Clear error messages with actionable steps

### 3.3 Accessibility (WCAG 2.1 AA)
**Mandatory Accessibility Features:**
```tsx
// ✅ CORRECT - Accessible components
<button
  aria-label="Create new board"
  aria-describedby="create-board-description"
>
  <PlusIcon aria-hidden="true" />
  New Board
</button>

// ✅ CORRECT - Screen reader support
<div role="status" aria-live="polite">
  Board created successfully
</div>
```

## 4. Layout & Navigation Patterns

### 4.1 Sidebar Layout Integration
**SidebarProvider Integration:**
```tsx
// ✅ CORRECT - Proper sidebar setup
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar"

export default function AppLayout({ children }) {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header>{/* Header content */}</header>
        <main>{children}</main>
      </SidebarInset>
    </SidebarProvider>
  )
}
```

**Responsive Sidebar Pattern:**
```tsx
// ✅ CORRECT - Mobile-first sidebar
function AppSidebar() {
  return (
    <Sidebar collapsible="offcanvas">
      <SidebarHeader>
        {/* Logo and branding */}
      </SidebarHeader>
      <SidebarContent>
        {/* Navigation items */}
      </SidebarContent>
      <SidebarFooter>
        {/* User menu */}
      </SidebarFooter>
    </Sidebar>
  )
}
```

### 4.2 Breadcrumb Navigation
**Breadcrumb Implementation:**
```tsx
// ✅ CORRECT - Consistent breadcrumb pattern
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbPage } from "@/components/ui/breadcrumb"

function BoardBreadcrumb({ boardName }) {
  return (
    <Breadcrumb>
      <BreadcrumbItem>
        <BreadcrumbLink href="/app">Dashboard</BreadcrumbLink>
      </BreadcrumbItem>
      <BreadcrumbSeparator />
      <BreadcrumbItem>
        <BreadcrumbPage>{boardName}</BreadcrumbPage>
      </BreadcrumbItem>
    </Breadcrumb>
  )
}
```

## 5. Form & Data Entry Patterns

### 5.1 Form Validation & Error Handling
**Form Pattern:**
```tsx
// ✅ CORRECT - Comprehensive form handling
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"

const formSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
})

function CreateBoardForm() {
  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: { title: "", description: "" }
  })

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Title</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </form>
    </Form>
  )
}
```

### 5.2 Data Display Patterns
**Table/List Pattern:**
```tsx
// ✅ CORRECT - Consistent data display
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

function BoardsTable({ boards }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Created</TableHead>
          <TableHead>Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {boards.map(board => (
          <TableRow key={board.id}>
            <TableCell>{board.title}</TableCell>
            <TableCell>{formatDate(board.createdAt)}</TableCell>
            <TableCell>
              <Button variant="ghost" size="sm">
                Edit
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
```