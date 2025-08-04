'use client'

import * as React from "react"
import Link from "next/link"

import { ArrowRight, Code2, Github, Twitter, Youtube } from "lucide-react"
import { FileText } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Chat } from '@/features/message/presentation/components/chat'

export default function Home() {
  return (
    <div className="h-screen grid grid-rows-[auto_1fr_auto]">
      <header className="flex items-center space-x-4 border-b">
        <div className="container mx-auto max-w-screen-md border-x p-4 flex items-center space-x-4">
          <img src="https://igniterjs.com/logo-light.svg" alt="" className="h-6" />
          <Badge variant="outline" className="rounded-full px-3 py-1 text-xs font-medium bg-cyan-500/10 text-cyan-500 border-cyan-300/10/20" aria-label="Beta version">
            BETA
          </Badge>
        </div>
      </header>

      <div className="container mx-auto max-w-screen-md border-x">
        <Chat />
      </div>

      <footer className="w-full text-sm text-muted-foreground">
        <div className="container mx-auto max-w-screen-md border-x py-4 flex items-center justify-between px-8">
          <div className="text-center md:text-left flex items-center space-x-2" >
            <p>
              Powered by{" "}
              <a
                href="https://igniter-js.vercel.app"
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium underline underline-offset-4 hover:text-primary transition-colors"
              >
                Igniter.js
              </a>
              .
            </p>
          </div>
          <div className="flex items-center space-x-4">
            <Button
              asChild
              variant="ghost"
              size="icon"
              aria-label="Igniter.js GitHub"
              className="hover:text-primary transition-colors rounded-full"
            >
              <a
              href="https://github.com/felipebarcelospro/igniter-js"
              target="_blank"
              rel="noopener noreferrer"
              >
              <Github className="h-5 w-5" />
              </a>
            </Button>
            <Button
              asChild
              variant="ghost"
              size="icon"
              aria-label="Igniter.js Twitter"
              className="hover:text-primary transition-colors rounded-full"
            >
              <a
              href="https://x.com/IgniterJs"
              target="_blank"
              rel="noopener noreferrer"
              >
              <Twitter className="h-5 w-5" />
              </a>
            </Button>
          </div>
        </div>
      </footer>
    </div>
  )
}
