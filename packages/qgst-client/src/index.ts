/**
 * @qgst/client — Unified TypeScript client for Q-GST Engine
 *
 * Connects to three backends:
 * - SpacetimeDB (real-time engine: agents, graph, temporal, metering)
 * - Versioned Memory (Gitea: repos, files, PRs, wiki, kanban)
 * - CachedLLM (OpenAI-compatible: chat, agents, ingest, analytics)
 */

import {
  SpacetimeDBClient,
  type SpacetimeDBConfig,
} from './spacetimedb'
import {
  VersionedMemoryClient,
  type VersionedMemoryConfig,
} from './versioned-memory'
import {
  CachedLLMClient,
  type CachedLLMConfig,
} from './cached-llm'

// =============================================================================
// Unified Client
// =============================================================================

export interface QGSTClientConfig {
  spacetimedb: SpacetimeDBConfig
  versionedMemory: VersionedMemoryConfig
  cachedLLM: CachedLLMConfig
}

export class QGSTClient {
  /** SpacetimeDB engine — real-time subscriptions, graph, temporal, metering */
  readonly engine: SpacetimeDBClient
  /** Versioned Memory (Gitea) — repos, files, PRs, wiki, kanban */
  readonly memory: VersionedMemoryClient
  /** CachedLLM — OpenAI-compatible chat, agent CRUD, ingest, analytics */
  readonly llm: CachedLLMClient

  constructor(config: QGSTClientConfig) {
    this.engine = new SpacetimeDBClient(config.spacetimedb)
    this.memory = new VersionedMemoryClient(config.versionedMemory)
    this.llm = new CachedLLMClient(config.cachedLLM)
  }

  /** Connect to SpacetimeDB WebSocket */
  async connect(): Promise<void> {
    await this.engine.connect()
  }

  /** Disconnect from SpacetimeDB */
  disconnect(): void {
    this.engine.disconnect()
  }
}

// =============================================================================
// Re-exports
// =============================================================================

// Types — Q-GST Engine schema
export type {
  Agent,
  AttentionEntry,
  AuditLog,
  CausalOp,
  ChronosLoop,
  ConsolidationLog,
  ContextEntry,
  ContextSession,
  Edge,
  EdgeInput,
  Epoch,
  Event,
  EventInput,
  FutureEvent,
  Node,
  NodeInput,
  Project,
  Quota,
  RateCounter,
  RetrievalResult,
  RetrievalSource,
  State,
  StateInput,
  TableName,
  TableTypeMap,
  TickLog,
  UniversalClock,
  UsageMetric,
} from './types'

// SpacetimeDB client
export {
  SpacetimeDBClient,
  type SpacetimeDBConfig,
  type ConnectionStatus,
  type Unsubscribe,
  type EventRecordOptions,
  type CtxAssembleOptions,
  type RetrieveQueryOptions,
  type ConsolidateMemoryOptions,
  type ChronosCreateOptions,
  type ConsolidationScheduleOptions,
} from './spacetimedb'

// Versioned Memory client
export {
  VersionedMemoryClient,
  type VersionedMemoryConfig,
  type GiteaRepo,
  type GiteaContent,
  type GiteaFileContent,
  type GiteaUser,
  type GiteaLabel,
  type GiteaPR,
  type GiteaIssue,
  type GiteaWikiPage,
  type GiteaProject,
} from './versioned-memory'

// CachedLLM client
export {
  CachedLLMClient,
  type CachedLLMConfig,
  type ChatMessage,
  type ChatRequest,
  type ChatResponse,
  type ChatChoice,
  type ChatResponseMessage,
  type StreamingChunk,
  type StreamingChoice,
  type DeltaContent,
  type UsageStats,
  type AgentQuality,
  type AgentMode,
  type FinishReason,
  type MessageRole,
  type AgentCreate,
  type AgentUpdate,
  type AgentResponse,
  type AgentListResponse,
  type KBSummary,
  type DeploymentInfo,
  type ModelListItem,
  type ModelListResponse,
  type IngestStrategy,
  type IngestStatus,
  type IngestJobResponse,
  type IngestJobStatus,
  type IngestURLRequest,
  type ApiKeyResponse,
  type ApiKeyMasked,
  type ApiKeyListResponse,
  type AgentAnalytics,
  type UsagePeriod,
  type HealthResponse,
} from './cached-llm'

// Utilities
export { ApiError } from './utils'
