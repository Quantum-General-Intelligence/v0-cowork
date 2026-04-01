/**
 * SpacetimeDB Client — Typed wrapper for Q-GST Engine reducers and subscriptions.
 *
 * Phase 1: Fully typed interface stubs. Actual WebSocket transport will use
 * @clockworklabs/spacetimedb-sdk when we wire up real connections.
 */

import type {
  EdgeInput,
  EventInput,
  NodeInput,
  StateInput,
  TableName,
  TableTypeMap,
} from './types'

// =============================================================================
// Configuration
// =============================================================================

export interface SpacetimeDBConfig {
  endpoint: string
  module: string
  /** SpacetimeDB identity token (optional — auto-generated if omitted) */
  token?: string
}

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected'
export type Unsubscribe = () => void

// =============================================================================
// Options types for reducers with optional parameters
// =============================================================================

export interface EventRecordOptions {
  parent_id?: number
  memory_ref?: string
  idempotency_key?: string
}

export interface CtxAssembleOptions {
  scope_graph?: string
  scope_uid?: string
  event_limit?: number
  cache_limit?: number
}

export interface RetrieveQueryOptions {
  scope_graph?: string
  scope_uid?: string
  limit?: number
}

export interface ConsolidateMemoryOptions {
  edge_decay_factor?: number
  edge_prune_threshold?: number
  event_max_age_hours?: number
}

export interface ChronosCreateOptions {
  name: string
  pattern_type: 'tick' | 'wallclock' | 'cron'
  pattern: string
  reducer_name: string
  args: string
  start_tick: number
  end_tick?: number
  max_iterations?: number
}

export interface ConsolidationScheduleOptions {
  interval_secs: number
  config_json: string
}

// =============================================================================
// SpacetimeDB Client
// =============================================================================

export class SpacetimeDBClient {
  private config: SpacetimeDBConfig
  private _status: ConnectionStatus = 'disconnected'
  private connectCallbacks: Array<() => void> = []
  private disconnectCallbacks: Array<() => void> = []

  constructor(config: SpacetimeDBConfig) {
    this.config = config
  }

  get status(): ConnectionStatus {
    return this._status
  }

  // ---------------------------------------------------------------------------
  // Connection lifecycle
  // ---------------------------------------------------------------------------

  async connect(): Promise<void> {
    this._status = 'connecting'
    // TODO: Initialize @clockworklabs/spacetimedb-sdk WebSocket connection
    // For now, mark as connected for type-checking purposes
    this._status = 'connected'
    this.connectCallbacks.forEach((cb) => cb())
  }

  disconnect(): void {
    this._status = 'disconnected'
    this.disconnectCallbacks.forEach((cb) => cb())
  }

  onConnect(cb: () => void): Unsubscribe {
    this.connectCallbacks.push(cb)
    return () => {
      this.connectCallbacks = this.connectCallbacks.filter((c) => c !== cb)
    }
  }

  onDisconnect(cb: () => void): Unsubscribe {
    this.disconnectCallbacks.push(cb)
    return () => {
      this.disconnectCallbacks = this.disconnectCallbacks.filter(
        (c) => c !== cb,
      )
    }
  }

  // ---------------------------------------------------------------------------
  // Agent Management
  // ---------------------------------------------------------------------------

  async agentRegister(
    tenant: string,
    name: string,
    role: string,
    permissions: string,
  ): Promise<void> {
    await this.callReducer('agent_register', [tenant, name, role, permissions])
  }

  // ---------------------------------------------------------------------------
  // Events — Episodic Memory
  // ---------------------------------------------------------------------------

  async eventRecord(
    tenant: string,
    kind: string,
    eventType: string,
    data: string,
    opts?: EventRecordOptions,
  ): Promise<void> {
    await this.callReducer('event_record', [
      tenant,
      kind,
      eventType,
      data,
      opts?.parent_id ?? null,
      opts?.memory_ref ?? null,
      opts?.idempotency_key ?? null,
    ])
  }

  async eventRecordBatch(
    tenant: string,
    events: EventInput[],
  ): Promise<void> {
    await this.callReducer('event_record_batch', [tenant, events])
  }

  // ---------------------------------------------------------------------------
  // State — Working Memory
  // ---------------------------------------------------------------------------

  async stateSet(
    tenant: string,
    scope: string,
    key: string,
    value: string,
  ): Promise<void> {
    await this.callReducer('state_set', [tenant, scope, key, value])
  }

  async stateSetBatch(
    tenant: string,
    entries: StateInput[],
  ): Promise<void> {
    await this.callReducer('state_set_batch', [tenant, entries])
  }

  async stateClearScope(tenant: string, scope: string): Promise<void> {
    await this.callReducer('state_clear_scope', [tenant, scope])
  }

  // ---------------------------------------------------------------------------
  // Graph Operations
  // ---------------------------------------------------------------------------

  async graphUpsertNode(tenant: string, node: NodeInput): Promise<void> {
    await this.callReducer('graph_upsert_node', [tenant, node])
  }

  async graphUpsertNodes(
    tenant: string,
    nodes: NodeInput[],
  ): Promise<void> {
    await this.callReducer('graph_upsert_nodes', [tenant, nodes])
  }

  async graphRemoveNode(tenant: string, uid: string): Promise<void> {
    await this.callReducer('graph_remove_node', [tenant, uid])
  }

  async graphAddEdge(tenant: string, edge: EdgeInput): Promise<void> {
    await this.callReducer('graph_add_edge', [tenant, edge])
  }

  async graphAddEdges(tenant: string, edges: EdgeInput[]): Promise<void> {
    await this.callReducer('graph_add_edges', [tenant, edges])
  }

  async graphRemoveEdge(
    tenant: string,
    graph: string,
    from: string,
    to: string,
    rel: string,
  ): Promise<void> {
    await this.callReducer('graph_remove_edge', [tenant, graph, from, to, rel])
  }

  async graphUpdateWeight(
    tenant: string,
    graph: string,
    from: string,
    to: string,
    rel: string,
    delta: number,
  ): Promise<void> {
    await this.callReducer('graph_update_weight', [
      tenant,
      graph,
      from,
      to,
      rel,
      delta,
    ])
  }

  async graphIngest(
    tenant: string,
    nodes: NodeInput[],
    edges: EdgeInput[],
  ): Promise<void> {
    await this.callReducer('graph_ingest', [tenant, nodes, edges])
  }

  // ---------------------------------------------------------------------------
  // Context Management
  // ---------------------------------------------------------------------------

  async ctxStartSession(tenant: string): Promise<void> {
    await this.callReducer('ctx_start_session', [tenant])
  }

  async ctxCloseSession(tenant: string, sessionId: number): Promise<void> {
    await this.callReducer('ctx_close_session', [tenant, sessionId])
  }

  async ctxUpdateFrame(
    tenant: string,
    sessionId: number,
    frame: string,
  ): Promise<void> {
    await this.callReducer('ctx_update_frame', [tenant, sessionId, frame])
  }

  async ctxAssemble(
    tenant: string,
    opts?: CtxAssembleOptions,
  ): Promise<void> {
    await this.callReducer('ctx_assemble', [
      tenant,
      opts?.scope_graph ?? null,
      opts?.scope_uid ?? null,
      opts?.event_limit ?? null,
      opts?.cache_limit ?? null,
    ])
  }

  // ---------------------------------------------------------------------------
  // Retrieval & Graph Queries
  // ---------------------------------------------------------------------------

  async retrieveQuery(
    tenant: string,
    query: string,
    opts?: RetrieveQueryOptions,
  ): Promise<void> {
    await this.callReducer('retrieve_query', [
      tenant,
      query,
      opts?.scope_graph ?? null,
      opts?.scope_uid ?? null,
      opts?.limit ?? null,
    ])
  }

  async graphNeighbors(
    tenant: string,
    graph: string,
    uid: string,
  ): Promise<void> {
    await this.callReducer('graph_neighbors', [tenant, graph, uid])
  }

  async graphTwoHop(
    tenant: string,
    graph: string,
    uid: string,
    rel1: string,
    rel2: string,
  ): Promise<void> {
    await this.callReducer('graph_two_hop', [tenant, graph, uid, rel1, rel2])
  }

  async retrieveRegisterSource(
    tenant: string,
    sourceType: string,
    name: string,
    config: string,
    priority: number,
  ): Promise<void> {
    await this.callReducer('retrieve_register_source', [
      tenant,
      sourceType,
      name,
      config,
      priority,
    ])
  }

  async retrieveToggleSource(
    tenant: string,
    sourceId: number,
    enabled: boolean,
  ): Promise<void> {
    await this.callReducer('retrieve_toggle_source', [
      tenant,
      sourceId,
      enabled,
    ])
  }

  // ---------------------------------------------------------------------------
  // Extended Memory Reference
  // ---------------------------------------------------------------------------

  async memoryRecordWrite(
    tenant: string,
    memoryRef: string,
    summary: string,
  ): Promise<void> {
    await this.callReducer('memory_record_write', [tenant, memoryRef, summary])
  }

  async memoryRecordRead(tenant: string, memoryRef: string): Promise<void> {
    await this.callReducer('memory_record_read', [tenant, memoryRef])
  }

  // ---------------------------------------------------------------------------
  // Attention Cache — Hot Memory
  // ---------------------------------------------------------------------------

  async cachePut(
    tenant: string,
    cacheKey: string,
    content: string,
    source: string,
    sourceRef: string,
    ttlSecs?: number,
  ): Promise<void> {
    await this.callReducer('cache_put', [
      tenant,
      cacheKey,
      content,
      source,
      sourceRef,
      ttlSecs ?? null,
    ])
  }

  async cacheGet(tenant: string, cacheKey: string): Promise<void> {
    await this.callReducer('cache_get', [tenant, cacheKey])
  }

  async cacheInvalidate(tenant: string, cacheKey: string): Promise<void> {
    await this.callReducer('cache_invalidate', [tenant, cacheKey])
  }

  // ---------------------------------------------------------------------------
  // Consolidation
  // ---------------------------------------------------------------------------

  async consolidateMemory(
    tenant: string,
    opts?: ConsolidateMemoryOptions,
  ): Promise<void> {
    await this.callReducer('consolidate_memory', [
      tenant,
      opts?.edge_decay_factor ?? null,
      opts?.edge_prune_threshold ?? null,
      opts?.event_max_age_hours ?? null,
    ])
  }

  async consolidationSchedule(
    tenant: string,
    opts: ConsolidationScheduleOptions,
  ): Promise<void> {
    await this.callReducer('consolidation_schedule', [
      tenant,
      opts.interval_secs,
      opts.config_json,
    ])
  }

  // ---------------------------------------------------------------------------
  // Usage Metering
  // ---------------------------------------------------------------------------

  async usageTrackTokens(
    tenant: string,
    inputTokens: number,
    outputTokens: number,
    model: string,
  ): Promise<void> {
    await this.callReducer('usage_track_tokens', [
      tenant,
      inputTokens,
      outputTokens,
      model,
    ])
  }

  async usageTrack(
    tenant: string,
    metric: string,
    count: number,
  ): Promise<void> {
    await this.callReducer('usage_track', [tenant, metric, count])
  }

  // ---------------------------------------------------------------------------
  // Quota Management
  // ---------------------------------------------------------------------------

  async quotaSet(
    tenant: string,
    agent: string | null,
    metric: string,
    maxValue: number,
    windowSecs: number,
  ): Promise<void> {
    await this.callReducer('quota_set', [
      tenant,
      agent,
      metric,
      maxValue,
      windowSecs,
    ])
  }

  async quotaRemove(tenant: string, quotaId: number): Promise<void> {
    await this.callReducer('quota_remove', [tenant, quotaId])
  }

  // ---------------------------------------------------------------------------
  // Health Check
  // ---------------------------------------------------------------------------

  async healthCheck(tenant: string): Promise<void> {
    await this.callReducer('health_check', [tenant])
  }

  // ---------------------------------------------------------------------------
  // Project Management
  // ---------------------------------------------------------------------------

  async projectCreate(
    tenant: string,
    name: string,
    description: string,
    repoName: string,
    meta?: string,
  ): Promise<void> {
    await this.callReducer('project_create', [
      tenant,
      name,
      description,
      repoName,
      meta ?? null,
    ])
  }

  async projectUpdateStatus(
    tenant: string,
    projectId: number,
    status: string,
  ): Promise<void> {
    await this.callReducer('project_update_status', [
      tenant,
      projectId,
      status,
    ])
  }

  // ---------------------------------------------------------------------------
  // Temporal — Epoch Management
  // ---------------------------------------------------------------------------

  async tickAdvance(tenant: string): Promise<void> {
    await this.callReducer('tick_advance', [tenant])
  }

  async tickSetStatus(tenant: string, status: 'active' | 'paused'): Promise<void> {
    await this.callReducer('tick_set_status', [tenant, status])
  }

  async tickSchedule(tenant: string, intervalSecs: number): Promise<void> {
    await this.callReducer('tick_schedule', [tenant, intervalSecs])
  }

  // ---------------------------------------------------------------------------
  // Future Events — One-shot scheduled actions
  // ---------------------------------------------------------------------------

  async futureSchedule(
    tenant: string,
    fireAtTick: number,
    reducerName: string,
    args: string,
  ): Promise<void> {
    await this.callReducer('future_schedule', [
      tenant,
      fireAtTick,
      reducerName,
      args,
    ])
  }

  async futureCancel(tenant: string, futureEventId: number): Promise<void> {
    await this.callReducer('future_cancel', [tenant, futureEventId])
  }

  // ---------------------------------------------------------------------------
  // Chronos Loops — Recurring events
  // ---------------------------------------------------------------------------

  async chronosCreate(
    tenant: string,
    opts: ChronosCreateOptions,
  ): Promise<void> {
    await this.callReducer('chronos_create', [
      tenant,
      opts.name,
      opts.pattern_type,
      opts.pattern,
      opts.reducer_name,
      opts.args,
      opts.start_tick,
      opts.end_tick ?? null,
      opts.max_iterations ?? null,
    ])
  }

  async chronosPause(tenant: string, loopId: number): Promise<void> {
    await this.callReducer('chronos_pause', [tenant, loopId])
  }

  async chronosResume(tenant: string, loopId: number): Promise<void> {
    await this.callReducer('chronos_resume', [tenant, loopId])
  }

  async chronosCancel(tenant: string, loopId: number): Promise<void> {
    await this.callReducer('chronos_cancel', [tenant, loopId])
  }

  // ---------------------------------------------------------------------------
  // Universal Clock
  // ---------------------------------------------------------------------------

  async clockTickToTime(tenant: string, tick: number): Promise<void> {
    await this.callReducer('clock_tick_to_time', [tenant, tick])
  }

  async clockTimeToTick(
    tenant: string,
    wallTimeMicros: number,
  ): Promise<void> {
    await this.callReducer('clock_time_to_tick', [tenant, wallTimeMicros])
  }

  // ---------------------------------------------------------------------------
  // Temporal Graph Queries
  // ---------------------------------------------------------------------------

  async graphAtTick(
    tenant: string,
    graph: string,
    tick: number,
  ): Promise<void> {
    await this.callReducer('graph_at_tick', [tenant, graph, tick])
  }

  async graphTimeline(tenant: string, uid: string): Promise<void> {
    await this.callReducer('graph_timeline', [tenant, uid])
  }

  async causalDescendants(tenant: string, opId: number): Promise<void> {
    await this.callReducer('causal_descendants', [tenant, opId])
  }

  // ---------------------------------------------------------------------------
  // Bulk Delete — GDPR/Cleanup
  // ---------------------------------------------------------------------------

  async bulkDeleteOldEvents(
    tenant: string,
    olderThanHours: number,
  ): Promise<void> {
    await this.callReducer('bulk_delete_old_events', [tenant, olderThanHours])
  }

  async bulkDeleteGraph(tenant: string, graphName: string): Promise<void> {
    await this.callReducer('bulk_delete_graph', [tenant, graphName])
  }

  async bulkDeleteTenant(tenant: string, confirm: string): Promise<void> {
    await this.callReducer('bulk_delete_tenant', [tenant, confirm])
  }

  async bulkDeleteAgentData(
    tenant: string,
    agentIdentity: string,
  ): Promise<void> {
    await this.callReducer('bulk_delete_agent_data', [tenant, agentIdentity])
  }

  // ---------------------------------------------------------------------------
  // Subscriptions — Real-time table changes
  // ---------------------------------------------------------------------------

  subscribe<T extends TableName>(
    table: T,
    filter?: Partial<TableTypeMap[T]>,
    callback?: (rows: TableTypeMap[T][]) => void,
  ): Unsubscribe {
    // TODO: Wire up SpacetimeDB SDK table subscriptions
    void table
    void filter
    void callback
    return () => {}
  }

  // ---------------------------------------------------------------------------
  // Internal
  // ---------------------------------------------------------------------------

  private async callReducer(
    _name: string,
    _args: unknown[],
  ): Promise<void> {
    // TODO: Wire up SpacetimeDB SDK reducer calls
    // Example: this.connection.callReducer(name, args)
  }
}
