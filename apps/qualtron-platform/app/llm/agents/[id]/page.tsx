'use client'

import { use, useState } from 'react'
import Link from 'next/link'

type Tab = 'overview' | 'keys' | 'code'

const CODE_SNIPPETS = {
  python: (modelId: string) => `from openai import OpenAI

client = OpenAI(
    base_url="http://localhost:8000/v1",
    api_key="cag_YOUR_API_KEY",
)

response = client.chat.completions.create(
    model="${modelId}",
    messages=[{"role": "user", "content": "What are the payment terms?"}],
    stream=True,
)
for chunk in response:
    print(chunk.choices[0].delta.content or "", end="")`,

  typescript: (modelId: string) => `import OpenAI from "openai";

const client = new OpenAI({
  baseURL: "http://localhost:8000/v1",
  apiKey: "cag_YOUR_API_KEY",
});

const stream = await client.chat.completions.create({
  model: "${modelId}",
  messages: [{ role: "user", content: "What are the payment terms?" }],
  stream: true,
});
for await (const chunk of stream) {
  process.stdout.write(chunk.choices[0]?.delta?.content || "");
}`,

  curl: (modelId: string) => `curl http://localhost:8000/v1/chat/completions \\
  -H "Authorization: Bearer cag_YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "model": "${modelId}",
    "messages": [{"role": "user", "content": "What are the payment terms?"}],
    "stream": true
  }'`,
}

export default function ModelInstanceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const [tab, setTab] = useState<Tab>('overview')
  const [codeLanguage, setCodeLanguage] = useState<
    'python' | 'typescript' | 'curl'
  >('python')

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href="/llm/agents"
          className="text-muted-foreground hover:text-foreground"
        >
          ← Model Instances
        </Link>
        <span className="text-muted-foreground">/</span>
        <h1 className="text-2xl font-bold tracking-tight">Qualtron-9B-600K</h1>
        <span className="rounded-full bg-primary/15 px-2.5 py-0.5 text-xs font-medium text-primary">
          Enterprise
        </span>
        <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
          hosted
        </span>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
        <StatCard label="Requests Today" value="3,500" />
        <StatCard label="Tokens Today" value="450k" />
        <StatCard label="QHM Tokens" value="620k" />
        <StatCard label="QHM Files" value="12" />
        <StatCard label="API Keys" value="2" />
      </div>

      {/* CAG Pipeline */}
      <div className="rounded-lg border border-border bg-card p-5">
        <h3 className="mb-3 text-sm font-semibold text-card-foreground">
          CAG Cognitive Hierarchy (Cache-Augmented Generation)
        </h3>
        <div className="flex items-center gap-2">
          {[
            { model: '0.8B', label: 'Classification', tier: 'Tier 1 — QHP' },
            { model: '2B', label: 'Rule Extraction', tier: 'Tier 1 — QHP' },
            { model: '4B', label: 'Normalization', tier: 'Tier 1 — QHP' },
            { model: '9B', label: 'Reasoning', tier: 'Tier 2 — Thinker' },
            {
              model: '122B',
              label: 'Deep Analysis',
              tier: 'Tier 3 — Enterprise',
            },
          ].map((stage, i) => (
            <div key={stage.model} className="flex items-center gap-2">
              {i > 0 && <span className="text-muted-foreground">→</span>}
              <div
                className={`rounded-lg border p-3 text-center ${
                  stage.model === '122B'
                    ? 'border-primary/50 bg-primary/5'
                    : 'border-border bg-muted/50'
                }`}
              >
                <div className="text-xs font-bold text-card-foreground">
                  {stage.model}
                </div>
                <div className="mt-0.5 text-[10px] text-muted-foreground">
                  {stage.label}
                </div>
                <div className="mt-0.5 text-[10px] text-muted-foreground/60">
                  {stage.tier}
                </div>
              </div>
            </div>
          ))}
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          Tier 1 runs QHP non-thinking (fast retrieval from QHM). Tier 2 enables
          reasoning with thinking mode. Tier 3 (122B) produces comprehensive
          answers via deep analysis. QHM is pre-cached via RadixAttention —
          prefix computed once, reused across all stages.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-border pb-2">
        {(['overview', 'keys', 'code'] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
              tab === t
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-muted'
            }`}
          >
            {t === 'overview'
              ? 'Overview'
              : t === 'keys'
                ? 'API Keys'
                : 'Quick Start'}
          </button>
        ))}
      </div>

      {tab === 'overview' && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="space-y-4">
            <h3 className="text-sm font-semibold">Configuration</h3>
            <div className="space-y-2 text-sm">
              <Row label="Base Model" value="Qualtron-9B-600K" mono />
              <Row label="CAG Tier" value="Enterprise (3-Tier)" />
              <Row label="Temperature" value="0.7" />
              <Row label="Max Tokens" value="2,048" />
              <Row label="Instance ID" value={id} mono />
            </div>
          </div>
          <div className="space-y-4">
            <h3 className="text-sm font-semibold">
              Quantum Hypergraph Memory (QHM)
            </h3>
            <div className="space-y-2 text-sm">
              <Row label="QHM Token Count" value="620,000" />
              <Row label="Source Files" value="12" />
              <Row label="QHP Strategy" value="single_pass" mono />
              <Row label="Cache Status" value="Warmed (RadixAttention)" />
              <Row label="Last Updated" value="2 hours ago" />
            </div>
            <button className="rounded-md bg-muted px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted/80">
              Reload QHM (Re-run QHP)
            </button>
          </div>
          <div className="space-y-4">
            <h3 className="text-sm font-semibold">GPU Deployment</h3>
            <div className="rounded-lg border border-border bg-muted/50 p-4 text-center text-sm text-muted-foreground">
              Running in hosted mode. Deploy to dedicated GPU for lower latency.
            </div>
            <Link
              href="/llm/deploy"
              className="inline-flex rounded-md bg-muted px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted/80"
            >
              Deploy to GPU →
            </Link>
          </div>
          <div className="space-y-4">
            <h3 className="text-sm font-semibold">System Prompt</h3>
            <pre className="rounded-lg border border-border bg-muted/50 p-3 text-xs text-muted-foreground">
              You are a helpful assistant. Answer questions based on the
              provided knowledge.
            </pre>
          </div>
        </div>
      )}

      {tab === 'keys' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              API keys grant access to this Qualtron instance via the
              OpenAI-compatible API.
            </p>
            <button className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90">
              Create Key
            </button>
          </div>
          <div className="rounded-lg border border-border">
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <div>
                <span className="text-sm font-medium">Production</span>
                <span className="ml-2 font-mono text-xs text-muted-foreground">
                  cag_prod••••••••••••
                </span>
              </div>
              <span className="rounded-full bg-accent/20 px-2 py-0.5 text-[10px] text-accent">
                Active
              </span>
            </div>
            <div className="flex items-center justify-between px-4 py-3">
              <div>
                <span className="text-sm font-medium">Development</span>
                <span className="ml-2 font-mono text-xs text-muted-foreground">
                  cag_dev•••••••••••••
                </span>
              </div>
              <span className="rounded-full bg-accent/20 px-2 py-0.5 text-[10px] text-accent">
                Active
              </span>
            </div>
          </div>
        </div>
      )}

      {tab === 'code' && (
        <div className="space-y-4">
          <div className="flex gap-2">
            {(['python', 'typescript', 'curl'] as const).map((lang) => (
              <button
                key={lang}
                onClick={() => setCodeLanguage(lang)}
                className={`rounded-md px-3 py-1.5 text-xs font-medium ${
                  codeLanguage === lang
                    ? 'bg-muted text-foreground'
                    : 'text-muted-foreground hover:bg-muted/50'
                }`}
              >
                {lang === 'python'
                  ? 'Python'
                  : lang === 'typescript'
                    ? 'TypeScript'
                    : 'curl'}
              </button>
            ))}
          </div>
          <pre className="overflow-x-auto rounded-lg border border-border bg-muted/50 p-4 text-xs leading-relaxed text-foreground">
            {CODE_SNIPPETS[codeLanguage](id)}
          </pre>
          <p className="text-xs text-muted-foreground">
            The Qualtron API is fully OpenAI-compatible. Use any OpenAI SDK
            client with the Qualtron endpoint.
          </p>
        </div>
      )}
    </div>
  )
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-card p-3">
      <p className="text-[10px] font-medium text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-lg font-bold text-card-foreground">{value}</p>
    </div>
  )
}

function Row({
  label,
  value,
  mono,
}: {
  label: string
  value: string
  mono?: boolean
}) {
  return (
    <div className="flex justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className={mono ? 'font-mono text-primary' : ''}>{value}</span>
    </div>
  )
}
