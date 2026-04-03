/**
 * Q-Inference API client for the Qualtron Platform.
 *
 * Wraps the /v1/qinference/* endpoints from the cagent backend.
 * Used server-side (API routes, server components) — not exposed to browser.
 */

const BASE_URL = process.env.CACHEDLLM_URL ?? 'http://localhost:8000'
const API_KEY = process.env.CACHEDLLM_API_KEY ?? ''

// ─── Types ──────────────────────────────────────

export interface CatalogVariant {
  id: string
  name: string
  base_family: string
  huggingface_repo: string
  total_params: string
  active_params: string
  context_tokens: number
  native_context: number
  yarn_multiplier: number
  vram_gb: number
  avg_latency_s: number
  latency_108k_s: number | null
  architecture: string
  gpu_count: number
  supports_thinking: boolean
  supports_prefix_cache: boolean
}

export interface DeployedModel {
  id: string
  variant_id: string
  name: string
  status: 'queued' | 'loading' | 'ready' | 'error' | 'stopped'
  endpoint: string
  gpustack_model_id: string
  base_model: string
  base_family: string
  context_tokens: number
  vram_gb: number
  replicas: number
  gpu_count: number
  backend: string
  created_at: number
  ready_at: number | null
  total_requests: number
  total_tokens: number
}

export interface CompletionMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface CompletionResponse {
  id: string
  model: string
  variant: string
  choices: {
    index: number
    message: CompletionMessage
    finish_reason: string
  }[]
  usage: {
    prompt_tokens: number
    completion_tokens: number
    total_tokens: number
  }
}

export interface ClusterStatus {
  workers: number
  gpus: {
    index: number
    name: string
    vram_total_gb: number
    vram_used_gb: number
    utilization_pct: number
  }[]
  models_loaded: number
  total_vram_gb: number
  used_vram_gb: number
  healthy: boolean
}

// ─── Client ─────────────────────────────────────

async function qfetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${API_KEY}`,
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  })

  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Q-Inference ${res.status}: ${body}`)
  }

  return res.json()
}

// ─── Catalog ────────────────────────────────────

export async function getCatalog(params?: {
  family?: string
  min_context?: number
}): Promise<{ data: CatalogVariant[]; total: number }> {
  const query = new URLSearchParams()
  if (params?.family) query.set('family', params.family)
  if (params?.min_context) query.set('min_context', String(params.min_context))

  const qs = query.toString()
  return qfetch(`/v1/qinference/catalog${qs ? `?${qs}` : ''}`)
}

// ─── Models ─────────────────────────────────────

export async function deployModel(
  variantId: string,
  options?: { name?: string; replicas?: number },
): Promise<DeployedModel> {
  return qfetch('/v1/qinference/models', {
    method: 'POST',
    body: JSON.stringify({
      variant_id: variantId,
      name: options?.name,
      replicas: options?.replicas ?? 1,
    }),
  })
}

export async function listModels(params?: {
  status?: string
  family?: string
}): Promise<{ data: DeployedModel[]; total: number }> {
  const query = new URLSearchParams()
  if (params?.status) query.set('status', params.status)
  if (params?.family) query.set('family', params.family)

  const qs = query.toString()
  return qfetch(`/v1/qinference/models${qs ? `?${qs}` : ''}`)
}

export async function getModel(modelId: string): Promise<DeployedModel> {
  return qfetch(`/v1/qinference/models/${modelId}`)
}

export async function scaleModel(
  modelId: string,
  replicas: number,
): Promise<DeployedModel> {
  return qfetch(`/v1/qinference/models/${modelId}`, {
    method: 'PATCH',
    body: JSON.stringify({ replicas }),
  })
}

export async function teardownModel(
  modelId: string,
): Promise<{ deleted: boolean; model_id: string }> {
  return qfetch(`/v1/qinference/models/${modelId}`, { method: 'DELETE' })
}

// ─── Completions ────────────────────────────────

export async function complete(
  modelId: string,
  messages: CompletionMessage[],
  options?: {
    temperature?: number
    max_tokens?: number
    enable_thinking?: boolean
    stream?: false
  },
): Promise<CompletionResponse> {
  return qfetch(`/v1/qinference/models/${modelId}/completions`, {
    method: 'POST',
    body: JSON.stringify({
      messages,
      temperature: options?.temperature ?? 0.7,
      max_tokens: options?.max_tokens ?? 2048,
      enable_thinking: options?.enable_thinking,
      stream: false,
    }),
  })
}

export async function streamComplete(
  modelId: string,
  messages: CompletionMessage[],
  options?: {
    temperature?: number
    max_tokens?: number
    enable_thinking?: boolean
  },
): Promise<Response> {
  return fetch(`${BASE_URL}/v1/qinference/models/${modelId}/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messages,
      temperature: options?.temperature ?? 0.7,
      max_tokens: options?.max_tokens ?? 2048,
      enable_thinking: options?.enable_thinking,
      stream: true,
    }),
  })
}

// ─── Health ─────────────────────────────────────

export async function getModelHealth(modelId: string): Promise<{
  model_id: string
  variant_id: string
  db_status: string
  sglang_status: string | null // "ready" | "unreachable" | null
  /** @deprecated renamed to sglang_status */
  gpustack_status?: string | null
  healthy: boolean
  error: string | null
}> {
  return qfetch(`/v1/qinference/models/${modelId}/health`)
}

// ─── Cluster ────────────────────────────────────

export async function getClusterStatus(): Promise<ClusterStatus> {
  return qfetch('/v1/qinference/cluster')
}
