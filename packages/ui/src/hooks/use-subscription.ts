'use client'

import { useEffect, useState } from 'react'
import type { TableName, TableTypeMap } from '@qgst/client'
import { useQGSTClient } from './use-qgst'

/**
 * Subscribe to a SpacetimeDB table and receive real-time updates.
 *
 * @param table - Table name from the Q-GST schema
 * @param filter - Optional partial filter on table fields
 * @returns Current rows matching the subscription
 */
export function useSubscription<T extends TableName>(
  table: T,
  filter?: Partial<TableTypeMap[T]>,
): TableTypeMap[T][] {
  const client = useQGSTClient()
  const [rows, setRows] = useState<TableTypeMap[T][]>([])

  useEffect(() => {
    const unsub = client.engine.subscribe(table, filter, (newRows) => {
      setRows(newRows)
    })
    return unsub
  }, [client, table, filter])

  return rows
}
