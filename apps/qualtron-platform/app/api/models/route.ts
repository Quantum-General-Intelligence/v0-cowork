import { NextResponse } from 'next/server'

/**
 * Available models for the Playground.
 * Qualtron models use CAG pipeline. OpenRouter models use external inference.
 */

interface ModelOption {
  id: string
  name: string
  provider: 'qualtron' | 'openrouter' | 'pi'
  description: string
  category: string
}

export async function GET() {
  const models: ModelOption[] = [
    // Qualtron Models (CAG pipeline)
    {
      id: 'qualtron:default',
      name: 'Qualtron-9B-600K',
      provider: 'qualtron',
      description:
        'Default Qualtron model with CAG cognitive hierarchy. 600K QHM capacity.',
      category: 'Qualtron (CAG)',
    },

    // Pi Agents (Agentic — tools + multi-turn)
    {
      id: 'pi:qualtron:9b-600k',
      name: 'Pi-Qualtron-9B-600K',
      provider: 'pi',
      description:
        'Pi Agent with tools (read, bash) + Qualtron-9B CAG inference.',
      category: 'Pi Agents',
    },
    {
      id: 'pi:openrouter:anthropic/claude-sonnet-4-20250514',
      name: 'Pi-Claude-Sonnet-4',
      provider: 'pi',
      description: 'Pi Agent with tools + Claude Sonnet 4 via OpenRouter.',
      category: 'Pi Agents',
    },
    {
      id: 'pi:openrouter:openai/gpt-4o',
      name: 'Pi-GPT-4o',
      provider: 'pi',
      description: 'Pi Agent with tools + GPT-4o via OpenRouter.',
      category: 'Pi Agents',
    },

    // OpenRouter — Anthropic
    {
      id: 'openrouter:anthropic/claude-sonnet-4-20250514',
      name: 'Claude Sonnet 4',
      provider: 'openrouter',
      description:
        'Anthropic Claude Sonnet 4 — fast, capable, great for coding.',
      category: 'Anthropic',
    },
    {
      id: 'openrouter:anthropic/claude-opus-4-20250514',
      name: 'Claude Opus 4',
      provider: 'openrouter',
      description:
        'Anthropic Claude Opus 4 — most capable model for complex reasoning.',
      category: 'Anthropic',
    },

    // OpenRouter — OpenAI
    {
      id: 'openrouter:openai/gpt-4o',
      name: 'GPT-4o',
      provider: 'openrouter',
      description: 'OpenAI GPT-4o — multimodal, fast, great all-rounder.',
      category: 'OpenAI',
    },
    {
      id: 'openrouter:openai/o3-mini',
      name: 'o3-mini',
      provider: 'openrouter',
      description:
        'OpenAI o3-mini — reasoning model, great for math and logic.',
      category: 'OpenAI',
    },

    // OpenRouter — Open Source
    {
      id: 'openrouter:meta-llama/llama-3.1-70b-instruct',
      name: 'Llama 3.1 70B',
      provider: 'openrouter',
      description:
        'Meta Llama 3.1 70B — open-source, strong general performance.',
      category: 'Open Source',
    },
    {
      id: 'openrouter:qwen/qwen-2.5-72b-instruct',
      name: 'Qwen 2.5 72B',
      provider: 'openrouter',
      description: 'Alibaba Qwen 2.5 72B — excellent for multilingual tasks.',
      category: 'Open Source',
    },
    {
      id: 'openrouter:google/gemini-2.0-flash-001',
      name: 'Gemini 2.0 Flash',
      provider: 'openrouter',
      description: 'Google Gemini 2.0 Flash — fast and efficient.',
      category: 'Google',
    },
  ]

  // Fetch Q-Inference deployed models (real GPU-backed inference)
  if (process.env.CACHEDLLM_URL) {
    try {
      const res = await fetch(
        `${process.env.CACHEDLLM_URL}/v1/qinference/models?status=ready`,
        {
          headers: {
            Authorization: `Bearer ${process.env.CACHEDLLM_API_KEY ?? ''}`,
          },
        },
      )
      if (res.ok) {
        const data = await res.json()
        const qualtronModels: ModelOption[] = (data.data ?? []).map(
          (m: { id: string; name: string; variant_id: string }) => ({
            id: `qualtron:${m.id}`,
            name: m.name || m.variant_id,
            provider: 'qualtron' as const,
            description: `Q-Inference: ${m.variant_id} — direct GPU inference`,
            category: 'Qualtron (Q-Inference)',
          }),
        )
        if (qualtronModels.length > 0) {
          return NextResponse.json({
            models: [
              ...qualtronModels,
              ...models.filter((m) => m.provider !== 'qualtron'),
            ],
          })
        }
      }
    } catch {
      // Fall through to defaults
    }
  }

  return NextResponse.json({ models })
}
