'use client'

import { useState } from 'react'
import Link from 'next/link'

type Provider = 'runpod' | 'lambda' | 'vast'
type GPUTier = 'small' | 'medium' | 'large' | 'xlarge'

const PROVIDERS: {
  id: Provider
  name: string
  description: string
}[] = [
  {
    id: 'runpod',
    name: 'RunPod',
    description: 'Community and secure cloud GPUs. Best for flexible scaling.',
  },
  {
    id: 'lambda',
    name: 'Lambda',
    description: 'On-demand GPU cloud. Best for guaranteed availability.',
  },
  {
    id: 'vast',
    name: 'Vast.ai',
    description: 'Marketplace GPUs. Best for cost optimization.',
  },
]

const GPU_TIERS: {
  id: GPUTier
  name: string
  gpus: string
  vram: string
  cost: string
  bestFor: string
}[] = [
  {
    id: 'small',
    name: 'Small',
    gpus: '1x A10G / L4',
    vram: '24 GB',
    cost: '~$0.50/hr',
    bestFor: 'Balanced quality (9B thinker)',
  },
  {
    id: 'medium',
    name: 'Medium',
    gpus: '1x A100 40GB',
    vram: '40 GB',
    cost: '~$1.50/hr',
    bestFor: 'Max quality with small KB (<100k tokens)',
  },
  {
    id: 'large',
    name: 'Large',
    gpus: '2x A100 80GB',
    vram: '160 GB',
    cost: '~$4.00/hr',
    bestFor: 'Max quality with large KB (100k-1M tokens)',
  },
  {
    id: 'xlarge',
    name: 'X-Large',
    gpus: '4-8x A100 / H100',
    vram: '320-640 GB',
    cost: '~$12.00/hr',
    bestFor: 'Max quality with massive KB (1M+ tokens)',
  },
]

export default function GPUDeployPage() {
  const [selectedProvider, setSelectedProvider] = useState<Provider>('runpod')
  const [selectedTier, setSelectedTier] = useState<GPUTier>('medium')

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">GPU Deployment</h1>
        <p className="text-muted-foreground">
          Deploy Qualtron CacheLLM agents to dedicated GPU instances for lower
          latency and higher throughput.
        </p>
      </div>

      {/* Active Deployments */}
      <div>
        <h2 className="mb-3 text-lg font-semibold">Active Deployments</h2>
        <div className="rounded-lg border border-border bg-card p-8 text-center text-sm text-muted-foreground">
          No active GPU deployments. Agents are running in hosted mode.
        </div>
      </div>

      {/* Deploy New */}
      <div>
        <h2 className="mb-3 text-lg font-semibold">Deploy Agent</h2>

        {/* Provider */}
        <div className="mb-4">
          <label className="mb-2 block text-sm font-medium">GPU Provider</label>
          <div className="grid grid-cols-3 gap-3">
            {PROVIDERS.map((p) => (
              <button
                key={p.id}
                onClick={() => setSelectedProvider(p.id)}
                className={`rounded-lg border p-4 text-left transition-colors ${
                  selectedProvider === p.id
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-muted-foreground/30'
                }`}
              >
                <div className="text-sm font-semibold">{p.name}</div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {p.description}
                </p>
              </button>
            ))}
          </div>
        </div>

        {/* GPU Tier */}
        <div className="mb-4">
          <label className="mb-2 block text-sm font-medium">GPU Tier</label>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {GPU_TIERS.map((tier) => (
              <button
                key={tier.id}
                onClick={() => setSelectedTier(tier.id)}
                className={`rounded-lg border p-4 text-left transition-colors ${
                  selectedTier === tier.id
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-muted-foreground/30'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold">{tier.name}</span>
                  <span className="text-xs font-bold text-primary">
                    {tier.cost}
                  </span>
                </div>
                <p className="mt-1 font-mono text-xs text-muted-foreground">
                  {tier.gpus} — {tier.vram}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {tier.bestFor}
                </p>
              </button>
            ))}
          </div>
        </div>

        {/* Agent selector placeholder */}
        <div className="mb-4">
          <label className="mb-2 block text-sm font-medium">Agent</label>
          <select className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
            <option>Support Agent (62k KB tokens)</option>
          </select>
        </div>

        <button className="rounded-md bg-primary px-6 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
          Deploy to {PROVIDERS.find((p) => p.id === selectedProvider)?.name}
        </button>
      </div>
    </div>
  )
}
