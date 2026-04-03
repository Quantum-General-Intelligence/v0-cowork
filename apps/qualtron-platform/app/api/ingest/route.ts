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

const QHP_CLI = '/usr/local/bin/tsx /workspace/QHP-CORE/packages/cli/index.ts'
const GITHUB_TOKEN = process.env.GITHUB_TOKEN ?? ''
const SPACY_URL = 'http://localhost:8100'
const CORENLP_URL = 'http://localhost:9000'

// QHP-CORE env vars for LLM-based ingest (fallback)
function qhpEnv(): string {
  const vars: string[] = []
  const openaiKey =
    process.env.OPENAI_API_KEY ?? process.env.OPENROUTER_API_KEY ?? ''
  vars.push(`OPENAI_API_KEY="${openaiKey}"`)
  if (!process.env.OPENAI_API_KEY && process.env.OPENROUTER_API_KEY) {
    vars.push('OPENAI_BASE_URL="https://openrouter.ai/api/v1"')
    vars.push('LLM_MODEL="openai/gpt-4o"')
  }
  vars.push(
    `SUPABASE_URL="${process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://placeholder.supabase.co'}"`,
  )
  vars.push(
    `SUPABASE_SERVICE_ROLE_KEY="${process.env.SUPABASE_SERVICE_ROLE_KEY ?? 'placeholder'}"`,
  )
  return vars.join(' ')
}

// ─── GitHub / URL ingestion via gitingest ────────────────────────────────────

async function ingestGitHub(
  repoUrl: string,
  options?: { branch?: string; include?: string; exclude?: string },
) {
  const args = [repoUrl, '-o', '-']
  if (options?.branch) args.push('-b', options.branch)
  if (options?.include) args.push('-i', options.include)
  if (options?.exclude) args.push('-e', options.exclude)
  if (GITHUB_TOKEN) args.push('-t', GITHUB_TOKEN)

  const { stdout, stderr } = await execAsync(`gitingest ${args.join(' ')}`, {
    maxBuffer: 50 * 1024 * 1024,
    timeout: 120000,
  })
  return {
    tool: 'gitingest',
    output: stdout,
    stderr,
    tokenEstimate: estimateTokens(stdout),
  }
}

// ─── Symbolic ingestion via QHP-CORE sym-ingest (deterministic, no LLM) ─────

async function symIngest(source: string, isText: boolean) {
  const tmpOut = `/tmp/sym-result-${Date.now()}.json`
  const sourceArg = isText
    ? `--text "${source.replace(/"/g, '\\"')}"`
    : `"${source}"`
  const { stdout, stderr } = await execAsync(
    `${QHP_CLI} sym-ingest ${sourceArg} --tools-url ${SPACY_URL} --corenlp-url ${CORENLP_URL} --output "${tmpOut}"`,
    { maxBuffer: 10 * 1024 * 1024, timeout: 120000, shell: '/bin/bash', env: { ...process.env, PATH: process.env.PATH ?? '/usr/local/bin:/usr/bin:/bin' } },
  )
  // Read the JSON result file
  let result: unknown = { raw: stdout }
  try {
    const { readFileSync } = await import('node:fs')
    const json = readFileSync(tmpOut, 'utf-8')
    result = JSON.parse(json)
    // Clean up
    const { unlinkSync } = await import('node:fs')
    unlinkSync(tmpOut)
  } catch {}
  return { tool: 'qhp-sym', mode: 'symbolic', output: result, stderr }
}

// ─── LLM-based ingestion via QHP-CORE ingest (fallback) ─────────────────────

async function ingestLLM(
  source: string,
  isText: boolean,
  options?: { heuristic?: boolean },
) {
  const hFlag = options?.heuristic ? '--heuristic' : ''
  const sourceArg = isText
    ? `--text "${source.replace(/"/g, '\\"')}"`
    : `"${source}"`
  const { stdout, stderr } = await execAsync(
    `${qhpEnv()} ${QHP_CLI} ingest ${sourceArg} --json ${hFlag}`,
    { maxBuffer: 10 * 1024 * 1024, timeout: 180000, shell: '/bin/bash' },
  )
  return { tool: 'qhp-core', mode: 'llm', output: parseJSON(stdout), stderr }
}

// ─── Code indexing via CodeGraphContext ───────────────────────────────────────

async function indexCode(dirPath: string) {
  const { stdout, stderr } = await execAsync(`cgc index "${dirPath}" 2>&1`, {
    maxBuffer: 10 * 1024 * 1024,
    timeout: 300000,
  })
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
        if (tool === 'llm') {
          const result = await ingestLLM(tmpPath, false, { heuristic })
          return NextResponse.json(result)
        }
        // Default: symbolic (deterministic, no LLM)
        const result = await symIngest(tmpPath, false)
        return NextResponse.json(result)
      } finally {
        await rm(tmpDir, { recursive: true, force: true }).catch(() => {})
      }
    } catch (error) {
      return NextResponse.json(
        {
          error: 'Ingestion failed',
          detail: error instanceof Error ? error.message : String(error),
        },
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

    const useLLM = (options as { mode?: string })?.mode === 'llm'

    switch (method) {
      case 'github':
        result = await ingestGitHub(
          source,
          options as { branch?: string; include?: string; exclude?: string },
        )
        break

      case 'url':
        // URLs: use sym-ingest by default, LLM if requested
        if (useLLM) {
          result = await ingestLLM(source, false)
        } else {
          result = await symIngest(source, false)
        }
        break

      case 'text':
        // Text: use sym-ingest by default (deterministic), LLM if requested
        if (useLLM) {
          result = await ingestLLM(source, true, {
            heuristic: (options as { heuristic?: boolean })?.heuristic,
          })
        } else {
          result = await symIngest(source, true)
        }
        break

      case 'code-index':
        result = await indexCode(source)
        break

      default:
        return NextResponse.json(
          { error: `Unknown method: ${method}` },
          { status: 400 },
        )
    }

    return NextResponse.json(result)
  } catch (error) {
    return NextResponse.json(
      {
        error: 'Ingestion failed',
        detail: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    )
  }
}
