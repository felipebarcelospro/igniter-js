"use client";

import { type ComponentProps, memo } from "react";
import { Streamdown } from "streamdown";
import { cn } from "@/lib/utils";

type ResponseProps = ComponentProps<typeof Streamdown>;

export const Response = memo(
  ({ className, ...props }: ResponseProps) => (
    <Streamdown
      className={cn(
        "size-full [&>*:first-child]:mt-0 [&>*:last-child]:mb-0 response-content",
        className,
      )}
      {...props}
      components={{
        h2: ({ children, node, ...props }) => (
          <h3
            className="font-bold text-sm text-primary tracking-wide"
            {...props}
          >
            {children}
          </h3>
        ),
        h3: ({ children, node, ...props }) => (
          <h3
            className="font-bold text-sm text-primary tracking-wide"
            {...props}
          >
            {children}
          </h3>
        ),
        h4: ({ children, node, ...props }) => (
          <h4
            className="font-bold text-sm text-primary tracking-wide"
            {...props}
          >
            {children}
          </h4>
        ),
        p: ({ children, node, ...props }) => (
          <p
            className="text-sm text-muted-foreground tracking-wide"
            {...props}
          >
            {children}
          </p>
        ),
      }}
    />
  ),
  (prevProps, nextProps) => prevProps.children === nextProps.children,
);

Response.displayName = "Response";