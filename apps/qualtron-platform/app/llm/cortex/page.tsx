'use client'

import { useCallback, useEffect, useRef, useState, type ChangeEvent } from 'react'

interface CortexStage {
  id: string
  name: string
  role: string
  description: string
  model: string | null
  qhmStatus: 'empty' | 'uploading' | 'processing' | 'ready'
  qhmTokenCount: number
  qhmFileCount: number
}

interface SpineCortexConfig {
  id: string
  name: string
  description: string
  stages: CortexStage[]
  status: 'draft' | 'active' | 'deploying'
  createdAt: string
}

const DEFAULT_STAGES: CortexStage[] = [
  {
    id: 'stage-1',
    name: 'Retrieval Cortex',
    role: 'Tier 1 — Fast QHP retrieval',
    description:
      'Lightweight models (0.8B–4B) for classification, rule extraction, and normalization. Runs non-thinking for fast triage from QHM.',
    model: null,
    qhmStatus: 'empty',
    qhmTokenCount: 0,
    qhmFileCount: 0,
  },
  {
    id: 'stage-2',
    name: 'Reasoning Cortex',
    role: 'Tier 2 — Thinker',
    description:
      'Mid-size model (9B) with thinking enabled. Validates evidence, checks sufficiency, reasons step-by-step with citations.',
    model: null,
    qhmStatus: 'empty',
    qhmTokenCount: 0,
    qhmFileCount: 0,
  },
  {
    id: 'stage-3',
    name: 'Deep Analysis Cortex',
    role: 'Tier 3 — Enterprise',
    description:
      'Large model (27B–122B) for comprehensive final answers. Deep analysis with full context from Tier 1+2 output.',
    model: null,
    qhmStatus: 'empty',
    qhmTokenCount: 0,
    qhmFileCount: 0,
  },
]

const SUPPORTED_FORMATS = '.pdf,.docx,.txt,.md,.csv,.json,.jsonl,.py,.ts,.js,.go,.java,.rs,.zip'

export default function SpineCortexPage() {
  const [configs, setConfigs] = useState<SpineCortexConfig[]>([])
  const [activeConfig, setActiveConfig] = useState<SpineCortexConfig | null>(null)
  const [catalogModels, setCatalogModels] = useState<{ id: string; name: string; base_family: string }[]>([])
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({})

  // Fetch catalog for model selection
  useEffect(() => {
    fetch('/api/qinference/catalog')
      .then((r) => r.json())
      .then((d) => setCatalogModels(d.data ?? []))
      .catch(() => {})
  }, [])

  const handleNewCortex = () => {
    const config: SpineCortexConfig = {
      id: `cortex-${Date.now()}`,
      name: 'New Spine Cortex',
      description: '',
      stages: DEFAULT_STAGES.map((s) => ({ ...s })),
      status: 'draft',
      createdAt: new Date().toISOString(),
    }
    setConfigs((prev) => [config, ...prev])
    setActiveConfig(config)
  }

  const updateStage = (stageId: string, updates: Partial<CortexStage>) => {
    if (!activeConfig) return
    const updated = {
      ...activeConfig,
      stages: activeConfig.stages.map((s) =>
        s.id === stageId ? { ...s, ...updates } : s,
      ),
    }
    setActiveConfig(updated)
    setConfigs((prev) =>
      prev.map((c) => (c.id === updated.id ? updated : c)),
    )
  }

  const handleFileUpload = (stageId: string, e: ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length) return
    const count = e.target.files.length

    updateStage(stageId, { qhmStatus: 'uploading', qhmFileCount: count })

    // Simulate QHP processing
    setTimeout(() => {
      updateStage(stageId, { qhmStatus: 'processing' })
    }, 1000)
    setTimeout(() => {
      updateStage(stageId, {
        qhmStatus: 'ready',
        qhmTokenCount: Math.floor(Math.random() * 500000) + 100000,
      })
    }, 3000)
  }

  const QHM_STATUS_LABELS: Record<string, { label: string; color: string }> = {
    empty: { label: 'No QHM', color: 'text-muted-foreground' },
    uploading: { label: 'Uploading...', color: 'text-warning' },
    processing: { label: 'QHP Processing...', color: 'text-primary' },
    ready: { label: 'QHM Ready', color: 'text-accent' },
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Spine Cortex</h1>
          <p className="text-muted-foreground">
            Define a MaaS (Model-as-a-Service) configuration with three
            cognitive stages. Each cortex carries its own Quantum Hypergraph
            Memory (QHM) partition.
          </p>
        </div>
        <button
          onClick={handleNewCortex}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          New Cortex
        </button>
      </div>

      {/* Config List */}
      {configs.length === 0 && !activeConfig ? (
        <div className="rounded-lg border border-border bg-card p-12 text-center">
          <div className="mb-3 text-3xl">🧬</div>
          <h3 className="text-sm font-semibold">No Spine Cortex defined</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            A Spine Cortex is a 3-stage pipeline where each cortex (specialist
            model) carries its own QHM partition. Create one to define your MaaS
            configuration.
          </p>
        </div>
      ) : null}

      {/* Active Config Editor */}
      {activeConfig && (
        <div className="space-y-4">
          {/* Name & Description */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium">
                Cortex Name
              </label>
              <input
                type="text"
                value={activeConfig.name}
                onChange={(e) => {
                  const updated = { ...activeConfig, name: e.target.value }
                  setActiveConfig(updated)
                  setConfigs((prev) =>
                    prev.map((c) => (c.id === updated.id ? updated : c)),
                  )
                }}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium">
                Description
              </label>
              <input
                type="text"
                value={activeConfig.description}
                onChange={(e) => {
                  const updated = {
                    ...activeConfig,
                    description: e.target.value,
                  }
                  setActiveConfig(updated)
                  setConfigs((prev) =>
                    prev.map((c) => (c.id === updated.id ? updated : c)),
                  )
                }}
                placeholder="e.g. Legal document analysis pipeline"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </div>
          </div>

          {/* 3 Stages */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            {activeConfig.stages.map((stage, i) => {
              const statusInfo = QHM_STATUS_LABELS[stage.qhmStatus]
              return (
                <div
                  key={stage.id}
                  className="rounded-lg border border-border bg-card p-4"
                >
                  {/* Stage Header */}
                  <div className="mb-3 flex items-center gap-2">
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/20 text-xs font-bold text-primary">
                      {i + 1}
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold">{stage.name}</h3>
                      <p className="text-[10px] text-muted-foreground">
                        {stage.role}
                      </p>
                    </div>
                  </div>

                  <p className="mb-3 text-xs text-muted-foreground">
                    {stage.description}
                  </p>

                  {/* Model Selection */}
                  <div className="mb-3">
                    <label className="mb-1 block text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                      Model
                    </label>
                    <select
                      value={stage.model ?? ''}
                      onChange={(e) =>
                        updateStage(stage.id, {
                          model: e.target.value || null,
                        })
                      }
                      className="w-full rounded-md border border-input bg-background px-2 py-1.5 text-xs"
                    >
                      <option value="">Select model...</option>
                      {catalogModels.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.name} ({m.base_family})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* QHM Upload */}
                  <div className="mb-2">
                    <label className="mb-1 block text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                      QHM Partition
                    </label>
                    <div className="flex items-center justify-between">
                      <span className={`text-xs font-medium ${statusInfo.color}`}>
                        {statusInfo.label}
                      </span>
                      {stage.qhmTokenCount > 0 && (
                        <span className="font-mono text-[10px] text-muted-foreground">
                          {(stage.qhmTokenCount / 1000).toFixed(0)}K tokens ·{' '}
                          {stage.qhmFileCount} files
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Upload Button */}
                  <button
                    onClick={() => fileInputRefs.current[stage.id]?.click()}
                    disabled={
                      stage.qhmStatus === 'uploading' ||
                      stage.qhmStatus === 'processing'
                    }
                    className="w-full rounded-md border border-dashed border-border px-3 py-2 text-xs text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground disabled:opacity-50"
                  >
                    {stage.qhmStatus === 'empty'
                      ? 'Upload QHM files for this cortex'
                      : stage.qhmStatus === 'ready'
                        ? 'Replace QHM files'
                        : 'Processing...'}
                  </button>
                  <input
                    ref={(el) => {
                      fileInputRefs.current[stage.id] = el
                    }}
                    type="file"
                    multiple
                    accept={SUPPORTED_FORMATS}
                    onChange={(e) => handleFileUpload(stage.id, e)}
                    className="hidden"
                  />

                  {/* Progress for processing */}
                  {(stage.qhmStatus === 'uploading' ||
                    stage.qhmStatus === 'processing') && (
                    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full animate-pulse rounded-full bg-primary transition-all"
                        style={{
                          width:
                            stage.qhmStatus === 'uploading' ? '30%' : '70%',
                        }}
                      />
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* Pipeline visualization */}
          <div className="rounded-lg border border-border bg-card p-4">
            <h3 className="mb-3 text-sm font-semibold">
              CAG Pipeline Flow
            </h3>
            <div className="flex items-center justify-center gap-2">
              {activeConfig.stages.map((stage, i) => (
                <div key={stage.id} className="flex items-center gap-2">
                  {i > 0 && (
                    <span className="text-lg text-muted-foreground">→</span>
                  )}
                  <div
                    className={`rounded-lg border p-3 text-center ${
                      stage.model && stage.qhmStatus === 'ready'
                        ? 'border-accent/50 bg-accent/5'
                        : stage.model
                          ? 'border-primary/50 bg-primary/5'
                          : 'border-border bg-muted/50'
                    }`}
                  >
                    <div className="text-xs font-bold">
                      {stage.model
                        ? catalogModels.find((m) => m.id === stage.model)
                            ?.name ?? stage.model
                        : 'Not set'}
                    </div>
                    <div className="mt-0.5 text-[10px] text-muted-foreground">
                      {stage.name}
                    </div>
                    {stage.qhmStatus === 'ready' && (
                      <div className="mt-0.5 text-[10px] font-medium text-accent">
                        QHM ✓
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Deploy button */}
          <div className="flex gap-3">
            <button
              disabled={activeConfig.stages.some((s) => !s.model)}
              className="rounded-md bg-primary px-6 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              Deploy Spine Cortex
            </button>
            <span className="self-center text-xs text-muted-foreground">
              {activeConfig.stages.filter((s) => s.model).length}/3 models
              assigned
              {' · '}
              {activeConfig.stages.filter((s) => s.qhmStatus === 'ready').length}
              /3 QHM loaded
            </span>
          </div>
        </div>
      )}

      {/* Existing configs */}
      {configs.length > 1 && (
        <div>
          <h2 className="mb-3 text-lg font-semibold">
            Saved Configurations
          </h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {configs
              .filter((c) => c.id !== activeConfig?.id)
              .map((config) => (
                <button
                  key={config.id}
                  onClick={() => setActiveConfig(config)}
                  className="rounded-lg border border-border bg-card p-4 text-left transition-colors hover:border-primary/50"
                >
                  <h3 className="text-sm font-semibold">{config.name}</h3>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {config.description || 'No description'}
                  </p>
                  <div className="mt-2 flex gap-1">
                    {config.stages.map((s, i) => (
                      <span
                        key={s.id}
                        className={`rounded px-1.5 py-0.5 text-[10px] font-mono ${
                          s.model
                            ? 'bg-primary/20 text-primary'
                            : 'bg-muted text-muted-foreground'
                        }`}
                      >
                        T{i + 1}
                        {s.qhmStatus === 'ready' ? ' ✓' : ''}
                      </span>
                    ))}
                  </div>
                </button>
              ))}
          </div>
        </div>
      )}
    </div>
  )
}
