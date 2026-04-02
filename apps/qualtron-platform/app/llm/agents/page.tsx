'use client'

import { useState } from 'react'
import Link from 'next/link'
import type { LLMAgent } from '@/lib/database.types'

// Mock data — replaced by Supabase + inference backend sync
const MOCK_INSTANCES: LLMAgent[] = [
  {
    id: '1',
    team_id: 't1',
    engine_connection_id: 'ec1',
    cachedllm_agent_id: 'qualtron-9b-600k-support',
    name: 'Qualtron-9B-600K',
    description: 'Customer support with product QHM loaded',
    system_prompt: 'You are a helpful support agent.',
    quality: 'max',
    mode: 'hosted',
    temperature: 0.7,
    max_tokens: 2048,
    kb_token_count: 620000,
    kb_file_count: 12,
    kb_strategy: 'single_pass',
    kb_last_updated: new Date().toISOString(),
    deploy_provider: null,
    deploy_pod_id: null,
    deploy_endpoint: null,
    deploy_gpu_tier: null,
    deploy_status: null,
    deploy_cost_per_hour: null,
    api_keys_count: 2,
    requests_today: 3500,
    tokens_today: 450000,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
]

const MODEL_TIERS: Record<string, string> = {
  max: 'Enterprise',
  balanced: 'Pro',
}

export default function ModelInstancesPage() {
  const [instances] = useState<LLMAgent[]>(MOCK_INSTANCES)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Qualtron Model Instances
          </h1>
          <p className="text-muted-foreground">
            Manage Qualtron model deployments — Quantum Hypergraph Memory (QHM),
            CAG pipeline configuration, and GPU serving.
          </p>
        </div>
        <Link
          href="/llm/agents/new"
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          Create Instance
        </Link>
      </div>

      {/* Model Cards */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {instances.map((inst) => (
          <Link key={inst.id} href={`/llm/agents/${inst.cachedllm_agent_id}`}>
            <div className="rounded-lg border border-border bg-card p-5 transition-colors hover:border-primary/50">
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-card-foreground">
                    {inst.name}
                  </h3>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {inst.description}
                  </p>
                </div>
                <div className="flex gap-1.5">
                  <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-medium text-primary">
                    {MODEL_TIERS[inst.quality] ?? inst.quality}
                  </span>
                  <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                    {inst.mode}
                  </span>
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-4 gap-3">
                <div>
                  <p className="text-[10px] font-medium text-muted-foreground">
                    Requests
                  </p>
                  <p className="text-sm font-bold text-card-foreground">
                    {inst.requests_today.toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-medium text-muted-foreground">
                    Tokens
                  </p>
                  <p className="text-sm font-bold text-card-foreground">
                    {(inst.tokens_today / 1000).toFixed(0)}k
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-medium text-muted-foreground">
                    QHM Size
                  </p>
                  <p className="text-sm font-bold text-card-foreground">
                    {inst.kb_token_count > 0
                      ? `${(inst.kb_token_count / 1000).toFixed(0)}k`
                      : 'No QHM'}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-medium text-muted-foreground">
                    API Keys
                  </p>
                  <p className="text-sm font-bold text-card-foreground">
                    {inst.api_keys_count}
                  </p>
                </div>
              </div>

              {/* CAG Pipeline */}
              <div className="mt-3 flex items-center gap-1">
                <span className="text-[10px] text-muted-foreground">
                  CAG Pipeline:
                </span>
                {['0.8B', '2B', '4B', '9B'].map((stage) => (
                  <span
                    key={stage}
                    className="rounded bg-accent/20 px-1.5 py-0.5 text-[10px] font-mono text-accent"
                  >
                    {stage}
                  </span>
                ))}
                {inst.quality === 'max' && (
                  <span className="rounded bg-primary/20 px-1.5 py-0.5 text-[10px] font-mono text-primary">
                    122B
                  </span>
                )}
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
