'use client'

import { useCallback, useRef, useState, type ChangeEvent } from 'react'
import dynamic from 'next/dynamic'
import { QHMGraph } from '@/components/qhm/qhm-graph'

// Monaco editor — dynamic import (SSR not supported)
const MonacoEditor = dynamic(
  () => import('@monaco-editor/react').then((m) => m.default),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
        Loading editor...
      </div>
    ),
  },
)

type Tab = 'text' | 'graph' | 'raw'
type UploadMethod = 'file' | 'text' | 'url'

interface SymResult {
  document_id: string
  extraction_mode: string
  qlang: { index: number; role: string; text: string; rawText: string }[]
  predicates: {
    sentence_index: number
    subject: string
    relation: string
    object: string
    negated: boolean
    modality: string
    confidence: number
  }[]
  triples: {
    sentence_index: number
    subject: string
    relation: string
    object: string
    confidence: number
  }[]
  entities: { text: string; label: string; start: number; end: number }[]
  sentences: { index: number; text: string }[]
  cnl_results: {
    sentence_index: number
    cnl_text: string
    role: string
    parse_success: boolean
  }[]
  meta: {
    timing_ms: Record<string, number>
    sentence_count: number
    word_count: number
    entity_count: number
    heuristic_content_type: string
  }
  counts: Record<string, number>
}

export default function QHMPage() {
  const [result, setResult] = useState<SymResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [tab, setTab] = useState<Tab>('text')
  const [uploadMethod, setUploadMethod] = useState<UploadMethod>('file')
  const [textInput, setTextInput] = useState('')
  const [urlInput, setUrlInput] = useState('')
  const [fileName, setFileName] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  // ─── Ingest handlers ─────────────────────────────────────────────────────

  const handleFileUpload = useCallback(
    async (e: ChangeEvent<HTMLInputElement>) => {
      if (!e.target.files?.length) return
      const file = e.target.files[0]
      setFileName(file.name)
      setLoading(true)
      setError(null)
      const formData = new FormData()
      formData.append('file', file)
      formData.append('tool', 'sym')
      try {
        const res = await fetch('/api/ingest', {
          method: 'POST',
          body: formData,
        })
        const data = await res.json()
        if (!res.ok || data.error)
          throw new Error(data.error ?? data.detail ?? 'Failed')
        setResult(data.output as SymResult)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed')
      } finally {
        setLoading(false)
      }
    },
    [],
  )

  const handleTextIngest = useCallback(async () => {
    if (!textInput.trim()) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/ingest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          method: 'text',
          source: textInput,
          options: { mode: 'sym' },
        }),
      })
      const data = await res.json()
      if (!res.ok || data.error)
        throw new Error(data.error ?? data.detail ?? 'Failed')
      setResult(data.output as SymResult)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed')
    } finally {
      setLoading(false)
    }
  }, [textInput])

  const handleUrlIngest = useCallback(async () => {
    if (!urlInput.trim()) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/ingest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          method: 'url',
          source: urlInput,
          options: { mode: 'sym' },
        }),
      })
      const data = await res.json()
      if (!res.ok || data.error)
        throw new Error(data.error ?? data.detail ?? 'Failed')
      setResult(data.output as SymResult)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed')
    } finally {
      setLoading(false)
    }
  }, [urlInput])

  // ─── Build graph data from sym-ingest result ─────────────────────────────

  const graphData = result ? buildGraphData(result) : { nodes: [], edges: [] }

  // ─── Build text for Monaco editor ────────────────────────────────────────

  const editorContent = result ? buildEditorContent(result) : ''

  // ─── Timing summary ──────────────────────────────────────────────────────

  const totalMs = result?.meta?.timing_ms
    ? Object.values(result.meta.timing_ms).reduce(
        (a, b) => a + (typeof b === 'number' ? b : 0),
        0,
      )
    : 0

  return (
    <div className="flex h-[calc(100vh-72px)] flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-4 py-2">
        <div>
          <h1 className="text-lg font-bold">Quantum Hypergraph Memory</h1>
          <p className="text-xs text-muted-foreground">
            Upload → Extract → Visualize → Load into Model
          </p>
        </div>
        {result && (
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span>{result.counts?.sentences ?? 0} sentences</span>
            <span>{result.qlang?.length ?? 0} QLang</span>
            <span>{result.triples?.length ?? 0} triples</span>
            <span>{result.entities?.length ?? 0} entities</span>
            <span>{totalMs}ms</span>
          </div>
        )}
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Left: Upload panel */}
        <div className="w-72 shrink-0 border-r border-border overflow-y-auto p-3 space-y-3">
          {/* Upload method tabs */}
          <div className="flex gap-1">
            {(['file', 'text', 'url'] as UploadMethod[]).map((m) => (
              <button
                key={m}
                onClick={() => setUploadMethod(m)}
                className={`rounded px-2 py-1 text-xs font-medium ${
                  uploadMethod === m
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground'
                }`}
              >
                {m === 'file' ? '📄 File' : m === 'text' ? '✏️ Text' : '🔗 URL'}
              </button>
            ))}
          </div>

          {/* File upload */}
          {uploadMethod === 'file' && (
            <div>
              <button
                onClick={() => fileRef.current?.click()}
                className="w-full rounded-lg border-2 border-dashed border-border py-6 text-center text-xs text-muted-foreground hover:border-primary/50"
              >
                {fileName || 'Drop PDF, TXT, MD, code files'}
              </button>
              <input
                ref={fileRef}
                type="file"
                accept=".pdf,.docx,.txt,.md,.csv,.json,.py,.ts,.js,.go,.java,.rs"
                onChange={handleFileUpload}
                className="hidden"
              />
            </div>
          )}

          {/* Text input */}
          {uploadMethod === 'text' && (
            <div className="space-y-2">
              <textarea
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                placeholder="Paste text to analyze..."
                rows={6}
                className="w-full rounded-md border border-input bg-background px-2 py-1.5 text-xs"
              />
              <button
                onClick={handleTextIngest}
                disabled={!textInput.trim() || loading}
                className="w-full rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground disabled:opacity-50"
              >
                {loading ? 'Processing...' : 'Extract'}
              </button>
            </div>
          )}

          {/* URL input */}
          {uploadMethod === 'url' && (
            <div className="space-y-2">
              <input
                type="url"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                placeholder="https://example.com/document"
                className="w-full rounded-md border border-input bg-background px-2 py-1.5 text-xs"
              />
              <button
                onClick={handleUrlIngest}
                disabled={!urlInput.trim() || loading}
                className="w-full rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground disabled:opacity-50"
              >
                {loading ? 'Processing...' : 'Extract'}
              </button>
            </div>
          )}

          {loading && (
            <div className="rounded-md bg-primary/10 p-3 text-center">
              <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                <div className="h-full w-2/3 animate-pulse rounded-full bg-primary" />
              </div>
              <p className="mt-2 text-xs text-primary">
                Extracting with QHP...
              </p>
            </div>
          )}

          {error && (
            <div className="rounded-md bg-destructive/10 p-2 text-xs text-destructive">
              {error}
              <button onClick={() => setError(null)} className="ml-2 underline">
                dismiss
              </button>
            </div>
          )}

          {/* QLang rules list */}
          {result && result.qlang?.length > 0 && (
            <div>
              <h3 className="mb-1.5 text-xs font-semibold">
                QLang Rules ({result.qlang.length})
              </h3>
              <div className="space-y-1 max-h-60 overflow-y-auto">
                {result.qlang.map((q, i) => (
                  <div
                    key={i}
                    className="rounded border border-border bg-background px-2 py-1 text-[10px]"
                  >
                    <span
                      className={`font-mono font-medium ${
                        TYPE_COLOR_CSS[q.role] ?? 'text-muted-foreground'
                      }`}
                    >
                      {q.role}
                    </span>
                    <p className="mt-0.5 text-muted-foreground">
                      {q.rawText.slice(0, 80)}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Load into model */}
          {result && (
            <button className="w-full rounded-md bg-accent px-3 py-2 text-xs font-medium text-accent-foreground hover:bg-accent/90">
              Load QHM into Model →
            </button>
          )}
        </div>

        {/* Right: Viewer */}
        <div className="flex flex-1 flex-col overflow-hidden">
          {/* Tabs */}
          <div className="flex gap-1 border-b border-border px-3 py-1.5">
            {(['text', 'graph', 'raw'] as Tab[]).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`rounded px-3 py-1 text-xs font-medium ${
                  tab === t
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-muted'
                }`}
              >
                {t === 'text'
                  ? '📝 Text View'
                  : t === 'graph'
                    ? '🔗 Graph'
                    : '{ } Raw JSON'}
              </button>
            ))}
          </div>

          {/* Content */}
          <div className="flex-1 overflow-hidden">
            {!result ? (
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                Upload a document to see QHM extraction results
              </div>
            ) : tab === 'text' ? (
              <MonacoEditor
                height="100%"
                language="markdown"
                theme="vs-dark"
                value={editorContent}
                options={{
                  readOnly: true,
                  minimap: { enabled: false },
                  fontSize: 12,
                  wordWrap: 'on',
                  lineNumbers: 'on',
                  scrollBeyondLastLine: false,
                }}
              />
            ) : tab === 'graph' ? (
              <div className="h-full w-full overflow-auto p-2">
                <QHMGraph
                  nodes={graphData.nodes}
                  edges={graphData.edges}
                  width={Math.max(800, graphData.nodes.length * 60)}
                  height={Math.max(500, graphData.nodes.length * 40)}
                />
              </div>
            ) : (
              <MonacoEditor
                height="100%"
                language="json"
                theme="vs-dark"
                value={JSON.stringify(result, null, 2)}
                options={{
                  readOnly: true,
                  minimap: { enabled: false },
                  fontSize: 11,
                  wordWrap: 'on',
                  scrollBeyondLastLine: false,
                }}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const TYPE_COLOR_CSS: Record<string, string> = {
  Obligation: 'text-warning',
  Permission: 'text-success',
  Prohibition: 'text-destructive',
  Condition: 'text-info',
  TriggerRule: 'text-primary',
  TimeCondition: 'text-info',
  Entity: 'text-muted-foreground',
  Actor: 'text-primary',
  Action: 'text-accent',
  Claim: 'text-primary',
}

function buildEditorContent(r: SymResult): string {
  const lines: string[] = []
  lines.push(`# QHM Extraction — ${r.extraction_mode}`)
  lines.push(``)
  lines.push(`**Document:** ${r.document_id}`)
  lines.push(
    `**Sentences:** ${r.counts?.sentences ?? 0} | **QLang:** ${r.qlang?.length ?? 0} | **Triples:** ${r.triples?.length ?? 0} | **Entities:** ${r.entities?.length ?? 0}`,
  )
  lines.push(`**Content type:** ${r.meta?.heuristic_content_type ?? 'unknown'}`)
  lines.push(``)

  // QLang
  lines.push(`## QLang Rules`)
  lines.push(``)
  for (const q of r.qlang ?? []) {
    lines.push(`**[${q.role}]** ${q.rawText}`)
  }
  lines.push(``)

  // Predicates
  if (r.predicates?.length) {
    lines.push(`## Predicates`)
    lines.push(``)
    for (const p of r.predicates) {
      const neg = p.negated ? ' [NEGATED]' : ''
      lines.push(
        `- **${p.subject}** → *${p.relation}* → **${p.object}**${neg} (${p.modality}, conf: ${p.confidence})`,
      )
    }
    lines.push(``)
  }

  // OpenIE Triples
  if (r.triples?.length) {
    lines.push(`## OpenIE Triples`)
    lines.push(``)
    for (const t of r.triples) {
      lines.push(
        `- ${t.subject} → *${t.relation}* → ${t.object} (conf: ${t.confidence})`,
      )
    }
    lines.push(``)
  }

  // Entities
  if (r.entities?.length) {
    lines.push(`## Named Entities`)
    lines.push(``)
    for (const e of r.entities) {
      lines.push(`- **${e.text}** (${e.label})`)
    }
    lines.push(``)
  }

  // CNL
  if (r.cnl_results?.length) {
    lines.push(`## CNL (Controlled Natural Language)`)
    lines.push(``)
    for (const c of r.cnl_results) {
      const status = c.parse_success ? '✓' : '○'
      lines.push(`${status} **[${c.role}]** ${c.cnl_text}`)
    }
    lines.push(``)
  }

  // Sentences
  lines.push(`## Source Sentences`)
  lines.push(``)
  for (const s of r.sentences ?? []) {
    lines.push(`${s.index}. ${s.text}`)
  }

  return lines.join('\n')
}

function buildGraphData(r: SymResult): {
  nodes: { id: string; label: string; type: string }[]
  edges: { source: string; target: string; label: string }[]
} {
  const nodeMap = new Map<string, { id: string; label: string; type: string }>()
  const edges: { source: string; target: string; label: string }[] = []

  // Add QLang sentences as nodes
  for (const q of r.qlang ?? []) {
    const id = `qlang-${q.index}`
    nodeMap.set(id, {
      id,
      label: (q.rawText ?? q.text ?? '').slice(0, 40),
      type: q.role ?? 'unknown',
    })
  }

  // Add entities as nodes
  for (const e of r.entities ?? []) {
    const label = e.text ?? ''
    const id = `entity-${label}`
    if (!nodeMap.has(id)) {
      nodeMap.set(id, { id, label, type: 'Entity' })
    }
  }

  // Add triples as edges between subject/object nodes
  for (const t of r.triples ?? []) {
    const subj = t.subject ?? ''
    const obj = t.object ?? ''
    const rel = t.relation ?? ''
    if (!subj && !obj) continue
    const srcId = `subj-${subj}`
    const tgtId = `obj-${obj}`
    if (!nodeMap.has(srcId))
      nodeMap.set(srcId, { id: srcId, label: subj, type: 'Actor' })
    if (!nodeMap.has(tgtId))
      nodeMap.set(tgtId, { id: tgtId, label: obj, type: 'Entity' })
    edges.push({ source: srcId, target: tgtId, label: rel })
  }

  // Connect QLang to related entities via predicates
  for (const p of r.predicates ?? []) {
    const subjId = `subj-${p.subject ?? ''}`
    const objId = `obj-${p.object ?? ''}`
    const qlangId = `qlang-${p.sentence_index}`
    if (nodeMap.has(qlangId) && nodeMap.has(subjId)) {
      edges.push({ source: qlangId, target: subjId, label: 'about' })
    }
    if (nodeMap.has(qlangId) && nodeMap.has(objId)) {
      edges.push({ source: qlangId, target: objId, label: 'relates' })
    }
  }

  return { nodes: Array.from(nodeMap.values()), edges }
}
