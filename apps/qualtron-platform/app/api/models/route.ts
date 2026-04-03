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

  // ─── 1. Check if SGLang is running (needed for Qualtron models to work) ───
  const sglangUrl = process.env.SGLANG_URL ?? 'http://127.0.0.1:18000'
  let sglangModelId: string | null = null
  try {
    const res = await fetch(`${sglangUrl}/v1/models`)
    if (res.ok) {
      const data = await res.json()
      sglangModelId = data.data?.[0]?.id ?? null
    }
  } catch {}

  // ─── 2. Show Qualtron model (routes to SGLang) ────────────────────────────
  // Only shown when SGLang is running — the model appears after user
  // activates a Spine Cortex (frontend checks localStorage)
  if (sglangModelId) {
    const branded = QUALTRON_NAMES[sglangModelId]
    models.push({
      id: `qualtron:${sglangModelId}`,
      name: branded?.name ?? 'Qualtron-GPU',
      provider: 'qualtron',
      description:
        branded?.description ?? 'Qualtron cognitive model — GPU inference.',
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
