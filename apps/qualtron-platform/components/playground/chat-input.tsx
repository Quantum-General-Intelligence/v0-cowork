'use client'

import { useRef, type FormEvent, type KeyboardEvent } from 'react'

interface ModelOption {
  id: string
  name: string
  provider: string
  category: string
}

interface ChatInputProps {
  value: string
  onChange: (value: string) => void
  onSubmit: (e: FormEvent) => void
  isLoading: boolean
  models: ModelOption[]
  selectedModel: string
  onModelChange: (model: string) => void
}

export function ChatInput({
  value,
  onChange,
  onSubmit,
  isLoading,
  models,
  selectedModel,
  onModelChange,
}: ChatInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      onSubmit(e as unknown as FormEvent)
    }
  }

  const selectedModelInfo = models.find((m) => m.id === selectedModel)

  // Group models by category
  const grouped = models.reduce<Record<string, ModelOption[]>>((acc, m) => {
    ;(acc[m.category] ??= []).push(m)
    return acc
  }, {})

  return (
    <div className="border-t border-border bg-background p-3">
      {/* Model selector row */}
      <div className="mb-2 flex items-center gap-2">
        <select
          value={selectedModel}
          onChange={(e) => onModelChange(e.target.value)}
          className="rounded-md border border-border bg-muted/50 px-2 py-1 text-[11px] font-medium text-foreground outline-none"
        >
          {Object.entries(grouped).map(([category, items]) => (
            <optgroup key={category} label={category}>
              {items.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </optgroup>
          ))}
        </select>

        {selectedModelInfo && (
          <span className="text-[10px] text-muted-foreground">
            {selectedModelInfo.provider === 'qualtron' && '⚡ CAG Pipeline'}
            {selectedModelInfo.provider === 'openrouter' && '🌐 OpenRouter'}
            {selectedModelInfo.provider === 'pi' && '🤖 Pi Agent + Tools'}
          </span>
        )}
      </div>

      {/* Input area */}
      <form onSubmit={onSubmit} className="flex items-end gap-2">
        <div className="relative flex-1">
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => {
              onChange(e.target.value)
              // Auto-resize
              e.target.style.height = 'auto'
              e.target.style.height = `${Math.min(e.target.scrollHeight, 200)}px`
            }}
            onKeyDown={handleKeyDown}
            placeholder="Type a message... (Enter to send, Shift+Enter for newline)"
            rows={1}
            disabled={isLoading}
            className="w-full resize-none rounded-xl border border-input bg-background px-4 py-3 pr-12 text-sm outline-none placeholder:text-muted-foreground focus:ring-1 focus:ring-ring disabled:opacity-50"
            style={{ minHeight: 48, maxHeight: 200 }}
          />
        </div>
        <button
          type="submit"
          disabled={isLoading || !value.trim()}
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
    </div>
  )
}
