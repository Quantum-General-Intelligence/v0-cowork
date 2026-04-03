'use client'

import { useChat } from '@ai-sdk/react'
import { TextStreamChatTransport } from 'ai'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { ResizableLayout } from './resizable-layout'
import { ChatMessages } from './chat-messages'
import { ChatInput } from './chat-input'
import { ChatSidebar, type ChatSession } from './chat-sidebar'
import { PreviewPanel } from './preview-panel'

interface ModelOption {
  id: string
  name: string
  provider: string
  description: string
  category: string
}

export function PlaygroundClient() {
  // Models
  const [models, setModels] = useState<ModelOption[]>([])
  const [selectedModel, setSelectedModel] = useState('qualtron:default')

  // Sessions (local state — swap for Supabase when connected)
  const [sessions, setSessions] = useState<ChatSession[]>([])
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null)

  // Input
  const [inputValue, setInputValue] = useState('')

  // Mobile
  const [activePanel, setActivePanel] = useState<'left' | 'right'>('left')
  const [showSidebar, setShowSidebar] = useState(true)

  // CAG behavior from Spine Cortex config
  const [cagBehavior, setCagBehavior] = useState('general')
  useEffect(() => {
    const saved = localStorage.getItem('cag-behavior')
    if (saved) setCagBehavior(saved)
  }, [])

  // Chat transport — route Pi models to Pi agent endpoint
  const isPiModel = selectedModel.startsWith('pi:')
  const transport = useMemo(
    () =>
      new TextStreamChatTransport({
        api: isPiModel ? '/api/chat/pi' : '/api/chat',
        body: { model: selectedModel, behavior: cagBehavior },
      }),
    [selectedModel, isPiModel, cagBehavior],
  )

  const { messages, sendMessage, status, error, setMessages } = useChat({
    transport,
  })

  const isLoading = status === 'streaming' || status === 'submitted'

  // Check if a cortex is deployed (controls whether Qualtron model shows)
  const [hasCortex, setHasCortex] = useState(false)
  useEffect(() => {
    try {
      const configs = JSON.parse(
        localStorage.getItem('cortex-configs') ?? '[]',
      )
      setHasCortex(configs.length > 0)
    } catch {}
  }, [])

  // Fetch models — filter Qualtron unless cortex is deployed
  useEffect(() => {
    fetch('/api/models')
      .then((r) => r.json())
      .then((d) => {
        let list = d.models ?? []
        if (!hasCortex) {
          list = list.filter(
            (m: ModelOption) => m.provider !== 'qualtron',
          )
        }
        if (list.length) setModels(list)
        // Auto-select first model
        if (list.length && !list.find((m: ModelOption) => m.id === selectedModel)) {
          setSelectedModel(list[0].id)
        }
      })
      .catch(() => {})
  }, [hasCortex])

  // Derive provider type
  const selectedModelInfo = models.find((m) => m.id === selectedModel)
  const providerType = (selectedModelInfo?.provider ?? 'qualtron') as
    | 'qualtron'
    | 'openrouter'
    | 'pi'

  // Session management
  const handleNewSession = useCallback(() => {
    const id = `session-${Date.now()}`
    const session: ChatSession = {
      id,
      title: 'New Chat',
      model: selectedModelInfo?.name ?? selectedModel,
      updatedAt: new Date().toISOString(),
    }
    setSessions((prev) => [session, ...prev])
    setActiveSessionId(id)
    setMessages([])
  }, [selectedModel, selectedModelInfo, setMessages])

  const handleSelectSession = useCallback(
    (id: string) => {
      setActiveSessionId(id)
      // TODO: Load messages from Supabase
      setMessages([])
    },
    [setMessages],
  )

  const handleDeleteSession = useCallback(
    (id: string) => {
      setSessions((prev) => prev.filter((s) => s.id !== id))
      if (activeSessionId === id) {
        setActiveSessionId(null)
        setMessages([])
      }
    },
    [activeSessionId, setMessages],
  )

  const handleRenameSession = useCallback((id: string, title: string) => {
    setSessions((prev) => prev.map((s) => (s.id === id ? { ...s, title } : s)))
  }, [])

  // Send message
  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault()
      if (!inputValue.trim() || isLoading) return

      // Auto-create session if none
      if (!activeSessionId) {
        const id = `session-${Date.now()}`
        const session: ChatSession = {
          id,
          title: inputValue.slice(0, 50),
          model: selectedModelInfo?.name ?? selectedModel,
          updatedAt: new Date().toISOString(),
        }
        setSessions((prev) => [session, ...prev])
        setActiveSessionId(id)
      } else {
        // Update title to first message if it's "New Chat"
        setSessions((prev) =>
          prev.map((s) =>
            s.id === activeSessionId && s.title === 'New Chat'
              ? { ...s, title: inputValue.slice(0, 50) }
              : s,
          ),
        )
      }

      sendMessage({ text: inputValue })
      setInputValue('')
    },
    [
      inputValue,
      isLoading,
      activeSessionId,
      selectedModel,
      selectedModelInfo,
      sendMessage,
    ],
  )

  // Chat panel
  const chatPanel = (
    <div className="flex h-full flex-col">
      {/* Chat header */}
      <div className="flex items-center justify-between border-b border-border px-4 py-2">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowSidebar(!showSidebar)}
            className="rounded-md p-1 text-muted-foreground hover:bg-muted lg:hidden"
          >
            ☰
          </button>
          <span className="text-xs font-semibold">
            {sessions.find((s) => s.id === activeSessionId)?.title ??
              'Qualtron Playground'}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {providerType === 'qualtron' && (
            <div className="hidden items-center gap-1 sm:flex">
              <span className="text-[10px] text-muted-foreground">CAG:</span>
              {['0.8B', '2B', '4B', '9B', '122B'].map((s) => (
                <span
                  key={s}
                  className={`rounded px-1 py-0.5 text-[10px] font-mono ${
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
            onClick={() => {
              setMessages([])
              setActiveSessionId(null)
            }}
            className="rounded-md border border-border bg-muted px-3 py-1 text-xs font-medium text-muted-foreground hover:bg-muted/80"
          >
            New Chat
          </button>
        </div>
      </div>

      {/* Messages or empty state */}
      {messages.length === 0 ? (
        <div className="flex flex-1 items-center justify-center">
          <div className="max-w-md text-center">
            <div className="mb-4 text-4xl">⚡</div>
            <h2 className="text-lg font-semibold">Qualtron Playground</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Chat with Qualtron cognitive models (CAG) or Pi agents with tools.
            </p>
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              {[
                'Explain Quantum Hypergraph Memory',
                'Write a Python web scraper',
                'Review this code for security issues',
              ].map((s) => (
                <button
                  key={s}
                  onClick={() => setInputValue(s)}
                  className="rounded-full border border-border px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-muted"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <ChatMessages
          messages={messages}
          isLoading={isLoading}
          modelName={selectedModelInfo?.name}
          providerType={providerType}
        />
      )}

      {error && (
        <div className="mx-4 mb-2 rounded-lg border border-destructive/50 bg-destructive/10 p-2 text-xs text-destructive">
          {error.message}
        </div>
      )}

      {/* Input */}
      <ChatInput
        value={inputValue}
        onChange={setInputValue}
        onSubmit={handleSubmit}
        isLoading={isLoading}
        models={models}
        selectedModel={selectedModel}
        onModelChange={setSelectedModel}
      />
    </div>
  )

  // Full layout with sidebar
  return (
    <div className="flex h-[calc(100vh-96px)]">
      {/* Sidebar — hidden on mobile unless toggled */}
      <div
        className={`${showSidebar ? 'block' : 'hidden'} w-64 shrink-0 lg:block`}
      >
        <ChatSidebar
          sessions={sessions}
          activeSessionId={activeSessionId ?? undefined}
          onSelectSession={handleSelectSession}
          onNewSession={handleNewSession}
          onDeleteSession={handleDeleteSession}
          onRenameSession={handleRenameSession}
        />
      </div>

      {/* Main area — resizable chat + preview */}
      <div className="flex-1">
        <ResizableLayout
          leftPanel={chatPanel}
          rightPanel={<PreviewPanel />}
          defaultLeftWidth={60}
          minLeftWidth={40}
          maxLeftWidth={80}
        />
      </div>
    </div>
  )
}
