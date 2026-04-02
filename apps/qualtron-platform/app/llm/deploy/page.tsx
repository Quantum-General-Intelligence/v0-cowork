'use client'

import { useState, useEffect } from 'react'

interface CatalogVariant {
  id: string
  name: string
  base_family: string
  total_params: string
  active_params: string
  context_tokens: number
  yarn_multiplier: number
  vram_gb: number
  avg_latency_s: number
  architecture: string
  gpu_count: number
  supports_thinking: boolean
}

interface DeployedModel {
  id: string
  variant_id: string
  name: string
  status: string
  base_family: string
  context_tokens: number
  vram_gb: number
  total_requests: number
  total_tokens: number
}

const FAMILY_LABELS: Record<string, { name: string; color: string }> = {
  nano: { name: 'Nano', color: 'bg-green-100 text-green-800' },
  mini: { name: 'Mini', color: 'bg-blue-100 text-blue-800' },
  coder: { name: 'Coder', color: 'bg-purple-100 text-purple-800' },
  thinker: { name: 'Thinker', color: 'bg-orange-100 text-orange-800' },
  'coder-pro': { name: 'Coder Pro', color: 'bg-red-100 text-red-800' },
}

const STATUS_ICONS: Record<string, string> = {
  ready: '●',
  loading: '◐',
  queued: '○',
  error: '✗',
  stopped: '□',
}

export default function QInferenceDeployPage() {
  const [catalog, setCatalog] = useState<CatalogVariant[]>([])
  const [models, setModels] = useState<DeployedModel[]>([])
  const [selectedFamily, setSelectedFamily] = useState<string>('')
  const [deploying, setDeploying] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchCatalog()
    fetchModels()
  }, [])

  async function fetchCatalog() {
    const res = await fetch('/api/qinference/catalog')
    if (res.ok) {
      const data = await res.json()
      setCatalog(data.data ?? [])
    }
  }

  async function fetchModels() {
    const res = await fetch('/api/qinference/models')
    if (res.ok) {
      const data = await res.json()
      setModels(data.data ?? [])
    }
  }

  async function deploy(variantId: string) {
    setDeploying(variantId)
    setError(null)
    try {
      const res = await fetch('/api/qinference/models', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ variant_id: variantId }),
      })
      if (res.ok) {
        await fetchModels()
      } else {
        const data = await res.json()
        setError(data.error ?? 'Deploy failed')
      }
    } catch (e) {
      setError(String(e))
    }
    setDeploying(null)
  }

  const families = [...new Set(catalog.map((v) => v.base_family))]
  const filtered = selectedFamily
    ? catalog.filter((v) => v.base_family === selectedFamily)
    : catalog

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Q-Inference — Model Deployment
        </h1>
        <p className="text-muted-foreground">
          Deploy Qualtron AI models to your GPU infrastructure. 5 base models,
          17 variants with YaRN context extension.
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Active Models */}
      <div>
        <h2 className="mb-3 text-lg font-semibold">Deployed Models</h2>
        {models.length === 0 ? (
          <div className="rounded-lg border border-border bg-card p-8 text-center text-sm text-muted-foreground">
            No models deployed yet. Pick one from the catalog below.
          </div>
        ) : (
          <div className="overflow-hidden rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-4 py-2 text-left font-medium">Model</th>
                  <th className="px-4 py-2 text-left font-medium">Status</th>
                  <th className="px-4 py-2 text-left font-medium">Context</th>
                  <th className="px-4 py-2 text-left font-medium">VRAM</th>
                  <th className="px-4 py-2 text-right font-medium">Requests</th>
                </tr>
              </thead>
              <tbody>
                {models.map((m) => (
                  <tr key={m.id} className="border-t border-border">
                    <td className="px-4 py-3">
                      <div className="font-medium">{m.name}</div>
                      <div className="font-mono text-xs text-muted-foreground">
                        {m.variant_id}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={
                          m.status === 'ready'
                            ? 'text-green-600'
                            : m.status === 'error'
                              ? 'text-red-600'
                              : 'text-yellow-600'
                        }
                      >
                        {STATUS_ICONS[m.status] ?? '?'} {m.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs">
                      {(m.context_tokens / 1000).toFixed(0)}K
                    </td>
                    <td className="px-4 py-3 font-mono text-xs">
                      {m.vram_gb}GB
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-xs">
                      {m.total_requests.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Catalog */}
      <div>
        <h2 className="mb-3 text-lg font-semibold">Model Catalog</h2>

        {/* Family filter */}
        <div className="mb-4 flex gap-2">
          <button
            onClick={() => setSelectedFamily('')}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              !selectedFamily
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}
          >
            All ({catalog.length})
          </button>
          {families.map((f) => {
            const label = FAMILY_LABELS[f] ?? { name: f, color: 'bg-gray-100' }
            const count = catalog.filter((v) => v.base_family === f).length
            return (
              <button
                key={f}
                onClick={() => setSelectedFamily(selectedFamily === f ? '' : f)}
                className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                  selectedFamily === f
                    ? 'bg-primary text-primary-foreground'
                    : `${label.color} hover:opacity-80`
                }`}
              >
                {label.name} ({count})
              </button>
            )
          })}
        </div>

        {/* Variant grid */}
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((v) => {
            const label = FAMILY_LABELS[v.base_family] ?? {
              name: v.base_family,
              color: 'bg-gray-100',
            }
            const isDeployed = models.some(
              (m) => m.variant_id === v.id && m.status !== 'stopped',
            )
            const yarn =
              v.yarn_multiplier > 1 ? `YaRN ${v.yarn_multiplier}×` : 'native'

            return (
              <div
                key={v.id}
                className={`rounded-lg border p-4 transition-colors ${
                  isDeployed
                    ? 'border-green-300 bg-green-50/50'
                    : 'border-border hover:border-muted-foreground/30'
                }`}
              >
                <div className="mb-2 flex items-center justify-between">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${label.color}`}
                  >
                    {label.name}
                  </span>
                  <span className="font-mono text-xs text-muted-foreground">
                    {v.total_params} / {v.active_params} active
                  </span>
                </div>

                <h3 className="mb-1 text-sm font-semibold">{v.name}</h3>
                <p className="mb-2 text-xs text-muted-foreground">
                  {v.architecture} — {yarn}
                </p>

                <div className="mb-3 grid grid-cols-3 gap-2 text-center">
                  <div>
                    <div className="text-xs text-muted-foreground">Context</div>
                    <div className="font-mono text-xs font-bold">
                      {v.context_tokens >= 1_000_000
                        ? `${(v.context_tokens / 1_000_000).toFixed(0)}M`
                        : `${(v.context_tokens / 1000).toFixed(0)}K`}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">VRAM</div>
                    <div className="font-mono text-xs font-bold">
                      {v.vram_gb}GB
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Latency</div>
                    <div className="font-mono text-xs font-bold">
                      {v.avg_latency_s}s
                    </div>
                  </div>
                </div>

                <div className="mb-3 flex gap-1">
                  {v.supports_thinking && (
                    <span className="rounded bg-muted px-1.5 py-0.5 text-[10px]">
                      thinking
                    </span>
                  )}
                  {v.gpu_count > 1 && (
                    <span className="rounded bg-muted px-1.5 py-0.5 text-[10px]">
                      TP={v.gpu_count}
                    </span>
                  )}
                </div>

                <button
                  onClick={() => deploy(v.id)}
                  disabled={isDeployed || deploying === v.id}
                  className={`w-full rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                    isDeployed
                      ? 'cursor-default bg-green-100 text-green-700'
                      : deploying === v.id
                        ? 'cursor-wait bg-muted text-muted-foreground'
                        : 'bg-primary text-primary-foreground hover:bg-primary/90'
                  }`}
                >
                  {isDeployed
                    ? '● Deployed'
                    : deploying === v.id
                      ? 'Deploying...'
                      : 'Deploy'}
                </button>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
