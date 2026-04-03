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

  // For Qualtron models, use SGLang directly (OpenAI-compatible on port 18000)
  if (model.startsWith('qualtron:')) {
    const sglangUrl = process.env.SGLANG_URL ?? 'http://127.0.0.1:18000'

    // Get the model name from SGLang
    let sglangModel = model.replace('qualtron:', '')
    try {
      const modelsRes = await fetch(`${sglangUrl}/v1/models`)
      const modelsData = await modelsRes.json()
      if (modelsData.data?.[0]?.id) {
        sglangModel = modelsData.data[0].id
      }
    } catch {}

    // Direct fetch with SSE streaming — bypasses AI SDK compatibility issues
    const response = await fetch(`${sglangUrl}/v1/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: sglangModel,
        messages,
        stream: true,
        max_tokens: 2048,
        temperature: 0.7,
      }),
    })

    if (!response.ok || !response.body) {
      return new Response('SGLang error', { status: 502 })
    }

    // Transform SSE to plain text stream for the frontend
    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    const stream = new ReadableStream({
      async start(controller) {
        try {
          while (true) {
            const { done, value } = await reader.read()
            if (done) break
            const text = decoder.decode(value, { stream: true })
            for (const line of text.split('\n')) {
              if (line.startsWith('data: ') && line !== 'data: [DONE]') {
                try {
                  const json = JSON.parse(line.slice(6))
                  const content = json.choices?.[0]?.delta?.content
                  if (content)
                    controller.enqueue(new TextEncoder().encode(content))
                } catch {}
              }
            }
          }
          controller.close()
        } catch {
          controller.close()
        }
      },
    })

    return new Response(stream, {
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    })
  }

  // OpenRouter and other models — use AI SDK
  const { provider, modelId } = getProvider(model)
  const result = streamText({ model: provider(modelId), messages })
  return result.toTextStreamResponse()
}
