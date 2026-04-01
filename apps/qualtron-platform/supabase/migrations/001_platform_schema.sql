-- Qualtron Platform DB Schema
-- This is the PLATFORM database — separate from Q-GST Engine.
-- Stores: users, teams, billing, GitHub connections, project management,
-- and the bridge to Q-GST Engine (engine_connections, agent_assignments).

-- =============================================================================
-- TEAMS & USERS
-- =============================================================================

create table public.teams (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique not null,
  avatar_url text,
  plan text not null default 'starter', -- starter, pro, business
  stripe_customer_id text,
  stripe_subscription_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.team_members (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member', -- owner, admin, member
  created_at timestamptz not null default now(),
  unique(team_id, user_id)
);

create table public.user_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  avatar_url text,
  github_username text,
  default_team_id uuid references public.teams(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- =============================================================================
-- GITHUB CONNECTIONS
-- =============================================================================

create table public.github_connections (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  github_installation_id bigint, -- GitHub App installation
  github_account_login text not null, -- org or user login
  github_account_type text not null default 'Organization', -- Organization, User
  access_token_encrypted text, -- encrypted OAuth token
  scopes text[], -- ['repo', 'read:org', ...]
  connected_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- =============================================================================
-- Q-GST ENGINE CONNECTIONS
-- =============================================================================

create table public.engine_connections (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  name text not null default 'default',
  -- SpacetimeDB (Q-GST Core Runtime)
  spacetimedb_endpoint text not null default 'ws://localhost:3000',
  spacetimedb_module text not null default 'spacetime-engine',
  spacetimedb_token text,
  -- Versioned Memory (content store)
  memory_endpoint text not null default 'http://localhost:3333',
  memory_token text,
  memory_owner text not null default 'qgst-acme', -- tenant org
  -- CachedLLM (inference backend)
  cachedllm_endpoint text not null default 'http://localhost:8000',
  cachedllm_api_key text,
  -- Engine tenant mapping
  engine_tenant text not null, -- Q-GST Engine tenant name
  status text not null default 'disconnected', -- connected, disconnected, error
  last_health_check timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(team_id, name)
);

-- =============================================================================
-- PROJECTS — User's projects linked to GitHub repos + Q-GST Engine
-- =============================================================================

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  name text not null,
  description text default '',
  -- GitHub link (user's code repo — NOT Gitea brain repo)
  github_repo_full_name text, -- 'org/repo'
  github_repo_id bigint,
  github_default_branch text default 'main',
  -- Q-GST Engine link
  engine_connection_id uuid references public.engine_connections(id),
  engine_project_id bigint, -- Q-GST Engine projects table ID
  -- State
  status text not null default 'active', -- active, archived, paused
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- =============================================================================
-- AGENT ASSIGNMENTS — Bridge between platform projects and Q-GST agents
-- =============================================================================

create table public.agent_assignments (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  engine_connection_id uuid not null references public.engine_connections(id),
  -- Q-GST Engine agent identity
  agent_name text not null,
  agent_role text not null default 'ai_agent', -- ai_agent, human, service
  -- Platform-level config (not stored in engine)
  display_name text,
  description text,
  assigned_by uuid references auth.users(id),
  assigned_at timestamptz not null default now(),
  unique(project_id, agent_name)
);

-- =============================================================================
-- CACHEDLLM AGENTS — Platform view of inference agents
-- =============================================================================

create table public.llm_agents (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  engine_connection_id uuid not null references public.engine_connections(id),
  -- Mirrors CachedLLM agent config
  cachedllm_agent_id text not null, -- ID in CachedLLM backend
  name text not null,
  description text default '',
  system_prompt text default '',
  quality text not null default 'max', -- max, balanced
  mode text not null default 'hosted', -- hosted, dedicated
  temperature real not null default 0.7,
  max_tokens integer not null default 2048,
  -- KB status (synced from CachedLLM)
  kb_token_count bigint default 0,
  kb_file_count integer default 0,
  kb_strategy text, -- single_pass, yarn_extended, hierarchical
  kb_last_updated timestamptz,
  -- GPU deployment
  deploy_provider text, -- runpod, lambda, vast
  deploy_pod_id text,
  deploy_endpoint text,
  deploy_gpu_tier text, -- small, medium, large, xlarge
  deploy_status text, -- starting, running, stopped, error
  deploy_cost_per_hour real,
  -- API keys count (keys stored in CachedLLM, not here)
  api_keys_count integer default 0,
  -- Stats (synced periodically)
  requests_today bigint default 0,
  tokens_today bigint default 0,
  --
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(team_id, cachedllm_agent_id)
);

-- =============================================================================
-- INGEST JOBS — Platform tracking of KB uploads
-- =============================================================================

create table public.ingest_jobs (
  id uuid primary key default gen_random_uuid(),
  llm_agent_id uuid not null references public.llm_agents(id) on delete cascade,
  cachedllm_job_id text not null, -- ID in CachedLLM backend
  status text not null default 'pending', -- pending, processing, done, failed
  progress real not null default 0, -- 0.0 to 1.0
  current_step text, -- parsing, formatting, counting_tokens, storing, warming_cache
  file_count integer not null default 0,
  token_count bigint,
  strategy text, -- single_pass, yarn_extended, hierarchical
  error text,
  started_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

-- =============================================================================
-- CHAT SESSIONS — For Cowork app
-- =============================================================================

create table public.chat_sessions (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects(id) on delete set null,
  team_id uuid not null references public.teams(id) on delete cascade,
  title text default 'New Chat',
  -- Which agents participated
  agent_names text[] default '{}',
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.chat_sessions(id) on delete cascade,
  role text not null, -- user, assistant, system
  content text not null,
  agent_name text, -- which agent responded (null for user messages)
  -- Metadata from CachedLLM response
  model text,
  tokens_in integer,
  tokens_out integer,
  phase_timings jsonb,
  finish_reason text,
  created_at timestamptz not null default now()
);

-- =============================================================================
-- BILLING (synced with Stripe)
-- =============================================================================

create table public.billing_usage (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  period text not null, -- '2026-04' (monthly)
  requests_count bigint not null default 0,
  tokens_in bigint not null default 0,
  tokens_out bigint not null default 0,
  kb_tokens_total bigint not null default 0,
  agents_count integer not null default 0,
  cost_usd real not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(team_id, period)
);

-- =============================================================================
-- INDEXES
-- =============================================================================

create index idx_team_members_user on public.team_members(user_id);
create index idx_team_members_team on public.team_members(team_id);
create index idx_projects_team on public.projects(team_id);
create index idx_agent_assignments_project on public.agent_assignments(project_id);
create index idx_llm_agents_team on public.llm_agents(team_id);
create index idx_ingest_jobs_agent on public.ingest_jobs(llm_agent_id);
create index idx_chat_sessions_team on public.chat_sessions(team_id);
create index idx_chat_sessions_project on public.chat_sessions(project_id);
create index idx_chat_messages_session on public.chat_messages(session_id);
create index idx_billing_usage_team on public.billing_usage(team_id);

-- =============================================================================
-- ROW LEVEL SECURITY
-- =============================================================================

alter table public.teams enable row level security;
alter table public.team_members enable row level security;
alter table public.user_profiles enable row level security;
alter table public.github_connections enable row level security;
alter table public.engine_connections enable row level security;
alter table public.projects enable row level security;
alter table public.agent_assignments enable row level security;
alter table public.llm_agents enable row level security;
alter table public.ingest_jobs enable row level security;
alter table public.chat_sessions enable row level security;
alter table public.chat_messages enable row level security;
alter table public.billing_usage enable row level security;

-- Team members can see their team's data
create policy "Team members can view their teams"
  on public.teams for select
  using (id in (select team_id from public.team_members where user_id = auth.uid()));

create policy "Team members can view team data"
  on public.team_members for select
  using (team_id in (select team_id from public.team_members where user_id = auth.uid()));

create policy "Users can view own profile"
  on public.user_profiles for all
  using (id = auth.uid());

create policy "Team members can view projects"
  on public.projects for select
  using (team_id in (select team_id from public.team_members where user_id = auth.uid()));

create policy "Team members can view agents"
  on public.llm_agents for select
  using (team_id in (select team_id from public.team_members where user_id = auth.uid()));

create policy "Team members can view chats"
  on public.chat_sessions for select
  using (team_id in (select team_id from public.team_members where user_id = auth.uid()));

create policy "Team members can view messages"
  on public.chat_messages for select
  using (session_id in (
    select id from public.chat_sessions
    where team_id in (select team_id from public.team_members where user_id = auth.uid())
  ));
