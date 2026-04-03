import { NextResponse } from 'next/server'

const BASE = process.env.CACHEDLLM_URL ?? 'http://localhost:8000'
const KEY = process.env.CACHEDLLM_API_KEY ?? ''

/** Upload files to CAG agent for QHM ingestion */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params

  try {
    const contentType = req.headers.get('content-type') ?? ''

    if (contentType.includes('multipart/form-data')) {
      // Forward multipart upload to Q-Inference
      const formData = await req.formData()
      const res = await fetch(`${BASE}/v1/agents/${id}/ingest`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${KEY}` },
        body: formData,
      })
      const data = await res.json()
      return NextResponse.json(data, { status: res.status })
    }

    // JSON body — URL ingest. Backend requires agent_id in body.
    const body = await req.json()
    const res = await fetch(`${BASE}/v1/agents/${id}/ingest/url`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ ...body, agent_id: id }),
    })
    const data = await res.json()
    return NextResponse.json(data, { status: res.status })
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 502 })
  }
}

/** Check ingest job status */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const { searchParams } = new URL(req.url)
  const jobId = searchParams.get('job_id')

  if (!jobId) {
    return NextResponse.json({ error: 'job_id required' }, { status: 400 })
  }

  try {
    const res = await fetch(`${BASE}/v1/ingest/${jobId}`, {
      headers: { Authorization: `Bearer ${KEY}` },
    })
    const data = await res.json()
    return NextResponse.json(data)
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 502 })
  }
}
