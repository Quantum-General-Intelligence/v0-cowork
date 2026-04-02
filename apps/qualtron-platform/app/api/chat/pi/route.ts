import { Agent, type AgentEvent } from '@mariozechner/pi-agent-core'
import { registerBuiltInApiProviders, streamSimple, Type } from '@mariozechner/pi-ai'
import type { Model } from '@mariozechner/pi-ai'

// Register all built-in providers (Anthropic, OpenAI, Google, etc.)
registerBuiltInApiProviders()

/**
 * Pi Agent chat route — provides agentic capabilities (tools, multi-turn) on top of any model.
 *
 * Model format:
 *   pi:qualtron:9b-600k    → Pi Agent + Qualtron model (OpenAI-compatible)
 *   pi:openrouter:claude    → Pi Agent + OpenRouter model
 *   pi:anthropic:claude-sonnet-4-5 → Pi Agent + direct Anthropic
 */

function createModel(modelSpec: string): Model<any> {
  // Parse "pi:provider:model-id"
  const parts = modelSpec.replace('pi:', '').split(':')
  const provider = parts[0]
  const modelId = parts.slice(1).join(':') || 'default'

  if (provider === 'qualtron') {
    // Qualtron — OpenAI-compatible endpoint
    return {
      id: modelId,
      name: `Qualtron ${modelId}`,
      api: 'openai-completions',
      provider: 'qualtron',
      baseUrl: process.env.CACHEDLLM_URL
        ? `${process.env.CACHEDLLM_URL}/v1`
        : 'http://localhost:8000/v1',
      reasoning: false,
      input: ['text'] as ('text' | 'image')[],
      cost: { input: 1, output: 3, cacheRead: 0.1, cacheWrite: 1 },
      contextWindow: 600000,
      maxTokens: 4096,
    }
  }

  if (provider === 'openrouter') {
    return {
      id: modelId,
      name: modelId,
      api: 'openai-completions',
      provider: 'openrouter',
      baseUrl: 'https://openrouter.ai/api/v1',
      reasoning: modelId.includes('o3') || modelId.includes('o1'),
      input: ['text', 'image'] as ('text' | 'image')[],
      cost: { input: 2, output: 6, cacheRead: 0.2, cacheWrite: 2 },
      contextWindow: 128000,
      maxTokens: 4096,
    }
  }

  // Direct provider (anthropic, openai, google, etc.)
  // Fall back to OpenAI-compatible
  return {
    id: modelId,
    name: modelId,
    api: 'openai-completions',
    provider,
    baseUrl: 'https://openrouter.ai/api/v1',
    reasoning: false,
    input: ['text'] as ('text' | 'image')[],
    cost: { input: 2, output: 6, cacheRead: 0.2, cacheWrite: 2 },
    contextWindow: 128000,
    maxTokens: 4096,
  }
}

function getApiKey(provider: string): string {
  if (provider === 'qualtron')
    return process.env.CACHEDLLM_API_KEY ?? ''
  if (provider === 'openrouter')
    return process.env.OPENROUTER_API_KEY ?? ''
  if (provider === 'anthropic')
    return process.env.ANTHROPIC_API_KEY ?? ''
  return process.env.OPENROUTER_API_KEY ?? ''
}

// Simple tools for the Pi agent
const readTool = {
  name: 'read_file',
  label: 'Read File',
  description: 'Read the contents of a file',
  parameters: Type.Object({
    path: Type.String({ description: 'File path to read' }),
  }),
  async execute(
    toolCallId: string,
    params: { path: string },
  ) {
    return {
      content: [
        {
          type: 'text' as const,
          text: `[File read: ${params.path}] — File system access requires project connection.`,
        },
      ],
      details: { path: params.path },
    }
  },
}

const bashTool = {
  name: 'bash',
  label: 'Run Command',
  description: 'Execute a bash command',
  parameters: Type.Object({
    command: Type.String({ description: 'Command to execute' }),
  }),
  async execute(
    toolCallId: string,
    params: { command: string },
  ) {
    return {
      content: [
        {
          type: 'text' as const,
          text: `[Command: ${params.command}] — Sandbox execution requires project connection.`,
        },
      ],
      details: { command: params.command },
    }
  },
}

export async function POST(req: Request) {
  const { messages, model: modelSpec = 'pi:qualtron:default' } =
    await req.json()

  const model = createModel(modelSpec)
  const apiKey = getApiKey(model.provider)

  // Create Pi agent
  const agent = new Agent({
    initialState: {
      systemPrompt:
        'You are a helpful AI agent powered by the Qualtron platform. You have access to tools for reading files and running commands. Use tools when the user asks for help with code, files, or system tasks.',
      model,
      thinkingLevel: 'medium',
      tools: [readTool, bashTool],
      messages: [],
    },
    streamFn: (streamModel, context, options) => {
      return streamSimple(streamModel, context, {
        ...options,
        apiKey,
      })
    },
  })

  // Convert incoming messages to agent format
  for (const msg of messages) {
    if (msg.role === 'user') {
      agent.state.messages.push({
        role: 'user',
        content: [{ type: 'text', text: msg.content }],
        timestamp: Date.now(),
      })
    } else if (msg.role === 'assistant') {
      agent.state.messages.push({
        role: 'assistant',
        content: [{ type: 'text', text: msg.content }],
        api: model.api,
        provider: model.provider,
        model: model.id,
        usage: {
          input: 0,
          output: 0,
          cacheRead: 0,
          cacheWrite: 0,
          totalTokens: 0,
          cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 },
        },
        stopReason: 'stop',
        timestamp: Date.now(),
      })
    }
  }

  // Stream the agent response as SSE text
  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    async start(controller) {
      try {
        // Subscribe to agent events
        const unsubscribe = agent.subscribe((event: AgentEvent) => {
          if (
            event.type === 'message_update' &&
            event.assistantMessageEvent
          ) {
            const evt = event.assistantMessageEvent
            if (evt.type === 'text_delta' && evt.delta) {
              controller.enqueue(encoder.encode(evt.delta))
            }
          }

          if (event.type === 'tool_execution_start') {
            controller.enqueue(
              encoder.encode(
                `\n\n🔧 **Tool: ${event.toolName ?? 'unknown'}**\n`,
              ),
            )
          }

          if (event.type === 'tool_execution_end') {
            const result =
              event.result?.content
                ?.filter((c: { type: string }) => c.type === 'text')
                .map((c: { text: string }) => c.text)
                .join('') ?? ''
            if (result) {
              controller.enqueue(encoder.encode(`\n${result}\n\n`))
            }
          }
        })

        // Get the last user message
        const lastUserMsg = messages[messages.length - 1]
        if (lastUserMsg?.role === 'user') {
          await agent.prompt(lastUserMsg.content)
        }

        unsubscribe()
        controller.close()
      } catch (error) {
        controller.enqueue(
          encoder.encode(
            `\n\nError: ${error instanceof Error ? error.message : 'Agent failed'}`,
          ),
        )
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  })
}
