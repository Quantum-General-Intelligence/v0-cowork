'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'

interface CatalogVariant {
  id: string
  name: string
  base_family: string
  huggingface_repo: string
  total_params: string
  active_params: string
  context_tokens: number
  native_context: number
  yarn_multiplier: number
  vram_gb: number
  avg_latency_s: number
  latency_108k_s: number | null
  architecture: string
  gpu_count: number
  supports_thinking: boolean
  supports_prefix_cache: boolean
}

interface DeployedModel {
  id: string
  variant_id: string
  name: string
  status: 'queued' | 'loading' | 'ready' | 'error' | 'stopped'
  endpoint: string
  base_family: string
  context_tokens: number
  vram_gb: number
  gpu_count: number
  total_requests: number
  total_tokens: number
}

const FAMILY_LABELS: Record<string, { label: string; color: string }> = {
  nano: { label: 'Nano', color: 'bg-accent/20 text-accent' },
  mini: { label: 'Mini', color: 'bg-primary/20 text-primary' },
  coder: { label: 'Coder', color: 'bg-info/20 text-info' },
  thinker: { label: 'Thinker', color: 'bg-warning/20 text-warning' },
  'coder-pro': {
    label: 'Coder Pro',
    color: 'bg-destructive/20 text-destructive',
  },
}

const STATUS_COLORS: Record<string, string> = {
  ready: 'bg-success/20 text-success',
  loading: 'bg-warning/20 text-warning',
  queued: 'bg-muted text-muted-foreground',
  error: 'bg-destructive/20 text-destructive',
  stopped: 'bg-muted text-muted-foreground',
}

export default function DeployPage() {
  const [catalog, setCatalog] = useState<CatalogVariant[]>([])
  const [deployed, setDeployed] = useState<DeployedModel[]>([])
  const [familyFilter, setFamilyFilter] = useState('all')
  const [loading, setLoading] = useState(true)
  const [deploying, setDeploying] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    try {
      const [catRes, depRes] = await Promise.all([
        fetch('/api/qinference/catalog').then((r) => r.json()),
        fetch('/api/qinference/models').then((r) => r.json()),
      ])
      setCatalog(catRes.data ?? [])
      setDeployed(depRes.data ?? [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleDeploy = useCallback(
    async (variantId: string) => {
      setDeploying(variantId)
      setError(null)
      try {
        await fetch('/api/qinference/models', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ variant_id: variantId }),
        })
        await fetchData()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Deploy failed')
      } finally {
        setDeploying(null)
      }
    },
    [fetchData],
  )

  const families = ['all', ...new Set(catalog.map((v) => v.base_family))]
  const filtered =
    familyFilter === 'all'
      ? catalog
      : catalog.filter((v) => v.base_family === familyFilter)
  const deployedIds = new Set(deployed.map((d) => d.variant_id))

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Qualtron Model Deploy
        </h1>
        <p className="text-muted-foreground">
          Deploy Qualtron model variants to GPU. 5 base models × YaRN context
          scaling = 17 variants.
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Deployed */}
      <div>
        <h2 className="mb-3 text-lg font-semibold">
          Deployed ({deployed.length})
        </h2>
        {deployed.length === 0 ? (
          <div className="rounded-lg border border-border bg-card p-6 text-center text-sm text-muted-foreground">
            {loading ? 'Loading...' : 'No models deployed yet.'}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {deployed.map((m) => (
              <div
                key={m.id}
                className="rounded-lg border border-border bg-card p-4"
              >
                <div className="mb-2 flex items-center justify-between">
                  <h3 className="text-sm font-semibold">{m.name}</h3>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${STATUS_COLORS[m.status] ?? ''}`}
                  >
                    {m.status}
                  </span>
                </div>
                <div className="space-y-1 text-xs text-muted-foreground">
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
                    Chat →
                  </Link>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Catalog */}
      <div>
        <h2 className="mb-3 text-lg font-semibold">
          Catalog ({catalog.length})
        </h2>
        <div className="mb-4 flex flex-wrap gap-2">
          {families.map((f) => (
            <button
              key={f}
              onClick={() => setFamilyFilter(f)}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                familyFilter === f
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
            >
              {f === 'all'
                ? `All (${catalog.length})`
                : `${FAMILY_LABELS[f]?.label ?? f} (${catalog.filter((v) => v.base_family === f).length})`}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="rounded-lg border border-border bg-card p-6 text-center text-sm text-muted-foreground">
            Loading catalog from Q-Inference...
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            {filtered.map((v) => {
              const fam = FAMILY_LABELS[v.base_family]
              const isDeployed = deployedIds.has(v.id)
              return (
                <div
                  key={v.id}
                  className={`rounded-lg border bg-card p-4 ${isDeployed ? 'border-accent/50' : 'border-border'}`}
                >
                  <div className="mb-2 flex items-center gap-2">
                    <h3 className="text-sm font-semibold">{v.name}</h3>
                    {fam && (
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${fam.color}`}
                      >
                        {fam.label}
                      </span>
                    )}
                    {isDeployed && (
                      <span className="rounded-full bg-accent/20 px-2 py-0.5 text-[10px] text-accent">
                        Deployed
                      </span>
                    )}
                  </div>

                  <div className="mb-3 grid grid-cols-4 gap-2 text-xs">
                    <div>
                      <div className="text-muted-foreground">Context</div>
                      <div className="font-mono font-medium">
                        {(v.context_tokens / 1000).toFixed(0)}K
                      </div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">VRAM</div>
                      <div className="font-mono font-medium">
                        {v.vram_gb} GB
                      </div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Latency</div>
                      <div className="font-mono font-medium">
                        {v.avg_latency_s}s
                      </div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">GPUs</div>
                      <div className="font-mono font-medium">{v.gpu_count}</div>
                    </div>
                  </div>

                  <div className="mb-3 text-xs text-muted-foreground">
                    <span className="font-mono">{v.architecture}</span>
                    {' · '}
                    {v.total_params}
                    {v.active_params !== v.total_params &&
                      ` (${v.active_params} active)`}
                    {v.supports_thinking && ' · Thinking'}
                    {v.supports_prefix_cache && ' · Prefix Cache'}
                  </div>

                  {!isDeployed && (
                    <button
                      onClick={() => handleDeploy(v.id)}
                      disabled={deploying === v.id}
                      className="rounded-md bg-primary px-4 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                    >
                      {deploying === v.id ? 'Deploying...' : 'Deploy to GPU'}
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
