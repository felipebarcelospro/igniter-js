# Shadcn UI Component Creation Guide

## Overview

This guide helps create React components following Shadcn UI's patterns and best practices. The process ensures type-safety, accessibility, and consistent styling.

## Component Structure Template

```typescript
"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

// Import any necessary Radix UI primitives
import * as ComponentPrimitive from "@radix-ui/react-component-name"

// Define component props interface
interface ComponentProps {
  // Props definition
}

// Define context if needed
const ComponentContext = React.createContext<ComponentContextProps | null>(null)

// Create hook if needed
function useComponent() {
  const context = React.useContext(ComponentContext)
  if (!context) {
    throw new Error("useComponent must be used within a <Component />")
  }
  return context
}

// Main component using forwardRef
const Component = React.forwardRef<HTMLElement, ComponentProps>(
  ({ className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn("base-styles", className)}
        {...props}
      />
    )
  }
)
Component.displayName = "Component"

// Export all parts
export {
  Component,
  useComponent, // if hook exists
  // Additional exports
}
```

## Step-by-Step Process

1. **Component Analysis**

   - Identify the core functionality
   - List required props and types
   - Determine if context/hooks are needed
   - Identify sub-components

2. **Dependencies Setup**

   - Import React and utilities
   - Import Radix UI primitives if needed
   - Import other required dependencies

3. **Type Definitions**

   - Define component props interface
   - Define context types if needed
   - Use VariantProps for styling variants

4. **Component Implementation**

   - Use forwardRef for ref forwarding
   - Implement proper className merging
   - Add proper displayName
   - Ensure accessibility features

5. **Styling Integration**
   - Use cn utility for className merging
   - Implement variants using cva if needed
   - Follow Tailwind CSS conventions

## Example Prompt

To convert a component to Shadcn UI style, use this prompt structure:

```
Please help me convert this component to follow Shadcn UI patterns:

Context:
- Component name: [Name]
- Core functionality: [Description]
- Required features: [List]
- Dependencies needed: [List]

Requirements:
1. Follow Shadcn UI's component structure
2. Implement proper TypeScript types
3. Include Radix UI primitives if needed
4. Ensure accessibility
5. Use Tailwind CSS for styling
6. Add proper documentation

Current component code:
[Paste your component code here]
```

## Best Practices

1. **Type Safety**

   ```typescript
   // Use specific types
   type ButtonVariant = "default" | "outline" | "ghost";

   // Avoid any
   function handleClick(event: React.MouseEvent<HTMLButtonElement>) {
     // Implementation
   }
   ```

2. **Accessibility**

   ```typescript
   // Include ARIA attributes
   <button
     aria-label="Close"
     aria-expanded={isOpen}
     onClick={handleClick}
   />
   ```

3. **Styling**

   ```typescript
   // Use cva for variants
   const componentVariants = cva("base-styles", {
     variants: {
       variant: {
         default: "default-styles",
         outline: "outline-styles",
       },
     },
     defaultVariants: {
       variant: "default",
     },
   });
   ```

4. **Context Usage**

   ```typescript
   // Create context with null check
   const ComponentContext = React.createContext<ComponentContextProps | null>(
     null,
   );

   // Implement useComponent hook
   function useComponent() {
     const context = React.useContext(ComponentContext);
     if (!context) {
       throw new Error("useComponent must be used within <Component />");
     }
     return context;
   }
   ```

## Examples Reference

1. **Button Component**: See @button.tsx for basic component structure
2. **Tabs Component**: See @tabs.tsx for complex component with multiple parts
3. **Animated Tabs**: See @animated-tabs.tsx for advanced animation integration
4. **Scroll Area**: See @scroll-area.tsx for Radix UI primitive usage

## Common Patterns

1. **Component Composition**

   ```typescript
   const Root = Component;
   const Item = ComponentItem;
   const Trigger = ComponentTrigger;

   export { Root, Item, Trigger };
   ```

2. **Variant Handling**

   ```typescript
   interface Props extends VariantProps<typeof componentVariants> {
     // Additional props
   }
   ```

3. **Ref Forwarding**
   ```typescript
   const Component = React.forwardRef<HTMLElement, Props>(
     ({ className, ...props }, ref) => {
       // Implementation
     },
   );
   ```

Remember to maintain consistency with Shadcn UI's existing components and follow their established patterns for the best integration experience.
