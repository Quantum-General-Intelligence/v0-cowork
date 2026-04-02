'use client'

import { useChat } from '@ai-sdk/react'
import { TextStreamChatTransport } from 'ai'
import { useEffect, useMemo, useRef, useState } from 'react'

interface ModelOption {
  id: string
  name: string
  provider: 'qualtron' | 'openrouter'
  description: string
  category: string
}

export default function PlaygroundPage() {
  const [models, setModels] = useState<ModelOption[]>([])
  const [selectedModel, setSelectedModel] = useState('qualtron:default')
  const [showModelPicker, setShowModelPicker] = useState(false)
  const [inputValue, setInputValue] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)

  const transport = useMemo(
    () =>
      new TextStreamChatTransport({
        api: '/api/chat',
        body: { model: selectedModel },
      }),
    [selectedModel],
  )

  const { messages, sendMessage, status, error, setMessages } = useChat({
    transport,
  })

  const isLoading = status === 'streaming' || status === 'submitted'

  // Fetch available models
  useEffect(() => {
    fetch('/api/models')
      .then((r) => r.json())
      .then((d) => {
        if (d.models?.length) setModels(d.models)
      })
      .catch(() => {})
  }, [])

  // Auto-scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!inputValue.trim() || isLoading) return
    sendMessage({ text: inputValue })
    setInputValue('')
  }

  const selectedModelInfo = models.find((m) => m.id === selectedModel)

  const groupedModels = models.reduce<Record<string, ModelOption[]>>(
    (acc, m) => {
      ;(acc[m.category] ??= []).push(m)
      return acc
    },
    {},
  )

  return (
    <div className="flex h-[calc(100vh-112px)] flex-col">
      {/* Toolbar */}
      <div className="flex items-center justify-between border-b border-border px-4 py-2">
        <div className="flex items-center gap-3">
          <h1 className="text-sm font-semibold">Playground</h1>

          {/* Model Selector */}
          <div className="relative">
            <button
              onClick={() => setShowModelPicker(!showModelPicker)}
              className="flex items-center gap-2 rounded-md border border-border bg-muted/50 px-3 py-1.5 text-xs font-medium transition-colors hover:bg-muted"
            >
              <span
                className={`h-2 w-2 rounded-full ${
                  selectedModelInfo?.provider === 'qualtron'
                    ? 'bg-accent'
                    : 'bg-primary'
                }`}
              />
              {selectedModelInfo?.name ?? selectedModel}
              <span className="text-muted-foreground">▾</span>
            </button>

            {showModelPicker && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setShowModelPicker(false)}
                />
                <div className="absolute left-0 top-full z-50 mt-1 w-80 max-h-96 overflow-y-auto rounded-lg border border-border bg-card p-2 shadow-lg">
                  {Object.entries(groupedModels).map(([category, items]) => (
                    <div key={category}>
                      <div className="px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                        {category}
                      </div>
                      {items.map((m) => (
                        <button
                          key={m.id}
                          onClick={() => {
                            setSelectedModel(m.id)
                            setShowModelPicker(false)
                          }}
                          className={`flex w-full items-start gap-2 rounded-md px-2 py-2 text-left transition-colors ${
                            selectedModel === m.id
                              ? 'bg-primary/10 text-foreground'
                              : 'text-foreground hover:bg-muted'
                          }`}
                        >
                          <span
                            className={`mt-1 h-2 w-2 shrink-0 rounded-full ${
                              m.provider === 'qualtron'
                                ? 'bg-accent'
                                : 'bg-primary'
                            }`}
                          />
                          <div>
                            <div className="text-xs font-medium">{m.name}</div>
                            <div className="text-[10px] text-muted-foreground">
                              {m.description}
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {selectedModelInfo?.provider === 'qualtron' && (
            <div className="flex items-center gap-1">
              <span className="text-[10px] text-muted-foreground">CAG:</span>
              {['0.8B', '2B', '4B', '9B', '122B'].map((s) => (
                <span
                  key={s}
                  className={`rounded px-1 py-0.5 text-[8px] font-mono ${
                    s === '122B'
                      ? 'bg-primary/20 text-primary'
                      : 'bg-accent/20 text-accent'
                  }`}
                >
                  {s}
                </span>
              ))}
            </div>
          )}
          <button
            onClick={() => setMessages([])}
            className="rounded-md px-2 py-1 text-xs text-muted-foreground hover:bg-muted"
          >
            Clear
          </button>
        </div>
      </div>

      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto">
        {messages.length === 0 ? (
          <div className="flex h-full items-center justify-center">
            <div className="max-w-md text-center">
              <div className="mb-4 text-4xl">⚡</div>
              <h2 className="text-lg font-semibold">Qualtron Playground</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Chat with Qualtron models using CAG (Cognitive Augmented
                Generation) or any model via OpenRouter.
              </p>
              <div className="mt-4 flex flex-wrap justify-center gap-2">
                {[
                  'What is Quantum Hypergraph Memory?',
                  'Explain the CAG pipeline stages',
                  'How does RadixAttention prefix caching work?',
                ].map((suggestion) => (
                  <button
                    key={suggestion}
                    onClick={() => setInputValue(suggestion)}
                    className="rounded-full border border-border px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-muted"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="mx-auto max-w-3xl space-y-4 p-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${
                  message.role === 'user' ? 'justify-end' : 'justify-start'
                }`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                    message.role === 'user'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-foreground'
                  }`}
                >
                  {message.role === 'assistant' && (
                    <div className="mb-1 flex items-center gap-1.5">
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${
                          selectedModelInfo?.provider === 'qualtron'
                            ? 'bg-accent'
                            : 'bg-primary'
                        }`}
                      />
                      <span className="text-[10px] font-medium text-muted-foreground">
                        {selectedModelInfo?.name ?? 'Assistant'}
                      </span>
                    </div>
                  )}
                  <div className="whitespace-pre-wrap text-sm leading-relaxed">
                    {message.parts
                      .filter((p) => p.type === 'text')
                      .map((p, i) => (
                        <span key={i}>{'text' in p ? p.text : ''}</span>
                      ))}
                  </div>
                </div>
              </div>
            ))}

            {isLoading &&
              messages[messages.length - 1]?.role !== 'assistant' && (
                <div className="flex justify-start">
                  <div className="rounded-2xl bg-muted px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`h-1.5 w-1.5 animate-pulse rounded-full ${
                          selectedModelInfo?.provider === 'qualtron'
                            ? 'bg-accent'
                            : 'bg-primary'
                        }`}
                      />
                      <span className="text-[10px] text-muted-foreground">
                        Thinking...
                      </span>
                    </div>
                  </div>
                </div>
              )}

            {error && (
              <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
                Error: {error.message}
              </div>
            )}

            <div ref={bottomRef} />
          </div>
        )}
      </div>

      {/* Input */}
      <div className="border-t border-border p-4">
        <form
          onSubmit={handleSubmit}
          className="mx-auto flex max-w-3xl items-end gap-2"
        >
          <textarea
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                handleSubmit(e as unknown as React.FormEvent)
              }
            }}
            placeholder="Type a message... (Enter to send, Shift+Enter for newline)"
            rows={1}
            disabled={isLoading}
            className="flex-1 resize-none rounded-xl border border-input bg-background px-4 py-3 text-sm outline-none placeholder:text-muted-foreground focus:ring-1 focus:ring-ring disabled:opacity-50"
            style={{ minHeight: 48, maxHeight: 200 }}
          />
          <button
            type="submit"
            disabled={isLoading || !inputValue.trim()}
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
          >
            {isLoading ? (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
            ) : (
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M22 2L11 13" />
                <path d="M22 2L15 22L11 13L2 9L22 2Z" />
              </svg>
            )}
          </button>
        </form>
        <div className="mx-auto mt-2 max-w-3xl text-center text-[10px] text-muted-foreground">
          {selectedModelInfo?.provider === 'qualtron'
            ? 'Using Qualtron CAG — 5-stage cognitive hierarchy with QHM prefix caching'
            : `Using ${selectedModelInfo?.name ?? 'external model'} via OpenRouter`}
        </div>
      </div>
    </div>
  )
}
