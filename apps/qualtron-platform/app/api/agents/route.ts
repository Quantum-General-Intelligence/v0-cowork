import { NextResponse } from 'next/server'

const BASE = process.env.CACHEDLLM_URL ?? 'http://localhost:8000'
const KEY = process.env.CACHEDLLM_API_KEY ?? ''

const headers = () => ({
  Authorization: `Bearer ${KEY}`,
  'Content-Type': 'application/json',
})

/** List CAG agents */
export async function GET() {
  try {
    const res = await fetch(`${BASE}/v1/agents`, { headers: headers() })
    const data = await res.json()
    return NextResponse.json(data)
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 502 })
  }
}

/** Create CAG agent */
export async function POST(req: Request) {
  try {
    const body = await req.json()
    const res = await fetch(`${BASE}/v1/agents`, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify(body),
    })
    const data = await res.json()
    return NextResponse.json(data, { status: res.status })
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 502 })
  }
}
