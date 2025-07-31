import ReactMarkdown from "react-markdown";

export function Markdown({ children }: { children: string }) {
  return (
    <div className="prose dark:prose-invert max-w-none">
      <ReactMarkdown
        components={{
          h1: ({ ...props }) => (
            <h1 className="text-3xl font-bold mt-8 mb-4" {...props} />
          ),
          h2: ({ ...props }) => (
            <h2 className="text-2xl font-semibold mt-6 mb-3" {...props} />
          ),
          h3: ({ ...props }) => (
            <h3 className="text-xl font-medium mt-4 mb-2" {...props} />
          ),
          p: ({ ...props }) => <p className="my-4" {...props} />,
          ul: ({ ...props }) => (
            <ul className="list-disc pl-6 my-4" {...props} />
          ),
          ol: ({ ...props }) => (
            <ol className="list-decimal pl-6 my-4" {...props} />
          ),
          li: ({ ...props }) => <li className="mb-2" {...props} />,
          a: ({ ...props }) => (
            <a className="text-primary hover:underline" {...props} />
          ),
          blockquote: ({ ...props }) => (
            <blockquote
              className="border-l-4 border-muted pl-4 italic my-4"
              {...props}
            />
          ),
          code: ({
            inline,
            ...props
          }: { inline?: boolean } & React.HTMLProps<HTMLElement>) =>
            inline ? (
              <code className="bg-muted rounded px-1 py-0.5" {...props} />
            ) : (
              <code
                className="block bg-muted rounded p-4 my-4 overflow-x-auto"
                {...props}
              />
            ),
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}
