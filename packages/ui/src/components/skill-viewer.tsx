'use client'

import { useCallback, useEffect, useState } from 'react'
import type { GiteaWikiPage, VersionedMemoryClient } from '@qgst/client'
import { brainRepoName } from '@qgst/client'

export interface SkillViewerProps {
  /** Versioned Memory client */
  client: VersionedMemoryClient
  /** Agent name — skills are read from {agent}-knowledge wiki */
  agentName: string
  /** Called when a skill page is selected */
  onSkillSelect?: (skill: GiteaWikiPage) => void
}

export function SkillViewer({
  client,
  agentName,
  onSkillSelect,
}: SkillViewerProps) {
  const [skills, setSkills] = useState<GiteaWikiPage[]>([])
  const [selectedSkill, setSelectedSkill] = useState<GiteaWikiPage | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    setError(null)
    client
      .listAgentSkills(agentName)
      .then(setSkills)
      .catch((err) =>
        setError(err instanceof Error ? err.message : 'Failed to load skills'),
      )
      .finally(() => setLoading(false))
  }, [client, agentName])

  const handleSkillClick = useCallback(
    async (skill: GiteaWikiPage) => {
      try {
        const full = await client.getAgentSkill(agentName, skill.title)
        setSelectedSkill(full)
        onSkillSelect?.(full)
      } catch {
        setError('Failed to load skill')
      }
    },
    [client, agentName, onSkillSelect],
  )

  return (
    <div
      style={{
        border: '1px solid var(--border, #333)',
        borderRadius: 'var(--radius, 8px)',
        overflow: 'hidden',
        backgroundColor: 'var(--card, #111)',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '8px 12px',
          borderBottom: '1px solid var(--border, #333)',
          backgroundColor: 'var(--muted, #1a1a1a)',
        }}
      >
        <span
          style={{
            fontSize: 13,
            fontWeight: 600,
            color: 'var(--foreground, #fff)',
          }}
        >
          Agent Skills
        </span>
        {selectedSkill && (
          <button
            onClick={() => setSelectedSkill(null)}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--primary, #00C2FF)',
              cursor: 'pointer',
              fontSize: 12,
            }}
          >
            Back to list
          </button>
        )}
      </div>

      {/* Content */}
      {loading ? (
        <div
          style={{
            padding: 24,
            textAlign: 'center',
            color: 'var(--muted-foreground, #666)',
          }}
        >
          Loading skills...
        </div>
      ) : error ? (
        <div
          style={{
            padding: 24,
            textAlign: 'center',
            color: 'var(--destructive, #f44)',
          }}
        >
          {error}
        </div>
      ) : selectedSkill ? (
        <div style={{ padding: 16 }}>
          <h3
            style={{
              margin: '0 0 8px 0',
              fontSize: 16,
              fontWeight: 600,
              color: 'var(--foreground, #fff)',
            }}
          >
            {selectedSkill.title}
          </h3>
          {selectedSkill.last_commit && (
            <p
              style={{
                margin: '0 0 12px 0',
                fontSize: 11,
                color: 'var(--muted-foreground, #666)',
                fontFamily: 'monospace',
              }}
            >
              Last updated: {selectedSkill.last_commit.message}
            </p>
          )}
          <pre
            style={{
              margin: 0,
              padding: 12,
              fontSize: 13,
              lineHeight: 1.6,
              overflow: 'auto',
              maxHeight: 400,
              backgroundColor: 'var(--muted, #1a1a1a)',
              borderRadius: 6,
              color: 'var(--foreground, #fff)',
              fontFamily: 'var(--font-mono, monospace)',
              whiteSpace: 'pre-wrap',
            }}
          >
            {selectedSkill.content}
          </pre>
        </div>
      ) : skills.length === 0 ? (
        <div
          style={{
            padding: 24,
            textAlign: 'center',
            color: 'var(--muted-foreground, #666)',
          }}
        >
          No skills defined yet. Skills are learned from the agent&#39;s
          knowledge wiki.
        </div>
      ) : (
        skills.map((skill) => (
          <button
            key={skill.sub_url}
            onClick={() => handleSkillClick(skill)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              width: '100%',
              padding: '10px 12px',
              background: 'none',
              border: 'none',
              borderBottom: '1px solid var(--border, #222)',
              color: 'var(--foreground, #fff)',
              cursor: 'pointer',
              textAlign: 'left',
              fontSize: 13,
            }}
          >
            <span style={{ color: 'var(--accent, #00FF94)', fontSize: 14 }}>
              ⚡
            </span>
            <span>{skill.title}</span>
          </button>
        ))
      )}
    </div>
  )
}
