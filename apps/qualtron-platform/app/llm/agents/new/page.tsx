'use client'

import {
  useCallback,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
} from 'react'
import Link from 'next/link'

type Step = 'config' | 'upload' | 'processing' | 'done'

const SUPPORTED_FORMATS = [
  '.pdf',
  '.docx',
  '.txt',
  '.md',
  '.csv',
  '.json',
  '.jsonl',
  '.py',
  '.ts',
  '.tsx',
  '.js',
  '.jsx',
  '.go',
  '.java',
  '.rs',
  '.rb',
  '.php',
  '.swift',
  '.kt',
  '.c',
  '.cpp',
  '.cs',
  '.sql',
  '.sh',
  '.yaml',
  '.yml',
  '.toml',
  '.xml',
  '.html',
  '.css',
  '.zip',
]

const MAX_FILE_SIZE = 50 * 1024 * 1024

export default function CreateModelInstancePage() {
  const [step, setStep] = useState<Step>('config')
  const [instanceId, setInstanceId] = useState<string | null>(null)

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [systemPrompt, setSystemPrompt] = useState(
    'You are a helpful assistant. Answer questions based on the provided knowledge.',
  )
  const [tier, setTier] = useState<'enterprise' | 'pro' | 'instant'>(
    'enterprise',
  )
  const [baseModel, setBaseModel] = useState('Qualtron-9B-600K')

  const [files, setFiles] = useState<File[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [progress, setProgress] = useState(0)
  const [currentStep, setCurrentStep] = useState<string | null>(null)

  const handleCreate = (e: FormEvent) => {
    e.preventDefault()
    setInstanceId('inst-' + Date.now())
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

  const handleStartQHP = () => {
    setStep('processing')
    const stages = [
      { step: 'classification', target: 0.1 },
      { step: 'rule_extraction', target: 0.25 },
      { step: 'normalization', target: 0.4 },
      { step: 'hypergraph_construction', target: 0.6 },
      { step: 'intelligence_signals', target: 0.75 },
      { step: 'qhm_loading', target: 0.9 },
      { step: 'cache_warming', target: 0.95 },
      { step: 'done', target: 1.0 },
    ]
    let idx = 0
    const interval = setInterval(() => {
      if (idx < stages.length) {
        setCurrentStep(stages[idx].step)
        setProgress(stages[idx].target)
        idx++
      } else {
        clearInterval(interval)
        setStep('done')
      }
    }, 1200)
  }

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index))
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center gap-4">
        <Link
          href="/llm/agents"
          className="text-muted-foreground hover:text-foreground"
        >
          ← Model Instances
        </Link>
        <span className="text-muted-foreground">/</span>
        <h1 className="text-2xl font-bold tracking-tight">
          Create Qualtron Instance
        </h1>
      </div>

      {/* Step indicator */}
      <div className="flex gap-2">
        {(['config', 'upload', 'processing', 'done'] as Step[]).map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            {i > 0 && (
              <div
                className={`h-px w-8 ${stepIndex(step) >= i ? 'bg-primary' : 'bg-border'}`}
              />
            )}
            <div
              className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${
                stepIndex(step) >= i
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground'
              }`}
            >
              {stepIndex(step) > i ? '✓' : i + 1}
            </div>
            <span
              className={`text-xs ${stepIndex(step) >= i ? 'text-foreground' : 'text-muted-foreground'}`}
            >
              {s === 'config'
                ? 'Configure'
                : s === 'upload'
                  ? 'Load QHM'
                  : s === 'processing'
                    ? 'QHP Processing'
                    : 'Ready'}
            </span>
          </div>
        ))}
      </div>

      {/* Step 1: Configuration */}
      {step === 'config' && (
        <form onSubmit={handleCreate} className="space-y-5">
          <div>
            <label className="mb-1.5 block text-sm font-medium">
              Instance Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Support — Legal Docs"
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
              placeholder="Customer support with product documentation loaded as QHM"
              rows={2}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium">
              Base Model
            </label>
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
              {[
                {
                  id: 'Qualtron-0.8B-400K',
                  label: 'Qualtron-0.8B',
                  qhm: '400K QHM',
                  desc: 'Ultra-fast, small context',
                },
                {
                  id: 'Qualtron-9B-600K',
                  label: 'Qualtron-9B',
                  qhm: '600K QHM',
                  desc: 'Balanced speed & quality',
                },
                {
                  id: 'Qualtron-27B-1M',
                  label: 'Qualtron-27B',
                  qhm: '1M QHM',
                  desc: 'High quality, large memory',
                },
                {
                  id: 'Qualtron-120B-1M',
                  label: 'Qualtron-120B',
                  qhm: '1M QHM',
                  desc: 'Maximum quality (12B active via MoE)',
                },
              ].map((model) => (
                <label
                  key={model.id}
                  className={`cursor-pointer rounded-lg border p-3 transition-colors ${
                    baseModel === model.id
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-muted-foreground/30'
                  }`}
                >
                  <input
                    type="radio"
                    name="baseModel"
                    value={model.id}
                    checked={baseModel === model.id}
                    onChange={() => setBaseModel(model.id)}
                    className="sr-only"
                  />
                  <div className="text-sm font-semibold">{model.label}</div>
                  <div className="mt-0.5 text-[10px] font-mono text-primary">
                    {model.qhm}
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {model.desc}
                  </p>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium">
              CAG Cognitive Hierarchy
            </label>
            <div className="grid grid-cols-2 gap-3">
              {[
                {
                  id: 'enterprise' as const,
                  label: 'Enterprise (3-Tier)',
                  desc: 'Full CAG: Tier 1 retrieval (0.8B→2B→4B) → Tier 2 reasoning (9B) → Tier 3 deep analysis (122B)',
                  stages: ['0.8B', '2B', '4B', '9B', '122B'],
                },
                {
                  id: 'pro' as const,
                  label: 'Pro (2-Tier)',
                  desc: 'CAG: Tier 1 retrieval (0.8B→2B→4B) → Tier 2 reasoning (9B). Faster, lower cost.',
                  stages: ['0.8B', '2B', '4B', '9B'],
                },
              ].map((t) => (
                <label
                  key={t.id}
                  className={`cursor-pointer rounded-lg border p-4 transition-colors ${
                    tier === t.id
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-muted-foreground/30'
                  }`}
                >
                  <input
                    type="radio"
                    name="tier"
                    value={t.id}
                    checked={tier === t.id}
                    onChange={() => setTier(t.id)}
                    className="sr-only"
                  />
                  <div className="text-sm font-semibold">{t.label}</div>
                  <p className="mt-1 text-xs text-muted-foreground">{t.desc}</p>
                  <div className="mt-2 flex gap-1">
                    {t.stages.map((s) => (
                      <span
                        key={s}
                        className={`rounded px-1.5 py-0.5 text-[10px] font-mono ${
                          s === '122B'
                            ? 'bg-primary/20 text-primary'
                            : 'bg-accent/20 text-accent'
                        }`}
                      >
                        {s}
                      </span>
                    ))}
                  </div>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium">
              System Prompt
            </label>
            <textarea
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              rows={3}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono"
            />
          </div>

          <button
            type="submit"
            disabled={!name}
            className="rounded-md bg-primary px-6 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            Create & Load QHM
          </button>
        </form>
      )}

      {/* Step 2: QHM Upload */}
      {step === 'upload' && (
        <div className="space-y-5">
          <p className="text-sm text-muted-foreground">
            Upload documents to build the Quantum Hypergraph Memory (QHM). Files
            are processed through QHP (Quantum Hypergraph Processing) —
            classification, rule extraction, normalization, hypergraph
            construction, and intelligence signals.
          </p>
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
              onClick={handleStartQHP}
              disabled={files.length === 0}
              className="rounded-md bg-primary px-6 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              Start QHP Processing
            </button>
            <button
              onClick={() => setStep('done')}
              className="rounded-md bg-muted px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-muted/80"
            >
              Skip — No QHM
            </button>
          </div>
        </div>
      )}

      {/* Step 3: QHP Processing */}
      {step === 'processing' && (
        <div className="space-y-6">
          <div className="rounded-lg border border-border bg-card p-6">
            <div className="mb-4 text-center">
              <p className="text-sm font-medium text-card-foreground">
                Quantum Hypergraph Processing
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {currentStep === 'classification' &&
                  'Stage 1: Classifying document types...'}
                {currentStep === 'rule_extraction' &&
                  'Stage 2: Extracting rules into 18 typed categories...'}
                {currentStep === 'normalization' &&
                  'Stage 3: Normalizing into Abstract Syntax Trees...'}
                {currentStep === 'hypergraph_construction' &&
                  'Stage 4: Building dependency hypergraph...'}
                {currentStep === 'intelligence_signals' &&
                  'Stage 5: Generating intelligence signals (relevance, conflicts)...'}
                {currentStep === 'qhm_loading' &&
                  'Loading Quantum Hypergraph Memory into model context...'}
                {currentStep === 'cache_warming' &&
                  'Warming RadixAttention prefix cache on GPU...'}
                {currentStep === 'done' && 'Complete!'}
              </p>
            </div>

            <div className="h-2 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary transition-all duration-500"
                style={{ width: `${progress * 100}%` }}
              />
            </div>
            <p className="mt-2 text-center text-xs text-muted-foreground">
              {Math.round(progress * 100)}%
            </p>

            <div className="mt-4 grid grid-cols-4 gap-1 lg:grid-cols-7">
              {[
                { key: 'classification', label: 'Classify' },
                { key: 'rule_extraction', label: 'Extract' },
                { key: 'normalization', label: 'Normalize' },
                { key: 'hypergraph_construction', label: 'Hypergraph' },
                { key: 'intelligence_signals', label: 'Signals' },
                { key: 'qhm_loading', label: 'QHM Load' },
                { key: 'cache_warming', label: 'Cache' },
              ].map((s) => {
                const sp: Record<string, number> = {
                  classification: 0.1,
                  rule_extraction: 0.25,
                  normalization: 0.4,
                  hypergraph_construction: 0.6,
                  intelligence_signals: 0.75,
                  qhm_loading: 0.9,
                  cache_warming: 0.95,
                }
                const isDone = progress > (sp[s.key] ?? 1)
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
              {baseModel} instance &quot;{name}&quot; is ready!
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {files.length > 0
                ? `QHM built from ${files.length} files via QHP. RadixAttention cache warmed.`
                : 'Instance created without QHM. You can load memory later.'}
            </p>
          </div>
          <div className="flex justify-center gap-3">
            <Link
              href={`/llm/agents/${instanceId}`}
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              View Instance
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

function stepIndex(step: Step): number {
  return { config: 0, upload: 1, processing: 2, done: 3 }[step]
}
