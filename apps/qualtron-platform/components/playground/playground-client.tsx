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

  // Load Spine Cortex config (behavior, name, QHM content)
  const [cortexConfig, setCortexConfig] = useState<{
    name: string
    behavior: string
    qhmContent: string
  } | null>(null)

  useEffect(() => {
    try {
      const configs = JSON.parse(
        localStorage.getItem('cortex-configs') ?? '[]',
      )
      if (configs.length > 0) {
        const latest = configs[0]
        // Combine QHM results from all stages into a single context string
        const qhmParts: string[] = []
        for (const stage of latest.stages ?? []) {
          if (stage.qhmResult) {
            const r = stage.qhmResult
            // Build readable QHM from structured result
            if (r.output) {
              const o = typeof r.output === 'string' ? r.output : r.output
              if (o.qlang) {
                qhmParts.push(
                  `=== QLang Rules (${stage.name}) ===\n` +
                    (o.qlang as { role?: string; rawText?: string; text?: string }[])
                      .map(
                        (q: { role?: string; rawText?: string; text?: string }) =>
                          `[${q.role ?? 'unknown'}] ${q.rawText ?? q.text ?? ''}`,
                      )
                      .join('\n'),
                )
              }
              if (o.entities) {
                qhmParts.push(
                  `=== Entities ===\n` +
                    (o.entities as { text?: string; label?: string }[])
                      .map((e: { text?: string; label?: string }) => `${e.text} (${e.label})`)
                      .join(', '),
                )
              }
              if (o.triples) {
                qhmParts.push(
                  `=== Relations ===\n` +
                    (o.triples as { subject?: string; relation?: string; object?: string }[])
                      .map(
                        (t: { subject?: string; relation?: string; object?: string }) =>
                          `${t.subject} → ${t.relation} → ${t.object}`,
                      )
                      .join('\n'),
                )
              }
            }
            // Fallback: raw text
            if (qhmParts.length === 0 && typeof r === 'string') {
              qhmParts.push(r)
            }
          }
        }
        setCortexConfig({
          name: latest.name ?? 'Cortex',
          behavior: latest.behavior ?? 'general',
          qhmContent: qhmParts.join('\n\n'),
        })
      }
    } catch {}
  }, [])

  const hasCortex = cortexConfig !== null
  const cagBehavior = cortexConfig?.behavior ?? 'general'

  // Chat transport — route Pi models to Pi agent endpoint, pass QHM content
  const isPiModel = selectedModel.startsWith('pi:')
  const transport = useMemo(
    () =>
      new TextStreamChatTransport({
        api: isPiModel ? '/api/chat/pi' : '/api/chat',
        body: {
          model: selectedModel,
          behavior: cagBehavior,
          qhmContent: cortexConfig?.qhmContent ?? '',
          cortexName: cortexConfig?.name ?? '',
        },
      }),
    [selectedModel, isPiModel, cagBehavior, cortexConfig],
  )

  const { messages, sendMessage, status, error, setMessages } = useChat({
    transport,
  })

  const isLoading = status === 'streaming' || status === 'submitted'

  // Fetch models — filter Qualtron unless cortex is deployed
  useEffect(() => {
    fetch('/api/models')
      .then((r) => r.json())
      .then((d) => {
        let list = d.models ?? []
        if (!hasCortex) {
          list = list.filter((m: ModelOption) => m.provider !== 'qualtron')
        } else {
          // Rename the Qualtron model to the cortex name
          list = list.map((m: ModelOption) =>
            m.provider === 'qualtron'
              ? { ...m, name: cortexConfig?.name ?? m.name }
              : m,
          )
        }
        if (list.length) setModels(list)
        if (
          list.length &&
          !list.find((m: ModelOption) => m.id === selectedModel)
        ) {
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
          {providerType === 'qualtron' && cortexConfig && (
            <span className="hidden text-[10px] text-muted-foreground sm:inline">
              CAG: {cortexConfig.name} ({cortexConfig.behavior})
            </span>
          )}
          {providerType === 'pi' && (
            <span className="hidden text-[10px] text-warning sm:inline">
              Pi Agent + Tools
            </span>
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
              {hasCortex
                ? `Chatting with ${cortexConfig?.name}. Your ingested knowledge is loaded.`
                : 'Deploy a Spine Cortex first, or use Pi Agent.'}
            </p>
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              {(hasCortex
                ? [
                    'What are the key obligations in the documents?',
                    'Summarize the main entities and relationships',
                    'What rules and conditions were extracted?',
                  ]
                : [
                    'Help me analyze this code',
                    'Write a Python script',
                    'Explain how CAG works',
                  ]
              ).map((s) => (
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
