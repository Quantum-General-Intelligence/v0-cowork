'use client'

import { use } from 'react'
import Link from 'next/link'
import { BRAIN_REPO_TYPES, type BrainRepoType } from '@qgst/client'

const BRAIN_LABELS: Record<
  BrainRepoType,
  { label: string; description: string }
> = {
  episodic: {
    label: 'Episodic Memory',
    description: 'Session logs, archived events, interaction history',
  },
  knowledge: {
    label: 'Knowledge Store',
    description: 'Entity profiles, validated facts, domain expertise',
  },
  analysis: {
    label: 'Analysis Workspace',
    description: 'Work products, reports, review outputs',
  },
  context: {
    label: 'Context & Focus',
    description: 'Active focus, decision logs, session state',
  },
  inbox: {
    label: 'Inbox',
    description: 'Documents and files queued for processing',
  },
}

export default function AgentDetailPage({
  params,
}: {
  params: Promise<{ name: string }>
}) {
  const { name } = use(params)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href="/agents"
          className="text-muted-foreground hover:text-foreground"
        >
          ← Agents
        </Link>
        <span className="text-muted-foreground">/</span>
        <h1 className="text-2xl font-bold tracking-tight">{name}</h1>
        <span className="rounded-full bg-accent/20 px-2.5 py-0.5 text-xs font-medium text-accent">
          AI Agent
        </span>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="Events Today" value="—" />
        <StatCard label="Graph Nodes" value="—" />
        <StatCard label="Open Reviews" value="—" />
        <StatCard label="Skills" value="—" />
      </div>

      {/* Brain Repos */}
      <div>
        <h2 className="mb-3 text-lg font-semibold">Brain Memory</h2>
        <p className="mb-4 text-sm text-muted-foreground">
          Each agent has 5 memory stores managed by the Q-GST Engine.
        </p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {BRAIN_REPO_TYPES.map((type) => {
            const info = BRAIN_LABELS[type]
            return (
              <Link
                key={type}
                href={`/agents/${name}/brain?repo=${type}`}
                className="rounded-lg border border-border bg-card p-4 transition-colors hover:border-primary/50"
              >
                <div className="mb-1 text-sm font-semibold text-card-foreground">
                  {info.label}
                </div>
                <div className="text-xs text-muted-foreground">
                  {info.description}
                </div>
                <div className="mt-2 font-mono text-xs text-primary/70">
                  {name}-{type}
                </div>
              </Link>
            )
          })}
        </div>
      </div>

      {/* Skills & Knowledge Reviews */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div>
          <h2 className="mb-3 text-lg font-semibold">Learned Skills</h2>
          <p className="mb-3 text-sm text-muted-foreground">
            Skills are learned methodology stored in the agent&apos;s knowledge
            wiki. They improve over time via quality feedback.
          </p>
          <Link
            href={`/agents/${name}/skills`}
            className="inline-flex items-center gap-2 rounded-md bg-muted px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted/80"
          >
            View Skill Library →
          </Link>
        </div>

        <div>
          <h2 className="mb-3 text-lg font-semibold">Knowledge Reviews</h2>
          <p className="mb-3 text-sm text-muted-foreground">
            Pending reviews where agent work requires human validation before
            being added to the knowledge store.
          </p>
          <div className="rounded-lg border border-border bg-card p-6 text-center text-sm text-muted-foreground">
            No pending reviews.
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div>
        <h2 className="mb-3 text-lg font-semibold">Recent Activity</h2>
        <div className="rounded-lg border border-border bg-card p-6 text-center text-sm text-muted-foreground">
          Connect to Q-GST Engine to view real-time episodic memory stream.
        </div>
      </div>
    </div>
  )
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-card p-3">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-xl font-bold text-card-foreground">{value}</p>
    </div>
  )
}
