'use client'

import { useCallback, useEffect, useState } from 'react'
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
  source?: 'qinference' | 'sglang'
}

const STATUS_CONFIG: Record<
  string,
  { label: string; cls: string; canUndeploy: boolean }
> = {
  ready: {
    label: 'Ready',
    cls: 'bg-success/20 text-success',
    canUndeploy: true,
  },
  loading: {
    label: 'Loading',
    cls: 'bg-warning/20 text-warning animate-pulse',
    canUndeploy: true,
  },
  queued: {
    label: 'Queued',
    cls: 'bg-muted text-muted-foreground',
    canUndeploy: true,
  },
  error: {
    label: 'Error',
    cls: 'bg-destructive/20 text-destructive',
    canUndeploy: true,
  },
  stopped: {
    label: 'Stopped',
    cls: 'bg-muted text-muted-foreground',
    canUndeploy: false,
  },
}

/** Map SGLang HuggingFace IDs to Qualtron branded names */
const SGLANG_BRAND: Record<
  string,
  {
    name: string
    family: string
    context: number
    vram: number
    gpus: number
  }
> = {
  'nvidia/NVIDIA-Nemotron-3-Super-120B-A12B-FP8': {
    name: 'Qualtron-120B Cognitive Model',
    family: 'coder-pro',
    context: 262000,
    vram: 138,
    gpus: 2,
  },
  'nvidia/Nemotron-3-Super-49B-v1': {
    name: 'Qualtron-49B Cognitive Model',
    family: 'thinker',
    context: 262000,
    vram: 48,
    gpus: 1,
  },
  'Qwen/Qwen3.5-4B': {
    name: 'Qualtron-Mini-4B Cognitive Model',
    family: 'mini',
    context: 1048000,
    vram: 11,
    gpus: 1,
  },
  'nvidia/Nemotron-3-Nano-4B': {
    name: 'Qualtron-Nano-4B Cognitive Model',
    family: 'nano',
    context: 524000,
    vram: 16,
    gpus: 1,
  },
}

export default function ModelInstancesPage() {
  const [models, setModels] = useState<DeployedModel[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)

  const fetchModels = useCallback(async () => {
    const all: DeployedModel[] = []

    // 1. Discover live SGLang GPU models (always running)
    try {
      const res = await fetch('/api/models')
      const data = await res.json()
      for (const m of data.models ?? []) {
        if (m.provider !== 'qualtron') continue
        // Extract the raw model ID from qualtron:xxx
        const rawId = m.id.replace('qualtron:', '')
        const brand = SGLANG_BRAND[rawId]
        all.push({
          id: `sglang:${rawId}`,
          variant_id: rawId,
          name: brand?.name ?? m.name,
          status: 'ready',
          base_family: brand?.family ?? 'gpu',
          context_tokens: brand?.context ?? 262000,
          vram_gb: brand?.vram ?? 0,
          gpu_count: brand?.gpus ?? 1,
          total_requests: 0,
          total_tokens: 0,
          source: 'sglang',
        })
      }
    } catch {}

    // 2. Q-Inference deployed models (if any are active)
    try {
      const res = await fetch('/api/qinference/models')
      const data = await res.json()
      for (const m of data.data ?? []) {
        if (
          m.status !== 'ready' &&
          m.status !== 'loading' &&
          m.status !== 'queued'
        )
          continue
        all.push({ ...m, source: 'qinference' as const })
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

  const handleUndeploy = useCallback(
    async (modelId: string) => {
      // SGLang models can't be undeployed from the UI
      if (modelId.startsWith('sglang:')) return
      setDeleting(modelId)
      setError(null)
      try {
        const res = await fetch(`/api/qinference/models/${modelId}`, {
          method: 'DELETE',
        })
        if (!res.ok) {
          const data = await res.json()
          throw new Error(data.error ?? 'Undeploy failed')
        }
        setConfirmDelete(null)
        await fetchModels()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Undeploy failed')
      } finally {
        setDeleting(null)
      }
    },
    [fetchModels],
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Cognitive Models
          </h1>
          <p className="text-muted-foreground">
            Active Qualtron cognitive models on GPU.
            {models.length > 0 && (
              <span className="ml-1 text-xs text-muted-foreground/60">
                (auto-refreshes)
              </span>
            )}
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
            Deploy from the{' '}
            <Link href="/llm/deploy" className="text-primary hover:underline">
              catalog
            </Link>{' '}
            or create a{' '}
            <Link href="/llm/cortex" className="text-primary hover:underline">
              Spine Cortex
            </Link>
            .
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {models.map((m) => {
            const status = STATUS_CONFIG[m.status] ?? STATUS_CONFIG.stopped
            const isConfirming = confirmDelete === m.id
            const isSglang = m.source === 'sglang'
            return (
              <div
                key={m.id}
                className="rounded-lg border border-border bg-card p-4"
              >
                <div className="mb-2 flex items-center justify-between">
                  <h3 className="text-sm font-semibold">{m.name}</h3>
                  <div className="flex items-center gap-1.5">
                    {isSglang && (
                      <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
                        GPU
                      </span>
                    )}
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${status.cls}`}
                    >
                      {status.label}
                    </span>
                  </div>
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
                  {!isSglang && (
                    <div className="flex justify-between">
                      <span>Requests</span>
                      <span className="font-mono">
                        {m.total_requests.toLocaleString()}
                      </span>
                    </div>
                  )}
                </div>

                <div className="mt-3 flex gap-2">
                  {m.status === 'ready' && (
                    <Link
                      href="/playground"
                      className="rounded-md bg-primary/10 px-3 py-1.5 text-[10px] font-medium text-primary hover:bg-primary/20"
                    >
                      Chat →
                    </Link>
                  )}
                  {!isSglang && status.canUndeploy && !isConfirming && (
                    <button
                      onClick={() => setConfirmDelete(m.id)}
                      className="rounded-md bg-destructive/10 px-3 py-1.5 text-[10px] font-medium text-destructive hover:bg-destructive/20"
                    >
                      Undeploy
                    </button>
                  )}
                  {isConfirming && (
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] text-destructive">
                        Confirm?
                      </span>
                      <button
                        onClick={() => handleUndeploy(m.id)}
                        disabled={deleting === m.id}
                        className="rounded bg-destructive px-2 py-1 text-[10px] font-medium text-destructive-foreground hover:bg-destructive/90 disabled:opacity-50"
                      >
                        {deleting === m.id ? '...' : 'Yes'}
                      </button>
                      <button
                        onClick={() => setConfirmDelete(null)}
                        className="rounded bg-muted px-2 py-1 text-[10px] text-muted-foreground"
                      >
                        No
                      </button>
                    </div>
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
