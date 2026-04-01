'use client'

import { useCallback, useRef, useState, type ChangeEvent, type FormEvent } from 'react'
import Link from 'next/link'

type Step = 'config' | 'upload' | 'processing' | 'done'

const SUPPORTED_FORMATS = [
  '.pdf', '.docx', '.txt', '.md', '.csv', '.json', '.jsonl',
  '.py', '.ts', '.tsx', '.js', '.jsx', '.go', '.java', '.rs',
  '.rb', '.php', '.swift', '.kt', '.c', '.cpp', '.cs', '.sql',
  '.sh', '.yaml', '.yml', '.toml', '.xml', '.html', '.css', '.zip',
]

const MAX_FILE_SIZE = 50 * 1024 * 1024 // 50MB

export default function CreateLLMAgentPage() {
  const [step, setStep] = useState<Step>('config')
  const [agentId, setAgentId] = useState<string | null>(null)

  // Step 1: Config
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [systemPrompt, setSystemPrompt] = useState(
    'You are a helpful assistant. Answer questions based on the provided knowledge base.',
  )
  const [quality, setQuality] = useState<'max' | 'balanced'>('max')

  // Step 2: Upload
  const [files, setFiles] = useState<File[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Step 3: Processing
  const [progress, setProgress] = useState(0)
  const [currentStep, setCurrentStep] = useState<string | null>(null)

  const handleCreateAgent = (e: FormEvent) => {
    e.preventDefault()
    // TODO: POST /v1/agents → get agent ID
    setAgentId('new-agent-' + Date.now())
    setStep('upload')
  }

  const handleFileSelect = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files).filter(
        (f) => f.size <= MAX_FILE_SIZE,
      )
      setFiles((prev) => [...prev, ...newFiles])
    }
  }

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    const dropped = Array.from(e.dataTransfer.files).filter(
      (f) => f.size <= MAX_FILE_SIZE,
    )
    setFiles((prev) => [...prev, ...dropped])
  }, [])

  const handleStartIngest = () => {
    setStep('processing')
    // TODO: POST /v1/agents/{agentId}/ingest → start polling
    // Simulate progress
    const steps = [
      { step: 'parsing', target: 0.1 },
      { step: 'formatting', target: 0.3 },
      { step: 'counting_tokens', target: 0.5 },
      { step: 'storing', target: 0.7 },
      { step: 'warming_cache', target: 0.9 },
      { step: 'done', target: 1.0 },
    ]
    let idx = 0
    const interval = setInterval(() => {
      if (idx < steps.length) {
        setCurrentStep(steps[idx].step)
        setProgress(steps[idx].target)
        idx++
      } else {
        clearInterval(interval)
        setStep('done')
      }
    }, 1500)
  }

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index))
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href="/llm/agents"
          className="text-muted-foreground hover:text-foreground"
        >
          ← LLM Agents
        </Link>
        <span className="text-muted-foreground">/</span>
        <h1 className="text-2xl font-bold tracking-tight">
          Create CacheLLM Agent
        </h1>
      </div>

      {/* Step indicator */}
      <div className="flex gap-2">
        {(['config', 'upload', 'processing', 'done'] as Step[]).map(
          (s, i) => (
            <div
              key={s}
              className={`flex items-center gap-2 ${i > 0 ? '' : ''}`}
            >
              {i > 0 && (
                <div
                  className={`h-px w-8 ${
                    steps(step) >= i
                      ? 'bg-primary'
                      : 'bg-border'
                  }`}
                />
              )}
              <div
                className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${
                  steps(step) >= i
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground'
                }`}
              >
                {steps(step) > i ? '✓' : i + 1}
              </div>
              <span
                className={`text-xs ${
                  steps(step) >= i
                    ? 'text-foreground'
                    : 'text-muted-foreground'
                }`}
              >
                {s === 'config'
                  ? 'Configure'
                  : s === 'upload'
                    ? 'Upload KB'
                    : s === 'processing'
                      ? 'Processing'
                      : 'Ready'}
              </span>
            </div>
          ),
        )}
      </div>

      {/* Step 1: Configuration */}
      {step === 'config' && (
        <form onSubmit={handleCreateAgent} className="space-y-5">
          <div>
            <label className="mb-1.5 block text-sm font-medium">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Support Agent"
              required
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Customer support with product knowledge base"
              rows={2}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
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
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium">
              Quality Tier
            </label>
            <div className="grid grid-cols-2 gap-3">
              {(['max', 'balanced'] as const).map((q) => (
                <label
                  key={q}
                  className={`cursor-pointer rounded-lg border p-4 transition-colors ${
                    quality === q
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-muted-foreground/30'
                  }`}
                >
                  <input
                    type="radio"
                    name="quality"
                    value={q}
                    checked={quality === q}
                    onChange={() => setQuality(q)}
                    className="sr-only"
                  />
                  <div className="text-sm font-semibold">
                    {q === 'max' ? 'Maximum Quality' : 'Balanced'}
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {q === 'max'
                      ? '5-stage pipeline: 0.8B → 2B → 4B → 9B → 122B deep thinker with reasoning'
                      : '4-stage pipeline: 0.8B → 2B → 4B → 9B thinker (faster, lower cost)'}
                  </p>
                  <div className="mt-2 flex gap-1">
                    {['0.8B', '2B', '4B', '9B'].map((s) => (
                      <span
                        key={s}
                        className="rounded bg-accent/20 px-1.5 py-0.5 text-[9px] font-mono text-accent"
                      >
                        {s}
                      </span>
                    ))}
                    {q === 'max' && (
                      <span className="rounded bg-primary/20 px-1.5 py-0.5 text-[9px] font-mono text-primary">
                        122B
                      </span>
                    )}
                  </div>
                </label>
              ))}
            </div>
          </div>

          <button
            type="submit"
            disabled={!name}
            className="rounded-md bg-primary px-6 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            Create Agent & Upload KB
          </button>
        </form>
      )}

      {/* Step 2: File Upload */}
      {step === 'upload' && (
        <div className="space-y-5">
          <div
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
            onClick={() => fileInputRef.current?.click()}
            className="cursor-pointer rounded-lg border-2 border-dashed border-border p-10 text-center transition-colors hover:border-primary/50"
          >
            <p className="text-sm font-medium text-foreground">
              Drop files here or click to browse
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              PDF, DOCX, TXT, MD, CSV, JSON, code files, ZIP — up to 50MB each
            </p>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept={SUPPORTED_FORMATS.join(',')}
              onChange={handleFileSelect}
              className="hidden"
            />
          </div>

          {files.length > 0 && (
            <div className="space-y-2">
              <div className="text-sm font-medium">
                {files.length} file{files.length !== 1 ? 's' : ''} selected
              </div>
              {files.map((file, i) => (
                <div
                  key={`${file.name}-${i}`}
                  className="flex items-center justify-between rounded-md border border-border bg-muted/50 px-3 py-2"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-xs">📄</span>
                    <span className="text-sm">{file.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {(file.size / 1024).toFixed(0)} KB
                    </span>
                  </div>
                  <button
                    onClick={() => removeFile(i)}
                    className="text-xs text-muted-foreground hover:text-destructive"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={handleStartIngest}
              disabled={files.length === 0}
              className="rounded-md bg-primary px-6 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              Upload & Ingest
            </button>
            <button
              onClick={() => setStep('done')}
              className="rounded-md bg-muted px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-muted/80"
            >
              Skip — No KB
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Processing */}
      {step === 'processing' && (
        <div className="space-y-6">
          <div className="rounded-lg border border-border bg-card p-6">
            <div className="mb-4 text-center">
              <p className="text-sm font-medium text-card-foreground">
                Building Knowledge Base
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {currentStep === 'parsing' && 'Parsing uploaded files...'}
                {currentStep === 'formatting' &&
                  'Optimizing for attention-order placement...'}
                {currentStep === 'counting_tokens' &&
                  'Counting tokens and selecting cache strategy...'}
                {currentStep === 'storing' && 'Saving to knowledge store...'}
                {currentStep === 'warming_cache' &&
                  'Warming RadixAttention cache on GPU...'}
                {currentStep === 'done' && 'Complete!'}
              </p>
            </div>

            {/* Progress bar */}
            <div className="h-2 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary transition-all duration-500"
                style={{ width: `${progress * 100}%` }}
              />
            </div>
            <p className="mt-2 text-center text-xs text-muted-foreground">
              {Math.round(progress * 100)}%
            </p>

            {/* Pipeline stages */}
            <div className="mt-4 grid grid-cols-5 gap-1">
              {[
                { key: 'parsing', label: 'Parse' },
                { key: 'formatting', label: 'Format' },
                { key: 'counting_tokens', label: 'Count' },
                { key: 'storing', label: 'Store' },
                { key: 'warming_cache', label: 'Cache' },
              ].map((s) => {
                const stepProgress =
                  { parsing: 0.1, formatting: 0.3, counting_tokens: 0.5, storing: 0.7, warming_cache: 0.9 }[s.key] ?? 1
                const isDone = progress > stepProgress
                const isActive = currentStep === s.key
                return (
                  <div
                    key={s.key}
                    className={`rounded px-2 py-1.5 text-center text-[10px] font-medium ${
                      isDone
                        ? 'bg-accent/20 text-accent'
                        : isActive
                          ? 'bg-primary/20 text-primary'
                          : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    {isDone ? '✓ ' : ''}
                    {s.label}
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* Step 4: Done */}
      {step === 'done' && (
        <div className="space-y-6">
          <div className="rounded-lg border border-accent/50 bg-accent/10 p-6 text-center">
            <div className="mb-2 text-3xl">✓</div>
            <p className="text-sm font-medium text-accent">
              Agent &quot;{name}&quot; is ready!
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {files.length > 0
                ? `${files.length} files ingested. Cache warmed and ready to serve.`
                : 'Agent created without knowledge base.'}
            </p>
          </div>

          <div className="flex justify-center gap-3">
            <Link
              href={`/llm/agents/${agentId}`}
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              View Agent
            </Link>
            <Link
              href="/playground"
              className="rounded-md bg-muted px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-muted/80"
            >
              Test in Playground
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}

function steps(step: Step): number {
  return { config: 0, upload: 1, processing: 2, done: 3 }[step]
}
