/**
 * CachedLLM Client — Typed wrapper for QGI-Cashed-LLM API.
 *
 * OpenAI-compatible REST API with agent management, ingest, API keys, and analytics.
 * Types translated from QGI-Cashed-LLM/cagent/api/schemas.py.
 */

import { authHeaders, fetchJSON, streamSSE } from './utils'

// =============================================================================
// Configuration
// =============================================================================

export interface CachedLLMConfig {
  /** CachedLLM endpoint, e.g. "http://localhost:8000" */
  endpoint: string
  /** API key (cag_* format) */
  apiKey: string
}

// =============================================================================
// API Types — translated from schemas.py
// =============================================================================

export type AgentQuality = 'balanced' | 'max'
export type AgentMode = 'hosted' | 'dedicated'
export type IngestStrategy = 'single_pass' | 'yarn_extended' | 'hierarchical'
export type IngestStatus = 'pending' | 'processing' | 'done' | 'failed'
export type DeployProvider = 'runpod' | 'lambda' | 'vast'
export type GPUTier = 'small' | 'medium' | 'large' | 'xlarge'
export type FinishReason = 'stop' | 'length' | 'content_filter'
export type MessageRole = 'system' | 'user' | 'assistant'

// --- Chat ---

export interface ChatMessage {
  role: MessageRole
  content: string
}

export interface ChatRequest {
  model: string
  messages: ChatMessage[]
  stream?: boolean
  temperature?: number
  top_p?: number
  max_tokens?: number
  presence_penalty?: number
  thinking?: boolean | null
}

export interface UsageStats {
  prompt_tokens: number
  completion_tokens: number
  total_tokens: number
  phase_timings?: Record<string, number> | null
}

export interface ChatResponseMessage {
  role: 'assistant'
  content: string
}

export interface ChatChoice {
  index: number
  message: ChatResponseMessage
  finish_reason: FinishReason
}

export interface ChatResponse {
  id: string
  object: 'chat.completion'
  created: number
  model: string
  choices: ChatChoice[]
  usage: UsageStats
}

export interface DeltaContent {
  role?: 'assistant' | null
  content?: string | null
}

export interface StreamingChoice {
  index: number
  delta: DeltaContent
  finish_reason: FinishReason | null
}

export interface StreamingChunk {
  id: string
  object: 'chat.completion.chunk'
  created: number
  model: string
  choices: StreamingChoice[]
}

// --- Agent CRUD ---

export interface AgentCreate {
  name: string
  description?: string
  system_prompt?: string
  quality?: AgentQuality
  mode?: AgentMode
  temperature?: number
  max_tokens?: number
}

export interface AgentUpdate {
  name?: string | null
  description?: string | null
  system_prompt?: string | null
  quality?: AgentQuality | null
  temperature?: number | null
  max_tokens?: number | null
}

export interface KBSummary {
  token_count: number
  file_count: number
  strategy: IngestStrategy
  last_updated: number
  size_bytes: number
}

export interface DeploymentInfo {
  provider: DeployProvider
  pod_id: string
  endpoint: string
  gpu_tier: GPUTier
  cost_per_hour: number
  status: 'starting' | 'running' | 'stopped' | 'error'
  started_at: number
}

export interface AgentResponse {
  id: string
  name: string
  description: string
  system_prompt: string
  quality: AgentQuality
  mode: AgentMode
  temperature: number
  max_tokens: number
  kb: KBSummary | null
  deployment: DeploymentInfo | null
  requests_today: number
  tokens_today: number
  created_at: number
  updated_at: number
}

export interface AgentListResponse {
  object: 'list'
  data: AgentResponse[]
  total: number
  page: number
  per_page: number
}

export interface ModelListItem {
  id: string
  object: 'model'
  created: number
  owned_by: string
}

export interface ModelListResponse {
  object: 'list'
  data: ModelListItem[]
}

// --- Ingest ---

export interface IngestURLRequest {
  urls: string[]
  max_depth?: number
  agent_id: string
}

export interface IngestJobResponse {
  job_id: string
  agent_id: string
  status: IngestStatus
  file_count: number
  estimated_tokens: number | null
  created_at: number
}

export interface IngestJobStatus {
  job_id: string
  agent_id: string
  status: IngestStatus
  progress: number
  current_step: string | null
  token_count: number | null
  strategy: IngestStrategy | null
  error: string | null
  created_at: number
  completed_at: number | null
}

// --- API Keys ---

export interface ApiKeyCreate {
  name: string
  expires_at?: number | null
}

export interface ApiKeyResponse {
  id: string
  agent_id: string
  name: string
  key: string
  prefix: string
  expires_at: number | null
  created_at: number
}

export interface ApiKeyMasked {
  id: string
  agent_id: string
  name: string
  prefix: string
  masked_key: string
  expires_at: number | null
  created_at: number
  last_used_at: number | null
  requests_total: number
  is_active: boolean
}

export interface ApiKeyListResponse {
  object: 'list'
  data: ApiKeyMasked[]
  total: number
}

// --- Analytics ---

export interface UsagePeriod {
  timestamp: number
  requests: number
  tokens_in: number
  tokens_out: number
  avg_latency_ms: number
  p95_latency_ms: number
  errors: number
}

export interface AgentAnalytics {
  agent_id: string
  period_start: number
  period_end: number
  granularity: 'hour' | 'day'
  total_requests: number
  total_tokens: number
  avg_latency_ms: number
  p95_latency_ms: number
  error_rate: number
  data: UsagePeriod[]
}

// --- Health ---

export interface HealthResponse {
  status: 'ok' | 'degraded'
  version: string
  gpu_available: boolean
  sglang_connected: boolean
  timestamp: number
}

// =============================================================================
// Client
// =============================================================================

export class CachedLLMClient {
  private endpoint: string
  private apiKey: string

  constructor(config: CachedLLMConfig) {
    this.endpoint = config.endpoint.replace(/\/$/, '')
    this.apiKey = config.apiKey
  }

  // ---------------------------------------------------------------------------
  // Chat (OpenAI-compatible)
  // ---------------------------------------------------------------------------

  async chat(request: ChatRequest): Promise<ChatResponse> {
    return this.post<ChatResponse>('/v1/chat/completions', {
      ...request,
      stream: false,
    })
  }

  async *chatStream(
    request: ChatRequest,
  ): AsyncGenerator<StreamingChunk> {
    const url = `${this.endpoint}/v1/chat/completions`
    const body = JSON.stringify({ ...request, stream: true })

    for await (const data of streamSSE(url, {
      method: 'POST',
      headers: authHeaders(this.apiKey),
      body,
    })) {
      try {
        yield JSON.parse(data) as StreamingChunk
      } catch {
        // Skip non-JSON lines (comments, empty lines)
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Models
  // ---------------------------------------------------------------------------

  async listModels(): Promise<ModelListResponse> {
    return this.get<ModelListResponse>('/v1/models')
  }

  // ---------------------------------------------------------------------------
  // Agents
  // ---------------------------------------------------------------------------

  async listAgents(page = 1, perPage = 20): Promise<AgentListResponse> {
    return this.get<AgentListResponse>(
      `/v1/agents?page=${page}&per_page=${perPage}`,
    )
  }

  async getAgent(agentId: string): Promise<AgentResponse> {
    return this.get<AgentResponse>(`/v1/agents/${agentId}`)
  }

  async createAgent(agent: AgentCreate): Promise<AgentResponse> {
    return this.post<AgentResponse>('/v1/agents', agent)
  }

  async updateAgent(
    agentId: string,
    update: AgentUpdate,
  ): Promise<AgentResponse> {
    return this.request<AgentResponse>(
      'PATCH',
      `/v1/agents/${agentId}`,
      update,
    )
  }

  async deleteAgent(agentId: string): Promise<void> {
    await this.request<unknown>('DELETE', `/v1/agents/${agentId}`)
  }

  // ---------------------------------------------------------------------------
  // Ingest
  // ---------------------------------------------------------------------------

  async ingestFiles(
    agentId: string,
    files: File[],
  ): Promise<IngestJobResponse> {
    const formData = new FormData()
    for (const file of files) {
      formData.append('files', file)
    }
    const res = await fetch(
      `${this.endpoint}/v1/agents/${agentId}/ingest`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${this.apiKey}` },
        body: formData,
      },
    )
    if (!res.ok) {
      throw new Error(`Ingest failed: ${res.status} ${res.statusText}`)
    }
    return res.json() as Promise<IngestJobResponse>
  }

  async ingestURLs(
    agentId: string,
    urls: string[],
    maxDepth = 1,
  ): Promise<IngestJobResponse> {
    return this.post<IngestJobResponse>(
      `/v1/agents/${agentId}/ingest/url`,
      { urls, max_depth: maxDepth, agent_id: agentId },
    )
  }

  async getIngestJob(jobId: string): Promise<IngestJobStatus> {
    return this.get<IngestJobStatus>(`/v1/ingest/${jobId}`)
  }

  // ---------------------------------------------------------------------------
  // API Keys
  // ---------------------------------------------------------------------------

  async createKey(
    agentId: string,
    name: string,
    expiresAt?: number,
  ): Promise<ApiKeyResponse> {
    return this.post<ApiKeyResponse>(`/v1/agents/${agentId}/keys`, {
      name,
      expires_at: expiresAt ?? null,
    })
  }

  async listKeys(agentId: string): Promise<ApiKeyListResponse> {
    return this.get<ApiKeyListResponse>(`/v1/agents/${agentId}/keys`)
  }

  async deleteKey(agentId: string, keyId: string): Promise<void> {
    await this.request<unknown>(
      'DELETE',
      `/v1/agents/${agentId}/keys/${keyId}`,
    )
  }

  // ---------------------------------------------------------------------------
  // Analytics
  // ---------------------------------------------------------------------------

  async getAnalytics(
    agentId: string,
    period: 'day' | 'week' | 'month' = 'day',
    granularity: 'hour' | 'day' = 'hour',
  ): Promise<AgentAnalytics> {
    return this.get<AgentAnalytics>(
      `/v1/agents/${agentId}/analytics?period=${period}&granularity=${granularity}`,
    )
  }

  // ---------------------------------------------------------------------------
  // Health
  // ---------------------------------------------------------------------------

  async health(): Promise<HealthResponse> {
    return this.get<HealthResponse>('/health')
  }

  // ---------------------------------------------------------------------------
  // Internal
  // ---------------------------------------------------------------------------

  private async get<T>(path: string): Promise<T> {
    return fetchJSON<T>(`${this.endpoint}${path}`, {
      headers: authHeaders(this.apiKey),
    })
  }

  private async post<T>(path: string, body: unknown): Promise<T> {
    return this.request<T>('POST', path, body)
  }

  private async request<T>(
    method: string,
    path: string,
    body?: unknown,
  ): Promise<T> {
    return fetchJSON<T>(`${this.endpoint}${path}`, {
      method,
      headers: authHeaders(this.apiKey),
      body: body ? JSON.stringify(body) : undefined,
    })
  }
}
