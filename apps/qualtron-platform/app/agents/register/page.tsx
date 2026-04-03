'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'

interface DeployedModel {
  id: string
  variant_id: string
  name: string
  status: string
  base_family: string
  context_tokens: number
  vram_gb: number
}

interface CreatedAgent {
  id: string
  name: string
  description: string
}

type Step = 'config' | 'ingest' | 'done'

const DEFAULT_SYSTEM_PROMPT =
  'You are a helpful assistant. Answer questions based on the provided knowledge base. If the answer is not in the knowledge base, say so clearly.'

export default function RegisterAgentPage() {
  const searchParams = useSearchParams()
  const preselectedModel = searchParams.get('model') ?? ''

  // Step state
  const [step, setStep] = useState<Step>('config')

  // Step 1 — Agent config
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [systemPrompt, setSystemPrompt] = useState(DEFAULT_SYSTEM_PROMPT)
  const [quality, setQuality] = useState<'max' | 'balanced' | 'fast'>('max')
  const [temperature, setTemperature] = useState(0.7)
  const [maxTokens, setMaxTokens] = useState(2048)

  // Step 1 — Model selection
  const [models, setModels] = useState<DeployedModel[]>([])
  const [selectedModel, setSelectedModel] = useState(preselectedModel)
  const [loadingModels, setLoadingModels] = useState(true)

  // Step 1 — submit
  const [submitting, setSubmitting] = useState(false)
  const [configError, setConfigError] = useState<string | null>(null)
  const [createdAgent, setCreatedAgent] = useState<CreatedAgent | null>(null)

  // Step 2 — Ingest
  const [ingestTab, setIngestTab] = useState<'file' | 'url'>('file')
  const [ingestUrl, setIngestUrl] = useState('')
  const [ingestFiles, setIngestFiles] = useState<File[]>([])
  const [ingesting, setIngesting] = useState(false)
  const [ingestError, setIngestError] = useState<string | null>(null)
  const [ingestJobId, setIngestJobId] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Load deployed models for the picker
  useEffect(() => {
    fetch('/api/qinference/models?status=ready')
      .then((r) => r.json())
      .then((d) => {
        setModels(d.data ?? [])
        // Auto-select if only one ready model and no preselection
        if (!preselectedModel && d.data?.length === 1) {
          setSelectedModel(d.data[0].id)
        }
      })
      .catch(() => {})
      .finally(() => setLoadingModels(false))
  }, [preselectedModel])

  // Step 1 submit — create agent
  const handleCreateAgent = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()
      setSubmitting(true)
      setConfigError(null)
      try {
        const res = await fetch('/api/agents', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name,
            description,
            system_prompt: systemPrompt,
            quality,
            temperature,
            max_tokens: maxTokens,
          }),
        })
        if (!res.ok) {
          const body = await res.json().catch(() => ({}))
          throw new Error(body?.detail ?? `HTTP ${res.status}`)
        }
        const data = await res.json()
        setCreatedAgent(data)
        setStep('ingest')
      } catch (err) {
        setConfigError(err instanceof Error ? err.message : 'Create failed')
      } finally {
        setSubmitting(false)
      }
    },
    [name, description, systemPrompt, quality, temperature, maxTokens],
  )

  // Step 2 — ingest files — uses the fast CAG backend chunker, NOT the heavy QHP pipeline
  const handleIngestFiles = useCallback(async () => {
    if (!createdAgent || ingestFiles.length === 0) return
    setIngesting(true)
    setIngestError(null)
    try {
      const form = new FormData()
      for (const f of ingestFiles) form.append('files', f)
      // /api/agents/[id]/ingest → proxies to /v1/agents/{id}/ingest on the backend
      const res = await fetch(`/api/agents/${createdAgent.id}/ingest`, {
        method: 'POST',
        body: form,
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      setIngestJobId(data.job_id ?? data.id ?? 'started')
      setStep('done')
    } catch (err) {
      setIngestError(err instanceof Error ? err.message : 'Ingest failed')
    } finally {
      setIngesting(false)
    }
  }, [createdAgent, ingestFiles])

  // Step 2 — ingest URL — proxies to /v1/agents/{id}/ingest/url on the backend
  const handleIngestUrl = useCallback(async () => {
    if (!createdAgent || !ingestUrl.trim()) return
    setIngesting(true)
    setIngestError(null)
    try {
      const res = await fetch(`/api/agents/${createdAgent.id}/ingest`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ urls: [ingestUrl] }),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      setIngestJobId(data.job_id ?? data.id ?? 'started')
      setStep('done')
    } catch (err) {
      setIngestError(err instanceof Error ? err.message : 'Ingest failed')
    } finally {
      setIngesting(false)
    }
  }, [createdAgent, ingestUrl])

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href="/agents"
          className="text-muted-foreground hover:text-foreground"
        >
          ← Agents
        </Link>
        <span className="text-muted-foreground">/</span>
        <h1 className="text-2xl font-bold tracking-tight">New CAG Agent</h1>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-2 text-sm">
        {(['config', 'ingest', 'done'] as Step[]).map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <span
              className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
                step === s
                  ? 'bg-primary text-primary-foreground'
                  : s === 'done' ||
                      (s === 'ingest' && (step === 'ingest' || step === 'done'))
                    ? 'bg-accent/20 text-accent'
                    : 'bg-muted text-muted-foreground'
              }`}
            >
              {i + 1}
            </span>
            <span
              className={
                step === s ? 'font-medium' : 'text-muted-foreground text-xs'
              }
            >
              {s === 'config' ? 'Configure' : s === 'ingest' ? 'Load KB' : 'Done'}
            </span>
            {i < 2 && <span className="text-muted-foreground">→</span>}
          </div>
        ))}
      </div>

      {/* ── Step 1: Configure ── */}
      {step === 'config' && (
        <form onSubmit={handleCreateAgent} className="space-y-5">
          {configError && (
            <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
              {configError}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="mb-1.5 block text-sm font-medium">
                Agent Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) =>
                  setName(e.target.value.toLowerCase().replace(/[^a-z0-9-_\s]/g, ''))
                }
                placeholder="e.g. hr-policy-bot"
                required
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono"
              />
            </div>

            <div className="col-span-2">
              <label className="mb-1.5 block text-sm font-medium">
                Description{' '}
                <span className="text-muted-foreground font-normal">(optional)</span>
              </label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What does this agent know / do?"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium">
              System Prompt
            </label>
            <textarea
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              rows={4}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono"
            />
            <p className="mt-1 text-xs text-muted-foreground">
              CAG documents are appended automatically before this prompt.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium">Quality</label>
              <select
                value={quality}
                onChange={(e) =>
                  setQuality(e.target.value as 'max' | 'balanced' | 'fast')
                }
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="max">Max</option>
                <option value="balanced">Balanced</option>
                <option value="fast">Fast</option>
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium">
                Temperature
              </label>
              <input
                type="number"
                value={temperature}
                onChange={(e) => setTemperature(Number(e.target.value))}
                step={0.1}
                min={0}
                max={2}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium">
                Max Tokens
              </label>
              <input
                type="number"
                value={maxTokens}
                onChange={(e) => setMaxTokens(Number(e.target.value))}
                step={256}
                min={256}
                max={8192}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono"
              />
            </div>
          </div>

          {/* Model picker (informational — which deployed model to chat with) */}
          <div>
            <label className="mb-1.5 block text-sm font-medium">
              Qualtron Model{' '}
              <span className="text-muted-foreground font-normal">(for chat)</span>
            </label>
            {loadingModels ? (
              <div className="rounded-md border border-border bg-muted/50 px-3 py-2 text-sm text-muted-foreground">
                Loading deployed models...
              </div>
            ) : models.length === 0 ? (
              <div className="rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-600">
                No ready models — go to{' '}
                <Link href="/llm/deploy" className="underline">
                  Deploy
                </Link>{' '}
                first.
              </div>
            ) : (
              <select
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="">— pick a model (optional) —</option>
                {models.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name} · {(m.context_tokens / 1000).toFixed(0)}K ctx ·{' '}
                    {m.vram_gb} GB
                  </option>
                ))}
              </select>
            )}
            <p className="mt-1 text-xs text-muted-foreground">
              The playground will pre-select this model when chatting with this
              agent.
            </p>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={!name || submitting}
              className="rounded-md bg-primary px-6 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {submitting ? 'Creating...' : 'Create Agent →'}
            </button>
            <Link
              href="/agents"
              className="rounded-md bg-muted px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-muted/80"
            >
              Cancel
            </Link>
          </div>
        </form>
      )}

      {/* ── Step 2: Load KB ── */}
      {step === 'ingest' && createdAgent && (
        <div className="space-y-5">
          <div className="rounded-lg border border-accent/40 bg-accent/10 p-3 text-sm text-accent">
            Agent <strong>{createdAgent.name}</strong> created. Now load its
            knowledge base (optional — you can do this later from Settings).
          </div>

          {ingestError && (
            <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
              {ingestError}
            </div>
          )}

          {/* Tabs */}
          <div className="flex gap-1 rounded-md bg-muted p-1 w-fit">
            {(['file', 'url'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setIngestTab(t)}
                className={`rounded px-4 py-1.5 text-sm font-medium transition-colors ${
                  ingestTab === t
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {t === 'file' ? 'Upload Files' : 'URL / GitHub'}
              </button>
            ))}
          </div>

          {ingestTab === 'file' && (
            <div className="space-y-3">
              <div
                onClick={() => fileInputRef.current?.click()}
                className="cursor-pointer rounded-lg border-2 border-dashed border-border bg-muted/30 p-8 text-center hover:border-primary/50 hover:bg-muted/50 transition-colors"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept=".pdf,.txt,.md,.docx,.csv"
                  className="hidden"
                  onChange={(e) =>
                    setIngestFiles(Array.from(e.target.files ?? []))
                  }
                />
                {ingestFiles.length > 0 ? (
                  <div className="space-y-1">
                    {ingestFiles.map((f) => (
                      <div key={f.name} className="text-sm font-mono">
                        {f.name}{' '}
                        <span className="text-muted-foreground">
                          ({(f.size / 1024).toFixed(0)} KB)
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <>
                    <p className="text-sm font-medium">
                      Drop files or click to browse
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      PDF · TXT · MD · DOCX · CSV
                    </p>
                  </>
                )}
              </div>
              <div className="flex gap-3">
                <button
                  onClick={handleIngestFiles}
                  disabled={ingestFiles.length === 0 || ingesting}
                  className="rounded-md bg-primary px-5 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                >
                  {ingesting ? 'Uploading...' : 'Upload & Index'}
                </button>
                <button
                  onClick={() => setStep('done')}
                  className="rounded-md bg-muted px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-muted/80"
                >
                  Skip for now
                </button>
              </div>
            </div>
          )}

          {ingestTab === 'url' && (
            <div className="space-y-3">
              <div>
                <label className="mb-1.5 block text-sm font-medium">
                  URL or GitHub repo
                </label>
                <input
                  type="url"
                  value={ingestUrl}
                  onChange={(e) => setIngestUrl(e.target.value)}
                  placeholder="https://github.com/org/repo  or  https://docs.example.com"
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono"
                />
                <p className="mt-1 text-xs text-muted-foreground">
                  GitHub repos are crawled via gitingest · web URLs are scraped
                  recursively.
                </p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={handleIngestUrl}
                  disabled={!ingestUrl.trim() || ingesting}
                  className="rounded-md bg-primary px-5 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                >
                  {ingesting ? 'Fetching...' : 'Fetch & Index'}
                </button>
                <button
                  onClick={() => setStep('done')}
                  className="rounded-md bg-muted px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-muted/80"
                >
                  Skip for now
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Step 3: Done ── */}
      {step === 'done' && createdAgent && (
        <div className="space-y-4">
          <div className="rounded-lg border border-accent/50 bg-accent/10 p-5">
            <h2 className="text-base font-semibold text-accent">
              Agent ready ✓
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              <strong className="text-foreground">{createdAgent.name}</strong>{' '}
              is set up
              {ingestJobId
                ? ` — documents are being indexed (job ${ingestJobId}).`
                : ' — no documents loaded yet.'}
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href={`/playground?agent=${createdAgent.id}${selectedModel ? '&model=' + selectedModel : ''}`}
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              Chat with agent →
            </Link>
            <Link
              href={`/agents/${createdAgent.id}`}
              className="rounded-md bg-muted px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-muted/80"
            >
              Agent settings
            </Link>
            <Link
              href="/agents"
              className="rounded-md bg-muted px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-muted/80"
            >
              All agents
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
