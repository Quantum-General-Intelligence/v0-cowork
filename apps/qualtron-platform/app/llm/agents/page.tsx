'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

interface DeployedModel {
  id: string
  variant_id: string
  name: string
  status: string
  base_family: string
  context_tokens: number
  vram_gb: number
  gpu_count: number
  total_requests: number
  total_tokens: number
}

const STATUS_COLORS: Record<string, string> = {
  ready: 'bg-success/20 text-success',
  loading: 'bg-warning/20 text-warning',
  queued: 'bg-muted text-muted-foreground',
  error: 'bg-destructive/20 text-destructive',
  stopped: 'bg-muted text-muted-foreground',
}

export default function ModelInstancesPage() {
  const [models, setModels] = useState<DeployedModel[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/qinference/models')
      .then((r) => r.json())
      .then((d) => setModels(d.data ?? []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Model Instances</h1>
          <p className="text-muted-foreground">
            Deployed Qualtron models running on GPU. Deploy new models from the
            catalog or configure a Spine Cortex pipeline.
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/llm/cortex"
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            New Cortex
          </Link>
          <Link
            href="/llm/deploy"
            className="rounded-md bg-muted px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-muted/80"
          >
            Deploy Catalog
          </Link>
        </div>
      </div>

      {loading ? (
        <div className="rounded-lg border border-border bg-card p-8 text-center text-sm text-muted-foreground">
          Loading deployed models from Q-Inference...
        </div>
      ) : models.length === 0 ? (
        <div className="rounded-lg border border-border bg-card p-12 text-center">
          <div className="mb-3 text-3xl">🧠</div>
          <h3 className="text-sm font-semibold">No models deployed</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            Deploy a model from the{' '}
            <Link href="/llm/deploy" className="text-primary hover:underline">
              catalog
            </Link>{' '}
            or create a{' '}
            <Link href="/llm/cortex" className="text-primary hover:underline">
              Spine Cortex
            </Link>{' '}
            pipeline.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {models.map((m) => (
            <div
              key={m.id}
              className="rounded-lg border border-border bg-card p-4"
            >
              <div className="mb-2 flex items-center justify-between">
                <h3 className="text-sm font-semibold">{m.name}</h3>
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${STATUS_COLORS[m.status] ?? 'bg-muted text-muted-foreground'}`}
                >
                  {m.status}
                </span>
              </div>
              <div className="space-y-1 text-xs text-muted-foreground">
                <div className="flex justify-between">
                  <span>Family</span>
                  <span className="font-mono">{m.base_family}</span>
                </div>
                <div className="flex justify-between">
                  <span>Context</span>
                  <span className="font-mono">
                    {(m.context_tokens / 1000).toFixed(0)}K
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>VRAM</span>
                  <span className="font-mono">{m.vram_gb} GB</span>
                </div>
                <div className="flex justify-between">
                  <span>GPUs</span>
                  <span className="font-mono">{m.gpu_count}</span>
                </div>
                <div className="flex justify-between">
                  <span>Requests</span>
                  <span className="font-mono">
                    {m.total_requests.toLocaleString()}
                  </span>
                </div>
              </div>
              {m.status === 'ready' && (
                <Link
                  href="/playground"
                  className="mt-3 inline-block rounded-md bg-primary/10 px-3 py-1.5 text-[10px] font-medium text-primary hover:bg-primary/20"
                >
                  Chat in Playground →
                </Link>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
