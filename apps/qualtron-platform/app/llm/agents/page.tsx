'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import type { LLMAgent } from '@/lib/database.types'

// Mock data — replaced by Supabase + CachedLLM sync
const MOCK_AGENTS: LLMAgent[] = [
  {
    id: '1',
    team_id: 't1',
    engine_connection_id: 'ec1',
    cachedllm_agent_id: 'support-agent-a3f2',
    name: 'Support Agent',
    description: 'Customer support with product knowledge base',
    system_prompt: 'You are a helpful support agent.',
    quality: 'max',
    mode: 'hosted',
    temperature: 0.7,
    max_tokens: 2048,
    kb_token_count: 62000,
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

export default function LLMAgentsPage() {
  const [agents, setAgents] = useState<LLMAgent[]>(MOCK_AGENTS)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Qualtron CacheLLM Agents
          </h1>
          <p className="text-muted-foreground">
            Manage inference agents — knowledge bases, cache configuration,
            pipeline stages, and GPU deployment.
          </p>
        </div>
        <Link
          href="/llm/agents/new"
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          Create Agent
        </Link>
      </div>

      {/* Agent Cards */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {agents.map((agent) => (
          <Link key={agent.id} href={`/llm/agents/${agent.cachedllm_agent_id}`}>
            <div className="rounded-lg border border-border bg-card p-5 transition-colors hover:border-primary/50">
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-card-foreground">
                    {agent.name}
                  </h3>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {agent.description}
                  </p>
                </div>
                <div className="flex gap-1.5">
                  <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-medium text-primary">
                    {agent.quality}
                  </span>
                  <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                    {agent.mode}
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
                    {agent.requests_today.toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-medium text-muted-foreground">
                    Tokens
                  </p>
                  <p className="text-sm font-bold text-card-foreground">
                    {(agent.tokens_today / 1000).toFixed(0)}k
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-medium text-muted-foreground">
                    KB Size
                  </p>
                  <p className="text-sm font-bold text-card-foreground">
                    {agent.kb_token_count > 0
                      ? `${(agent.kb_token_count / 1000).toFixed(0)}k`
                      : 'No KB'}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-medium text-muted-foreground">
                    API Keys
                  </p>
                  <p className="text-sm font-bold text-card-foreground">
                    {agent.api_keys_count}
                  </p>
                </div>
              </div>

              {/* Pipeline indicator */}
              <div className="mt-3 flex items-center gap-1">
                <span className="text-[10px] text-muted-foreground">
                  Pipeline:
                </span>
                {['0.8B', '2B', '4B', '9B'].map((stage) => (
                  <span
                    key={stage}
                    className="rounded bg-accent/20 px-1.5 py-0.5 text-[9px] font-mono text-accent"
                  >
                    {stage}
                  </span>
                ))}
                {agent.quality === 'max' && (
                  <span className="rounded bg-primary/20 px-1.5 py-0.5 text-[9px] font-mono text-primary">
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
