'use client'

import { useEffect, useRef } from 'react'
import type { UIMessage } from 'ai'
import { MessageBubble } from './message-bubble'

interface ChatMessagesProps {
  messages: UIMessage[]
  isLoading: boolean
  modelName?: string
  providerType?: 'qualtron' | 'openrouter' | 'pi'
}

export function ChatMessages({
  messages,
  isLoading,
  modelName,
  providerType,
}: ChatMessagesProps) {
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isLoading])

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="mx-auto max-w-3xl space-y-4 p-4">
        {messages.map((message, i) => {
          const isLastAssistant =
            message.role === 'assistant' && i === messages.length - 1

          return (
            <MessageBubble
              key={message.id}
              message={message}
              modelName={message.role === 'assistant' ? modelName : undefined}
              isStreaming={isLastAssistant && isLoading}
              providerType={providerType}
            />
          )
        })}

        {/* Loading indicator when waiting for first token */}
        {isLoading && messages[messages.length - 1]?.role !== 'assistant' && (
          <div className="flex justify-start">
            <div className="rounded-2xl rounded-bl-md bg-muted px-4 py-3">
              <div className="flex items-center gap-1.5">
                <span
                  className={`h-1.5 w-1.5 animate-pulse rounded-full ${
                    providerType === 'qualtron'
                      ? 'bg-accent'
                      : providerType === 'pi'
                        ? 'bg-warning'
                        : 'bg-primary'
                  }`}
                />
                <span className="text-[10px] text-muted-foreground">
                  {providerType === 'pi' ? 'Agent thinking...' : 'Thinking...'}
                </span>
              </div>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>
    </div>
  )
}
