import { createOpenAI } from '@ai-sdk/openai'
import { streamText } from 'ai'

/**
 * Chat API route — routes to Q-Inference (Qualtron GPU), or OpenRouter.
 *
 * Model naming:
 *   "qualtron:MODEL_ID"              → Q-Inference /v1/qinference/models/{id}/completions
 *   "openrouter:anthropic/claude..." → OpenRouter
 */

function getProvider(model: string) {
  if (model.startsWith('openrouter:')) {
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

  // Qualtron Q-Inference — OpenAI-compatible completions endpoint per model
  const modelId = model.startsWith('qualtron:')
    ? model.replace('qualtron:', '')
    : model

  const baseURL = process.env.CACHEDLLM_URL
    ? `${process.env.CACHEDLLM_URL}/v1/qinference/models/${modelId}`
    : `http://localhost:8000/v1/qinference/models/${modelId}`

  return {
    provider: createOpenAI({
      baseURL,
      apiKey: process.env.CACHEDLLM_API_KEY ?? '',
    }),
    // Q-Inference completions endpoint uses "completions" as the model param
    // but the actual model is encoded in the URL path
    modelId: modelId,
  }
}

export async function POST(req: Request) {
  const { messages, model = 'qualtron:default' } = await req.json()

  // For Q-Inference models, use direct fetch with streaming
  if (model.startsWith('qualtron:')) {
    const modelId = model.replace('qualtron:', '')
    const apiUrl = process.env.CACHEDLLM_URL ?? 'http://localhost:8000'
    const apiKey = process.env.CACHEDLLM_API_KEY ?? ''

    const response = await fetch(
      `${apiUrl}/v1/qinference/models/${modelId}/completions`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages,
          stream: true,
          temperature: 0.7,
          max_tokens: 2048,
        }),
      },
    )

    if (!response.ok) {
      // Fall back to OpenAI-compatible endpoint
      const { provider, modelId: mId } = getProvider(model)
      const result = streamText({ model: provider(mId), messages })
      return result.toTextStreamResponse()
    }

    // Forward the SSE stream
    return new Response(response.body, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    })
  }

  // OpenRouter and other models — use AI SDK
  const { provider, modelId } = getProvider(model)
  const result = streamText({ model: provider(modelId), messages })
  return result.toTextStreamResponse()
}
