'use client'

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
} from 'react'
import Link from 'next/link'
import { CAG_PROMPT_TEMPLATES, getPromptById } from '@/lib/cag-prompts'

// ─── Types ───────────────────────────────────────────────────────────────────

interface CortexStage {
  id: string
  name: string
  role: string
  description: string
  model: string | null
  qhmStatus: 'empty' | 'ingesting' | 'ready' | 'error'
  qhmTokenCount: number
  qhmFileCount: number
  qhmError: string | null
  qhmResult: Record<string, unknown> | null
}

interface CatalogModel {
  id: string
  name: string
  base_family: string
}

type UploadMethod = 'file' | 'url' | 'github'

const DEFAULT_STAGES: CortexStage[] = [
  {
    id: 'retrieval',
    name: 'Retrieval Cortex',
    role: 'Tier 1 — QHP Fast Retrieval',
    description:
      'Lightweight models (Nano/Mini) for classification, rule extraction, normalization.',
    model: null,
    qhmStatus: 'empty',
    qhmTokenCount: 0,
    qhmFileCount: 0,
    qhmError: null,
    qhmResult: null,
  },
  {
    id: 'reasoning',
    name: 'Reasoning Cortex',
    role: 'Tier 2 — Thinker',
    description:
      'Mid-size model (Coder/Thinker) with thinking. Validates evidence, reasons step-by-step.',
    model: null,
    qhmStatus: 'empty',
    qhmTokenCount: 0,
    qhmFileCount: 0,
    qhmError: null,
    qhmResult: null,
  },
  {
    id: 'deep',
    name: 'Deep Analysis Cortex',
    role: 'Tier 3 — Enterprise',
    description:
      'Large model (Thinker/Coder Pro) for comprehensive answers with full context.',
    model: null,
    qhmStatus: 'empty',
    qhmTokenCount: 0,
    qhmFileCount: 0,
    qhmError: null,
    qhmResult: null,
  },
]

// ─── Component ───────────────────────────────────────────────────────────────

export default function SpineCortexPage() {
  const [stages, setStages] = useState<CortexStage[]>(
    DEFAULT_STAGES.map((s) => ({ ...s })),
  )
  const [cortexName, setCortexName] = useState('')
  const [selectedBehavior, setSelectedBehavior] = useState('general')
  const [catalogModels, setCatalogModels] = useState<CatalogModel[]>([])
  const [activeStageId, setActiveStageId] = useState<string | null>(null)
  const [uploadMethod, setUploadMethod] = useState<UploadMethod>('file')
  const [urlInput, setUrlInput] = useState('')
  const [githubInput, setGithubInput] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetch('/api/qinference/catalog')
      .then((r) => r.json())
      .then((d) => setCatalogModels(d.data ?? []))
      .catch(() => {})
  }, [])

  const updateStage = useCallback(
    (id: string, updates: Partial<CortexStage>) => {
      setStages((prev) =>
        prev.map((s) => (s.id === id ? { ...s, ...updates } : s)),
      )
    },
    [],
  )

  // ─── File upload ─────────────────────────────────────────────────────────

  const handleFileUpload = useCallback(
    async (stageId: string, e: ChangeEvent<HTMLInputElement>) => {
      if (!e.target.files?.length) return
      updateStage(stageId, {
        qhmStatus: 'ingesting',
        qhmFileCount: e.target.files.length,
        qhmError: null,
      })

      const formData = new FormData()
      for (const file of Array.from(e.target.files)) {
        formData.append('file', file)
      }
      formData.append('tool', 'qhp')

      try {
        const res = await fetch('/api/ingest', {
          method: 'POST',
          body: formData,
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Ingestion failed')
        const tokens = data.output?.extraction?.rules_count
          ? data.output.extraction.rules_count * 500
          : estimateTokens(JSON.stringify(data.output))
        updateStage(stageId, {
          qhmStatus: 'ready',
          qhmTokenCount: tokens,
          qhmResult: data.output,
        })
      } catch (err) {
        updateStage(stageId, {
          qhmStatus: 'error',
          qhmError: err instanceof Error ? err.message : 'Failed',
        })
      }
    },
    [updateStage],
  )

  // ─── URL ingest ──────────────────────────────────────────────────────────

  const handleURLIngest = useCallback(
    async (stageId: string, url: string) => {
      if (!url.trim()) return
      updateStage(stageId, { qhmStatus: 'ingesting', qhmError: null })

      try {
        const res = await fetch('/api/ingest', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ method: 'url', source: url }),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Ingestion failed')
        const tokens = estimateTokens(JSON.stringify(data.output))
        updateStage(stageId, {
          qhmStatus: 'ready',
          qhmTokenCount: tokens,
          qhmResult: data.output,
        })
      } catch (err) {
        updateStage(stageId, {
          qhmStatus: 'error',
          qhmError: err instanceof Error ? err.message : 'Failed',
        })
      }
      setUrlInput('')
    },
    [updateStage],
  )

  // ─── GitHub ingest ───────────────────────────────────────────────────────

  const handleGitHubIngest = useCallback(
    async (stageId: string, repoUrl: string) => {
      if (!repoUrl.trim()) return
      updateStage(stageId, { qhmStatus: 'ingesting', qhmError: null })

      try {
        const res = await fetch('/api/ingest', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ method: 'github', source: repoUrl }),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Ingestion failed')
        const tokens = data.tokenEstimate ?? estimateTokens(data.output ?? '')
        updateStage(stageId, {
          qhmStatus: 'ready',
          qhmTokenCount: tokens,
          qhmResult: data,
        })
      } catch (err) {
        updateStage(stageId, {
          qhmStatus: 'error',
          qhmError: err instanceof Error ? err.message : 'Failed',
        })
      }
      setGithubInput('')
    },
    [updateStage],
  )

  const STATUS_BADGE = {
    empty: { label: 'No QHM', cls: 'text-muted-foreground' },
    ingesting: { label: 'Processing...', cls: 'text-primary animate-pulse' },
    ready: { label: 'QHM Ready', cls: 'text-accent' },
    error: { label: 'Error', cls: 'text-destructive' },
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Spine Cortex</h1>
        <p className="text-muted-foreground">
          Define a 3-stage MaaS pipeline. Each cortex carries its own QHM
          partition — upload files, crawl URLs, or ingest GitHub repos.
        </p>
      </div>

      {/* Cortex Name + Behavior */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs font-medium">Cortex Name</label>
          <input
            type="text"
            value={cortexName}
            onChange={(e) => setCortexName(e.target.value)}
            placeholder="e.g. Legal Analysis Pipeline"
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium">
            Cognitive Model Behavior
          </label>
          <div className="flex flex-wrap gap-1.5">
            {CAG_PROMPT_TEMPLATES.map((t) => (
              <button
                key={t.id}
                onClick={() => setSelectedBehavior(t.id)}
                className={`flex items-center gap-1 rounded-md border px-2 py-1 text-[10px] transition-colors ${
                  selectedBehavior === t.id
                    ? 'border-primary bg-primary/10 text-foreground'
                    : 'border-border text-muted-foreground hover:border-primary/50'
                }`}
                title={t.description}
              >
                <span>{t.icon}</span>
                <span>{t.name}</span>
                {selectedBehavior === t.id && (
                  <span className="text-primary">✓</span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Three Stages */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {stages.map((stage, i) => {
          const badge = STATUS_BADGE[stage.qhmStatus] ?? STATUS_BADGE.empty
          const isActive = activeStageId === stage.id
          return (
            <div
              key={stage.id}
              className="rounded-lg border border-border bg-card p-4"
            >
              {/* Header */}
              <div className="mb-2 flex items-center gap-2">
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

              {/* Model Selection — locked during ingestion */}
              <div className="mb-3">
                <label className="mb-1 block text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                  Model
                </label>
                <select
                  value={stage.model ?? ''}
                  onChange={(e) =>
                    updateStage(stage.id, { model: e.target.value || null })
                  }
                  disabled={stage.qhmStatus === 'ingesting'}
                  className="w-full rounded-md border border-input bg-background px-2 py-1.5 text-xs disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <option value="">Select from catalog...</option>
                  {catalogModels.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} ({m.base_family})
                    </option>
                  ))}
                </select>
                {stage.qhmStatus === 'ingesting' && (
                  <p className="mt-1 text-[10px] text-warning">
                    Model locked during QHM processing
                  </p>
                )}
              </div>

              {/* QHM Status + Actions */}
              <div className="mb-2 flex items-center justify-between">
                <span className={`text-xs font-medium ${badge.cls}`}>
                  {badge.label}
                </span>
                <div className="flex items-center gap-2">
                  {stage.qhmTokenCount > 0 && (
                    <span className="font-mono text-[10px] text-muted-foreground">
                      {(stage.qhmTokenCount / 1000).toFixed(0)}K tokens
                    </span>
                  )}
                  {(stage.qhmStatus === 'ready' ||
                    stage.qhmStatus === 'error') && (
                    <button
                      onClick={() =>
                        updateStage(stage.id, {
                          qhmStatus: 'empty',
                          qhmTokenCount: 0,
                          qhmFileCount: 0,
                          qhmError: null,
                          qhmResult: null,
                        })
                      }
                      className="text-[10px] text-muted-foreground hover:text-foreground"
                      title="Clear QHM data"
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>

              {/* Error with retry */}
              {stage.qhmError && (
                <div className="mb-2 flex items-center justify-between rounded bg-destructive/10 px-2 py-1">
                  <p className="text-[10px] text-destructive">
                    {stage.qhmError}
                  </p>
                  <button
                    onClick={() =>
                      updateStage(stage.id, {
                        qhmStatus: 'empty',
                        qhmError: null,
                      })
                    }
                    className="text-[10px] text-destructive hover:underline"
                  >
                    Retry
                  </button>
                </div>
              )}

              {/* QHP Results viewer — expandable */}
              {stage.qhmStatus === 'ready' && stage.qhmResult && (
                <QHPResultsViewer result={stage.qhmResult} />
              )}

              {/* Upload toggle */}
              <button
                onClick={() => setActiveStageId(isActive ? null : stage.id)}
                className="w-full rounded-md border border-dashed border-border px-3 py-2 text-xs text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground"
              >
                {stage.qhmStatus === 'empty'
                  ? 'Load QHM data →'
                  : stage.qhmStatus === 'ready'
                    ? 'Replace QHM →'
                    : 'Processing...'}
              </button>

              {/* Upload Panel */}
              {isActive && stage.qhmStatus !== 'ingesting' && (
                <div className="mt-3 space-y-2 rounded-md border border-border bg-background p-3">
                  {/* Method tabs */}
                  <div className="flex gap-1">
                    {(['file', 'url', 'github'] as UploadMethod[]).map((m) => (
                      <button
                        key={m}
                        onClick={() => setUploadMethod(m)}
                        className={`rounded px-2 py-1 text-[10px] font-medium ${
                          uploadMethod === m
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted text-muted-foreground'
                        }`}
                      >
                        {m === 'file'
                          ? '📄 Files'
                          : m === 'url'
                            ? '🔗 URL'
                            : '🐙 GitHub'}
                      </button>
                    ))}
                  </div>

                  {/* File upload */}
                  {uploadMethod === 'file' && (
                    <div>
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="w-full rounded border border-dashed border-border py-3 text-xs text-muted-foreground hover:border-primary/50"
                      >
                        Drop files or click — PDF, DOCX, TXT, MD, CSV, JSON,
                        code
                      </button>
                      <input
                        ref={fileInputRef}
                        type="file"
                        multiple
                        accept=".pdf,.docx,.txt,.md,.csv,.json,.jsonl,.py,.ts,.js,.go,.java,.rs,.zip"
                        onChange={(e) => handleFileUpload(stage.id, e)}
                        className="hidden"
                      />
                    </div>
                  )}

                  {/* URL ingest */}
                  {uploadMethod === 'url' && (
                    <form
                      onSubmit={(e: FormEvent) => {
                        e.preventDefault()
                        handleURLIngest(stage.id, urlInput)
                      }}
                      className="flex gap-2"
                    >
                      <input
                        type="url"
                        value={urlInput}
                        onChange={(e) => setUrlInput(e.target.value)}
                        placeholder="https://example.com/document"
                        className="flex-1 rounded-md border border-input bg-background px-2 py-1.5 text-xs"
                      />
                      <button
                        type="submit"
                        className="rounded-md bg-primary px-3 py-1.5 text-[10px] font-medium text-primary-foreground"
                      >
                        Ingest
                      </button>
                    </form>
                  )}

                  {/* GitHub ingest */}
                  {uploadMethod === 'github' && (
                    <form
                      onSubmit={(e: FormEvent) => {
                        e.preventDefault()
                        handleGitHubIngest(stage.id, githubInput)
                      }}
                      className="flex gap-2"
                    >
                      <input
                        type="text"
                        value={githubInput}
                        onChange={(e) => setGithubInput(e.target.value)}
                        placeholder="https://github.com/user/repo"
                        className="flex-1 rounded-md border border-input bg-background px-2 py-1.5 text-xs"
                      />
                      <button
                        type="submit"
                        className="rounded-md bg-primary px-3 py-1.5 text-[10px] font-medium text-primary-foreground"
                      >
                        Ingest
                      </button>
                    </form>
                  )}

                  <p className="text-[10px] text-muted-foreground">
                    {uploadMethod === 'file' &&
                      'Files processed through QHP-CORE (classify → extract → normalize)'}
                    {uploadMethod === 'url' &&
                      'URL content fetched and processed through QHP-CORE pipeline'}
                    {uploadMethod === 'github' &&
                      'Repository digested via gitingest, then processed through QHP-CORE'}
                  </p>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Pipeline Flow */}
      <div className="rounded-lg border border-border bg-card p-4">
        <h3 className="mb-3 text-sm font-semibold">CAG Pipeline Flow</h3>
        <div className="flex items-center justify-center gap-2">
          {stages.map((stage, i) => (
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
                    ? (catalogModels.find((m) => m.id === stage.model)?.name ??
                      stage.model)
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
                {stage.qhmStatus === 'ingesting' && (
                  <div className="mt-0.5 text-[10px] animate-pulse text-primary">
                    Processing...
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Deploy */}
      <DeploySection
        stages={stages}
        cortexName={cortexName}
        catalogModels={catalogModels}
      />
    </div>
  )
}

function DeploySection({
  stages,
  cortexName,
  catalogModels,
}: {
  stages: CortexStage[]
  cortexName: string
  catalogModels: CatalogModel[]
}) {
  const [deploying, setDeploying] = useState(false)
  const [deployStatus, setDeployStatus] = useState<string | null>(null)
  const [deployedIds, setDeployedIds] = useState<string[]>([])

  const allModelsSet = stages.every((s) => s.model)

  const handleDeploy = async () => {
    setDeploying(true)
    setDeployStatus('Deploying 3 models...')
    const ids: string[] = []

    try {
      for (let i = 0; i < stages.length; i++) {
        const stage = stages[i]
        if (!stage.model) continue
        const name = `${cortexName || 'Cortex'} — ${stage.name}`
        setDeployStatus(`Deploying ${i + 1}/3: ${stage.name}...`)

        const res = await fetch('/api/qinference/models', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ variant_id: stage.model, name }),
        })
        const data = await res.json()
        if (!res.ok)
          throw new Error(data.error ?? `Failed to deploy ${stage.name}`)
        ids.push(data.id)
      }

      setDeployedIds(ids)
      setDeployStatus('All 3 cortexes deployed!')

      // Save config to localStorage
      const config = {
        name: cortexName,
        stages: stages.map((s) => ({
          id: s.id,
          name: s.name,
          model: s.model,
          modelName: catalogModels.find((m) => m.id === s.model)?.name,
          qhmTokenCount: s.qhmTokenCount,
        })),
        deployedModelIds: ids,
        createdAt: new Date().toISOString(),
      }
      const saved = JSON.parse(localStorage.getItem('cortex-configs') ?? '[]')
      saved.unshift(config)
      localStorage.setItem('cortex-configs', JSON.stringify(saved.slice(0, 20)))
    } catch (err) {
      setDeployStatus(
        `Error: ${err instanceof Error ? err.message : 'Deploy failed'}`,
      )
    } finally {
      setDeploying(false)
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-3">
        <button
          onClick={handleDeploy}
          disabled={!allModelsSet || deploying}
          className="rounded-md bg-primary px-6 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          {deploying ? 'Deploying...' : 'Deploy Spine Cortex'}
        </button>
        <span className="self-center text-xs text-muted-foreground">
          {stages.filter((s) => s.model).length}/3 models ·{' '}
          {stages.filter((s) => s.qhmStatus === 'ready').length}/3 QHM loaded
        </span>
      </div>

      {deployStatus && (
        <div
          className={`rounded-lg border p-3 text-sm ${
            deployedIds.length === 3
              ? 'border-accent/50 bg-accent/10 text-accent'
              : deploying
                ? 'border-primary/50 bg-primary/10 text-primary'
                : 'border-destructive/50 bg-destructive/10 text-destructive'
          }`}
        >
          {deployStatus}
        </div>
      )}

      {deployedIds.length === 3 && (
        <div className="flex gap-3">
          <Link
            href="/playground"
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
          >
            Chat in Playground
          </Link>
          <Link
            href="/llm/agents"
            className="rounded-md bg-muted px-4 py-2 text-sm text-muted-foreground"
          >
            View Models
          </Link>
        </div>
      )}
    </div>
  )
}

function QHPResultsViewer({ result }: { result: unknown }) {
  const [expanded, setExpanded] = useState(false)

  if (!result || typeof result !== 'object') return null

  const r = result as Record<string, unknown>
  const extractionMode = r.extraction_mode as string | undefined
  const classification =
    r.classification ?? r.state ?? r.heuristic_content_type ?? null
  // Handle both LLM format (rules_list) and sym format (qlang)
  const qlangItems = (r.qlang ?? []) as { role: string; text: string }[]
  const rulesList = (r.rules_list ?? []) as { type: string; text: string }[]
  const allRules =
    rulesList.length > 0
      ? rulesList
      : qlangItems.map((q) => ({
          type: q.role,
          text: q.text.replace(/^\w+:\s*/, ''),
        }))
  // Role distribution
  const qlangRoles = r.qlang_roles as Record<string, number> | undefined
  const roleCounts =
    qlangRoles ??
    allRules.reduce<Record<string, number>>((acc, rule) => {
      acc[rule.type] = (acc[rule.type] ?? 0) + 1
      return acc
    }, {})
  // Timing
  const meta = r.meta as Record<string, unknown> | undefined
  const timingDetail = (meta?.timing_ms ?? r.timing_detail) as
    | Record<string, number>
    | undefined
  const totalTiming =
    (r.timing_ms as number | undefined) ??
    (timingDetail
      ? Object.values(timingDetail).reduce(
          (a, b) => a + (typeof b === 'number' ? b : 0),
          0,
        )
      : undefined)

  return (
    <div className="mb-2 rounded border border-border bg-background">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center justify-between px-2 py-1.5 text-[10px] font-medium text-muted-foreground hover:text-foreground"
      >
        <span>
          {`QHP: ${allRules.length} rules`}
          {extractionMode ? ` · ${extractionMode}` : ''}
          {classification ? ` · ${String(classification)}` : ''}
          {typeof totalTiming === 'number'
            ? ` · ${totalTiming < 1000 ? `${totalTiming}ms` : `${(totalTiming / 1000).toFixed(1)}s`}`
            : ''}
        </span>
        <span>{expanded ? '▾' : '▸'}</span>
      </button>
      {expanded && (
        <div className="border-t border-border px-2 py-2 space-y-2">
          {/* QLang role distribution */}
          {Object.keys(roleCounts).length > 0 && (
            <div>
              <div className="text-[10px] font-medium text-muted-foreground mb-1">
                Rule Types
              </div>
              <div className="flex flex-wrap gap-1">
                {Object.entries(roleCounts).map(([role, count]) => (
                  <span
                    key={role}
                    className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-mono text-primary"
                  >
                    {role}: {count}
                  </span>
                ))}
              </div>
            </div>
          )}
          {/* Extracted rules */}
          {allRules.length > 0 && (
            <div>
              <div className="text-[10px] font-medium text-muted-foreground mb-1">
                Extracted Rules
              </div>
              <div className="space-y-1 max-h-40 overflow-y-auto">
                {allRules.map((rule, i) => (
                  <div key={i} className="flex gap-1.5 text-[10px]">
                    <span
                      className={`shrink-0 rounded px-1 py-0.5 font-mono ${
                        rule.type === 'Obligation'
                          ? 'bg-warning/20 text-warning'
                          : rule.type === 'Prohibition'
                            ? 'bg-destructive/20 text-destructive'
                            : rule.type === 'Permission'
                              ? 'bg-success/20 text-success'
                              : 'bg-muted text-muted-foreground'
                      }`}
                    >
                      {rule.type}
                    </span>
                    <span className="text-foreground">{rule.text}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4)
}
