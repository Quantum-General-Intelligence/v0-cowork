'use client'

import { useConnectionStatus } from '../hooks/use-qgst'
import type { ConnectionStatus } from '@qgst/client'

export interface StatusBadgeProps {
  /** Override connection status (otherwise uses QGSTProvider context) */
  status?: ConnectionStatus
  /** Service label */
  label?: string
  /** Size variant */
  size?: 'sm' | 'md'
}

const STATUS_CONFIG: Record<ConnectionStatus, { color: string; text: string }> =
  {
    connected: { color: '#00FF94', text: 'Connected' },
    connecting: { color: '#FFB800', text: 'Connecting' },
    disconnected: { color: '#FF4444', text: 'Disconnected' },
  }

export function StatusBadge({
  status: statusOverride,
  label = 'Engine',
  size = 'sm',
}: StatusBadgeProps) {
  let contextStatus: ConnectionStatus = 'disconnected'
  try {
    contextStatus = useConnectionStatus()
  } catch {
    // Not in QGSTProvider — use override or default
  }

  const status = statusOverride ?? contextStatus
  const config = STATUS_CONFIG[status]
  const dotSize = size === 'sm' ? 8 : 10
  const fontSize = size === 'sm' ? 12 : 14

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: size === 'sm' ? 6 : 8,
        fontSize,
        fontFamily: 'monospace',
        color: 'var(--foreground, #fff)',
      }}
    >
      <span
        style={{
          width: dotSize,
          height: dotSize,
          borderRadius: '50%',
          backgroundColor: config.color,
          boxShadow:
            status === 'connected' ? `0 0 6px ${config.color}` : undefined,
        }}
      />
      <span style={{ opacity: 0.7 }}>{label}</span>
      <span>{config.text}</span>
    </span>
  )
}
