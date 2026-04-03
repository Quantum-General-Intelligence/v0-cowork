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

// QHP-CORE env vars for LLM-based ingest — uses GPT-5.2 via OpenRouter
function qhpEnv(): string {
  const vars: string[] = []
  const openaiKey =
    process.env.OPENAI_API_KEY ?? process.env.OPENROUTER_API_KEY ?? ''
  vars.push(`OPENAI_API_KEY="${openaiKey}"`)
  if (!process.env.OPENAI_API_KEY && process.env.OPENROUTER_API_KEY) {
    vars.push('OPENAI_BASE_URL="https://openrouter.ai/api/v1"')
  }
  // Always use GPT-5.2 for QHP extraction
  vars.push('LLM_MODEL="openai/gpt-5.2"')
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

// CoreNLP crashes on text > ~10K chars. Split on sentence boundaries and merge.
const CHUNK_LIMIT = 4000

async function symIngestRaw(source: string, isText: boolean) {
  const tmpOut = `/tmp/sym-result-${Date.now()}.json`
  const sourceArg = isText
    ? `--text "${source.replace(/"/g, '\\"').replace(/\n/g, '\\n')}"`
    : `"${source}"`
  const { stdout, stderr } = await execAsync(
    `${QHP_CLI} sym-ingest ${sourceArg} --tools-url ${SPACY_URL} --corenlp-url ${CORENLP_URL} --output "${tmpOut}"`,
    {
      maxBuffer: 10 * 1024 * 1024,
      timeout: 120000,
      shell: '/bin/bash',
      env: {
        ...process.env,
        PATH: process.env.PATH ?? '/usr/local/bin:/usr/bin:/bin',
      },
    },
  )
  let result: SymResult | null = null
  try {
    const { readFileSync } = await import('node:fs')
    const json = readFileSync(tmpOut, 'utf-8')
    result = JSON.parse(json)
    const { unlinkSync } = await import('node:fs')
    unlinkSync(tmpOut)
  } catch {}
  return { result, stdout, stderr }
}

interface SymResult {
  document_id?: string
  extraction_mode?: string
  qlang?: unknown[]
  predicates?: unknown[]
  triples?: unknown[]
  entities?: unknown[]
  sentences?: unknown[]
  cnl_results?: unknown[]
  meta?: { timing_ms?: Record<string, number>; sentence_count?: number; word_count?: number; entity_count?: number; [k: string]: unknown }
  counts?: Record<string, number>
}

function mergeSymResults(parts: SymResult[]): SymResult {
  const merged: SymResult = {
    document_id: parts[0]?.document_id,
    extraction_mode: parts[0]?.extraction_mode,
    qlang: [],
    predicates: [],
    triples: [],
    entities: [],
    sentences: [],
    cnl_results: [],
    meta: { timing_ms: {}, sentence_count: 0, word_count: 0, entity_count: 0 },
    counts: {},
  }
  let sentenceOffset = 0
  for (const p of parts) {
    // Offset sentence indices so they don't collide across chunks
    for (const q of (p.qlang ?? []) as { index: number }[]) {
      merged.qlang!.push({ ...q, index: q.index + sentenceOffset })
    }
    for (const pr of (p.predicates ?? []) as { sentence_index: number }[]) {
      merged.predicates!.push({ ...pr, sentence_index: pr.sentence_index + sentenceOffset })
    }
    for (const t of (p.triples ?? []) as { sentence_index: number }[]) {
      merged.triples!.push({ ...t, sentence_index: t.sentence_index + sentenceOffset })
    }
    for (const e of p.entities ?? []) merged.entities!.push(e)
    for (const s of (p.sentences ?? []) as { index: number }[]) {
      merged.sentences!.push({ ...s, index: s.index + sentenceOffset })
    }
    for (const c of (p.cnl_results ?? []) as { sentence_index: number }[]) {
      merged.cnl_results!.push({ ...c, sentence_index: c.sentence_index + sentenceOffset })
    }
    sentenceOffset += p.meta?.sentence_count ?? (p.sentences as unknown[] ?? []).length
    // Sum counts
    for (const [k, v] of Object.entries(p.counts ?? {})) {
      merged.counts![k] = (merged.counts![k] ?? 0) + (v as number)
    }
    merged.meta!.sentence_count! += p.meta?.sentence_count ?? 0
    merged.meta!.word_count! += p.meta?.word_count ?? 0
    merged.meta!.entity_count! += p.meta?.entity_count ?? 0
  }
  return merged
}

/** Split text into chunks at sentence boundaries (. ? ! followed by space/newline) */
function chunkText(text: string, limit: number): string[] {
  if (text.length <= limit) return [text]
  const chunks: string[] = []
  let start = 0
  while (start < text.length) {
    if (start + limit >= text.length) {
      chunks.push(text.slice(start))
      break
    }
    // Find last sentence boundary within limit
    const window = text.slice(start, start + limit)
    const lastBreak = Math.max(
      window.lastIndexOf('. '),
      window.lastIndexOf('.\n'),
      window.lastIndexOf('? '),
      window.lastIndexOf('! '),
    )
    const end = lastBreak > limit * 0.3 ? start + lastBreak + 1 : start + limit
    chunks.push(text.slice(start, end))
    start = end
  }
  return chunks
}

async function symIngest(source: string, isText: boolean) {
  // For file paths, read file size first
  if (!isText) {
    const { statSync, readFileSync } = await import('node:fs')
    const size = statSync(source).size
    if (size > CHUNK_LIMIT) {
      // Read file, chunk, and process each
      const text = readFileSync(source, 'utf-8')
      return symIngestChunked(text)
    }
    const { result, stderr } = await symIngestRaw(source, false)
    return { tool: 'qhp-sym', mode: 'symbolic', output: result ?? { raw: '' }, stderr }
  }

  if (source.length > CHUNK_LIMIT) {
    return symIngestChunked(source)
  }
  const { result, stderr } = await symIngestRaw(source, true)
  return { tool: 'qhp-sym', mode: 'symbolic', output: result ?? { raw: '' }, stderr }
}

async function symIngestChunked(text: string) {
  const chunks = chunkText(text, CHUNK_LIMIT)
  const parts: SymResult[] = []
  const stderrParts: string[] = []
  for (const chunk of chunks) {
    const { result, stderr } = await symIngestRaw(chunk, true)
    if (result) parts.push(result)
    if (stderr) stderrParts.push(stderr)
  }
  if (parts.length === 0) {
    return { tool: 'qhp-sym', mode: 'symbolic', output: { raw: '' }, stderr: stderrParts.join('\n') }
  }
  const merged = mergeSymResults(parts)
  return {
    tool: 'qhp-sym',
    mode: 'symbolic',
    output: merged,
    stderr: stderrParts.join('\n'),
    chunks: chunks.length,
    totalChars: text.length,
  }
}

// ─── PDF text extraction via opendataloader-pdf (fallback: pdfplumber) ──────

async function extractPdfText(filePath: string): Promise<string | null> {
  try {
    await execAsync(
      `python3 -c "from opendataloader_pdf import convert; convert('${filePath}')"`,
      { maxBuffer: 50 * 1024 * 1024, timeout: 60000 },
    )
    const jsonPath = filePath.replace(/\.[^.]+$/, '.json')
    const { readFileSync } = await import('node:fs')
    const json = JSON.parse(readFileSync(jsonPath, 'utf-8'))
    const text = (json.kids ?? [])
      .map((k: { content?: string }) => k.content ?? '')
      .filter(Boolean)
      .join('\n')
    if (text.length > 0) return text
  } catch {}
  // Fallback: pdfplumber
  try {
    const { stdout } = await execAsync(
      `python3 -c "import pdfplumber; pdf=pdfplumber.open('${filePath}'); print('\\n'.join(p.extract_text() or '' for p in pdf.pages))"`,
      { maxBuffer: 50 * 1024 * 1024, timeout: 30000 },
    )
    if (stdout.trim().length > 0) return stdout.trim()
  } catch {}
  return null
}

// ─── LLM-based ingestion via QHP-CORE ingest (fallback) ─────────────────────

async function ingestLLM(source: string, isText: boolean) {
  const hFlag = '' // No heuristic — full LLM extraction with GPT-5.2
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

        // Binary files (PDF, DOCX, etc.) must use LLM pipeline — sym-ingest only reads UTF-8 text
        const binaryExts = [
          '.pdf',
          '.docx',
          '.xlsx',
          '.pptx',
          '.odt',
          '.ods',
          '.odp',
          '.rtf',
        ]
        const isBinary = binaryExts.some((ext) =>
          file.name.toLowerCase().endsWith(ext),
        )

        // For binary files (PDF etc.), extract text first then sym-ingest
        if (isBinary) {
          const pdfText = await extractPdfText(tmpPath)
          if (pdfText && pdfText.length > 0) {
            // sym-ingest on extracted text — chunked to avoid CoreNLP crashes
            const result = await symIngest(pdfText, true)
            return NextResponse.json({
              ...result,
              extractor: 'opendataloader-pdf',
              totalChars: pdfText.length,
            })
          }
          // Extraction failed — fall through to LLM
          const result = await ingestLLM(tmpPath, false)
          return NextResponse.json(result)
        }

        // Text files — default to sym-ingest (chunked), fall back to LLM
        if (tool === 'sym' || tool === 'qhp') {
          const result = await symIngest(tmpPath, false)
          return NextResponse.json(result)
        }
        const result = await ingestLLM(tmpPath, false)
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

    const useSym = (options as { mode?: string })?.mode === 'sym'

    switch (method) {
      case 'github':
        result = await ingestGitHub(
          source,
          options as { branch?: string; include?: string; exclude?: string },
        )
        break

      case 'url':
        // Default: LLM mode with GPT-5.2, no heuristic
        if (useSym) {
          try {
            const urlRes = await fetch(source)
            const urlText = await urlRes.text()
            result = await symIngest(urlText.slice(0, 50000), true)
          } catch (fetchErr) {
            return NextResponse.json(
              { error: 'Failed to fetch URL', detail: String(fetchErr) },
              { status: 502 },
            )
          }
        } else {
          result = await ingestLLM(source, false)
        }
        break

      case 'text':
        // Default: LLM mode with GPT-5.2, no heuristic
        if (useSym) {
          result = await symIngest(source, true)
        } else {
          result = await ingestLLM(source, true)
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
