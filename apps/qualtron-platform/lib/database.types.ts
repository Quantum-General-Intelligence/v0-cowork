/**
 * Platform DB Types — generated from Supabase schema.
 * These are PLATFORM types, not Q-GST Engine types.
 */

export interface Team {
  id: string
  name: string
  slug: string
  avatar_url: string | null
  plan: 'starter' | 'pro' | 'business'
  stripe_customer_id: string | null
  stripe_subscription_id: string | null
  created_at: string
  updated_at: string
}

export interface TeamMember {
  id: string
  team_id: string
  user_id: string
  role: 'owner' | 'admin' | 'member'
  created_at: string
}

export interface UserProfile {
  id: string
  display_name: string | null
  avatar_url: string | null
  github_username: string | null
  default_team_id: string | null
  created_at: string
  updated_at: string
}

export interface GitHubConnection {
  id: string
  team_id: string
  github_installation_id: number | null
  github_account_login: string
  github_account_type: 'Organization' | 'User'
  scopes: string[] | null
  connected_at: string
  updated_at: string
}

export interface EngineConnection {
  id: string
  team_id: string
  name: string
  spacetimedb_endpoint: string
  spacetimedb_module: string
  spacetimedb_token: string | null
  memory_endpoint: string
  memory_token: string | null
  memory_owner: string
  cachedllm_endpoint: string
  cachedllm_api_key: string | null
  engine_tenant: string
  status: 'connected' | 'disconnected' | 'error'
  last_health_check: string | null
  created_at: string
  updated_at: string
}

export interface Project {
  id: string
  team_id: string
  name: string
  description: string
  github_repo_full_name: string | null
  github_repo_id: number | null
  github_default_branch: string
  engine_connection_id: string | null
  engine_project_id: number | null
  status: 'active' | 'archived' | 'paused'
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface AgentAssignment {
  id: string
  project_id: string
  engine_connection_id: string
  agent_name: string
  agent_role: 'ai_agent' | 'human' | 'service'
  display_name: string | null
  description: string | null
  assigned_by: string | null
  assigned_at: string
}

export interface LLMAgent {
  id: string
  team_id: string
  engine_connection_id: string
  cachedllm_agent_id: string
  name: string
  description: string
  system_prompt: string
  quality: 'max' | 'balanced'
  mode: 'hosted' | 'dedicated'
  temperature: number
  max_tokens: number
  kb_token_count: number
  kb_file_count: number
  kb_strategy: 'single_pass' | 'yarn_extended' | 'hierarchical' | null
  kb_last_updated: string | null
  deploy_provider: 'runpod' | 'lambda' | 'vast' | null
  deploy_pod_id: string | null
  deploy_endpoint: string | null
  deploy_gpu_tier: 'small' | 'medium' | 'large' | 'xlarge' | null
  deploy_status: 'starting' | 'running' | 'stopped' | 'error' | null
  deploy_cost_per_hour: number | null
  api_keys_count: number
  requests_today: number
  tokens_today: number
  created_at: string
  updated_at: string
}

export interface IngestJob {
  id: string
  llm_agent_id: string
  cachedllm_job_id: string
  status: 'pending' | 'processing' | 'done' | 'failed'
  progress: number
  current_step:
    | 'parsing'
    | 'formatting'
    | 'counting_tokens'
    | 'storing'
    | 'warming_cache'
    | null
  file_count: number
  token_count: number | null
  strategy: 'single_pass' | 'yarn_extended' | 'hierarchical' | null
  error: string | null
  started_by: string | null
  created_at: string
  completed_at: string | null
}

export interface ChatSession {
  id: string
  project_id: string | null
  team_id: string
  title: string
  agent_names: string[]
  created_by: string
  created_at: string
  updated_at: string
}

export interface ChatMessage {
  id: string
  session_id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  agent_name: string | null
  model: string | null
  tokens_in: number | null
  tokens_out: number | null
  phase_timings: Record<string, number> | null
  finish_reason: string | null
  created_at: string
}

export interface BillingUsage {
  id: string
  team_id: string
  period: string
  requests_count: number
  tokens_in: number
  tokens_out: number
  kb_tokens_total: number
  agents_count: number
  cost_usd: number
  created_at: string
  updated_at: string
}
