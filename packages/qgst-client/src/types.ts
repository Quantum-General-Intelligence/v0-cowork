/**
 * Q-GST Engine TypeScript Types
 *
 * Auto-translated from Q-GST-Engine/src/schema.rs (20 tables, 6 shared types).
 * SpacetimeDB Identity → string, Timestamp → number (microseconds), Option<T> → T | null
 */

// =============================================================================
// AGENTS — WHO exists in the system
// =============================================================================

export interface Agent {
  identity: string
  tenant: string
  name: string
  /** "human" | "ai_agent" | "service" | "system" */
  role: string
  /** JSON array: ["read", "write", "admin", "graph:write", "memory:write"] */
  permissions: string
  created_at: number
  last_seen: number
}

// =============================================================================
// EVENTS — WHAT happened (append-only episodic memory)
// =============================================================================

export interface Event {
  id: number
  tenant: string
  actor: string
  ts: number
  /** "action" | "observation" | "reflection" | "system" */
  kind: string
  /** Dot-notation: "file.read", "graph.update", "context.switch" */
  event_type: string
  /** JSON payload */
  data: string
  parent_id: number | null
  /** Reference to extended memory: "repo:path:sha" */
  memory_ref: string | null
  /** Client-supplied deduplication key */
  idempotency_key: string | null
  /** Epoch tick when recorded */
  tick: number | null
}

// =============================================================================
// STATE — Working memory (mutable, current focus per agent)
// =============================================================================

export interface State {
  id: number
  tenant: string
  agent: string
  /** "session" | "task" | "focus" | "scratch" */
  scope: string
  key: string
  /** JSON value */
  value: string
  updated_at: number
}

// =============================================================================
// NODES — Graph entities (namespaced by graph type)
// =============================================================================

export interface Node {
  id: number
  /** Unique external identifier: "party:acme-corp", "file:src/auth.rs" */
  uid: string
  tenant: string
  graph: string
  /** "file" | "person" | "concept" | "task" | "clause" */
  kind: string
  label: string
  /** JSON — searchable tags and properties */
  meta: string
  /** Pointer to extended memory: "repo:path:sha" */
  memory_ref: string | null
  created_at: number
  updated_at: number
  /** Tick when this node becomes active (null = always active) */
  valid_from_tick: number | null
  /** Tick when this node expires (null = never expires) */
  valid_to_tick: number | null
}

// =============================================================================
// EDGES — Graph relationships (namespaced by graph type)
// =============================================================================

export interface Edge {
  id: number
  tenant: string
  graph: string
  from_node: string
  to_node: string
  /** "imports" | "knows" | "obligates" | "blocks" etc. */
  rel: string
  /** Strength/confidence 0.0 - 1.0 */
  weight: number
  /** JSON — optional context */
  meta: string
  created_at: number
  updated_at: number
  valid_from_tick: number | null
  valid_to_tick: number | null
}

// =============================================================================
// RETRIEVAL SOURCES — Registry of retrieval backends
// =============================================================================

export interface RetrievalSource {
  id: number
  tenant: string
  /** "graph" | "memory" | "fulltext" | "vector" | "external" */
  source_type: string
  name: string
  /** JSON config: endpoint, credentials ref, parameters */
  config: string
  enabled: boolean
  priority: number
  created_at: number
}

// =============================================================================
// CONTEXT SESSIONS — Tracks agent context windows
// =============================================================================

export interface ContextSession {
  id: number
  tenant: string
  agent: string
  /** "active" | "suspended" | "closed" */
  status: string
  /** JSON: current context assembly */
  context_frame: string
  /** JSON array of retrieval source IDs */
  active_sources: string
  started_at: number
  updated_at: number
}

// =============================================================================
// ATTENTION CACHE — Hot memory (frequently/recently accessed items)
// =============================================================================

export interface AttentionEntry {
  id: number
  tenant: string
  agent: string
  cache_key: string
  /** JSON — summary, not full content */
  content: string
  /** "graph" | "event" | "state" | "memory" */
  source: string
  /** Source reference: node uid, event id, memory ref */
  source_ref: string
  access_count: number
  /** Decays over time, boosted on access */
  relevance: number
  created_at: number
  last_accessed: number
  /** Auto-expire on consolidation */
  expires_at: number
}

// =============================================================================
// CONSOLIDATION LOG — Tracks memory maintenance runs
// =============================================================================

export interface ConsolidationLog {
  id: number
  tenant: string
  run_at: number
  edges_decayed: number
  edges_pruned: number
  cache_evicted: number
  cache_promoted: number
  events_archived: number
  /** JSON summary */
  summary: string
}

// =============================================================================
// USAGE METRICS — Token/operation metering for invoicing
// =============================================================================

export interface UsageMetric {
  id: number
  tenant: string
  agent: string
  /** "2026-03" (monthly) or "2026-03-25" (daily) */
  period: string
  /** "reducer_calls" | "events_created" | "tokens_input" | "tokens_output" etc. */
  metric: string
  count: number
  updated_at: number
}

// =============================================================================
// QUOTAS — Rate limits and usage caps
// =============================================================================

export interface Quota {
  id: number
  tenant: string
  /** null = tenant-wide, string = specific agent */
  agent: string | null
  metric: string
  max_value: number
  /** Time window in seconds (0 = lifetime/total cap) */
  window_secs: number
  created_at: number
}

// =============================================================================
// RATE COUNTER — Rolling window rate limiting
// =============================================================================

export interface RateCounter {
  id: number
  tenant: string
  agent: string
  metric: string
  window_start: number
  count: number
}

// =============================================================================
// AUDIT LOG — Admin and destructive actions
// =============================================================================

export interface AuditLog {
  id: number
  tenant: string
  actor: string
  ts: number
  /** "quota.set" | "quota.remove" | "source.toggle" | "bulk.delete" | "consolidate" */
  action: string
  /** JSON details */
  details: string
}

// =============================================================================
// EPOCH — Turn-based time (global tick counter per tenant)
// =============================================================================

export interface Epoch {
  id: number
  tenant: string
  tick: number
  wall_time: number
  advanced_by: string
  /** "active" | "paused" */
  status: string
  /** JSON — custom metadata per tick */
  meta: string
}

// =============================================================================
// CAUSAL OP — Causal DAG across all operations
// =============================================================================

export interface CausalOp {
  id: number
  tenant: string
  tick: number
  parent_op: number | null
  actor: string
  /** "event" | "node.create" | "node.update" | "edge.create" | "state.set" etc. */
  op_type: string
  target_id: string
  ts: number
}

// =============================================================================
// FUTURE EVENT — One-shot scheduled actions at future ticks
// =============================================================================

export interface FutureEvent {
  id: number
  tenant: string
  fire_at_tick: number
  reducer_name: string
  /** JSON arguments */
  args: string
  /** "pending" | "fired" | "cancelled" */
  status: string
  created_at_tick: number
  created_by: string
  fired_at: number | null
}

// =============================================================================
// CHRONOS LOOP — Recurring events (tick, wallclock, or cron pattern)
// =============================================================================

export interface ChronosLoop {
  id: number
  tenant: string
  name: string
  /** "tick" | "wallclock" | "cron" */
  pattern_type: string
  /** tick: "5", wallclock: "3600", cron: "0 9 * * MON" */
  pattern: string
  reducer_name: string
  /** JSON arguments passed to reducer */
  args: string
  /** "active" | "paused" | "cancelled" | "exhausted" */
  status: string
  start_tick: number
  end_tick: number | null
  max_iterations: number | null
  iteration_count: number
  last_fired_tick: number | null
  last_fired_at: number | null
  next_fire_tick: number | null
  next_fire_at: number | null
  created_by: string
  created_at: number
}

// =============================================================================
// UNIVERSAL CLOCK — Authoritative time anchor per tenant
// =============================================================================

export interface UniversalClock {
  id: number
  tenant: string
  current_tick: number
  origin_wall_time: number
  last_tick_wall_time: number
  /** Average microseconds per tick (auto-computed) */
  tick_duration_micros: number
  total_ticks: number
  total_wall_micros: number
  updated_at: number
}

// =============================================================================
// TICK LOG — Audit trail of tick processing
// =============================================================================

export interface TickLog {
  id: number
  tenant: string
  tick: number
  ts: number
  future_events_fired: number
  chronos_loops_fired: number
  nodes_activated: number
  nodes_expired: number
  edges_activated: number
  edges_expired: number
  /** JSON summary */
  summary: string
}

// =============================================================================
// PROJECT — Collaborative workspaces indexed in the engine
// =============================================================================

export interface Project {
  id: number
  tenant: string
  name: string
  description: string
  /** "active" | "completed" | "archived" | "paused" */
  status: string
  /** Gitea repo name in the tenant org */
  repo_name: string
  /** Gitea Organization Project ID (kanban board) */
  gitea_project_id: number | null
  created_by: string
  created_at: number
  updated_at: number
  started_at_tick: number | null
  completed_at_tick: number | null
  /** JSON — budget, deadline, assigned agents, tags */
  meta: string
}

// =============================================================================
// SHARED INPUT TYPES — Used across the API
// =============================================================================

export interface NodeInput {
  uid: string
  graph: string
  kind: string
  label: string
  /** JSON */
  meta: string
  memory_ref: string | null
  valid_from_tick: number | null
  valid_to_tick: number | null
}

export interface EdgeInput {
  graph: string
  from_node: string
  to_node: string
  rel: string
  weight: number
  /** JSON */
  meta: string
  valid_from_tick: number | null
  valid_to_tick: number | null
}

export interface EventInput {
  kind: string
  event_type: string
  /** JSON payload */
  data: string
  parent_id: number | null
  memory_ref: string | null
  idempotency_key: string | null
}

export interface StateInput {
  scope: string
  key: string
  /** JSON value */
  value: string
}

export interface RetrievalResult {
  source: string
  kind: string
  uid: string
  label: string
  /** JSON */
  meta: string
  score: number
  memory_ref: string | null
}

export interface ContextEntry {
  source: string
  kind: string
  content: string
  relevance: number
}

// =============================================================================
// TABLE NAMES — For subscriptions
// =============================================================================

export type TableName =
  | 'agents'
  | 'events'
  | 'states'
  | 'nodes'
  | 'edges'
  | 'retrieval_sources'
  | 'context_sessions'
  | 'attention_cache'
  | 'consolidation_logs'
  | 'usage_metrics'
  | 'quotas'
  | 'rate_counters'
  | 'audit_logs'
  | 'epochs'
  | 'causal_ops'
  | 'future_events'
  | 'chronos_loops'
  | 'universal_clocks'
  | 'tick_logs'
  | 'projects'

export type TableTypeMap = {
  agents: Agent
  events: Event
  states: State
  nodes: Node
  edges: Edge
  retrieval_sources: RetrievalSource
  context_sessions: ContextSession
  attention_cache: AttentionEntry
  consolidation_logs: ConsolidationLog
  usage_metrics: UsageMetric
  quotas: Quota
  rate_counters: RateCounter
  audit_logs: AuditLog
  epochs: Epoch
  causal_ops: CausalOp
  future_events: FutureEvent
  chronos_loops: ChronosLoop
  universal_clocks: UniversalClock
  tick_logs: TickLog
  projects: Project
}
