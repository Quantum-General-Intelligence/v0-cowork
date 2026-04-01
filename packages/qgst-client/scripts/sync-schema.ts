/**
 * sync-schema.ts — Generate TypeScript types from Q-GST Engine schema.rs
 *
 * Reads the Rust schema file, parses struct definitions, and writes
 * TypeScript interfaces. Run with: pnpm --filter @qgst/client sync-schema
 *
 * This is a basic regex-based parser. For Phase 1 we maintain types by hand
 * in src/types.ts; this script will be enhanced to fully automate the process.
 */

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { resolve, dirname } from 'node:path'

const SCHEMA_PATH = resolve(
  import.meta.dirname ?? __dirname,
  '../../../../Q-GST-Engine/src/schema.rs',
)
const OUTPUT_PATH = resolve(
  import.meta.dirname ?? __dirname,
  '../src/generated/schema.ts',
)

// Rust → TypeScript type mapping
const TYPE_MAP: Record<string, string> = {
  Identity: 'string',
  Timestamp: 'number',
  String: 'string',
  bool: 'boolean',
  u8: 'number',
  u16: 'number',
  u32: 'number',
  u64: 'number',
  i8: 'number',
  i16: 'number',
  i32: 'number',
  i64: 'number',
  f32: 'number',
  f64: 'number',
}

function rustTypeToTS(rustType: string): string {
  // Handle Option<T>
  const optionMatch = rustType.match(/^Option<(.+)>$/)
  if (optionMatch) {
    return `${rustTypeToTS(optionMatch[1])} | null`
  }

  // Handle Vec<T>
  const vecMatch = rustType.match(/^Vec<(.+)>$/)
  if (vecMatch) {
    return `${rustTypeToTS(vecMatch[1])}[]`
  }

  return TYPE_MAP[rustType] ?? rustType
}

interface StructField {
  name: string
  type: string
  comment?: string
}

interface ParsedStruct {
  name: string
  fields: StructField[]
  isTable: boolean
  accessor?: string
}

function parseSchema(source: string): ParsedStruct[] {
  const structs: ParsedStruct[] = []

  // Match struct blocks (tables and SpacetimeType)
  const structRegex =
    /((?:#\[.*?\]\s*)*)\s*pub\s+struct\s+(\w+)\s*\{([^}]*)\}/gs

  let match: RegExpExecArray | null
  while ((match = structRegex.exec(source)) !== null) {
    const [, attrs, name, body] = match
    const isTable = attrs.includes('spacetimedb::table')
    const accessorMatch = attrs.match(/accessor\s*=\s*(\w+)/)
    const accessor = accessorMatch ? accessorMatch[1] : undefined

    const fields: StructField[] = []
    const fieldRegex =
      /(?:\/\/\/\s*(.*?)\n\s*)?(?:#\[.*?\]\s*)*pub\s+(\w+)\s*:\s*([^,\n]+)/g

    let fieldMatch: RegExpExecArray | null
    while ((fieldMatch = fieldRegex.exec(body)) !== null) {
      fields.push({
        name: fieldMatch[2],
        type: rustTypeToTS(fieldMatch[3].trim()),
        comment: fieldMatch[1]?.trim(),
      })
    }

    structs.push({ name, fields, isTable, accessor })
  }

  return structs
}

function generateTypeScript(structs: ParsedStruct[]): string {
  const lines: string[] = [
    '/**',
    ' * AUTO-GENERATED from Q-GST-Engine/src/schema.rs',
    ` * Generated at: ${new Date().toISOString()}`,
    ' * Do not edit manually — run `pnpm --filter @qgst/client sync-schema`',
    ' */',
    '',
  ]

  for (const struct of structs) {
    lines.push(`export interface ${struct.name} {`)
    for (const field of struct.fields) {
      if (field.comment) {
        lines.push(`  /** ${field.comment} */`)
      }
      lines.push(`  ${field.name}: ${field.type}`)
    }
    lines.push('}')
    lines.push('')
  }

  // Generate table name union
  const tables = structs.filter((s) => s.isTable && s.accessor)
  lines.push(`export type TableName =`)
  for (let i = 0; i < tables.length; i++) {
    const sep = i === 0 ? '  |' : '  |'
    lines.push(`${sep} '${tables[i].accessor}'`)
  }
  lines.push('')

  return lines.join('\n')
}

function main() {
  let source: string
  try {
    source = readFileSync(SCHEMA_PATH, 'utf-8')
  } catch {
    console.error(
      `Could not read schema at ${SCHEMA_PATH}. Ensure Q-GST-Engine is at /workspace/Q-GST-Engine/`,
    )
    process.exit(1)
  }

  const structs = parseSchema(source)
  console.log(
    `Parsed ${structs.length} types (${structs.filter((s) => s.isTable).length} tables)`,
  )

  const output = generateTypeScript(structs)

  mkdirSync(dirname(OUTPUT_PATH), { recursive: true })
  writeFileSync(OUTPUT_PATH, output, 'utf-8')
  console.log(`Written to ${OUTPUT_PATH}`)
}

main()
