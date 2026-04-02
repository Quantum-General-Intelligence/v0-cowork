'use client'

import type { UIMessage } from 'ai'

interface MessageBubbleProps {
  message: UIMessage
  modelName?: string
  isStreaming?: boolean
  providerType?: 'qualtron' | 'openrouter' | 'pi'
}

export function MessageBubble({
  message,
  modelName,
  isStreaming,
  providerType = 'qualtron',
}: MessageBubbleProps) {
  const isUser = message.role === 'user'

  // Extract text from parts
  const textContent = message.parts
    .filter((p) => p.type === 'text')
    .map((p) => ('text' in p ? p.text : ''))
    .join('')

  // Extract tool calls
  const toolCalls = message.parts.filter((p) => p.type === 'tool-invocation')

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[85%] ${
          isUser
            ? 'rounded-2xl rounded-br-md bg-primary px-4 py-3 text-primary-foreground'
            : 'rounded-2xl rounded-bl-md bg-muted px-4 py-3 text-foreground'
        }`}
      >
        {/* Assistant header */}
        {!isUser && modelName && (
          <div className="mb-1.5 flex items-center gap-1.5">
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                providerType === 'qualtron'
                  ? 'bg-accent'
                  : providerType === 'pi'
                    ? 'bg-warning'
                    : 'bg-primary'
              }`}
            />
            <span className="text-[10px] font-medium text-muted-foreground">
              {modelName}
            </span>
            {providerType === 'pi' && (
              <span className="rounded bg-warning/20 px-1 py-0.5 text-[10px] font-mono text-warning">
                AGENT
              </span>
            )}
          </div>
        )}

        {/* Text content with code block detection */}
        <div className="text-sm leading-relaxed">
          <FormattedContent content={textContent} isStreaming={isStreaming} />
        </div>

        {/* Tool calls (for Pi agents) */}
        {toolCalls.length > 0 && (
          <div className="mt-2 space-y-1.5">
            {toolCalls.map((tc, i) => (
              <div
                key={i}
                className="rounded-md border border-border/50 bg-background/50 px-3 py-2"
              >
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] text-warning">⚙️</span>
                  <span className="font-mono text-[10px] font-medium text-muted-foreground">
                    {'toolName' in tc ? String(tc.toolName) : 'tool'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function FormattedContent({
  content,
  isStreaming,
}: {
  content: string
  isStreaming?: boolean
}) {
  if (!content) {
    if (isStreaming) {
      return (
        <span className="inline-block h-4 w-1.5 animate-pulse bg-primary" />
      )
    }
    return null
  }

  // Split on code blocks
  const parts = content.split(/(```[\s\S]*?```)/g)

  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith('```') && part.endsWith('```')) {
          const lines = part.slice(3, -3).split('\n')
          const lang = lines[0]?.trim() || ''
          const code = lines.slice(1).join('\n')

          return (
            <div
              key={i}
              className="my-2 overflow-hidden rounded-lg border border-border"
            >
              {lang && (
                <div className="flex items-center justify-between border-b border-border bg-muted/80 px-3 py-1.5">
                  <span className="font-mono text-[10px] text-muted-foreground">
                    {lang}
                  </span>
                  <button
                    onClick={() => navigator.clipboard.writeText(code)}
                    className="text-[10px] text-muted-foreground hover:text-foreground"
                  >
                    Copy
                  </button>
                </div>
              )}
              <pre className="overflow-x-auto bg-muted/30 p-3 font-mono text-xs leading-relaxed">
                <code>{code || lines.join('\n')}</code>
              </pre>
            </div>
          )
        }

        // Regular text — preserve whitespace
        return (
          <span key={i} className="whitespace-pre-wrap">
            {part}
          </span>
        )
      })}
      {isStreaming && (
        <span className="ml-0.5 inline-block h-4 w-1.5 animate-pulse bg-primary" />
      )}
    </>
  )
}
