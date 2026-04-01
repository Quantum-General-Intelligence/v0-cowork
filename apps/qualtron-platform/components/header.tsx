'use client'

import { StatusBadge } from '@qgst/ui'

export function Header() {
  return (
    <header className="flex h-14 items-center justify-between border-b border-border bg-background px-6">
      <div className="flex items-center gap-4">
        <h2 className="text-sm font-medium text-muted-foreground">
          Qualtron Platform
        </h2>
      </div>
      <div className="flex items-center gap-4">
        <StatusBadge label="Engine" status="disconnected" size="sm" />
        <StatusBadge label="LLM" status="disconnected" size="sm" />
      </div>
    </header>
  )
}
