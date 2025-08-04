'use client'

import { useEffect, useRef, useState } from 'react'
import { api } from '@/igniter.client'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Send } from 'lucide-react'

export function Chat() {
  const [sender, setSender] = useState('')
  const [message, setMessage] = useState('')
  const [isSenderSet, setIsSenderSet] = useState(false)

  const scrollAreaRef = useRef<HTMLDivElement>(null)

  const { data } = api.message.list.useQuery({
    refetchOnWindowFocus: false,
  })

  const messages = data || []

  const createMessage = api.message.create.useMutation()

  useEffect(() => {
    const storedSender = localStorage.getItem('chat-sender')
    if (storedSender) {
      setSender(storedSender)
      setIsSenderSet(true)
    }
  }, [])

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (message.trim() && sender.trim()) {
      await createMessage.mutate({
        body: {
          content: message,
          sender: sender,
        },
      })
      setMessage('')
    }
  }

  const handleSetSender = () => {
    if (sender.trim()) {
      localStorage.setItem('chat-sender', sender.trim())
      setIsSenderSet(true)
    }
  }

  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollElement = scrollAreaRef.current.querySelector('div > div')
      if (scrollElement) {
        scrollElement.scrollTo({
          top: scrollElement.scrollHeight,
          behavior: 'smooth',
        })
      }
    }
  }, [messages])

  return (
    <div className="relative  flex flex-col">
      <Card className="w-full rounded-none pt-0 border-none flex-1 flex flex-col">
        <CardHeader className="border-b !pt-4 !pb-2 px-4">
          <CardTitle>Real-time Chat with Igniter.js</CardTitle>
        </CardHeader>
        <CardContent className='px-4 py-0'>
          <ScrollArea className=" w-full h-[calc(100vh-16.5rem)] pb-10 relative" ref={scrollAreaRef}>
            <div className="space-y-4">
              {messages.map((msg: any) => (
                <div
                  key={msg.id}
                  className={`flex ${
                    msg.sender === sender ? 'justify-end' : 'justify-start'
                  }`}
                >
                  <div
                    className={`p-3 rounded-lg max-w-xs ${
                      msg.sender === sender
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted'
                    }`}
                  >
                    <p className="text-sm font-bold">{msg.sender}</p>
                    <p>{msg.content}</p>
                    <p className="text-xs text-right opacity-70 mt-1">
                      {new Date(msg.createdAt).toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
            
            
          </ScrollArea>

          <form
            onSubmit={handleSendMessage}
            className="flex w-full items-center space-x-2"
          >
            <Input
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Type a message..."
              disabled={!isSenderSet}
            />
            <Button
              type="submit"
              disabled={createMessage.isLoading || !isSenderSet}
            >
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </CardContent>
      </Card>
      {!isSenderSet && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <Card className="w-full max-w-sm">
            <CardHeader>
              <CardTitle>Welcome!</CardTitle>
              <CardDescription>
                Please enter your name to join the chat.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex w-full items-center space-x-2">
                <Input
                  value={sender}
                  onChange={(e) => setSender(e.target.value)}
                  placeholder="Enter your name..."
                  onKeyDown={(e) => e.key === 'Enter' && handleSetSender()}
                />
                <Button onClick={handleSetSender}>Join Chat</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
