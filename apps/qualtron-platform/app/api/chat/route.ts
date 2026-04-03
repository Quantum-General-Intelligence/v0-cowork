import { createOpenAI } from '@ai-sdk/openai'
import { streamText } from 'ai'

/**
 * Chat API route — routes to SGLang (Qualtron GPU), or OpenRouter.
 *
 * Model naming:
 *   "qualtron:MODEL_ID"              → SGLang direct (port 18000)
 *   "openrouter:anthropic/claude..." → OpenRouter
 */

/**
 * AI SDK v5 useChat sends messages with `parts` array (UIMessage format).
 * SGLang and streamText both need simple `{ role, content }` (ModelMessage).
 */
function normalizeMessages(
  msgs: unknown[],
): { role: 'system' | 'user' | 'assistant'; content: string }[] {
  return msgs
    .map((m: any) => {
      const role = m.role ?? 'user'
      if (role !== 'system' && role !== 'user' && role !== 'assistant')
        return null
      // AI SDK v5 UIMessage: { role, parts: [{ type: "text", text: "..." }] }
      if (Array.isArray(m.parts)) {
        const text = m.parts
          .filter((p: any) => p.type === 'text')
          .map((p: any) => p.text ?? '')
          .join('')
        if (text) return { role, content: text }
      }
      // Standard: { role, content: "..." }
      if (typeof m.content === 'string' && m.content) {
        return { role, content: m.content }
      }
      return null
    })
    .filter(Boolean) as {
    role: 'system' | 'user' | 'assistant'
    content: string
  }[]
}

function getOpenRouterProvider(modelId: string) {
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
    modelId,
  }
}

export async function POST(req: Request) {
  const body = await req.json()
  const { messages: rawMessages, model = 'qualtron:default' } = body

  // Normalize all messages to simple {role, content} format
  const messages = normalizeMessages(rawMessages ?? [])

  if (messages.length === 0) {
    return new Response('No messages provided', { status: 400 })
  }

  // ─── Qualtron models → SGLang direct ──────────────────────────────────────
  if (model.startsWith('qualtron:')) {
    const sglangUrl = process.env.SGLANG_URL ?? 'http://127.0.0.1:18000'

    // Get the actual model name from SGLang
    let sglangModel = model.replace('qualtron:', '')
    try {
      const modelsRes = await fetch(`${sglangUrl}/v1/models`)
      const modelsData = await modelsRes.json()
      if (modelsData.data?.[0]?.id) {
        sglangModel = modelsData.data[0].id
      }
    } catch {}

    // Direct fetch with SSE streaming
    let response: Response
    try {
      response = await fetch(`${sglangUrl}/v1/chat/completions`, {
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
    } catch (err) {
      return new Response(`SGLang unreachable: ${err}`, { status: 502 })
    }

    if (!response.ok) {
      const errText = await response.text().catch(() => 'unknown')
      return new Response(`SGLang error ${response.status}: ${errText}`, {
        status: 502,
      })
    }

    if (!response.body) {
      return new Response('SGLang returned empty body', { status: 502 })
    }

    // Transform SSE to plain text stream for TextStreamChatTransport
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

  // ─── OpenRouter models → AI SDK streamText ────────────────────────────────
  const modelId = model.startsWith('openrouter:')
    ? model.replace('openrouter:', '')
    : model

  const { provider, modelId: resolvedId } = getOpenRouterProvider(modelId)

  try {
    const result = streamText({
      model: provider(resolvedId),
      messages, // normalized {role, content} — compatible with ModelMessage
    })
    return result.toTextStreamResponse()
  } catch (err) {
    return new Response(`Chat error: ${err}`, { status: 502 })
  }
}
