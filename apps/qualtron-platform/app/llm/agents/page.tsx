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
}

const STATUS_CONFIG: Record<string, { label: string; cls: string; canUndeploy: boolean }> = {
  ready: { label: 'Ready', cls: 'bg-success/20 text-success', canUndeploy: true },
  loading: { label: 'Loading', cls: 'bg-warning/20 text-warning animate-pulse', canUndeploy: true },
  queued: { label: 'Queued', cls: 'bg-muted text-muted-foreground', canUndeploy: true },
  error: { label: 'Error', cls: 'bg-destructive/20 text-destructive', canUndeploy: true },
  stopped: { label: 'Stopped', cls: 'bg-muted text-muted-foreground', canUndeploy: false },
}

export default function ModelInstancesPage() {
  const [models, setModels] = useState<DeployedModel[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)

  const fetchModels = useCallback(async () => {
    try {
      const res = await fetch('/api/qinference/models')
      const data = await res.json()
      setModels(data.data ?? [])
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchModels()
    // Auto-refresh every 10s to catch status changes
    const interval = setInterval(fetchModels, 10000)
    return () => clearInterval(interval)
  }, [fetchModels])

  const handleUndeploy = useCallback(async (modelId: string) => {
    setDeleting(modelId)
    setError(null)
    try {
      const res = await fetch(`/api/qinference/models/${modelId}`, { method: 'DELETE' })
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
  }, [fetchModels])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Model Instances</h1>
          <p className="text-muted-foreground">
            Deployed Qualtron models on GPU.
            {models.length > 0 && <span className="ml-1 text-xs text-muted-foreground/60">(auto-refreshes)</span>}
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/llm/cortex" className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
            New Cortex
          </Link>
          <Link href="/llm/deploy" className="rounded-md bg-muted px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-muted/80">
            Deploy Catalog
          </Link>
        </div>
      </div>

      {error && (
        <div className="flex items-center justify-between rounded-lg border border-destructive/50 bg-destructive/10 p-3">
          <span className="text-sm text-destructive">{error}</span>
          <button onClick={() => setError(null)} className="text-xs text-destructive hover:underline">Dismiss</button>
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
            Deploy from the <Link href="/llm/deploy" className="text-primary hover:underline">catalog</Link> or create a <Link href="/llm/cortex" className="text-primary hover:underline">Spine Cortex</Link>.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {models.map((m) => {
            const status = STATUS_CONFIG[m.status] ?? STATUS_CONFIG.stopped
            const isConfirming = confirmDelete === m.id
            return (
              <div key={m.id} className="rounded-lg border border-border bg-card p-4">
                <div className="mb-2 flex items-center justify-between">
                  <h3 className="text-sm font-semibold">{m.name}</h3>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${status.cls}`}>
                    {status.label}
                  </span>
                </div>

                <div className="space-y-1 text-xs text-muted-foreground">
                  <div className="flex justify-between"><span>Family</span><span className="font-mono">{m.base_family}</span></div>
                  <div className="flex justify-between"><span>Context</span><span className="font-mono">{(m.context_tokens / 1000).toFixed(0)}K</span></div>
                  <div className="flex justify-between"><span>VRAM</span><span className="font-mono">{m.vram_gb} GB</span></div>
                  <div className="flex justify-between"><span>GPUs</span><span className="font-mono">{m.gpu_count}</span></div>
                  <div className="flex justify-between"><span>Requests</span><span className="font-mono">{m.total_requests.toLocaleString()}</span></div>
                </div>

                <div className="mt-3 flex gap-2">
                  {m.status === 'ready' && (
                    <Link href="/playground" className="rounded-md bg-primary/10 px-3 py-1.5 text-[10px] font-medium text-primary hover:bg-primary/20">
                      Chat →
                    </Link>
                  )}
                  {status.canUndeploy && !isConfirming && (
                    <button
                      onClick={() => setConfirmDelete(m.id)}
                      className="rounded-md bg-destructive/10 px-3 py-1.5 text-[10px] font-medium text-destructive hover:bg-destructive/20"
                    >
                      Undeploy
                    </button>
                  )}
                  {isConfirming && (
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] text-destructive">Confirm?</span>
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
