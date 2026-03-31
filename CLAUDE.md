# Qualtron Platform Monorepo

This is a Turbo + pnpm monorepo for all customer-facing Qualtron UIs.

## Structure

- `packages/qgst-client` — TypeScript client for Q-GST Engine (SpacetimeDB + Gitea + CachedLLM)
- `packages/ui` — Shared React components (graph viewer, timeline, chat stream, etc.)
- `packages/v0-sdk` — v0 Platform API SDK (existing)
- `packages/react` — v0 React components (existing)
- `apps/qualtron-platform` — Agent management, graph explorer, analytics, billing
- `apps/qualtron-cowork` — Collaborative AI workspace, multi-agent chat
- `apps/qualtron-ingest` — Knowledge upload and processing
- `apps/playground` — v0 playground (existing)

## Commands

- `pnpm install` — Install all dependencies
- `pnpm dev` — Start all apps in dev mode (Turbo parallel)
- `pnpm build` — Build everything (Turbo cached)
- `pnpm test` — Run all tests
- `pnpm type-check` — TypeScript check across all packages
- `pnpm --filter @qgst/client sync-schema` — Regenerate types from Q-GST Engine
- `pnpm --filter qualtron-platform dev` — Dev a single app

## Backend Services

Start with `docker compose -f docker-compose.dev.yml up -d`. See QUALTRON-PLATFORM-PLAN.md for full architecture.

## Key Dependencies

- Next.js 16, React 19, Tailwind CSS 4
- @xyflow/react (React Flow) for graph visualization
- recharts for analytics charts
- @radix-ui/* for accessible UI primitives
- SpacetimeDB TypeScript SDK for real-time subscriptions

## Related Repos

- `Q-GST-Engine` — Rust/WASM cognitive engine (schema source of truth)
- `gitea` — Q-GST Admin UI + Versioned Memory
- `QGI-Cashed-LLM` — CAG inference backend (Python)
