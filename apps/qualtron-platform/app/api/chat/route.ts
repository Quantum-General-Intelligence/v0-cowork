import { createOpenAI } from '@ai-sdk/openai'
import { streamText } from 'ai'

/**
 * Chat API route — routes to Qualtron CAG or OpenRouter based on model prefix.
 *
 * Model naming:
 *   - "qualtron:support-agent-a3f2" → Qualtron inference (CAG pipeline)
 *   - "openrouter:anthropic/claude-sonnet-4" → OpenRouter
 *   - "openrouter:openai/gpt-4o" → OpenRouter
 *   - "openrouter:meta-llama/llama-3.1-70b" → OpenRouter
 */

function getProvider(model: string) {
  if (model.startsWith('openrouter:')) {
    // OpenRouter — any model
    return {
      provider: createOpenAI({
        baseURL: 'https://openrouter.ai/api/v1',
        apiKey: process.env.OPENROUTER_API_KEY ?? '',
        headers: {
          'HTTP-Referer':
            process.env.NEXT_PUBLIC_APP_URL ?? 'https://qualtron.ai',
          'X-Title': 'Qualtron Platform',
        },
      }),
      modelId: model.replace('openrouter:', ''),
    }
  }

  // Default: Qualtron inference (OpenAI-compatible CAG endpoint)
  const modelId = model.startsWith('qualtron:')
    ? model.replace('qualtron:', '')
    : model

  return {
    provider: createOpenAI({
      baseURL: process.env.CACHEDLLM_URL
        ? `${process.env.CACHEDLLM_URL}/v1`
        : 'http://localhost:8000/v1',
      apiKey: process.env.CACHEDLLM_API_KEY ?? 'sk-qualtron',
    }),
    modelId,
  }
}

export async function POST(req: Request) {
  const { messages, model = 'qualtron:default' } = await req.json()

  const { provider, modelId } = getProvider(model)

  const result = streamText({
    model: provider(modelId),
    messages,
  })

  return result.toTextStreamResponse()
}
