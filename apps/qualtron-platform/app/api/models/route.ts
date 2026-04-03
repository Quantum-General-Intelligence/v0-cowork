import { NextResponse } from 'next/server'

/**
 * Available models for the Playground.
 * Qualtron models use CAG pipeline. OpenRouter models use external inference.
 * Deployed Spine Cortex models are auto-discovered from Q-Inference.
 */

interface ModelOption {
  id: string
  name: string
  provider: 'qualtron' | 'openrouter' | 'pi'
  description: string
  category: string
}

/** Map raw HuggingFace model IDs to Qualtron-branded names */
const QUALTRON_NAMES: Record<string, { name: string; description: string }> = {
  'nvidia/NVIDIA-Nemotron-3-Super-120B-A12B-FP8': {
    name: 'Qualtron-120B-262K',
    description:
      'Qualtron flagship — 120B MoE (12B active), 262K context, CAG inference.',
  },
  'nvidia/Nemotron-3-Super-49B-v1': {
    name: 'Qualtron-49B-262K',
    description: 'Qualtron 49B reasoning model, 262K context.',
  },
  'Qwen/Qwen3.5-4B': {
    name: 'Qualtron-Mini-4B',
    description: 'Qualtron Mini — 4B lightweight model for fast retrieval.',
  },
  'nvidia/Nemotron-3-Nano-4B': {
    name: 'Qualtron-Nano-4B',
    description: 'Qualtron Nano — 4B efficient model for classification.',
  },
}

const BASE_URL = process.env.CACHEDLLM_URL ?? 'http://localhost:8000'
const API_KEY = process.env.CACHEDLLM_API_KEY ?? ''

export async function GET() {
  const models: ModelOption[] = []

  // ─── 1. Discover SGLang GPU models and brand them ─────────────────────────
  const sglangUrl = process.env.SGLANG_URL ?? 'http://127.0.0.1:18000'
  try {
    const res = await fetch(`${sglangUrl}/v1/models`)
    if (res.ok) {
      const data = await res.json()
      for (const m of data.data ?? []) {
        const branded = QUALTRON_NAMES[m.id]
        models.push({
          id: `qualtron:${m.id}`,
          name: branded?.name ?? `Qualtron-GPU`,
          provider: 'qualtron',
          description:
            branded?.description ?? `Qualtron GPU model — local inference.`,
          category: 'Qualtron (GPU)',
        })
      }
    }
  } catch {}

  // ─── 2. Discover deployed Q-Inference models (Spine Cortex etc.) ──────────
  try {
    const res = await fetch(`${BASE_URL}/v1/qinference/models`, {
      headers: { Authorization: `Bearer ${API_KEY}` },
    })
    if (res.ok) {
      const data = await res.json()
      for (const m of data.data ?? []) {
        if (m.status !== 'ready' && m.status !== 'loading') continue
        // Skip if it duplicates an SGLang model already added
        const alreadyListed = models.some(
          (existing) => existing.id === `qualtron:${m.variant_id}`,
        )
        if (alreadyListed) continue
        models.push({
          id: `qualtron:${m.id}`,
          name: m.name || `Qualtron-${m.base_family}`,
          provider: 'qualtron',
          description: `Deployed model — ${m.base_family}, ${(m.context_tokens / 1000).toFixed(0)}K context.`,
          category: 'Qualtron (Deployed)',
        })
      }
    }
  } catch {}

  // ─── 3. Fallback if no Qualtron models discovered ─────────────────────────
  if (models.length === 0) {
    models.push({
      id: 'qualtron:default',
      name: 'Qualtron-120B-262K',
      provider: 'qualtron',
      description: 'Default Qualtron model with CAG inference.',
      category: 'Qualtron (GPU)',
    })
  }

  // ─── 4. Pi Agents ─────────────────────────────────────────────────────────
  models.push({
    id: 'pi:qualtron:120b-262k',
    name: 'Pi-Qualtron-120B',
    provider: 'pi',
    description:
      'Pi Agent with tools (read, write, bash) + Qualtron-120B CAG inference.',
    category: 'Pi Agents',
  })

  return NextResponse.json({ models })
}
