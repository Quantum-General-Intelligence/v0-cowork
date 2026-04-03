'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'

interface CagAgent {
  id: string
  name: string
  description: string
  system_prompt: string
  quality: string
  mode: string
  temperature: number
  max_tokens: number
  kb: { chunks: number; size_bytes: number } | null
  requests_today: number
  tokens_today: number
  created_at: number
}

const QUALITY_COLORS: Record<string, string> = {
  max: 'bg-accent/20 text-accent',
  balanced: 'bg-primary/20 text-primary',
  fast: 'bg-info/20 text-info',
}

export default function AgentsPage() {
  const [agents, setAgents] = useState<CagAgent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchAgents = useCallback(async () => {
    try {
      const res = await fetch('/api/agents')
      const data = await res.json()
      setAgents(data.data ?? [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load agents')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchAgents()
  }, [fetchAgents])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">CAG Agents</h1>
          <p className="text-muted-foreground">
            Context-Augmented Generation agents. Each agent has a knowledge base
            and is bound to a deployed Qualtron model.
          </p>
        </div>
        <Link
          href="/agents/register"
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          + New Agent
        </Link>
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
          {error} — is the Q-Inference API running on{' '}
          <span className="font-mono">:8000</span>?
        </div>
      )}

      {loading ? (
        <div className="rounded-lg border border-border bg-card p-12 text-center text-sm text-muted-foreground">
          Loading agents from Q-Inference...
        </div>
      ) : agents.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border bg-card p-12 text-center">
          <p className="text-muted-foreground">No agents yet.</p>
          <Link
            href="/agents/register"
            className="mt-4 inline-block rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Create your first CAG agent →
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {agents.map((agent) => (
            <div
              key={agent.id}
              className="rounded-lg border border-border bg-card p-4 space-y-3"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="text-sm font-semibold">{agent.name}</h3>
                  {agent.description && (
                    <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">
                      {agent.description}
                    </p>
                  )}
                </div>
                <span
                  className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${QUALITY_COLORS[agent.quality] ?? 'bg-muted text-muted-foreground'}`}
                >
                  {agent.quality}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <div className="text-muted-foreground">KB chunks</div>
                  <div className="font-mono font-medium">
                    {agent.kb?.chunks ?? 0}
                  </div>
                </div>
                <div>
                  <div className="text-muted-foreground">Req today</div>
                  <div className="font-mono font-medium">
                    {agent.requests_today.toLocaleString()}
                  </div>
                </div>
                <div>
                  <div className="text-muted-foreground">Tokens today</div>
                  <div className="font-mono font-medium">
                    {(agent.tokens_today / 1000).toFixed(1)}K
                  </div>
                </div>
                <div>
                  <div className="text-muted-foreground">Mode</div>
                  <div className="font-mono font-medium">{agent.mode}</div>
                </div>
              </div>

              <div className="flex gap-2 pt-1">
                <Link
                  href={`/playground?agent=${agent.id}`}
                  className="rounded-md bg-primary/10 px-3 py-1.5 text-[10px] font-medium text-primary hover:bg-primary/20"
                >
                  Chat →
                </Link>
                <Link
                  href={`/agents/${agent.id}`}
                  className="rounded-md bg-muted px-3 py-1.5 text-[10px] font-medium text-muted-foreground hover:bg-muted/80"
                >
                  Settings
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
