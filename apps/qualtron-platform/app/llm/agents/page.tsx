'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'

interface DeployedModel {
  id: string
  name: string
  status: string
  base_family: string
  context_tokens: number
  vram_gb: number
  gpu_count: number
  behavior?: string
  createdAt?: string
}

const STATUS_CONFIG: Record<string, { label: string; cls: string }> = {
  ready: {
    label: 'Ready',
    cls: 'bg-success/20 text-success',
  },
  loading: {
    label: 'Loading',
    cls: 'bg-warning/20 text-warning animate-pulse',
  },
  stopped: {
    label: 'Stopped',
    cls: 'bg-muted text-muted-foreground',
  },
}

interface CortexConfig {
  name: string
  behavior: string
  stages: {
    id: string
    name: string
    model: string
    modelName?: string
    qhmTokenCount: number
  }[]
  createdAt: string
}

export default function ModelInstancesPage() {
  const [models, setModels] = useState<DeployedModel[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [confirmUndeploy, setConfirmUndeploy] = useState(false)
  const [undeploying, setUndeploying] = useState(false)

  const fetchModels = useCallback(async () => {
    const all: DeployedModel[] = []

    // Only show models that were deployed via Spine Cortex (saved in localStorage)
    try {
      const saved = JSON.parse(
        localStorage.getItem('cortex-configs') ?? '[]',
      ) as CortexConfig[]
      if (saved.length > 0) {
        const latest = saved[0]
        // Check if SGLang is actually running
        let sglangReady = false
        try {
          const res = await fetch('/api/models')
          const data = await res.json()
          sglangReady = (data.models ?? []).some(
            (m: { provider: string }) => m.provider === 'qualtron',
          )
        } catch {}

        if (sglangReady) {
          // Show each stage as a deployed model
          for (const stage of latest.stages) {
            all.push({
              id: `cortex:${latest.name}:${stage.id}`,
              name: `${latest.name} — ${stage.name}`,
              status: 'ready',
              base_family: stage.modelName ?? stage.model,
              context_tokens:
                stage.qhmTokenCount > 0 ? stage.qhmTokenCount : 262000,
              vram_gb: 138,
              gpu_count: 2,
              behavior: latest.behavior,
              createdAt: latest.createdAt,
            })
          }
        }
      }
    } catch {}

    setModels(all)
    setError(null)
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchModels()
    const interval = setInterval(fetchModels, 10000)
    return () => clearInterval(interval)
  }, [fetchModels])

  const handleUndeployAll = useCallback(async () => {
    setUndeploying(true)
    setError(null)
    try {
      // Clear cortex configs and behavior from localStorage
      localStorage.removeItem('cortex-configs')
      localStorage.removeItem('cag-behavior')
      setModels([])
      setConfirmUndeploy(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed')
    } finally {
      setUndeploying(false)
    }
  }, [])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Cognitive Models
          </h1>
          <p className="text-muted-foreground">
            Deployed Qualtron cognitive models on GPU.
          </p>
        </div>
        <div className="flex gap-2">
          {models.length > 0 && !confirmUndeploy && (
            <button
              onClick={() => setConfirmUndeploy(true)}
              className="rounded-md bg-destructive/10 px-4 py-2 text-sm font-medium text-destructive hover:bg-destructive/20"
            >
              Undeploy All
            </button>
          )}
          {confirmUndeploy && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-destructive">
                Remove all deployed models?
              </span>
              <button
                onClick={handleUndeployAll}
                disabled={undeploying}
                className="rounded-md bg-destructive px-3 py-1.5 text-xs font-medium text-destructive-foreground hover:bg-destructive/90 disabled:opacity-50"
              >
                {undeploying ? '...' : 'Yes, Undeploy'}
              </button>
              <button
                onClick={() => setConfirmUndeploy(false)}
                className="rounded-md bg-muted px-3 py-1.5 text-xs text-muted-foreground"
              >
                Cancel
              </button>
            </div>
          )}
          <Link
            href="/llm/cortex"
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            New Cortex
          </Link>
        </div>
      </div>

      {error && (
        <div className="flex items-center justify-between rounded-lg border border-destructive/50 bg-destructive/10 p-3">
          <span className="text-sm text-destructive">{error}</span>
          <button
            onClick={() => setError(null)}
            className="text-xs text-destructive hover:underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {loading ? (
        <div className="rounded-lg border border-border bg-card p-8 text-center text-sm text-muted-foreground">
          Loading deployed models...
        </div>
      ) : models.length === 0 ? (
        <div className="rounded-lg border border-border bg-card p-12 text-center">
          <div className="mb-3 text-3xl">🧠</div>
          <h3 className="text-sm font-semibold">No models deployed</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            Create and activate a{' '}
            <Link href="/llm/cortex" className="text-primary hover:underline">
              Spine Cortex
            </Link>{' '}
            to deploy cognitive models.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {models.map((m) => {
            const status = STATUS_CONFIG[m.status] ?? STATUS_CONFIG.stopped
            return (
              <div
                key={m.id}
                className="rounded-lg border border-border bg-card p-4"
              >
                <div className="mb-2 flex items-center justify-between">
                  <h3 className="text-sm font-semibold">{m.name}</h3>
                  <div className="flex items-center gap-1.5">
                    <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
                      GPU
                    </span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${status.cls}`}
                    >
                      {status.label}
                    </span>
                  </div>
                </div>

                <div className="space-y-1 text-xs text-muted-foreground">
                  <div className="flex justify-between">
                    <span>Model</span>
                    <span className="font-mono">{m.base_family}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Context</span>
                    <span className="font-mono">
                      {m.context_tokens > 1000
                        ? `${(m.context_tokens / 1000).toFixed(0)}K`
                        : `${m.context_tokens}`}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>VRAM</span>
                    <span className="font-mono">{m.vram_gb} GB</span>
                  </div>
                  {m.behavior && (
                    <div className="flex justify-between">
                      <span>Behavior</span>
                      <span className="font-mono capitalize">{m.behavior}</span>
                    </div>
                  )}
                </div>

                <div className="mt-3">
                  {m.status === 'ready' && (
                    <Link
                      href="/playground"
                      className="rounded-md bg-primary/10 px-3 py-1.5 text-[10px] font-medium text-primary hover:bg-primary/20"
                    >
                      Chat →
                    </Link>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
