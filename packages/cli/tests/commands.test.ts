import { describe, it, expect } from 'vitest'
import { renderCommand } from '../src/commands/render.js'
import { validateCommand } from '../src/commands/validate.js'
import { lintCommand } from '../src/commands/lint.js'
import { exportCommand } from '../src/commands/export.js'

// ─── fixture sources ──────────────────────────────────────────────────────────

const VALID = `
F_DAD["Ramesh | 55 | M | G+1"]
M_MUM["Sunita | 52 | F | G+1"]
C_SON["Arjun | 28 | M | G0"]
F_DAD --- M_MUM
F_DAD --> C_SON
M_MUM --> C_SON
`.trim()

const SINGLE = `A["Alice | 30 | F | G0"]`

/** V1 violation: parent 30, child 20 → gap 10 < 15 */
const V1_VIOLATION = `
F_DAD["Dad | 30 | M | G+1"]
C_KID["Kid | 20 | M | G0"]
F_DAD --> C_KID
`.trim()

const PARSE_ERROR = `@@@invalid@@@`

const EMPTY = ``

// ─── renderCommand ────────────────────────────────────────────────────────────

describe('renderCommand', () => {
  it('returns exitCode 0 and mermaid in stdout for valid source', () => {
    const r = renderCommand(VALID)
    expect(r.exitCode).toBe(0)
    expect(r.stdout).toContain('graph TD')
    expect(r.stderr).toBe('')
  })

  it('mermaid output contains expected node IDs', () => {
    const r = renderCommand(VALID)
    expect(r.stdout).toContain('F_DAD')
    expect(r.stdout).toContain('C_SON')
  })

  it('returns exitCode 1 and stderr for parse error', () => {
    const r = renderCommand(PARSE_ERROR)
    expect(r.exitCode).toBe(1)
    expect(r.stdout).toBe('')
    expect(r.stderr.length).toBeGreaterThan(0)
  })

  it('returns exitCode 1 and error message for validation failure', () => {
    const r = renderCommand(V1_VIOLATION)
    expect(r.exitCode).toBe(1)
    expect(r.stderr).toContain('[V1]')
  })

  it('still renders with strict:false even on validation error', () => {
    const r = renderCommand(V1_VIOLATION, { strict: false })
    expect(r.exitCode).toBe(0)
    expect(r.stdout).toContain('graph TD')
  })

  it('renders empty source successfully', () => {
    const r = renderCommand(EMPTY)
    expect(r.exitCode).toBe(0)
    expect(r.stdout).toBe('graph TD\n')
  })

  it('forwards direction config to output', () => {
    const r = renderCommand(SINGLE, { direction: 'LR' })
    expect(r.stdout.startsWith('graph LR')).toBe(true)
  })

  it('disables subgraphs when showGenerationSubgraphs:false', () => {
    const r = renderCommand(SINGLE, { showGenerationSubgraphs: false })
    expect(r.stdout).not.toContain('subgraph')
  })

  it('strict mode: stderr contains "Compilation failed" when no mermaid produced', () => {
    const r = renderCommand(V1_VIOLATION, { strict: true })
    expect(r.stderr).toContain('Compilation failed')
  })

  it('non-strict mode: warnings go to stderr but mermaid is in stdout', () => {
    const r = renderCommand(V1_VIOLATION, { strict: false })
    expect(r.stdout).toContain('graph TD')
    expect(r.stderr).toContain('[V1]')
  })
})

// ─── validateCommand ──────────────────────────────────────────────────────────

describe('validateCommand', () => {
  it('exitCode 0 and stdout "valid" message for valid source', () => {
    const r = validateCommand(VALID, 'tree.fam')
    expect(r.exitCode).toBe(0)
    expect(r.stdout).toContain('valid')
    expect(r.stderr).toBe('')
  })

  it('exitCode 1 and stderr errors for validation failure', () => {
    const r = validateCommand(V1_VIOLATION, 'tree.fam')
    expect(r.exitCode).toBe(1)
    expect(r.stderr).toContain('[V1]')
    expect(r.stdout).toBe('')
  })

  it('includes the file path in output', () => {
    const r = validateCommand(VALID, 'family.fam')
    expect(r.stdout).toContain('family.fam')
  })

  it('reports PARSE errors for invalid source', () => {
    const r = validateCommand(PARSE_ERROR)
    expect(r.exitCode).toBe(1)
    expect(r.stderr).toContain('[PARSE]')
  })

  it('exitCode 0 for empty source', () => {
    const r = validateCommand(EMPTY)
    expect(r.exitCode).toBe(0)
  })

  it('summary line mentions error count', () => {
    const r = validateCommand(V1_VIOLATION)
    expect(r.stderr).toMatch(/\d+ error/)
  })
})

// ─── lintCommand ──────────────────────────────────────────────────────────────

describe('lintCommand', () => {
  it('exitCode 0 and "No issues found" for valid source', () => {
    const r = lintCommand(VALID)
    expect(r.exitCode).toBe(0)
    expect(r.stdout).toContain('No issues found')
  })

  it('exitCode 1 and lint-format lines for invalid source', () => {
    const r = lintCommand(V1_VIOLATION, 'tree.fam')
    expect(r.exitCode).toBe(1)
    expect(r.stdout).toContain('[V1]')
  })

  it('lint lines include the file path', () => {
    const r = lintCommand(V1_VIOLATION, 'my/tree.fam')
    expect(r.stdout).toContain('my/tree.fam')
  })

  it('lint lines use location prefix (file:0:0)', () => {
    const r = lintCommand(V1_VIOLATION, 'tree.fam')
    expect(r.stdout).toMatch(/tree\.fam:0:0/)
  })

  it('summary line mentions error count', () => {
    const r = lintCommand(V1_VIOLATION)
    expect(r.stdout).toMatch(/\d+ error/)
  })

  it('empty source reports no issues', () => {
    const r = lintCommand(EMPTY)
    expect(r.exitCode).toBe(0)
  })

  it('multiple validation errors each get their own lint line', () => {
    // V1 + V6 violations in one source
    const multi = `
P["Parent | 50 | M | G+1"]
C1["Child1 | 25 | M | G0"]
C2["Child2 | 22 | M | G-1"]
P --> C1
P --> C2
F_X["FatherX | 30 | M | G+1"]
C_X["ChildX | 20 | M | G0"]
F_X --> C_X
    `.trim()
    const r = lintCommand(multi, 'multi.fam')
    const lines = r.stdout.split('\n').filter((l) => l.includes('multi.fam:'))
    expect(lines.length).toBeGreaterThanOrEqual(2)
  })
})

// ─── exportCommand ────────────────────────────────────────────────────────────

describe('exportCommand', () => {
  it('json format returns exitCode 0 and JSON in stdout', () => {
    const r = exportCommand(VALID, 'json')
    expect(r.exitCode).toBe(0)
    expect(r.stderr).toBe('')
    const parsed = JSON.parse(r.stdout)
    expect(Array.isArray(parsed.nodes)).toBe(true)
    expect(Array.isArray(parsed.edges)).toBe(true)
  })

  it('json output preserves all nodes from source', () => {
    const r = exportCommand(VALID, 'json')
    const parsed = JSON.parse(r.stdout)
    const ids = parsed.nodes.map((n: { id: string }) => n.id)
    expect(ids).toContain('F_DAD')
    expect(ids).toContain('M_MUM')
    expect(ids).toContain('C_SON')
  })

  it('json output preserves all edges from source', () => {
    const r = exportCommand(VALID, 'json')
    const parsed = JSON.parse(r.stdout)
    expect(parsed.edges).toHaveLength(3)
  })

  it('svg format returns exitCode 1 (not implemented)', () => {
    const r = exportCommand(VALID, 'svg')
    expect(r.exitCode).toBe(1)
    expect(r.stderr.length).toBeGreaterThan(0)
  })

  it('png format returns exitCode 1 (not implemented)', () => {
    const r = exportCommand(VALID, 'png')
    expect(r.exitCode).toBe(1)
  })

  it('pdf format returns exitCode 1 (not implemented)', () => {
    const r = exportCommand(VALID, 'pdf')
    expect(r.exitCode).toBe(1)
  })

  it('json export fails gracefully on invalid source', () => {
    const r = exportCommand(V1_VIOLATION, 'json')
    expect(r.exitCode).toBe(1)
    expect(r.stdout).toBe('')
  })

  it('json export fails on parse error', () => {
    const r = exportCommand(PARSE_ERROR, 'json')
    expect(r.exitCode).toBe(1)
  })

  it('not-implemented message mentions format name', () => {
    const r = exportCommand(VALID, 'svg')
    expect(r.stderr.toUpperCase()).toContain('SVG')
  })
})

// ─── output helpers (chalk-stripped content checks) ──────────────────────────

describe('output formatting', () => {
  it('validation errors in render stderr include rule ID in brackets', () => {
    const r = renderCommand(V1_VIOLATION)
    // strip ANSI codes
    const plain = r.stderr.replace(/\x1B\[[0-9;]*m/g, '')
    expect(plain).toContain('[V1]')
  })

  it('lint output includes "error" keyword', () => {
    const r = lintCommand(V1_VIOLATION)
    const plain = r.stdout.replace(/\x1B\[[0-9;]*m/g, '')
    expect(plain).toContain('error')
  })

  it('validate success stdout includes ✓ or "valid"', () => {
    const r = validateCommand(VALID)
    const plain = r.stdout.replace(/\x1B\[[0-9;]*m/g, '')
    expect(plain.toLowerCase()).toMatch(/valid|✓/)
  })
})
