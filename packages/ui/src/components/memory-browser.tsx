'use client'

import { useCallback, useEffect, useState } from 'react'
import type {
  GiteaContent,
  GiteaFileContent,
  VersionedMemoryClient,
} from '@qgst/client'

export interface MemoryBrowserProps {
  /** Versioned Memory client */
  client: VersionedMemoryClient
  /** Repo name to browse */
  repo: string
  /** Label shown in the header */
  label?: string
  /** Initial path */
  initialPath?: string
  /** Called when a file is selected */
  onFileSelect?: (file: GiteaFileContent) => void
}

interface BreadcrumbItem {
  name: string
  path: string
}

export function MemoryBrowser({
  client,
  repo,
  label,
  initialPath = '',
  onFileSelect,
}: MemoryBrowserProps) {
  const [currentPath, setCurrentPath] = useState(initialPath)
  const [entries, setEntries] = useState<GiteaContent[]>([])
  const [selectedFile, setSelectedFile] = useState<GiteaFileContent | null>(
    null,
  )
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadPath = useCallback(
    async (path: string) => {
      setLoading(true)
      setError(null)
      setSelectedFile(null)
      try {
        const contents = await client.listFiles(repo, path)
        const sorted = [...contents].sort((a, b) => {
          if (a.type === 'dir' && b.type !== 'dir') return -1
          if (a.type !== 'dir' && b.type === 'dir') return 1
          return a.name.localeCompare(b.name)
        })
        setEntries(sorted)
        setCurrentPath(path)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load')
        setEntries([])
      } finally {
        setLoading(false)
      }
    },
    [client, repo],
  )

  useEffect(() => {
    loadPath(initialPath)
  }, [loadPath, initialPath])

  const handleEntryClick = useCallback(
    async (entry: GiteaContent) => {
      if (entry.type === 'dir') {
        loadPath(entry.path)
      } else {
        try {
          const file = await client.readFile(repo, entry.path)
          setSelectedFile(file)
          onFileSelect?.(file)
        } catch {
          setError('Failed to read file')
        }
      }
    },
    [client, repo, loadPath, onFileSelect],
  )

  const breadcrumbs: BreadcrumbItem[] = [{ name: label ?? repo, path: '' }]
  if (currentPath) {
    const parts = currentPath.split('/')
    let accumulated = ''
    for (const part of parts) {
      accumulated = accumulated ? `${accumulated}/${part}` : part
      breadcrumbs.push({ name: part, path: accumulated })
    }
  }

  const fileContent = selectedFile?.content ? atob(selectedFile.content) : null

  return (
    <div
      style={{
        border: '1px solid var(--border, #333)',
        borderRadius: 'var(--radius, 8px)',
        overflow: 'hidden',
        backgroundColor: 'var(--card, #111)',
      }}
    >
      {/* Breadcrumb */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 4,
          padding: '8px 12px',
          borderBottom: '1px solid var(--border, #333)',
          fontSize: 13,
          fontFamily: 'monospace',
          backgroundColor: 'var(--muted, #1a1a1a)',
        }}
      >
        {breadcrumbs.map((crumb, i) => (
          <span
            key={crumb.path}
            style={{ display: 'flex', alignItems: 'center', gap: 4 }}
          >
            {i > 0 && (
              <span style={{ color: 'var(--muted-foreground, #666)' }}>/</span>
            )}
            <button
              onClick={() => loadPath(crumb.path)}
              style={{
                background: 'none',
                border: 'none',
                color:
                  i === breadcrumbs.length - 1
                    ? 'var(--foreground, #fff)'
                    : 'var(--primary, #00C2FF)',
                cursor: 'pointer',
                padding: 0,
                fontFamily: 'monospace',
                fontSize: 13,
              }}
            >
              {crumb.name}
            </button>
          </span>
        ))}
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
          Loading...
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
      ) : selectedFile && fileContent ? (
        <div>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '6px 12px',
              borderBottom: '1px solid var(--border, #333)',
              backgroundColor: 'var(--muted, #1a1a1a)',
            }}
          >
            <span
              style={{ fontSize: 12, color: 'var(--muted-foreground, #666)' }}
            >
              {selectedFile.path} ({selectedFile.size} bytes)
            </span>
            <button
              onClick={() => setSelectedFile(null)}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--primary, #00C2FF)',
                cursor: 'pointer',
                fontSize: 12,
              }}
            >
              Back to files
            </button>
          </div>
          <pre
            style={{
              margin: 0,
              padding: 12,
              fontSize: 13,
              lineHeight: 1.5,
              overflow: 'auto',
              maxHeight: 400,
              color: 'var(--foreground, #fff)',
              fontFamily: 'var(--font-mono, monospace)',
            }}
          >
            {fileContent}
          </pre>
        </div>
      ) : (
        <div>
          {entries.length === 0 ? (
            <div
              style={{
                padding: 24,
                textAlign: 'center',
                color: 'var(--muted-foreground, #666)',
              }}
            >
              Empty
            </div>
          ) : (
            entries.map((entry) => (
              <button
                key={entry.path}
                onClick={() => handleEntryClick(entry)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  width: '100%',
                  padding: '8px 12px',
                  background: 'none',
                  border: 'none',
                  borderBottom: '1px solid var(--border, #222)',
                  color: 'var(--foreground, #fff)',
                  cursor: 'pointer',
                  textAlign: 'left',
                  fontSize: 13,
                  fontFamily: 'monospace',
                }}
              >
                <span style={{ opacity: 0.5 }}>
                  {entry.type === 'dir' ? '📁' : '📄'}
                </span>
                <span
                  style={{
                    color:
                      entry.type === 'dir'
                        ? 'var(--primary, #00C2FF)'
                        : 'var(--foreground, #fff)',
                  }}
                >
                  {entry.name}
                </span>
                {entry.size > 0 && entry.type !== 'dir' && (
                  <span
                    style={{
                      marginLeft: 'auto',
                      fontSize: 11,
                      color: 'var(--muted-foreground, #666)',
                    }}
                  >
                    {entry.size > 1024
                      ? `${(entry.size / 1024).toFixed(1)} KB`
                      : `${entry.size} B`}
                  </span>
                )}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  )
}
