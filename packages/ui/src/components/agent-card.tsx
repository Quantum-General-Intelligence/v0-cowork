'use client'

import type { Agent } from '@qgst/client'

export interface AgentCardProps {
  agent: Agent
  onClick?: (agent: Agent) => void
}

const ROLE_COLORS: Record<string, string> = {
  human: '#00C2FF',
  ai_agent: '#00FF94',
  service: '#7B61FF',
  system: '#FFB800',
}

export function AgentCard({ agent, onClick }: AgentCardProps) {
  const roleColor = ROLE_COLORS[agent.role] ?? '#888'
  const permissions: string[] = (() => {
    try {
      return JSON.parse(agent.permissions) as string[]
    } catch {
      return []
    }
  })()

  return (
    <div
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={() => onClick?.(agent)}
      onKeyDown={(e) => {
        if (onClick && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault()
          onClick(agent)
        }
      }}
      style={{
        border: '1px solid var(--border, #333)',
        borderRadius: 'var(--radius, 8px)',
        padding: 16,
        backgroundColor: 'var(--card, #111)',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'border-color 0.15s',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: 8,
        }}
      >
        <div>
          <h3
            style={{
              margin: 0,
              fontSize: 16,
              fontWeight: 600,
              color: 'var(--foreground, #fff)',
            }}
          >
            {agent.name}
          </h3>
          <span
            style={{
              fontSize: 12,
              color: roleColor,
              fontFamily: 'monospace',
              textTransform: 'uppercase',
            }}
          >
            {agent.role}
          </span>
        </div>
        <span
          style={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            backgroundColor: '#00FF94',
            marginTop: 6,
          }}
        />
      </div>

      {permissions.length > 0 && (
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          {permissions.map((p) => (
            <span
              key={p}
              style={{
                fontSize: 11,
                padding: '2px 6px',
                borderRadius: 4,
                backgroundColor: 'var(--muted, #222)',
                color: 'var(--muted-foreground, #888)',
                fontFamily: 'monospace',
              }}
            >
              {p}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
