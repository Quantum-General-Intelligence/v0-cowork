'use client'

import { useState, type FormEvent } from 'react'
import Link from 'next/link'

type AgentRole = 'ai_agent' | 'human' | 'service'

const ROLE_OPTIONS: { value: AgentRole; label: string; description: string }[] =
  [
    {
      value: 'ai_agent',
      label: 'AI Agent',
      description:
        'Autonomous agent with full brain memory (5 repos), wiki skills, and graph access.',
    },
    {
      value: 'human',
      label: 'Human Operator',
      description:
        'Human user with admin capabilities. Brain memory is optional.',
    },
    {
      value: 'service',
      label: 'Engine Service',
      description:
        'Backend service (ingestor, indexer, etc.) with API-only access. No brain repos.',
    },
  ]

export default function RegisterAgentPage() {
  const [name, setName] = useState('')
  const [role, setRole] = useState<AgentRole>('ai_agent')
  const [tenant, setTenant] = useState('acme')
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState<string | null>(null)

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    // TODO: Call engine.agentRegister() + memory.provisionAgent()
    setTimeout(() => {
      setResult(
        `Agent "${name}" registered as ${role} in tenant "${tenant}". ` +
          `Brain repos and wiki skills provisioned.`,
      )
      setSubmitting(false)
    }, 1000)
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href="/agents"
          className="text-muted-foreground hover:text-foreground"
        >
          ← Agents
        </Link>
        <span className="text-muted-foreground">/</span>
        <h1 className="text-2xl font-bold tracking-tight">Register Agent</h1>
      </div>

      <p className="text-sm text-muted-foreground">
        Register a new agent in the Q-GST Engine. This creates the agent&apos;s
        identity, provisions brain memory stores, initializes the skill library,
        and sets up engine permissions.
      </p>

      {result ? (
        <div className="space-y-4">
          <div className="rounded-lg border border-accent/50 bg-accent/10 p-4">
            <p className="text-sm text-accent">{result}</p>
          </div>
          <div className="flex gap-3">
            <Link
              href={`/agents/${name}`}
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
            >
              View Agent
            </Link>
            <button
              onClick={() => {
                setResult(null)
                setName('')
              }}
              className="rounded-md bg-muted px-4 py-2 text-sm font-medium text-muted-foreground"
            >
              Register Another
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Tenant */}
          <div>
            <label className="mb-1.5 block text-sm font-medium">Tenant</label>
            <input
              type="text"
              value={tenant}
              onChange={(e) => setTenant(e.target.value)}
              placeholder="acme"
              required
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
            <p className="mt-1 text-xs text-muted-foreground">
              The Q-GST Engine tenant this agent belongs to.
            </p>
          </div>

          {/* Agent Name */}
          <div>
            <label className="mb-1.5 block text-sm font-medium">
              Agent Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) =>
                setName(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))
              }
              placeholder="alice"
              required
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono"
            />
            <p className="mt-1 text-xs text-muted-foreground">
              Lowercase alphanumeric. This becomes the agent&apos;s identity
              across all engine systems.
            </p>
          </div>

          {/* Role */}
          <div>
            <label className="mb-1.5 block text-sm font-medium">Role</label>
            <div className="space-y-2">
              {ROLE_OPTIONS.map((opt) => (
                <label
                  key={opt.value}
                  className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors ${
                    role === opt.value
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-muted-foreground/30'
                  }`}
                >
                  <input
                    type="radio"
                    name="role"
                    value={opt.value}
                    checked={role === opt.value}
                    onChange={() => setRole(opt.value)}
                    className="mt-0.5"
                  />
                  <div>
                    <span className="text-sm font-medium">{opt.label}</span>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {opt.description}
                    </p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* What Gets Created */}
          <div className="rounded-lg border border-border bg-muted/50 p-4">
            <h3 className="mb-2 text-sm font-medium">
              What will be provisioned:
            </h3>
            <ul className="space-y-1 text-xs text-muted-foreground">
              <li>
                ✓ Engine identity in tenant{' '}
                <span className="font-mono text-primary">qgst-{tenant}</span>
              </li>
              {role !== 'service' && (
                <>
                  <li>
                    ✓ 5 brain memory stores:{' '}
                    <span className="font-mono text-primary">
                      {name || '...'}-episodic
                    </span>
                    , knowledge, analysis, context, inbox
                  </li>
                  <li>✓ Skill library with default templates</li>
                  <li>
                    ✓ Protected knowledge store (requires review to merge)
                  </li>
                </>
              )}
              <li>✓ Engine permissions based on role</li>
            </ul>
          </div>

          <button
            type="submit"
            disabled={!name || !tenant || submitting}
            className="rounded-md bg-primary px-6 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {submitting ? 'Provisioning...' : 'Register Agent'}
          </button>
        </form>
      )}
    </div>
  )
}
