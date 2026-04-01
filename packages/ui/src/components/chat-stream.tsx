'use client'

import { useCallback, useRef, useState, type FormEvent } from 'react'
import type { ChatMessage, StreamingChunk, CachedLLMClient } from '@qgst/client'

export interface ChatStreamProps {
  /** CachedLLM client instance */
  client: CachedLLMClient
  /** Agent/model ID to chat with */
  model: string
  /** Optional system prompt override */
  systemPrompt?: string
  /** Max tokens for completion */
  maxTokens?: number
  /** Temperature */
  temperature?: number
}

interface DisplayMessage {
  role: 'user' | 'assistant'
  content: string
}

export function ChatStream({
  client,
  model,
  systemPrompt,
  maxTokens = 2048,
  temperature = 0.7,
}: ChatStreamProps) {
  const [messages, setMessages] = useState<DisplayMessage[]>([])
  const [input, setInput] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const abortRef = useRef<AbortController | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = useCallback(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  const handleSubmit = useCallback(
    async (e: FormEvent) => {
      e.preventDefault()
      const trimmed = input.trim()
      if (!trimmed || isStreaming) return

      const userMsg: DisplayMessage = { role: 'user', content: trimmed }
      const newMessages = [...messages, userMsg]
      setMessages(newMessages)
      setInput('')
      setIsStreaming(true)

      // Build chat messages
      const chatMessages: ChatMessage[] = []
      if (systemPrompt) {
        chatMessages.push({ role: 'system', content: systemPrompt })
      }
      for (const m of newMessages) {
        chatMessages.push({ role: m.role, content: m.content })
      }

      // Stream response
      let assistantContent = ''
      const assistantMsg: DisplayMessage = { role: 'assistant', content: '' }
      setMessages([...newMessages, assistantMsg])

      try {
        const stream = client.chatStream({
          model,
          messages: chatMessages,
          stream: true,
          max_tokens: maxTokens,
          temperature,
        })

        for await (const chunk of stream) {
          const delta = chunk.choices[0]?.delta
          if (delta?.content) {
            assistantContent += delta.content
            setMessages([
              ...newMessages,
              { role: 'assistant', content: assistantContent },
            ])
            scrollToBottom()
          }
        }
      } catch (err) {
        assistantContent += `\n\n[Error: ${err instanceof Error ? err.message : 'Stream failed'}]`
        setMessages([
          ...newMessages,
          { role: 'assistant', content: assistantContent },
        ])
      } finally {
        setIsStreaming(false)
        scrollToBottom()
      }
    },
    [
      client,
      model,
      input,
      messages,
      isStreaming,
      systemPrompt,
      maxTokens,
      temperature,
      scrollToBottom,
    ],
  )

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        backgroundColor: 'var(--background, #000)',
      }}
    >
      {/* Messages */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: 16,
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
        }}
      >
        {messages.length === 0 && (
          <div
            style={{
              textAlign: 'center',
              color: 'var(--muted-foreground, #666)',
              padding: 40,
            }}
          >
            Start a conversation with <strong>{model}</strong>
          </div>
        )}

        {messages.map((msg, i) => (
          <div
            key={i}
            style={{
              display: 'flex',
              justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
            }}
          >
            <div
              style={{
                maxWidth: '80%',
                padding: '10px 14px',
                borderRadius: 12,
                fontSize: 14,
                lineHeight: 1.5,
                whiteSpace: 'pre-wrap',
                backgroundColor:
                  msg.role === 'user'
                    ? 'var(--primary, #00C2FF)'
                    : 'var(--muted, #1a1a1a)',
                color:
                  msg.role === 'user'
                    ? 'var(--primary-foreground, #000)'
                    : 'var(--foreground, #fff)',
              }}
            >
              {msg.content}
              {isStreaming &&
                i === messages.length - 1 &&
                msg.role === 'assistant' && (
                  <span
                    style={{
                      display: 'inline-block',
                      width: 6,
                      height: 14,
                      backgroundColor: 'var(--primary, #00C2FF)',
                      marginLeft: 2,
                      animation: 'blink 1s infinite',
                    }}
                  />
                )}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <form
        onSubmit={handleSubmit}
        style={{
          display: 'flex',
          gap: 8,
          padding: 16,
          borderTop: '1px solid var(--border, #333)',
        }}
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type a message..."
          disabled={isStreaming}
          style={{
            flex: 1,
            padding: '10px 14px',
            borderRadius: 8,
            border: '1px solid var(--border, #333)',
            backgroundColor: 'var(--input, #111)',
            color: 'var(--foreground, #fff)',
            fontSize: 14,
            outline: 'none',
          }}
        />
        <button
          type="submit"
          disabled={isStreaming || !input.trim()}
          style={{
            padding: '10px 20px',
            borderRadius: 8,
            border: 'none',
            backgroundColor: 'var(--primary, #00C2FF)',
            color: 'var(--primary-foreground, #000)',
            fontSize: 14,
            fontWeight: 600,
            cursor: isStreaming || !input.trim() ? 'not-allowed' : 'pointer',
            opacity: isStreaming || !input.trim() ? 0.5 : 1,
          }}
        >
          Send
        </button>
      </form>
    </div>
  )
}
