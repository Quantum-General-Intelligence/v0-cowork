import { NextResponse } from 'next/server'
import { exec } from 'node:child_process'
import { promisify } from 'node:util'
import { writeFile, mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const execAsync = promisify(exec)

/**
 * Unified ingestion API — wraps three CLI tools:
 *
 * 1. gitingest   — GitHub repos / URLs → text digest
 * 2. cgc         — Code → knowledge graph (functions, classes, imports)
 * 3. q-rules     — Documents → QHM (classification, rules, QLang)
 *
 * POST /api/ingest
 * Body: { method: "file" | "url" | "github", source: string, options?: {...} }
 * For file uploads, use multipart/form-data with "file" field + "tool" field
 */

const QHP_CLI = 'tsx /workspace/QHP-CORE/packages/cli/index.ts'
const GITHUB_TOKEN = process.env.GITHUB_TOKEN ?? ''

// QHP-CORE requires these env vars even for extraction-only mode
function qhpEnv(): string {
  const vars: string[] = []
  // Route OpenAI calls through OpenRouter using the OpenRouter API key
  const openaiKey = process.env.OPENAI_API_KEY ?? process.env.OPENROUTER_API_KEY ?? ''
  vars.push(`OPENAI_API_KEY="${openaiKey}"`)
  // If no native OpenAI key, use OpenRouter as the base URL
  if (!process.env.OPENAI_API_KEY && process.env.OPENROUTER_API_KEY) {
    vars.push('OPENAI_BASE_URL="https://openrouter.ai/api/v1"')
    vars.push('LLM_MODEL="openai/gpt-4o"')
  }
  // QHP needs Supabase vars to load (even if extraction-only)
  vars.push(`SUPABASE_URL="${process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://placeholder.supabase.co'}"`)
  vars.push(`SUPABASE_SERVICE_ROLE_KEY="${process.env.SUPABASE_SERVICE_ROLE_KEY ?? 'placeholder'}"`)
  return vars.join(' ')
}

// ─── GitHub / URL ingestion via gitingest ────────────────────────────────────

async function ingestGitHub(repoUrl: string, options?: { branch?: string; include?: string; exclude?: string }) {
  const args = [repoUrl, '-o', '-']
  if (options?.branch) args.push('-b', options.branch)
  if (options?.include) args.push('-i', options.include)
  if (options?.exclude) args.push('-e', options.exclude)
  if (GITHUB_TOKEN) args.push('-t', GITHUB_TOKEN)

  const { stdout, stderr } = await execAsync(
    `gitingest ${args.join(' ')}`,
    { maxBuffer: 50 * 1024 * 1024, timeout: 120000 },
  )
  return { tool: 'gitingest', output: stdout, stderr, tokenEstimate: estimateTokens(stdout) }
}

// ─── URL ingestion via QHP-CORE ──────────────────────────────────────────────

async function ingestURL(url: string, options?: { heuristic?: boolean }) {
  const hFlag = options?.heuristic ? '--heuristic' : ''
  const { stdout, stderr } = await execAsync(
    `${qhpEnv()} ${QHP_CLI} ingest "${url}" --json ${hFlag}`,
    { maxBuffer: 10 * 1024 * 1024, timeout: 180000, shell: '/bin/bash' },
  )
  return { tool: 'qhp-core', output: parseJSON(stdout), stderr }
}

// ─── File ingestion via QHP-CORE ─────────────────────────────────────────────

async function ingestFile(filePath: string, options?: { heuristic?: boolean }) {
  const hFlag = options?.heuristic ? '--heuristic' : ''
  const { stdout, stderr } = await execAsync(
    `${qhpEnv()} ${QHP_CLI} ingest "${filePath}" --json ${hFlag}`,
    { maxBuffer: 10 * 1024 * 1024, timeout: 180000, shell: '/bin/bash' },
  )
  return { tool: 'qhp-core', output: parseJSON(stdout), stderr }
}

// ─── Code indexing via CodeGraphContext ───────────────────────────────────────

async function indexCode(dirPath: string) {
  const { stdout, stderr } = await execAsync(
    `cgc index "${dirPath}" 2>&1`,
    { maxBuffer: 10 * 1024 * 1024, timeout: 300000 },
  )
  return { tool: 'codegraphcontext', output: stdout, stderr }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4)
}

function parseJSON(stdout: string): unknown {
  // q-rules outputs JSON but may have non-JSON preamble
  const jsonStart = stdout.indexOf('{')
  if (jsonStart >= 0) {
    try {
      return JSON.parse(stdout.slice(jsonStart))
    } catch {
      return { raw: stdout }
    }
  }
  return { raw: stdout }
}

// ─── Route Handler ───────────────────────────────────────────────────────────

export async function POST(req: Request) {
  const contentType = req.headers.get('content-type') ?? ''

  // Handle multipart file upload
  if (contentType.includes('multipart/form-data')) {
    try {
      const formData = await req.formData()
      const file = formData.get('file') as File | null
      const tool = (formData.get('tool') as string) ?? 'qhp'
      const heuristic = formData.get('heuristic') === 'true'

      if (!file) {
        return NextResponse.json({ error: 'No file provided' }, { status: 400 })
      }

      // Write to temp file
      const tmpDir = await mkdtemp(join(tmpdir(), 'qingest-'))
      const tmpPath = join(tmpDir, file.name)
      const buffer = Buffer.from(await file.arrayBuffer())
      await writeFile(tmpPath, buffer)

      try {
        if (tool === 'cgc') {
          const result = await indexCode(tmpDir)
          return NextResponse.json(result)
        }
        const result = await ingestFile(tmpPath, { heuristic })
        return NextResponse.json(result)
      } finally {
        await rm(tmpDir, { recursive: true, force: true }).catch(() => {})
      }
    } catch (error) {
      return NextResponse.json(
        { error: 'Ingestion failed', detail: error instanceof Error ? error.message : String(error) },
        { status: 500 },
      )
    }
  }

  // Handle JSON body
  try {
    const body = await req.json()
    const { method, source, options } = body as {
      method: 'github' | 'url' | 'file' | 'text' | 'code-index'
      source: string
      options?: Record<string, unknown>
    }

    if (!method || !source) {
      return NextResponse.json(
        { error: 'method and source are required' },
        { status: 400 },
      )
    }

    let result: unknown

    switch (method) {
      case 'github':
        result = await ingestGitHub(source, options as { branch?: string; include?: string; exclude?: string })
        break

      case 'url':
        result = await ingestURL(source, options as { heuristic?: boolean })
        break

      case 'text': {
        const hFlag = (options as { heuristic?: boolean })?.heuristic ? '--heuristic' : ''
        const { stdout, stderr } = await execAsync(
          `${qhpEnv()} ${QHP_CLI} ingest --text "${source.replace(/"/g, '\\"')}" --json ${hFlag}`,
          { maxBuffer: 10 * 1024 * 1024, timeout: 180000, shell: '/bin/bash' },
        )
        result = { tool: 'qhp-core', output: parseJSON(stdout), stderr }
        break
      }

      case 'code-index':
        result = await indexCode(source)
        break

      default:
        return NextResponse.json({ error: `Unknown method: ${method}` }, { status: 400 })
    }

    return NextResponse.json(result)
  } catch (error) {
    return NextResponse.json(
      { error: 'Ingestion failed', detail: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    )
  }
}
