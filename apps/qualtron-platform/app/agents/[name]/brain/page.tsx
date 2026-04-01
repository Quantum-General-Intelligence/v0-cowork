'use client'

import { use } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { BRAIN_REPO_TYPES, brainRepoName, type BrainRepoType } from '@qgst/client'

const BRAIN_LABELS: Record<BrainRepoType, string> = {
  episodic: 'Episodic Memory',
  knowledge: 'Knowledge Store',
  analysis: 'Analysis Workspace',
  context: 'Context & Focus',
  inbox: 'Inbox',
}

export default function BrainBrowserPage({
  params,
}: {
  params: Promise<{ name: string }>
}) {
  const { name } = use(params)
  const searchParams = useSearchParams()
  const activeRepo = (searchParams.get('repo') as BrainRepoType) ?? 'knowledge'
  const repoFullName = brainRepoName(name, activeRepo)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href={`/agents/${name}`}
          className="text-muted-foreground hover:text-foreground"
        >
          ← {name}
        </Link>
        <span className="text-muted-foreground">/</span>
        <h1 className="text-2xl font-bold tracking-tight">Brain Memory</h1>
      </div>

      {/* Repo Tabs */}
      <div className="flex gap-2 overflow-x-auto">
        {BRAIN_REPO_TYPES.map((type) => (
          <Link
            key={type}
            href={`/agents/${name}/brain?repo=${type}`}
            className={`whitespace-nowrap rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
              activeRepo === type
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}
          >
            {BRAIN_LABELS[type]}
          </Link>
        ))}
      </div>

      {/* Browser */}
      <div className="rounded-lg border border-border bg-card p-6">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-card-foreground">
              {BRAIN_LABELS[activeRepo]}
            </h3>
            <p className="mt-1 font-mono text-xs text-muted-foreground">
              {repoFullName}
            </p>
          </div>
        </div>
        <div className="text-center text-sm text-muted-foreground">
          Connect Q-GST Versioned Memory to browse files. The MemoryBrowser
          component will render the file tree here.
        </div>
      </div>
    </div>
  )
}
