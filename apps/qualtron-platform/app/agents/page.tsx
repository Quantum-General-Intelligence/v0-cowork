'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { AgentCard } from '@qgst/ui'
import type { Agent } from '@qgst/client'

// Mock data for development — replaced by live SpacetimeDB subscription later
const MOCK_AGENTS: Agent[] = [
  {
    identity: 'id-alice',
    tenant: 'acme',
    name: 'alice',
    role: 'ai_agent',
    permissions: '["read","write"]',
    created_at: Date.now() * 1000,
    last_seen: Date.now() * 1000,
  },
  {
    identity: 'id-bob',
    tenant: 'acme',
    name: 'bob',
    role: 'ai_agent',
    permissions: '["read","write","graph:write"]',
    created_at: Date.now() * 1000,
    last_seen: Date.now() * 1000,
  },
  {
    identity: 'id-sam',
    tenant: 'acme',
    name: 'sam',
    role: 'human',
    permissions: '["read","write","admin"]',
    created_at: Date.now() * 1000,
    last_seen: Date.now() * 1000,
  },
  {
    identity: 'id-ingestor',
    tenant: 'acme',
    name: 'ingestor',
    role: 'service',
    permissions: '["read","write","graph:write","memory:write"]',
    created_at: Date.now() * 1000,
    last_seen: Date.now() * 1000,
  },
]

const ROLE_LABELS: Record<string, string> = {
  human: 'Human Operator',
  ai_agent: 'AI Agent',
  service: 'Engine Service',
  system: 'System',
}

export default function AgentsPage() {
  const [agents, setAgents] = useState<Agent[]>(MOCK_AGENTS)
  const [filter, setFilter] = useState<string>('all')

  const filtered =
    filter === 'all' ? agents : agents.filter((a) => a.role === filter)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Agents</h1>
          <p className="text-muted-foreground">
            Registered agents in the Q-GST Engine. Each agent has an identity,
            brain memory, and learned skills.
          </p>
        </div>
        <Link
          href="/agents/register"
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          Register Agent
        </Link>
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        {['all', 'ai_agent', 'human', 'service'].map((role) => (
          <button
            key={role}
            onClick={() => setFilter(role)}
            className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
              filter === role
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}
          >
            {role === 'all'
              ? `All (${agents.length})`
              : `${ROLE_LABELS[role] ?? role} (${agents.filter((a) => a.role === role).length})`}
          </button>
        ))}
      </div>

      {/* Agent Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((agent) => (
          <Link key={agent.identity} href={`/agents/${agent.name}`}>
            <AgentCard agent={agent} />
          </Link>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="rounded-lg border border-border bg-card p-12 text-center">
          <p className="text-muted-foreground">
            No agents match this filter.
          </p>
        </div>
      )}
    </div>
  )
}
