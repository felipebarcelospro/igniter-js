// src/routes/__root.tsx
/// <reference types="vite/client" />
// other imports...

import { IgniterProvider } from '@igniter-js/core/client'
import {
  createRootRoute,
  HeadContent,
  Outlet,
  Scripts,
} from '@tanstack/react-router'

import appCss from '../styles/app.css?url'

export const Route = createRootRoute({
  head: () => ({
    links: [{ rel: 'stylesheet', href: appCss }],
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { name: 'description', content: 'Igniter.js + TanStack Start' },
    ],
  }),
  component: RootComponent,
})

function RootComponent() {
  return (
    <html lang="en">
      <head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Igniter.js + TanStack Start</title>
        <link
          rel="icon"
          href="data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>🔥</text></svg>"
        />

        <HeadContent />
      </head>
      <body>
        {/* The IgniterProvider wraps the entire application */}
        <IgniterProvider>
          <Outlet />
        </IgniterProvider>
        <Scripts />
      </body>
    </html>
  )
}
