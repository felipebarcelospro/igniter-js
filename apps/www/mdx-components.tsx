import Link from "next/link";
import { cn } from "@/lib/utils";
import type { MDXComponents } from "mdx/types";
import React, { DetailedHTMLProps, HTMLAttributes, ReactNode } from "react";
import { Copy, ExternalLink, Info, AlertTriangle, CheckCircle, XCircle, Lightbulb, Zap, FileText, Terminal, ArrowRight } from "lucide-react";
import {
  Accordion,
  Expandable,
  Panel,
  Frame,
  CodeGroup,
  Code,
  Tooltip,
  Update,
  Field,
  Example,
  Columns,
  Column,
  Mermaid,
  Snippet
} from "@/components/mdx";

// Type definitions
type HeadingProps = DetailedHTMLProps<HTMLAttributes<HTMLHeadingElement>, HTMLHeadingElement>;
type ParagraphProps = DetailedHTMLProps<HTMLAttributes<HTMLParagraphElement>, HTMLParagraphElement>;
type PreProps = DetailedHTMLProps<HTMLAttributes<HTMLPreElement>, HTMLPreElement>;
type CodeProps = DetailedHTMLProps<HTMLAttributes<HTMLElement>, HTMLElement>;
type UListProps = DetailedHTMLProps<HTMLAttributes<HTMLUListElement>, HTMLUListElement>;
type OListProps = DetailedHTMLProps<HTMLAttributes<HTMLOListElement>, HTMLOListElement>;
type ListItemProps = DetailedHTMLProps<HTMLAttributes<HTMLLIElement>, HTMLLIElement>;
type AnchorProps = DetailedHTMLProps<HTMLAttributes<HTMLAnchorElement>, HTMLAnchorElement> & {
  href?: string;
};
type BlockquoteProps = DetailedHTMLProps<HTMLAttributes<HTMLQuoteElement>, HTMLQuoteElement>;
type DivProps = DetailedHTMLProps<HTMLAttributes<HTMLDivElement>, HTMLDivElement>;

// Copy button component
const CopyButton = ({ text }: { text: string }) => {
  return (
    <button
      className="absolute top-3 right-3 p-2 rounded-md bg-secondary/80 hover:bg-secondary transition-colors opacity-0 group-hover:opacity-100"
      aria-label="Copy code"
    >
      <Copy className="h-4 w-4 text-secondary-foreground" />
    </button>
  );
};

// Callout component for special content blocks
const Callout = ({ children, type = "info", title, icon: Icon, ...props }: {
  children: ReactNode;
  type?: "info" | "warning" | "error" | "success" | "tip" | "note";
  title?: string;
  icon?: React.ComponentType<{ className?: string }>;
} & DivProps) => {
  const configs = {
    info: {
      icon: Icon || Info,
      className: "border-border/60 bg-accent/30",
      iconClassName: "text-primary",
      titleClassName: "text-foreground"
    },
    warning: {
      icon: Icon || AlertTriangle,
      className: "border-destructive/40 bg-destructive/10",
      iconClassName: "text-destructive",
      titleClassName: "text-foreground"
    },
    error: {
      icon: Icon || XCircle,
      className: "border-destructive/60 bg-destructive/20",
      iconClassName: "text-destructive",
      titleClassName: "text-destructive-foreground"
    },
    success: {
      icon: Icon || CheckCircle,
      className: "border-border/60 bg-secondary/50",
      iconClassName: "text-primary",
      titleClassName: "text-foreground"
    },
    tip: {
      icon: Icon || Lightbulb,
      className: "border-border/60 bg-muted/50",
      iconClassName: "text-primary",
      titleClassName: "text-foreground"
    },
    note: {
      icon: Icon || FileText,
      className: "border-border/40 bg-muted/30",
      iconClassName: "text-muted-foreground",
      titleClassName: "text-foreground"
    }
  };

  const config = configs[type];
  const IconComponent = config.icon;

  return (
    <div
      className={cn(
        "my-6 rounded-lg border p-4 backdrop-blur-sm",
        config.className
      )}
      {...props}
    >
      <div className="flex gap-3">
        <IconComponent className={cn("h-5 w-5 mt-0.5 flex-shrink-0", config.iconClassName)} />
        <div className="flex-1 space-y-2">
          {title && (
            <div className={cn("font-semibold text-sm", config.titleClassName)}>
              {title}
            </div>
          )}
          <div className="text-sm leading-relaxed text-foreground/80 [&>p:first-child]:mb-0">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
};

// Card component for feature highlights
const Card = ({ children, title, icon: Icon, href, ...props }: {
  children?: ReactNode;
  title?: string;
  icon?: React.ComponentType<{ className?: string }>;
  href?: string;
} & DivProps) => {
  const content = (
    <div
      className={cn(
        "group relative rounded-lg border border-border bg-card p-6 transition-all duration-200",
        "hover:shadow-md hover:border-border/80",
        href && "cursor-pointer hover:bg-accent/50"
      )}
      {...props}
    >
      {Icon && (
        <div className="mb-4">
          <div className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <Icon className="h-5 w-5 text-primary" />
          </div>
        </div>
      )}
      {title && (
        <h3 className="mb-2 font-semibold text-foreground group-hover:text-primary transition-colors">
          {title}
          {href && <ArrowRight className="inline ml-2 h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity" />}
        </h3>
      )}
      {children && (
        <div className="text-sm text-muted-foreground leading-relaxed [&>p:first-child]:mb-0">
          {children}
        </div>
      )}
    </div>
  );

  if (href) {
    if (href.startsWith('http')) {
      return (
        <a href={href} target="_blank" rel="noopener noreferrer" className="block">
          {content}
        </a>
      );
    }
    return (
      <Link href={href} className="block">
        {content}
      </Link>
    );
  }

  return content;
};

export function useMDXComponents(components: MDXComponents): MDXComponents {
  return {
    // Headings with improved typography and spacing
    h1: ({ children, ...props }: HeadingProps) => (
      <h1
        className={cn(
          "scroll-m-20 text-4xl font-bold tracking-tight mb-8 mt-2",
          "bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent"
        )}
        {...props}
      >
        {children}
      </h1>
    ),

    h2: ({ children, ...props }: HeadingProps) => (
      <h2
        className={cn(
          "scroll-m-20 border-b border-border/40 pb-3 text-3xl font-semibold tracking-tight",
          "mt-16 mb-6 first:mt-0"
        )}
        {...props}
      >
        {children}
      </h2>
    ),

    h3: ({ children, ...props }: HeadingProps) => (
      <h3
        className="scroll-m-20 text-2xl font-semibold tracking-tight mt-12 mb-4 first:mt-0"
        {...props}
      >
        {children}
      </h3>
    ),

    h4: ({ children, ...props }: HeadingProps) => (
      <h4
        className="scroll-m-20 text-xl font-semibold tracking-tight mt-8 mb-3"
        {...props}
      >
        {children}
      </h4>
    ),

    h5: ({ children, ...props }: HeadingProps) => (
      <h5
        className="scroll-m-20 text-lg font-semibold tracking-tight mt-6 mb-2"
        {...props}
      >
        {children}
      </h5>
    ),

    h6: ({ children, ...props }: HeadingProps) => (
      <h6
        className="scroll-m-20 text-base font-semibold tracking-tight mt-4 mb-2"
        {...props}
      >
        {children}
      </h6>
    ),

    // Enhanced paragraph with better readability
    p: ({ children, ...props }: ParagraphProps) => (
      <p
        className="leading-7 text-foreground/80 mb-6 [&:not(:first-child)]:mt-6"
        {...props}
      >
        {children}
      </p>
    ),

    // Enhanced blockquote with modern styling
    blockquote: ({ children, ...props }: BlockquoteProps) => (
      <blockquote
        className={cn(
          "mt-6 border-l-4 border-primary/30 pl-6 italic text-foreground/80",
          "bg-muted/30 py-4 pr-4 rounded-r-lg"
        )}
        {...props}
      >
        {children}
      </blockquote>
    ),

    // Improved lists with better spacing and styling
    ul: ({ children, ...props }: UListProps) => {
      // Check if this is a card grid (special case)
      const isCardGrid = React.Children.toArray(children).some(child =>
        React.isValidElement(child) &&
        child.props?.className?.includes('card-item')
      );

      if (isCardGrid) {
        const { ref, ...divProps } = props as any;
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 my-8" {...divProps}>
            {React.Children.map(children, (child, index) =>
              React.isValidElement(child)
                ? React.cloneElement(child, { key: index })
                : child
            )}
          </div>
        );
      }

      return (
        <ul className="my-6 ml-6 list-disc space-y-2 [&>li]:mt-2" {...props}>
          {children}
        </ul>
      );
    },

    ol: ({ children, ...props }: OListProps) => (
      <ol className="my-6 ml-6 list-decimal space-y-2 [&>li]:mt-2" {...props}>
        {children}
      </ol>
    ),

    // Enhanced list items with special handling
    li: ({ children, ...props }: ListItemProps) => {
      // Handle task list items
      if (props.className?.includes("task-list-item")) {
        return (
          <li className="flex items-center gap-2 list-none ml-0" {...props}>
            {children}
          </li>
        );
      }

      // Handle card items
      if (props.className?.includes("card-item")) {
        const { ref, ...divProps } = props as any;
        return (
          <div className="list-none" {...divProps}>
            {children}
          </div>
        );
      }

      // Check for feature list items (strong + description pattern)
      const childArray = React.Children.toArray(children);
      const hasStrongWithColon =
        React.isValidElement(childArray[0]) &&
        childArray[0].type === "strong" &&
        String(childArray[1]).startsWith(": ");

      if (hasStrongWithColon) {
        const [strongElement, ...restContent] = childArray;
        const textContent = restContent.join("").replace(/^:\s*/, "");

        return (
          <li className="list-none ml-0 mb-4" {...props}>
            <div className="rounded-lg border border-border bg-card p-4 transition-colors hover:bg-accent/50">
              <div className="font-semibold text-foreground mb-1">
                {strongElement}
              </div>
              <div className="text-sm text-muted-foreground leading-relaxed">
                {textContent}
              </div>
            </div>
          </li>
        );
      }

      return (
        <li className="text-foreground/80" {...props}>
          {children}
        </li>
      );
    },

    // Enhanced links with better visual feedback
    a: ({ children, href = "", ...props }: AnchorProps) => {
      const isExternal = href.startsWith("http");

      const linkClasses = cn(
        "font-medium text-primary underline-offset-4 hover:underline",
        "transition-colors duration-200",
        isExternal && "inline-flex items-center gap-1"
      );

      if (isExternal) {
        return (
          <a
            href={href}
            className={linkClasses}
            target="_blank"
            rel="noopener noreferrer"
            {...props}
          >
            {children}
            <ExternalLink className="h-3 w-3" />
          </a>
        );
      }

      return (
        <Link href={href} className={linkClasses} {...props}>
          {children}
        </Link>
      );
    },

    // Enhanced code blocks with syntax highlighting and copy functionality
    pre: ({ children, ...props }: PreProps) => {
      const codeContent = React.isValidElement(children) && children.props?.children
        ? String(children.props.children)
        : String(children);

      return (
        <div className="group relative my-6">
          <div className="overflow-hidden rounded-lg border border-border bg-muted/30">
            {/* Header with copy button */}
            <div className="flex items-center justify-between border-b border-border bg-muted/50 px-4 py-3">
              <div className="flex items-center gap-2">
                <Terminal className="h-4 w-4 text-muted-foreground" />
                <span className="text-xs font-medium text-muted-foreground">Code</span>
              </div>
              <CopyButton text={codeContent} />
            </div>

            {/* Code content */}
            <pre
              className={cn(
                "overflow-x-auto p-4 text-sm leading-relaxed",
                "bg-background/50 backdrop-blur-sm"
              )}
              {...props}
            >
              {React.Children.map(children, (child, index) =>
                React.isValidElement(child)
                  ? React.cloneElement(child, {
                      key: `code-${index}`,
                      className: cn((child.props as any)?.className, "font-mono"),
                    } as any)
                  : child
              )}
            </pre>
          </div>
        </div>
      );
    },

    // Inline code with better styling
    code: ({ children, className, ...props }: CodeProps) => {
      // Don't style code inside pre blocks
      if (className?.includes("hljs")) {
        return <code className={className} {...props}>{children}</code>;
      }

      return (
        <code
          className={cn(
            "relative rounded-md bg-muted px-[0.3rem] py-[0.2rem] font-mono text-sm font-medium",
            "border border-border/50",
            className
          )}
          {...props}
        >
          {children}
        </code>
      );
    },

    // Enhanced tables with modern styling
    table: ({ children, ...props }) => (
      <div className="my-8 w-full overflow-hidden rounded-lg border border-border">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse bg-background" {...props}>
            {children}
          </table>
        </div>
      </div>
    ),

    thead: ({ children, ...props }) => (
      <thead className="bg-muted/50" {...props}>
        {children}
      </thead>
    ),

    tbody: ({ children, ...props }) => (
      <tbody className="[&_tr:last-child]:border-0" {...props}>
        {children}
      </tbody>
    ),

    tr: ({ children, ...props }) => (
      <tr
        className="border-b border-border transition-colors hover:bg-muted/30"
        {...props}
      >
        {children}
      </tr>
    ),

    th: ({ children, ...props }) => (
      <th
        className={cn(
          "h-12 px-4 text-left align-middle font-semibold text-foreground",
          "[&:has([role=checkbox])]:pr-0"
        )}
        {...props}
      >
        {children}
      </th>
    ),

    td: ({ children, ...props }) => (
      <td
        className="p-4 align-middle text-foreground/80 [&:has([role=checkbox])]:pr-0"
        {...props}
      >
        {children}
      </td>
    ),

    // Horizontal rule with better styling
    hr: ({ ...props }) => (
      <hr className="my-8 border-border" {...props} />
    ),

    // Custom components for enhanced documentation
    Callout,
    Card,

    // Mintlify Components
    Accordion,
    Expandable,
    Panel,
    Frame,
    CodeGroup,
    Code,
    Tooltip,
    Update,
    Field,
    Example,
    Columns,
    Column,
    Snippet,

    // Utility components
    Steps: ({ children, ...props }: { children: ReactNode } & DivProps) => (
      <div className="my-8" {...props}>
        {React.Children.map(children, (child, index) => {
          const isLast = index === React.Children.count(children) - 1;
          return (
            <div key={index} className="flex gap-4 relative">
              <div className="flex flex-col items-center relative">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-semibold z-10 relative">
                  {index + 1}
                </div>
                {!isLast && (
                  <div className="absolute top-8 left-1/2 transform -translate-x-1/2 w-0.5 bg-border" style={{height: 'calc(100% + 1.5rem)'}} />
                )}
              </div>
              <div className="flex-1 pt-1 pb-6">{child}</div>
            </div>
          );
        })}
      </div>
    ),

    Tabs: ({ children, ...props }: { children: ReactNode } & DivProps) => (
      <div className="my-6 rounded-lg border border-border overflow-hidden" {...props}>
        {children}
      </div>
    ),

    Tab: ({ children, title, ...props }: { children: ReactNode; title?: string } & DivProps) => (
      <div className="border-b border-border last:border-b-0" {...props}>
        {title && (
          <div className="bg-muted/30 px-4 py-2 font-medium text-sm border-b border-border">
            {title}
          </div>
        )}
        <div className="p-4">{children}</div>
      </div>
    ),

    ...components,
    Mermaid: Mermaid,
  };
}
