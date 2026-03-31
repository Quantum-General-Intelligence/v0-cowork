# Qualtron Platform — Build Plan

This monorepo (formerly `v0-cowork`) becomes the home for all customer-facing Qualtron UIs and shared packages that connect to the Q-GST cognitive infrastructure.

## Context

### What Exists Today

| Repo | What | Stack | Status |
|---|---|---|---|
| **v0-cowork** (this repo) | v0 clone SDK + playground | TypeScript, Turbo, pnpm, Next.js | Active — becomes Qualtron monorepo |
| **gitea** | Q-GST Admin UI + Versioned Memory | Go + Vue islands | Active — rebranded, admin-only |
| **Q-GST-Engine** | Cognitive engine (memory, graph, temporal) | Rust/WASM on SpacetimeDB | Active — 62 API calls, 22 tables |
| **QGI-Cashed-LLM** | CAG agent platform backend | Python (FastAPI + SGLang) | Active — backend stays, dashboard replaced |
| **QGI-AI-infra** | Production deployment configs | Shell/Docker | Active |
| **SpacetimeDB** | Upstream fork (reference only) | Rust | No changes |

### What We're Building

Three customer-facing UIs plus shared infrastructure:

| App | Purpose | Users |
|---|---|---|
| **Qualtron Platform** | Agent management, knowledge ingest, graph explorer, analytics, billing | Company admins, developers |
| **Qualtron Cowork** | Collaborative AI workspace, multi-agent chat, project files, PR review | End users, teams |
| **Qualtron Ingest** | Standalone knowledge upload + processing pipeline status | Data teams, knowledge managers |

### What Gets Replaced

**QGI-Cashed-LLM's `cagent/dashboard/`** (Next.js 15 + Recharts) is a temporary oversimplistic UI built during prototyping. It has basic pages for agents, analytics, billing, and a playground. All of this will be rebuilt properly in **Qualtron Platform** with:

- Full Q-GST Engine integration (not just CachedLLM API)
- Knowledge graph visualization
- Agent brain browser (browsing Gitea repos via API)
- Epoch/timeline viewer
- Real-time SpacetimeDB subscriptions
- Shared component library from this monorepo
- Better billing/analytics with Tremor dashboard components

The Python backend (`cagent/api/`, `cagent/skills/`, `cagent/ingest/`) stays in QGI-Cashed-LLM. Only the frontend moves here.

---

## Architecture

### System Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│  This Monorepo — Customer-Facing Apps                            │
│                                                                  │
│  ┌──────────────────┐ ┌────────────────┐ ┌───────────────────┐  │
│  │ qualtron-platform│ │ qualtron-cowork│ │ qualtron-ingest   │  │
│  │ Agent CRUD       │ │ AI workspace   │ │ KB upload         │  │
│  │ Graph explorer   │ │ Multi-agent    │ │ Processing status │  │
│  │ Analytics/billing│ │ chat           │ │ Preview/activate  │  │
│  │ KB management    │ │ Project files  │ │                   │  │
│  │ Brain browser    │ │ PR review      │ │                   │  │
│  │ Epoch timeline   │ │ Activity feed  │ │                   │  │
│  └────────┬─────────┘ └───────┬────────┘ └─────────┬─────────┘  │
│           │                   │                     │            │
│           └───────────────────┼─────────────────────┘            │
│                               │                                  │
│                        @qgst/client                              │
│                    ┌──────────┼──────────┐                       │
│                    │          │          │                        │
│              spacetimedb  versioned-  cached-llm                 │
│              .ts          memory.ts   .ts                        │
│                                                                  │
│                         @qgst/ui                                 │
│              graph-viewer, timeline, chat-stream,                │
│              memory-browser, status-badge, agent-card            │
├──────────────────────────────────────────────────────────────────┤
│  Backend Services (separate repos, separate processes)            │
│                                                                  │
│  SpacetimeDB ──────── Gitea (Q-GST Admin) ──────── Zvec          │
│  ws://localhost:3000   http://localhost:3333        (embedded)    │
│  Q-GST Engine module   Repos, PRs, Wiki, Actions   Semantic idx  │
│                                                                  │
│  CachedLLM (FastAPI) ─── SGLang (GPU inference)                  │
│  http://localhost:8000    GPU cluster                             │
└──────────────────────────────────────────────────────────────────┘
```

### Connection Details

| Service | Protocol | Endpoint | Auth |
|---|---|---|---|
| SpacetimeDB | WebSocket | `ws://localhost:3000` | SpacetimeDB Identity token |
| Gitea (Versioned Memory) | REST | `http://localhost:3333/api/v1/` | Gitea OAuth2 or API token |
| CachedLLM | REST (OpenAI-compatible) | `http://localhost:8000/v1/` | API key (`cag_*`) |
| Zvec | Not directly accessed | Embedded in runner process | N/A — accessed via Q-GST Engine API |

---

## Monorepo Structure

### Current (v0-cowork)

```
packages/
├── v0-sdk/              TypeScript SDK for v0 Platform API
├── react/               React components (streaming-message, code-block, etc.)
├── ai-tools/            AI tool integration
└── create-v0-sdk-app/   CLI scaffolding

apps/
└── playground/          v0 playground (Next.js 16 + Radix UI)
```

### Target

```
packages/
├── qgst-client/         NEW — TypeScript client for Q-GST Engine
│   ├── src/
│   │   ├── spacetimedb.ts      SpacetimeDB WebSocket + subscriptions
│   │   ├── versioned-memory.ts Gitea REST API (repos, files, PRs, wiki)
│   │   ├── cached-llm.ts       CachedLLM OpenAI-compatible API
│   │   ├── types.ts            Generated from Q-GST Engine schema.rs
│   │   └── index.ts            Unified client export
│   ├── scripts/
│   │   └── sync-schema.ts      Auto-generate types from Q-GST-Engine
│   └── package.json            "@qgst/client"
│
├── ui/                  NEW — Shared Q-GST UI components
│   ├── src/
│   │   ├── components/
│   │   │   ├── graph-viewer.tsx      Knowledge graph (React Flow)
│   │   │   ├── timeline.tsx          Epoch/tick timeline (D3)
│   │   │   ├── memory-browser.tsx    Agent brain file tree
│   │   │   ├── chat-stream.tsx       Streaming chat with thinking sections
│   │   │   ├── agent-card.tsx        Agent summary card
│   │   │   ├── status-badge.tsx      SpacetimeDB/Zvec connection status
│   │   │   ├── usage-chart.tsx       Token usage / billing chart (Tremor)
│   │   │   ├── ingest-progress.tsx   File ingest progress tracker
│   │   │   └── index.ts
│   │   ├── hooks/
│   │   │   ├── use-qgst.ts          React context + hooks for @qgst/client
│   │   │   ├── use-subscription.ts  SpacetimeDB subscription hook
│   │   │   └── use-agent.ts         Agent state hook
│   │   └── index.ts
│   └── package.json            "@qgst/ui"
│
├── v0-sdk/              EXISTING (unchanged)
├── react/               EXISTING (unchanged)
├── ai-tools/            EXISTING (unchanged)
└── create-v0-sdk-app/   EXISTING (unchanged)

apps/
├── playground/          EXISTING (unchanged)
│
├── qualtron-platform/   NEW — Company admin + agent management
│   ├── app/
│   │   ├── page.tsx                 Dashboard: agent count, KB stats, usage
│   │   ├── layout.tsx               Shared layout with sidebar nav
│   │   ├── agents/
│   │   │   ├── page.tsx             Agent list with cards
│   │   │   └── [id]/
│   │   │       ├── page.tsx         Agent detail: brain repos, events, graph
│   │   │       ├── brain/page.tsx   Brain repo browser (5 repos)
│   │   │       └── skills/page.tsx  Wiki skills viewer
│   │   ├── knowledge/
│   │   │   ├── page.tsx             Knowledge graph explorer
│   │   │   └── ingest/page.tsx      Upload + ingest management
│   │   ├── graph/
│   │   │   └── page.tsx             Full graph visualization
│   │   ├── timeline/
│   │   │   └── page.tsx             Epoch timeline + causal DAG
│   │   ├── analytics/
│   │   │   └── page.tsx             Usage metering, token costs, quotas
│   │   ├── billing/
│   │   │   └── page.tsx             Billing dashboard + invoicing
│   │   ├── settings/
│   │   │   └── page.tsx             Tenant settings, consolidation schedule
│   │   └── playground/
│   │       └── page.tsx             Chat playground with agent selection
│   ├── components/                  App-specific components
│   ├── lib/                         App-specific utilities
│   ├── public/
│   ├── next.config.ts
│   ├── components.json              shadcn/ui config
│   └── package.json
│
├── qualtron-cowork/     NEW — Collaborative AI workspace
│   ├── app/
│   │   ├── page.tsx                 Project list / workspace overview
│   │   ├── layout.tsx               Workspace layout with project sidebar
│   │   ├── [project]/
│   │   │   ├── page.tsx             Project dashboard
│   │   │   ├── files/page.tsx       Project file browser (Gitea repo)
│   │   │   ├── chat/page.tsx        Multi-agent chat interface
│   │   │   ├── review/page.tsx      PR review queue
│   │   │   ├── board/page.tsx       Kanban board (Gitea org project)
│   │   │   ├── wiki/page.tsx        Project wiki
│   │   │   └── activity/page.tsx    Activity feed + event stream
│   │   └── settings/
│   │       └── page.tsx             Workspace settings
│   ├── components/
│   ├── lib/
│   ├── next.config.ts
│   ├── components.json
│   └── package.json
│
└── qualtron-ingest/     NEW — Standalone knowledge ingestor
    ├── app/
    │   ├── page.tsx                 Upload dashboard
    │   ├── layout.tsx
    │   ├── upload/
    │   │   └── page.tsx             File upload + URL scraping
    │   ├── jobs/
    │   │   ├── page.tsx             Active ingest jobs
    │   │   └── [id]/page.tsx        Job detail + progress
    │   └── preview/
    │       └── page.tsx             KB preview before activation
    ├── components/
    ├── lib/
    ├── next.config.ts
    └── package.json
```

---

## Package Details

### `@qgst/client` — Core Client Library

The single source of truth for connecting to Q-GST Engine from any TypeScript app.

```typescript
// Usage in any app:
import { QGSTClient } from '@qgst/client'

const client = new QGSTClient({
  spacetimedb: {
    endpoint: 'ws://localhost:3000',
    module: 'spacetime-engine',
  },
  versionedMemory: {
    endpoint: 'http://localhost:3333',
    token: process.env.GITEA_TOKEN,
    owner: 'qgst-acme',
  },
  cachedLLM: {
    endpoint: 'http://localhost:8000',
    apiKey: process.env.CACHEDLLM_API_KEY,
  },
})

// SpacetimeDB operations
await client.engine.agentRegister('acme', 'alice', 'ai_agent', '["read","write"]')
await client.engine.eventRecord('acme', 'action', 'file.read', '{"file":"doc.pdf"}')
await client.engine.graphUpsertNode('acme', { uid: 'party:acme', graph: 'entity', ... })

// Versioned Memory (Gitea API)
const files = await client.memory.listFiles('alice-knowledge', 'parties/')
const content = await client.memory.readFile('alice-knowledge', 'parties/acme-corp.md')
await client.memory.createPR('project-alpha', 'review-findings', 'main', 'Agent review')

// CachedLLM (OpenAI-compatible)
const response = await client.llm.chat({
  model: 'support-agent-a3f2',
  messages: [{ role: 'user', content: 'What are the payment terms?' }],
  stream: true,
})

// Real-time subscriptions
client.engine.subscribe('events', { tenant: 'acme' }, (event) => {
  console.log('New event:', event.event_type)
})
```

**Key design decisions:**
- Wraps SpacetimeDB TypeScript SDK for WebSocket connections
- Wraps Gitea REST API (not git protocol — we need issues, PRs, wiki, not just files)
- Wraps CachedLLM with OpenAI-compatible interface (drop-in for any OpenAI client)
- All methods are typed from Q-GST Engine schema (auto-generated)
- Connection management, reconnection, token refresh built in

### `@qgst/ui` — Shared Component Library

Reusable React components that any Qualtron app can import.

**Dependencies:**
- `@qgst/client` — for data fetching and subscriptions
- `@xyflow/react` (React Flow) — graph visualization
- `recharts` or `@tremor/react` — charts and analytics
- `@radix-ui/*` — accessible primitives (already used in playground)
- `tailwindcss` 4 — styling (already configured)

**Component inventory:**

| Component | Used In | Data Source |
|---|---|---|
| `<GraphViewer>` | Platform (graph page), Cowork (project graph) | SpacetimeDB nodes/edges |
| `<Timeline>` | Platform (timeline page), Cowork (activity) | SpacetimeDB epochs/events |
| `<MemoryBrowser>` | Platform (agent brain), Cowork (project files) | Gitea REST API |
| `<ChatStream>` | Platform (playground), Cowork (chat) | CachedLLM streaming API |
| `<AgentCard>` | Platform (agent list), Cowork (member list) | SpacetimeDB agents table |
| `<StatusBadge>` | All apps (header) | `/-/q-gst/api/status` |
| `<UsageChart>` | Platform (analytics/billing) | SpacetimeDB usage_metrics |
| `<IngestProgress>` | Platform (ingest), Ingest app | CachedLLM ingest API |
| `<PRReviewCard>` | Cowork (review page) | Gitea PR API |
| `<KanbanBoard>` | Cowork (board page) | Gitea org project API |

---

## Q-GST Engine Schema Reference

These are the 22 tables in SpacetimeDB that `@qgst/client` wraps. Types are auto-generated from `Q-GST-Engine/src/schema.rs`.

### Core Memory (9 tables)

| Table | Key Fields | UI Usage |
|---|---|---|
| `agents` | identity, tenant, name, role, permissions | Agent list, cards |
| `events` | tenant, actor, kind, event_type, data | Activity feeds, timeline |
| `states` | tenant, agent, scope, key, value | Working memory display |
| `nodes` | uid, tenant, graph, kind, label, meta, memory_ref | Graph viewer |
| `edges` | tenant, graph, from_node, to_node, rel, weight | Graph viewer |
| `context_sessions` | tenant, agent, status, context_frame | Session viewer |
| `attention_cache` | tenant, agent, cache_key, content, relevance | Hot memory panel |
| `retrieval_sources` | tenant, source_type, name, config | Settings page |
| `projects` | tenant, name, status, repo_name, gitea_project_id | Project list, kanban |

### Operations (7 tables)

| Table | Key Fields | UI Usage |
|---|---|---|
| `consolidation_logs` | tenant, run_at, edges_decayed/pruned | Admin panel |
| `consolidation_schedules` | tenant, interval, config | Settings page |
| `usage_metrics` | tenant, agent, period, metric, count | Analytics/billing |
| `quotas` | tenant, agent, metric, max_value | Settings page |
| `rate_counters` | tenant, agent, metric, count | Rate limit display |
| `audit_logs` | tenant, actor, action, details | Audit trail |

### Temporal (6 tables)

| Table | Key Fields | UI Usage |
|---|---|---|
| `epochs` | tenant, tick, status | Timeline, tick counter |
| `causal_ops` | tenant, op_id, parent_op | Causal DAG viewer |
| `future_events` | tenant, fire_at_tick, action | Scheduled actions list |
| `chronos_loops` | tenant, name, pattern, action | Recurring tasks |
| `universal_clocks` | tenant, tick, wall_time | Time mapping |
| `tick_logs` | tenant, tick, summary | Tick history |

---

## CachedLLM API Reference

These are the endpoints in QGI-Cashed-LLM that `@qgst/client` wraps. The API is OpenAI-compatible.

| Endpoint | Method | Description |
|---|---|---|
| `/v1/chat/completions` | POST | Chat with an agent (streaming supported) |
| `/v1/models` | GET | List available agents (OpenAI models format) |
| `/v1/agents` | GET/POST | List/create agents |
| `/v1/agents/{id}` | GET/PATCH/DELETE | Agent CRUD |
| `/v1/agents/{id}/ingest/url` | POST | Ingest from URLs |
| `/v1/agents/{id}/ingest/upload` | POST | Ingest from file upload |
| `/v1/ingest/{job_id}` | GET | Ingest job status |
| `/v1/agents/{id}/keys` | GET/POST | API key management |
| `/v1/agents/{id}/analytics` | GET | Usage analytics |
| `/v1/agents/{id}/deploy` | POST | Deploy to dedicated GPU |
| `/health` | GET | Health check |

---

## Versioned Memory (Gitea) API Reference

These are the Gitea REST API endpoints that `@qgst/client` wraps for content store operations.

| Operation | Endpoint | Description |
|---|---|---|
| List repos | `GET /api/v1/orgs/{org}/repos` | List tenant repos (brains, projects, shared) |
| List files | `GET /api/v1/repos/{owner}/{repo}/contents/{path}` | Browse repo tree |
| Read file | `GET /api/v1/repos/{owner}/{repo}/contents/{filepath}` | Read file content |
| Write file | `PUT /api/v1/repos/{owner}/{repo}/contents/{filepath}` | Create/update file |
| List PRs | `GET /api/v1/repos/{owner}/{repo}/pulls` | PR list (human-in-the-loop) |
| Create PR | `POST /api/v1/repos/{owner}/{repo}/pulls` | Open PR for agent work |
| List issues | `GET /api/v1/repos/{owner}/{repo}/issues` | Tasks, future events |
| Wiki pages | `GET /api/v1/repos/{owner}/{repo}/wiki/pages` | Agent skills |
| Org projects | `GET /api/v1/orgs/{org}/projects` | Kanban boards |
| User list | `GET /api/v1/admin/users` | Agent/user management |

---

## Development Setup

### Prerequisites

- Node.js 22+
- pnpm 9+
- Docker (for backend services)

### Local Development

```bash
# 1. Clone and install
git clone https://github.com/Quantum-General-Intelligence/v0-cowork.git
cd v0-cowork
pnpm install

# 2. Start backend services
docker compose -f docker-compose.dev.yml up -d

# 3. Publish Q-GST Engine module to SpacetimeDB
spacetime publish spacetime-engine \
  --project-path ../Q-GST-Engine \
  --server http://localhost:3000

# 4. Start all apps in dev mode
pnpm dev

# Apps will be available at:
#   Qualtron Platform:  http://localhost:3001
#   Qualtron Cowork:    http://localhost:3002
#   Qualtron Ingest:    http://localhost:3003
#   v0 Playground:      http://localhost:3004
```

### Environment Variables

Create `.env.local` in each app directory:

```env
# SpacetimeDB
NEXT_PUBLIC_SPACETIMEDB_ENDPOINT=ws://localhost:3000
NEXT_PUBLIC_SPACETIMEDB_MODULE=spacetime-engine

# Gitea (Q-GST Versioned Memory)
QGST_MEMORY_URL=http://localhost:3333
QGST_MEMORY_TOKEN=your-gitea-api-token
QGST_MEMORY_OWNER=qgst-acme

# CachedLLM
CACHEDLLM_URL=http://localhost:8000
CACHEDLLM_API_KEY=your-cachedllm-key
```

---

## Build Order

The Turbo pipeline ensures correct build order:

```
1. @qgst/client          (no deps — builds first)
2. @qgst/ui              (depends on @qgst/client)
3. v0-sdk, react,         (existing packages — parallel)
   ai-tools
4. qualtron-platform,     (depend on @qgst/client + @qgst/ui — parallel)
   qualtron-cowork,
   qualtron-ingest,
   playground
```

### Schema Sync

When Q-GST-Engine schema changes:

```bash
# Regenerate TypeScript types from schema.rs
pnpm --filter @qgst/client sync-schema

# Turbo rebuilds everything that depends on @qgst/client
pnpm build

# Type errors surface immediately across all apps
pnpm type-check
```

---

## CI/CD

### GitHub Actions

```yaml
# Triggered on push OR when Q-GST-Engine dispatches an update
on:
  push:
    branches: [main]
  repository_dispatch:
    types: [qgst-engine-updated]

jobs:
  build-and-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - run: pnpm install
      - run: pnpm --filter @qgst/client sync-schema
      - run: pnpm build
      - run: pnpm test
      - run: pnpm type-check
```

### Deployment

Each app deploys independently:

| App | Deployment | URL |
|---|---|---|
| Qualtron Platform | Vercel / self-hosted | `platform.qualtron.ai` |
| Qualtron Cowork | Vercel / self-hosted | `cowork.qualtron.ai` |
| Qualtron Ingest | Vercel / self-hosted | `ingest.qualtron.ai` |
| v0 Playground | Vercel | `v0.qualtron.ai` |

---

## Implementation Phases

### Phase 1: Foundation (Week 1)
- [ ] Create `packages/qgst-client` with typed wrappers for all 3 backends
- [ ] Create `packages/ui` with `StatusBadge`, `AgentCard`, `ChatStream`
- [ ] Add `docker-compose.dev.yml` for local backend stack
- [ ] Scaffold `apps/qualtron-platform` with Next.js 16 + shadcn/ui

### Phase 2: Platform Core (Week 2)
- [ ] Platform: Agent list + detail pages
- [ ] Platform: Brain browser (Gitea file tree)
- [ ] Platform: Chat playground with streaming
- [ ] `@qgst/ui`: `<MemoryBrowser>` component

### Phase 3: Graph & Timeline (Week 3)
- [ ] `@qgst/ui`: `<GraphViewer>` with React Flow
- [ ] `@qgst/ui`: `<Timeline>` with epoch/tick visualization
- [ ] Platform: Knowledge graph explorer page
- [ ] Platform: Timeline page

### Phase 4: Analytics & Billing (Week 3-4)
- [ ] `@qgst/ui`: `<UsageChart>` with Tremor/Recharts
- [ ] Platform: Analytics dashboard
- [ ] Platform: Billing page
- [ ] Platform: Settings (quotas, consolidation, retrieval sources)

### Phase 5: Cowork (Week 4-5)
- [ ] Scaffold `apps/qualtron-cowork`
- [ ] Cowork: Project list + file browser
- [ ] Cowork: Multi-agent chat interface
- [ ] Cowork: PR review queue
- [ ] Cowork: Kanban board
- [ ] Cowork: Activity feed with real-time events

### Phase 6: Ingest (Week 5)
- [ ] Scaffold `apps/qualtron-ingest`
- [ ] Ingest: File upload + URL scraping
- [ ] Ingest: Job progress tracking
- [ ] Ingest: KB preview + activation

### Phase 7: Polish & Deploy (Week 6)
- [ ] Schema sync automation (CI dispatch)
- [ ] Auth: Shared OAuth2 via Gitea provider
- [ ] Production deployment configs
- [ ] E2E tests with Playwright

---

## Related Repositories

| Repo | Role | Link |
|---|---|---|
| **v0-cowork** (this) | Customer-facing UIs + shared packages | `Quantum-General-Intelligence/v0-cowork` |
| **gitea** | Q-GST Admin UI + Versioned Memory backend | `Quantum-General-Intelligence/gitea` |
| **Q-GST-Engine** | Rust/WASM cognitive engine (SpacetimeDB) | `Quantum-General-Intelligence/Q-GST-Engine` |
| **QGI-Cashed-LLM** | CAG inference backend (Python/FastAPI) | `Quantum-General-Intelligence/QGI-Cashed-LLM` |
| **QGI-AI-infra** | Production infrastructure configs | `Quantum-General-Intelligence/QGI-AI-infra` |
