import defaultMdxComponents from 'fumadocs-ui/mdx'
import type { MDXComponents } from 'mdx/types'
import { Accordion, Accordions } from 'fumadocs-ui/components/accordion'
import { Banner } from 'fumadocs-ui/components/banner'
import { Callout } from 'fumadocs-ui/components/callout'
import { Step, Steps } from 'fumadocs-ui/components/steps'
import * as TabsComponents from 'fumadocs-ui/components/tabs'
import { TypeTable } from 'fumadocs-ui/components/type-table'
import { File, Folder, Files } from 'fumadocs-ui/components/files'
import { CodeBlock, Pre } from 'fumadocs-ui/components/codeblock'
import { NextJsIcon, ViteIcon, RemixIcon, AstroIcon, ExpressIcon, BunIcon, DenoIcon } from './components/icons'
import { Mermaid } from './components/ui/mermaid'
import { Quiz, ChapterNav, ChapterObjectives } from './components/learn'

export function getMDXComponents(components?: MDXComponents): MDXComponents {
  return {
    ...defaultMdxComponents,
    Accordion,
    Accordions,
    Banner,
    Callout,
    Step,
    Steps,
    TypeTable,
    File,
    Folder,
    Files,
    NextJsIcon,
    ViteIcon,
    RemixIcon,
    AstroIcon,
    ExpressIcon,
    BunIcon,
    DenoIcon,
    Mermaid,
    Quiz,
    ChapterNav,
    ChapterObjectives,
    pre: ({ ...props }) => (
      <CodeBlock {...props}>
        <Pre>{props.children}</Pre>
      </CodeBlock>
    ),
    ...TabsComponents,
    ...components,
  }
}
