---
applyTo: '**'
---
# Form Building Guide for Igniter.js Applications

This guide outlines the best practices, patterns, and techniques for building robust, type-safe forms in applications using the Igniter.js framework with Next.js, React Hook Form, Zod, and Shadcn UI.

## Table of Contents

* [Core Form Philosophy](#core-form-philosophy)
* [Form Architecture](#form-architecture)
* [Form Components](#form-components)
* [Form Validation](#form-validation)
* [Form Submission](#form-submission)
* [Form State Management](#form-state-management)
* [Error Handling](#error-handling)
* [Advanced Form Patterns](#advanced-form-patterns)
* [Best Practices](#best-practices)

## Core Form Philosophy

Igniter.js forms follow these core principles:

* **Type Safety**: End-to-end type safety from schema definition to form submission
* **Validation First**: Schema-based validation using Zod
* **Component Composition**: Forms built from composable, reusable components
* **Error Resilience**: Comprehensive error handling and user feedback
* **Performance Optimized**: Forms that maintain performance even with complex validation
* **Accessibility**: ARIA-compliant forms that work for all users

## Form Architecture

### Key Components in the Form System

1. **Schema Definition**: Using Zod to define form shape and validation rules
2. **Form Hook**: `useFormWithZod` custom hook for connecting Zod schemas to React Hook Form
3. **Form Components**: Shadcn UI form primitives for consistent UI/UX
4. **Form State Management**: React Hook Form for handling form state
5. **Form Submission**: Integration with Igniter.js mutations for API calls

### Diagram of Form Data Flow

```
┌────────────┐     ┌───────────────┐     ┌───────────────┐
│            │     │               │     │               │
│  Zod       │────▶│  React Hook   │────▶│  Form         │
│  Schema    │     │  Form         │     │  Components   │
│            │     │               │     │               │
└────────────┘     └───────────────┘     └───────────────┘
                          │                      │
                          │                      │
                          ▼                      ▼
┌────────────┐     ┌───────────────┐     ┌───────────────┐
│            │     │               │     │               │
│  Igniter   │◀────│  Form         │◀────│  User         │
│  Mutation  │     │  Submission   │     │  Input        │
│            │     │               │     │               │
└────────────┘     └───────────────┘     └───────────────┘
       │
       │
       ▼
┌────────────┐
│            │
│  User      │
│  Feedback  │
│            │
└────────────┘
```

## Form Components

### Base Form Components

Igniter.js applications use Shadcn UI's form components as building blocks:

```tsx
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
```

### Form Container

Every form starts with the `Form` component that wraps the form elements:

```tsx
<Form {...form}>
  <form onSubmit={form.onSubmit} className="space-y-4 py-4">
    {/* Form fields go here */}
  </form>
</Form>
```

### Form Fields

Form fields follow this consistent pattern:

```tsx
<FormField
  control={form.control}
  name="fieldName"
  render={({ field }) => (
    <FormItem>
      <FormLabel>Field Label</FormLabel>
      <FormControl>
        <Input {...field} />
      </FormControl>
      <FormMessage />
    </FormItem>
  )}
/>
```

### Field Types

#### Text Input

```tsx
<FormField
  control={form.control}
  name="title"
  render={({ field }) => (
    <FormItem>
      <FormLabel>Title</FormLabel>
      <FormControl>
        <Input placeholder="Enter title..." {...field} />
      </FormControl>
      <FormMessage />
    </FormItem>
  )}
/>
```

#### Text Area

```tsx
<FormField
  control={form.control}
  name="description"
  render={({ field }) => (
    <FormItem>
      <FormLabel>Description</FormLabel>
      <FormControl>
        <Textarea
          placeholder="Enter description..."
          {...field}
        />
      </FormControl>
      <FormMessage />
    </FormItem>
  )}
/>
```

#### Date Picker

```tsx
<FormField
  control={form.control}
  name="dueDate"
  render={({ field }) => (
    <FormItem className="flex flex-col">
      <FormLabel>Due Date</FormLabel>
      <Popover>
        <PopoverTrigger asChild>
          <FormControl>
            <Button
              variant="outline"
              className={cn(
                'w-full pl-3 text-left font-normal',
                !field.value && 'text-muted-foreground'
              )}
            >
              {field.value ? (
                format(field.value, 'PPP')
              ) : (
                <span>Pick a date</span>
              )}
              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
            </Button>
          </FormControl>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={field.value ? new Date(field.value) : undefined}
            onSelect={field.onChange}
            disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
            initialFocus
          />
        </PopoverContent>
      </Popover>
      <FormMessage />
    </FormItem>
  )}
/>
```

#### Select Field

```tsx
<FormField
  control={form.control}
  name="category"
  render={({ field }) => (
    <FormItem>
      <FormLabel>Category</FormLabel>
      <Select onValueChange={field.onChange} defaultValue={field.value}>
        <FormControl>
          <SelectTrigger>
            <SelectValue placeholder="Select a category" />
          </SelectTrigger>
        </FormControl>
        <SelectContent>
          <SelectItem value="work">Work</SelectItem>
          <SelectItem value="personal">Personal</SelectItem>
          <SelectItem value="education">Education</SelectItem>
        </SelectContent>
      </Select>
      <FormMessage />
    </FormItem>
  )}
/>
```

#### Checkbox

```tsx
<FormField
  control={form.control}
  name="isCompleted"
  render={({ field }) => (
    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
      <FormControl>
        <Checkbox
          checked={field.value}
          onCheckedChange={field.onChange}
        />
      </FormControl>
      <div className="space-y-1 leading-none">
        <FormLabel>Completed</FormLabel>
        <FormDescription>
          Mark this task as completed
        </FormDescription>
      </div>
    </FormItem>
  )}
/>
```

## Form Validation

### Zod Schema Definition

Define validation schemas using Zod:

```typescript
const schema = z.object({
  id: z.string().optional(),
  title: z.string().min(3, 'Title must be at least 3 characters'),
  description: z.string().optional(),
  dueDate: z.date().transform(value => value.toISOString()).optional(),
  priority: z.enum(['low', 'medium', 'high']).default('medium'),
  isCompleted: z.boolean().default(false),
})

type FormValues = z.infer<typeof schema>
```

### Common Validation Patterns

#### Required Fields

```typescript
z.string().min(1, 'This field is required')
```

#### Email Validation

```typescript
z.string().email('Please enter a valid email address')
```

#### Number Validation

```typescript
z.number().min(0, 'Value must be positive').max(100, 'Value must be at most 100')
```

#### Date Validation

```typescript
z.date()
  .min(new Date(), 'Date must be in the future')
  .transform(value => value.toISOString())
```

#### Conditional Validation

```typescript
z.object({
  hasDeadline: z.boolean(),
  deadline: z.date().optional().superRefine((val, ctx) => {
    if (ctx.parent.hasDeadline && !val) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Deadline is required when "Has Deadline" is checked',
      });
    }
  }),
})
```

## Form Submission

### Using Custom Hook

The `useFormWithZod` custom hook simplifies form creation and submission:

```typescript
const form = useFormWithZod({
  schema: schema,
  defaultValues: defaultValues || { title: '', description: '' },
  onSubmit: async (values) => {
    // Handle form submission
    const result = await tryCatch(mutation.mutate({ body: values }))
    
    if (result.error) {
      toast.error('Error submitting form. Please try again.')
      return
    }
    
    toast.success('Form submitted successfully!')
    // Additional success handling
  }
})
```

### Using Igniter.js Mutations

```typescript
const upsertMutation = api.task.upsert.useMutation()

// In form submission handler
const result = await tryCatch(upsertMutation.mutate({ 
  body: formValues 
}))
```

### Form Submission States

Handle different form submission states:

```typescript
<Button 
  type="submit" 
  disabled={form.formState.isSubmitting || !form.formState.isValid}
>
  {form.formState.isSubmitting ? (
    <>
      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      Submitting...
    </>
  ) : (
    <>
      Submit
      <ArrowRight className="ml-2 h-4 w-4" />
    </>
  )}
</Button>
```

## Form State Management

### Using useFormWithZod

```typescript
import { useFormWithZod } from '@/hooks/use-form-with-zod'

const form = useFormWithZod({
  schema: schema,
  defaultValues: {
    title: '',
    description: '',
  },
  onSubmit: (values) => {
    // Form submission logic
  }
})

// Access form state
const { isDirty, isValid, isSubmitting } = form.formState
```

### Form Reset

```typescript
// Reset form to initial values
form.reset()

// Reset form to specific values
form.reset({
  title: 'New Title',
  description: 'New Description'
})
```

### Form Dialog Integration

When using forms inside dialogs, make sure to reset the form when the dialog closes:

```typescript
<Dialog onOpenChange={(open) => {
  if (!open) {
    form.reset()
  }
}}>
  {/* Dialog content and form */}
</Dialog>
```

## Error Handling

### Try-Catch Pattern

Use the `tryCatch` utility to handle form submission errors:

```typescript
import { tryCatch } from '@/utils/try-catch'

// In form submission handler
const result = await tryCatch(upsertMutation.mutate({ body: values }))

if (result.error) {
  toast.error('Error saving task. Please try again.')
  return
}

toast.success('Task created successfully!')
```

### Field-Level Error Handling

Errors are automatically displayed below each field using `FormMessage`:

```tsx
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
```

### Form-Level Error Handling

Display form-level errors:

```tsx
{form.formState.errors.root && (
  <Alert variant="destructive">
    <AlertCircle className="h-4 w-4" />
    <AlertTitle>Error</AlertTitle>
    <AlertDescription>
      {form.formState.errors.root.message}
    </AlertDescription>
  </Alert>
)}
```

## Advanced Form Patterns

### Dynamic Fields

Using React Hook Form's `useFieldArray`:

```tsx
import { useFieldArray } from "react-hook-form"

// Inside component
const { fields, append, remove } = useFieldArray({
  control: form.control,
  name: "tasks",
})

// In JSX
{fields.map((field, index) => (
  <div key={field.id} className="flex items-center gap-2">
    <FormField
      control={form.control}
      name={`tasks.${index}.title`}
      render={({ field }) => (
        <FormItem className="flex-1">
          <FormControl>
            <Input {...field} />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
    <Button 
      type="button" 
      variant="outline" 
      size="icon"
      onClick={() => remove(index)}
    >
      <Trash2 className="h-4 w-4" />
    </Button>
  </div>
))}

<Button
  type="button"
  variant="outline"
  size="sm"
  onClick={() => append({ title: '' })}
>
  <Plus className="mr-2 h-4 w-4" />
  Add Task
</Button>
```

### Multi-Step Forms

```tsx
function MultiStepForm() {
  const [step, setStep] = useState(0)
  const form = useFormWithZod({
    schema: schema,
    defaultValues: { /* ... */ },
    onSubmit: async (values) => {
      // Submit final form data
    }
  })
  
  const steps = [
    // Step 1: Basic Info
    <div key="basic" className="space-y-4">
      <FormField
        control={form.control}
        name="title"
        render={({ field }) => (/* ... */)}
      />
      {/* More fields */}
    </div>,
    
    // Step 2: Additional Details
    <div key="details" className="space-y-4">
      <FormField
        control={form.control}
        name="description"
        render={({ field }) => (/* ... */)}
      />
      {/* More fields */}
    </div>,
    
    // Step 3: Review
    <div key="review" className="space-y-4">
      {/* Review UI */}
    </div>
  ]
  
  return (
    <Form {...form}>
      <form onSubmit={form.onSubmit} className="space-y-8">
        {steps[step]}
        
        <div className="flex justify-between">
          <Button
            type="button"
            variant="outline"
            onClick={() => setStep(prev => Math.max(0, prev - 1))}
            disabled={step === 0}
          >
            Previous
          </Button>
          
          {step < steps.length - 1 ? (
            <Button
              type="button"
              onClick={() => setStep(prev => Math.min(steps.length - 1, prev + 1))}
            >
              Next
            </Button>
          ) : (
            <Button type="submit">Submit</Button>
          )}
        </div>
      </form>
    </Form>
  )
}
```

### Form with File Upload

```tsx
// Zod schema
const schema = z.object({
  name: z.string(),
  avatar: z.instanceof(File).optional(),
})

// Component
function FileUploadForm() {
  const form = useFormWithZod({
    schema,
    defaultValues: { name: '' },
    onSubmit: async (values) => {
      // Create FormData for submission
      const formData = new FormData()
      formData.append('name', values.name)
      if (values.avatar) {
        formData.append('avatar', values.avatar)
      }
      
      // Submit formData to API
      await uploadMutation.mutate({ formData })
    }
  })
  
  return (
    <Form {...form}>
      <form onSubmit={form.onSubmit} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (/* ... */)}
        />
        
        <FormField
          control={form.control}
          name="avatar"
          render={({ field: { value, onChange, ...field } }) => (
            <FormItem>
              <FormLabel>Profile Picture</FormLabel>
              <FormControl>
                <Input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) onChange(file)
                  }}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <Button type="submit">Upload</Button>
      </form>
    </Form>
  )
}
```

## Cache Invalidation After Form Submission

```typescript
const queryClient = useQueryClient()

// In form submission handler
const handleSubmit = async (values) => {
  const result = await tryCatch(upsertMutation.mutate({ body: values }))
  
  if (result.error) {
    toast.error('Error saving data')
    return
  }
  
  toast.success('Data saved successfully!')
  
  // Invalidate relevant queries to refetch data
  queryClient.invalidate(['task.list'])
  
  // Close modal/dialog
  onClose()
}
```

## Best Practices

### 1. Form Organization

* Keep form components focused on a single purpose
* Extract complex form logic into custom hooks
* Group related fields together
* Use consistent spacing and layout for all forms

### 2. Performance Optimization

* Use form validation modes appropriately:
  - `onChange`: Validates as user types (best for simple forms)
  - `onBlur`: Validates when field loses focus (better UX for most forms)
  - `onSubmit`: Validates only on submit (best for complex forms)

```typescript
const form = useFormWithZod({
  schema: schema,
  defaultValues: { /* ... */ },
  mode: 'onBlur', // or 'onChange', 'onSubmit'
})
```

* Debounce validation for text inputs:

```typescript
<Input
  {...field}
  onChange={(e) => {
    clearTimeout(timeout.current)
    timeout.current = setTimeout(() => {
      field.onChange(e)
    }, 300)
  }}
/>
```

### 3. Accessibility

* Always use `FormLabel` for form inputs
* Ensure form controls have appropriate ARIA attributes
* Provide clear error messages
* Make forms keyboard navigable
* Use `fieldset` and `legend` for groups of related inputs

```tsx
<fieldset className="border rounded-md p-4">
  <legend className="text-sm font-medium px-2">Contact Information</legend>
  {/* Form fields */}
}
</fieldset>
```

### 4. Error Prevention

* Provide clear validation messages
* Use placeholder text to guide users
* Implement input masks for formatted fields
* Show validation feedback as users type
* Confirm destructive actions

### 5. Reusability

Create custom form field components for common patterns:

```tsx
function FormTextField({ name, label, placeholder, ...props }) {
  return (
    <FormField
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel>{label}</FormLabel>
          <FormControl>
            <Input placeholder={placeholder} {...field} {...props} />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  )
}

// Usage
<FormTextField name="title" label="Title" placeholder="Enter a title" />
```

### 6. Testing

* Test form validation with valid and invalid inputs
* Test form submission with mock API calls
* Test form reset functionality
* Test form accessibility using jest-axe or similar tools

## Complete Example: Task Form

Here's a complete example of a task creation/editing form:

```tsx
'use client'

import * as z from 'zod'
import { useRef } from 'react'
import { format } from 'date-fns'
import { toast } from 'sonner'
import { api, useQueryClient } from '@/igniter.client'
import { useFormWithZod } from '@/hooks/use-form-with-zod'
import { tryCatch } from '@/utils/try-catch'
import { Task } from '../../task.interface'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { ArrowRight, CalendarIcon, Trash2 } from 'lucide-react'

// 1. Define form schema
const schema = z.object({
  id: z.string().optional(),
  title: z.string().min(3, 'Title must be at least 3 characters'),
  description: z.string().optional(),
  dueDate: z.date().transform(value => value.toISOString()).optional(),
})

type TaskDialogProps = {
  defaultValues?: Task;
  children: React.ReactNode;
}

export function TaskDialog({ defaultValues, children }: TaskDialogProps) {
  // 2. Setup references and API
  const triggerRef = useRef<HTMLDivElement>(null)
  const queryClient = useQueryClient()
  const upsertMutation = api.task.upsert.useMutation()
  const deleteMutation = api.task.delete.useMutation()

  // 3. Initialize form with Zod
  const form = useFormWithZod({
    schema: schema,
    defaultValues: defaultValues || { title: '', description: '' },
    onSubmit: async (values) => {
      const result = await tryCatch(upsertMutation.mutate({ body: values }))

      if (result.error) {
        toast.error('Error saving task. Please try again.')
        return
      }

      if (values.id) toast.success('Task updated successfully!')
      if (!values.id) toast.success('Task created successfully!')

      // 4. Invalidate queries to refetch data
      queryClient.invalidate(['task.list'])
      form.reset()
      triggerRef.current?.click() // Close dialog
    }
  })

  // 5. Handle delete action
  const handleDelete = async (task: Task) => {
    const result = await tryCatch(deleteMutation.mutate({ params: { id: task.id } }))
    
    if (result.error) {
      toast.error('Error deleting task. Please try again.')
      return
    }

    toast.success('Task deleted successfully!')
    queryClient.invalidate(['task.list'])
    triggerRef.current?.click() // Close dialog
  }

  // 6. Render form
  return (
    <Dialog onOpenChange={() => form.reset()}>
      <DialogTrigger asChild>
        <div ref={triggerRef}>
          {children}
        </div>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            {defaultValues ? 'Edit Task' : 'Create Task'}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.onSubmit} className="space-y-4 py-4">
            {/* Title field */}
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <FormControl>
                    <Input placeholder="Task title..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Description field */}
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Task description..."
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Due Date field */}
            <FormField
              control={form.control}
              name="dueDate"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Due Date</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          className={cn(
                            'w-full pl-3 text-left font-normal',
                            !field.value && 'text-muted-foreground'
                          )}
                        >
                          {field.value ? (
                            format(field.value, 'PPP')
                          ) : (
                            <span>Pick a date</span>
                          )}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value ? new Date(field.value) : undefined}
                        onSelect={field.onChange}
                        disabled={(date) =>
                          date < new Date(new Date().setHours(0, 0, 0, 0))
                        }
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />
          </form>
        </Form>

        {/* Action buttons */}
        <DialogFooter className="sm:justify-between">
          <Button type="submit" onClick={form.onSubmit}>
            {defaultValues ? 'Update' : 'Create'}
            <ArrowRight className="ml-2" />
          </Button>
          {defaultValues && (
            <Button variant="destructive" onClick={() => handleDelete(defaultValues)}>
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
```

This example demonstrates:
- Schema definition with Zod
- Form state management with useFormWithZod
- Form field rendering with shadcn/ui components
- Form submission with error handling
- Cache invalidation after successful submission
- Delete functionality with confirmation
- Dialog integration with proper state management

## Conclusion

By following these guidelines and patterns, you can build robust, type-safe, and user-friendly forms in your Igniter.js applications. Proper form implementation not only improves the developer experience but also significantly enhances the user experience by providing clear validation feedback and smooth interactions.

Remember that forms are often the primary way users interact with your application, so investing time in creating high-quality form experiences pays significant dividends in user satisfaction and engagement.