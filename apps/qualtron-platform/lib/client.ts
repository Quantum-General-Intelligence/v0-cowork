import { QGSTClient, type QGSTClientConfig } from '@qgst/client'

/**
 * Default client config from environment variables.
 * Used by QGSTProvider in the root layout.
 */
export function getClientConfig(): QGSTClientConfig {
  return {
    spacetimedb: {
      endpoint:
        process.env.NEXT_PUBLIC_SPACETIMEDB_ENDPOINT ?? 'ws://localhost:3000',
      module: process.env.NEXT_PUBLIC_SPACETIMEDB_MODULE ?? 'spacetime-engine',
    },
    versionedMemory: {
      endpoint: process.env.QGST_MEMORY_URL ?? 'http://localhost:3333',
      token: process.env.QGST_MEMORY_TOKEN ?? '',
      owner: process.env.QGST_MEMORY_OWNER ?? 'qgst-acme',
    },
    cachedLLM: {
      endpoint: process.env.CACHEDLLM_URL ?? 'http://localhost:8000',
      apiKey: process.env.CACHEDLLM_API_KEY ?? '',
    },
  }
}

let _client: QGSTClient | null = null

export function getClient(): QGSTClient {
  if (!_client) {
    _client = new QGSTClient(getClientConfig())
  }
  return _client
}
