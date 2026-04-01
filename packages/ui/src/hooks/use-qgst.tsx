'use client'

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import {
  QGSTClient,
  type QGSTClientConfig,
  type ConnectionStatus,
} from '@qgst/client'

// =============================================================================
// Context
// =============================================================================

interface QGSTContextValue {
  client: QGSTClient
  connectionStatus: ConnectionStatus
}

const QGSTContext = createContext<QGSTContextValue | null>(null)

// =============================================================================
// Provider
// =============================================================================

export interface QGSTProviderProps {
  config: QGSTClientConfig
  children: ReactNode
  /** Auto-connect to SpacetimeDB on mount (default: true) */
  autoConnect?: boolean
}

export function QGSTProvider({
  config,
  children,
  autoConnect = true,
}: QGSTProviderProps) {
  const clientRef = useRef<QGSTClient | null>(null)
  const [connectionStatus, setConnectionStatus] =
    useState<ConnectionStatus>('disconnected')

  if (!clientRef.current) {
    clientRef.current = new QGSTClient(config)
  }

  const client = clientRef.current

  useEffect(() => {
    const unsubConnect = client.engine.onConnect(() =>
      setConnectionStatus('connected'),
    )
    const unsubDisconnect = client.engine.onDisconnect(() =>
      setConnectionStatus('disconnected'),
    )

    if (autoConnect) {
      setConnectionStatus('connecting')
      client.connect().catch(() => setConnectionStatus('disconnected'))
    }

    return () => {
      unsubConnect()
      unsubDisconnect()
      client.disconnect()
    }
  }, [client, autoConnect])

  return (
    <QGSTContext.Provider value={{ client, connectionStatus }}>
      {children}
    </QGSTContext.Provider>
  )
}

// =============================================================================
// Hooks
// =============================================================================

export function useQGST(): QGSTContextValue {
  const ctx = useContext(QGSTContext)
  if (!ctx) {
    throw new Error('useQGST must be used within a <QGSTProvider>')
  }
  return ctx
}

export function useQGSTClient(): QGSTClient {
  return useQGST().client
}

export function useConnectionStatus(): ConnectionStatus {
  return useQGST().connectionStatus
}
