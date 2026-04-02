'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'

export interface ChatSession {
  id: string
  title: string
  model: string
  updatedAt: string
}

interface ChatSidebarProps {
  sessions: ChatSession[]
  activeSessionId?: string
  onSelectSession: (id: string) => void
  onNewSession: () => void
  onDeleteSession: (id: string) => void
  onRenameSession: (id: string, title: string) => void
}

export function ChatSidebar({
  sessions,
  activeSessionId,
  onSelectSession,
  onNewSession,
  onDeleteSession,
  onRenameSession,
}: ChatSidebarProps) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')

  const startRename = (session: ChatSession) => {
    setEditingId(session.id)
    setEditValue(session.title)
  }

  const commitRename = () => {
    if (editingId && editValue.trim()) {
      onRenameSession(editingId, editValue.trim())
    }
    setEditingId(null)
  }

  return (
    <div className="flex h-full flex-col border-r border-border bg-sidebar">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-3 py-2.5">
        <span className="text-xs font-semibold text-sidebar-foreground">
          Chat History
        </span>
        <button
          onClick={onNewSession}
          className="rounded-md bg-primary px-2 py-1 text-[10px] font-medium text-primary-foreground hover:bg-primary/90"
        >
          + New
        </button>
      </div>

      {/* Session List */}
      <div className="flex-1 overflow-y-auto">
        {sessions.length === 0 ? (
          <div className="p-4 text-center text-xs text-muted-foreground">
            No conversations yet
          </div>
        ) : (
          sessions.map((session) => (
            <div
              key={session.id}
              className={cn(
                'group flex items-center border-b border-border/50 px-3 py-2.5 transition-colors',
                activeSessionId === session.id
                  ? 'bg-sidebar-accent'
                  : 'hover:bg-sidebar-accent/50',
              )}
            >
              {editingId === session.id ? (
                <input
                  autoFocus
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  onBlur={commitRename}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') commitRename()
                    if (e.key === 'Escape') setEditingId(null)
                  }}
                  className="flex-1 bg-transparent text-xs outline-none"
                />
              ) : (
                <button
                  onClick={() => onSelectSession(session.id)}
                  className="flex-1 text-left"
                >
                  <div className="truncate text-xs font-medium text-sidebar-foreground">
                    {session.title}
                  </div>
                  <div className="mt-0.5 truncate text-[10px] text-muted-foreground">
                    {session.model}
                  </div>
                </button>
              )}

              {/* Actions */}
              <div className="ml-2 flex gap-1 opacity-0 group-hover:opacity-100">
                <button
                  onClick={() => startRename(session)}
                  className="text-[10px] text-muted-foreground hover:text-foreground"
                  title="Rename"
                >
                  ✏️
                </button>
                <button
                  onClick={() => onDeleteSession(session.id)}
                  className="text-[10px] text-muted-foreground hover:text-destructive"
                  title="Delete"
                >
                  🗑️
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
