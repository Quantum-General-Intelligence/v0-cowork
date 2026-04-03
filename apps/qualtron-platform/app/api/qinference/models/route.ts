import { NextResponse } from 'next/server'
import { listModels, deployModel, type DeployedModel } from '@/lib/qinference'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const status = searchParams.get('status') ?? undefined
  const family = searchParams.get('family') ?? undefined

  try {
    const data = await listModels({ status, family })
    // Filter out stopped/error models — backend soft-deletes only
    const activeStatuses = new Set(['ready', 'loading', 'queued'])
    const filtered = (data.data ?? []).filter((m: DeployedModel) =>
      activeStatuses.has(m.status),
    )
    return NextResponse.json({
      ...data,
      data: filtered,
      total: filtered.length,
    })
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to list models', detail: String(error) },
      { status: 502 },
    )
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const data = await deployModel(body.variant_id, {
      name: body.name,
      replicas: body.replicas,
    })
    return NextResponse.json(data, { status: 201 })
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to deploy model', detail: String(error) },
      { status: 502 },
    )
  }
}
