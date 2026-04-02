'use client'

import { useCallback, useEffect, useRef, useState, type ChangeEvent, type FormEvent } from 'react'
import Link from 'next/link'

type Step = 'model' | 'config' | 'upload' | 'processing' | 'deploy' | 'done'

interface CatalogVariant {
  id: string
  name: string
  base_family: string
  context_tokens: number
  vram_gb: number
  avg_latency_s: number
}

export default function CreateCAGModelPage() {
  const [step, setStep] = useState<Step>('model')
  const [catalog, setCatalog] = useState<CatalogVariant[]>([])
  const [selectedVariant, setSelectedVariant] = useState<string | null>(null)
  const [agentName, setAgentName] = useState('')
  const [systemPrompt, setSystemPrompt] = useState('You are a helpful assistant. Answer questions based on the provided knowledge.')
  const [agentId, setAgentId] = useState<string | null>(null)
  const [deployedModelId, setDeployedModelId] = useState<string | null>(null)
  const [files, setFiles] = useState<File[]>([])
  const [jobId, setJobId] = useState<string | null>(null)
  const [progress, setProgress] = useState(0)
  const [currentStep, setCurrentStep] = useState('')
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Load catalog
  useEffect(() => {
    fetch('/api/qinference/catalog')
      .then((r) => r.json())
      .then((d) => setCatalog(d.data ?? []))
      .catch(() => {})
  }, [])

  // Poll ingest job
  useEffect(() => {
    if (!jobId || !agentId) return
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/agents/${agentId}/ingest?job_id=${jobId}`)
        const data = await res.json()
        setProgress(data.progress ?? 0)
        setCurrentStep(data.current_step ?? '')
        if (data.status === 'done') {
          clearInterval(interval)
          setStep('deploy')
        } else if (data.status === 'failed') {
          clearInterval(interval)
          setError(data.error ?? 'Ingestion failed')
        }
      } catch {
        clearInterval(interval)
        setError('Failed to check status')
      }
    }, 1500)
    return () => clearInterval(interval)
  }, [jobId, agentId])

  // Step 1: Pick model from catalog
  const handleSelectModel = (variantId: string) => {
    setSelectedVariant(variantId)
    setStep('config')
  }

  // Step 2: Create agent
  const handleCreateAgent = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    try {
      const res = await fetch('/api/agents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: agentName, system_prompt: systemPrompt, quality: 'max' }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.detail?.[0]?.msg ?? data.error ?? 'Failed')
      setAgentId(data.id)
      setStep('upload')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create agent')
    }
  }

  // Step 3: Upload files for QHM
  const handleStartIngest = async () => {
    if (!agentId || files.length === 0) return
    setError(null)
    setStep('processing')

    const formData = new FormData()
    for (const file of files) formData.append('files', file)

    try {
      const res = await fetch(`/api/agents/${agentId}/ingest`, {
        method: 'POST',
        body: formData,
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Upload failed')
      setJobId(data.job_id)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed')
      setStep('upload')
    }
  }

  // Step 4: Deploy to GPU
  const handleDeploy = async () => {
    if (!selectedVariant) return
    setError(null)
    try {
      const res = await fetch('/api/qinference/models', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ variant_id: selectedVariant, name: agentName }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Deploy failed')
      setDeployedModelId(data.id)
      setStep('done')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Deploy failed')
    }
  }

  const selectedModel = catalog.find((v) => v.id === selectedVariant)
  const stepIndex = { model: 0, config: 1, upload: 2, processing: 3, deploy: 4, done: 5 }[step]

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/llm/agents" className="text-muted-foreground hover:text-foreground">← Model Instances</Link>
        <span className="text-muted-foreground">/</span>
        <h1 className="text-2xl font-bold tracking-tight">Create CAG Model</h1>
      </div>

      {/* Steps */}
      <div className="flex gap-1">
        {['Model', 'Config', 'Upload QHM', 'Processing', 'Deploy', 'Ready'].map((label, i) => (
          <div key={label} className="flex items-center gap-1">
            {i > 0 && <div className={`h-px w-4 ${stepIndex >= i ? 'bg-primary' : 'bg-border'}`} />}
            <div className={`flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold ${
              stepIndex >= i ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
            }`}>{stepIndex > i ? '✓' : i + 1}</div>
            <span className={`text-[10px] ${stepIndex >= i ? 'text-foreground' : 'text-muted-foreground'}`}>{label}</span>
          </div>
        ))}
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">{error}</div>
      )}

      {/* Step 1: Pick Model */}
      {step === 'model' && (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">Select a Qualtron model variant from the catalog:</p>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {catalog.map((v) => (
              <button key={v.id} onClick={() => handleSelectModel(v.id)}
                className="rounded-lg border border-border bg-card p-3 text-left transition-colors hover:border-primary/50">
                <div className="text-sm font-semibold">{v.name}</div>
                <div className="mt-1 text-xs text-muted-foreground">
                  {(v.context_tokens / 1000).toFixed(0)}K ctx · {v.vram_gb}GB VRAM · {v.avg_latency_s}s latency
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Step 2: Config */}
      {step === 'config' && (
        <form onSubmit={handleCreateAgent} className="space-y-4">
          <div className="rounded-lg border border-primary/30 bg-primary/5 p-3">
            <span className="text-xs font-medium text-primary">Selected: {selectedModel?.name}</span>
            <span className="ml-2 text-xs text-muted-foreground">
              {selectedModel && `${(selectedModel.context_tokens / 1000).toFixed(0)}K context`}
            </span>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Name</label>
            <input type="text" value={agentName} onChange={(e) => setAgentName(e.target.value)} required
              placeholder="e.g. Legal Support" className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">System Prompt</label>
            <textarea value={systemPrompt} onChange={(e) => setSystemPrompt(e.target.value)} rows={3}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono" />
          </div>
          <button type="submit" disabled={!agentName} className="rounded-md bg-primary px-6 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
            Create & Upload QHM
          </button>
        </form>
      )}

      {/* Step 3: Upload */}
      {step === 'upload' && (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Upload documents to build the QHM (Quantum Hypergraph Memory) for <strong>{agentName}</strong>.
            Files are processed through the CAG ingest pipeline.
          </p>
          <div onClick={() => fileInputRef.current?.click()}
            className="cursor-pointer rounded-lg border-2 border-dashed border-border p-8 text-center transition-colors hover:border-primary/50">
            <p className="text-sm font-medium">Drop files or click to browse</p>
            <p className="mt-1 text-xs text-muted-foreground">PDF, DOCX, TXT, MD, CSV, JSON, code — up to 50MB</p>
            <input ref={fileInputRef} type="file" multiple
              accept=".pdf,.docx,.txt,.md,.csv,.json,.jsonl,.py,.ts,.js,.go,.java,.rs,.zip"
              onChange={(e: ChangeEvent<HTMLInputElement>) => { if (e.target.files) setFiles(Array.from(e.target.files)) }}
              className="hidden" />
          </div>
          {files.length > 0 && (
            <div className="space-y-1">
              {files.map((f, i) => (
                <div key={i} className="flex items-center justify-between rounded border border-border px-3 py-1.5 text-xs">
                  <span>{f.name}</span>
                  <span className="text-muted-foreground">{(f.size / 1024).toFixed(0)} KB</span>
                </div>
              ))}
            </div>
          )}
          <div className="flex gap-3">
            <button onClick={handleStartIngest} disabled={files.length === 0}
              className="rounded-md bg-primary px-6 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
              Upload & Process
            </button>
            <button onClick={() => setStep('deploy')} className="rounded-md bg-muted px-4 py-2 text-sm text-muted-foreground">
              Skip — No QHM
            </button>
          </div>
        </div>
      )}

      {/* Step 4: Processing */}
      {step === 'processing' && (
        <div className="rounded-lg border border-border bg-card p-6 text-center">
          <p className="text-sm font-medium">Building QHM...</p>
          <p className="mt-1 text-xs text-muted-foreground">{currentStep || 'Starting...'}</p>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${progress * 100}%` }} />
          </div>
          <p className="mt-1 text-xs text-muted-foreground">{Math.round(progress * 100)}%</p>
        </div>
      )}

      {/* Step 5: Deploy */}
      {step === 'deploy' && (
        <div className="space-y-4">
          <div className="rounded-lg border border-accent/50 bg-accent/10 p-4">
            <p className="text-sm font-medium text-accent">QHM ready for {agentName}</p>
            <p className="mt-1 text-xs text-muted-foreground">Now deploy the model to GPU to start serving.</p>
          </div>
          <button onClick={handleDeploy}
            className="rounded-md bg-primary px-6 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
            Deploy {selectedModel?.name} to GPU
          </button>
        </div>
      )}

      {/* Step 6: Done */}
      {step === 'done' && (
        <div className="space-y-4">
          <div className="rounded-lg border border-accent/50 bg-accent/10 p-6 text-center">
            <div className="mb-2 text-3xl">✓</div>
            <p className="text-sm font-medium text-accent">{agentName} is deployed!</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {selectedModel?.name} with QHM loaded. Ready to serve.
            </p>
          </div>
          <div className="flex justify-center gap-3">
            <Link href="/playground" className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">
              Chat in Playground
            </Link>
            <Link href="/llm/agents" className="rounded-md bg-muted px-4 py-2 text-sm text-muted-foreground">
              View Instances
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
