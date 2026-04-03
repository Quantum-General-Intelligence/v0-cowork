import { NextResponse } from 'next/server'

const BASE = process.env.CACHEDLLM_URL ?? 'http://localhost:8000'
const KEY = process.env.CACHEDLLM_API_KEY ?? ''

const headers = () => ({
  Authorization: `Bearer ${KEY}`,
  'Content-Type': 'application/json',
})

/** Get model details */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  try {
    const res = await fetch(`${BASE}/v1/qinference/models/${id}`, {
      headers: headers(),
    })
    const data = await res.json()
    return NextResponse.json(data, { status: res.status })
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 502 })
  }
}

/** Scale model */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const body = await req.json()
  try {
    const res = await fetch(`${BASE}/v1/qinference/models/${id}`, {
      method: 'PATCH',
      headers: headers(),
      body: JSON.stringify(body),
    })
    const data = await res.json()
    return NextResponse.json(data, { status: res.status })
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 502 })
  }
}

/** Undeploy/teardown model */
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  try {
    const res = await fetch(`${BASE}/v1/qinference/models/${id}`, {
      method: 'DELETE',
      headers: headers(),
    })
    const data = await res.json()
    return NextResponse.json(data, { status: res.status })
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 502 })
  }
}
