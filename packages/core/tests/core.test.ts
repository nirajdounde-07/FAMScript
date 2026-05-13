import { describe, it, expect } from 'vitest'
import type { FamScriptAST } from '@famscript/parser'
import type { ValidationError } from '@famscript/validator'
import { compile, createFamScript } from '../src/compiler.js'

// ─── fixture source strings ───────────────────────────────────────────────────

/** Minimal valid single-node source */
const SINGLE_NODE = `A["Alice | 30 | F | G0"]`

/** Valid two-generation family */
const TWO_GEN = `
F_DAD["Ramesh | 55 | M | G+1"]
M_MUM["Sunita | 52 | F | G+1"]
C_SON["Arjun | 28 | M | G0"]
F_DAD --- M_MUM
F_DAD --> C_SON
M_MUM --> C_SON
`.trim()

/** Violates V1 (age gap < 15): parent age 30, child age 20 → gap = 10 */
const V1_VIOLATION = `
F_DAD["Dad | 30 | M | G+1"]
C_KID["Kid | 20 | M | G0"]
F_DAD --> C_KID
`.trim()

/** Violates V6 (sibling parity): one sibling at G0, another at G-1 */
const V6_VIOLATION = `
P["Parent | 50 | M | G+1"]
C1["Child1 | 25 | M | G0"]
C2["Child2 | 22 | M | G-1"]
P --> C1
P --> C2
`.trim()

/** Source with a lexer-level parse error (@ is not a valid token) */
const PARSE_ERROR_SOURCE = `@invalid`

/** Source with deceased ancestor */
const WITH_DECEASED = `
GGF["Ram Das | 104 | M | G+3 | deceased"]
C["Ravi | 30 | M | G0"]
`.trim()

// ─── compile() – happy path ───────────────────────────────────────────────────

describe('compile() – valid source', () => {
  it('returns success:true for a minimal valid source', () => {
    const r = compile(SINGLE_NODE)
    expect(r.success).toBe(true)
  })

  it('returns non-empty mermaid string', () => {
    const r = compile(SINGLE_NODE)
    expect(r.mermaid.length).toBeGreaterThan(0)
    expect(r.mermaid).toContain('graph TD')
  })

  it('mermaid output contains the node ID', () => {
    const r = compile(SINGLE_NODE)
    expect(r.mermaid).toContain('A[')
  })

  it('mermaid output ends with a newline', () => {
    const r = compile(SINGLE_NODE)
    expect(r.mermaid.endsWith('\n')).toBe(true)
  })

  it('validation.valid is true', () => {
    const r = compile(SINGLE_NODE)
    expect(r.validation.valid).toBe(true)
    expect(r.validation.errors).toHaveLength(0)
  })

  it('ast is populated', () => {
    const r = compile(SINGLE_NODE)
    expect(r.ast).not.toBeNull()
    expect(r.ast!.nodes).toHaveLength(1)
    expect(r.ast!.nodes[0]!.id).toBe('A')
  })

  it('layout is populated', () => {
    const r = compile(SINGLE_NODE)
    expect(r.layout).not.toBeNull()
    expect(r.layout!.nodes).toHaveLength(1)
    expect(r.layout!.width).toBeGreaterThan(0)
  })

  it('processes a two-generation family', () => {
    const r = compile(TWO_GEN)
    expect(r.success).toBe(true)
    expect(r.ast!.nodes).toHaveLength(3)
    expect(r.ast!.edges).toHaveLength(3)
    expect(r.mermaid).toContain('F_DAD')
    expect(r.mermaid).toContain('C_SON')
  })

  it('edges appear in mermaid output', () => {
    const r = compile(TWO_GEN)
    expect(r.mermaid).toContain('-->')
  })

  it('emits generation subgraphs for multi-generation input', () => {
    const r = compile(TWO_GEN)
    expect(r.mermaid).toContain('subgraph')
  })

  it('applies deceased classDef for deceased nodes', () => {
    const r = compile(WITH_DECEASED)
    expect(r.success).toBe(true)
    expect(r.mermaid).toContain('classDef deceased')
    expect(r.mermaid).toContain('class GGF deceased')
  })
})

// ─── compile() – parse errors ─────────────────────────────────────────────────

describe('compile() – parse errors', () => {
  it('returns success:false', () => {
    const r = compile(PARSE_ERROR_SOURCE)
    expect(r.success).toBe(false)
  })

  it('mermaid is empty', () => {
    const r = compile(PARSE_ERROR_SOURCE)
    expect(r.mermaid).toBe('')
  })

  it('validation.valid is false', () => {
    const r = compile(PARSE_ERROR_SOURCE)
    expect(r.validation.valid).toBe(false)
  })

  it('emits a PARSE rule error', () => {
    const r = compile(PARSE_ERROR_SOURCE)
    const parseErrors = r.validation.errors.filter((e) => e.rule === 'PARSE')
    expect(parseErrors.length).toBeGreaterThan(0)
  })

  it('ast is null', () => {
    const r = compile(PARSE_ERROR_SOURCE)
    expect(r.ast).toBeNull()
  })

  it('layout is null', () => {
    const r = compile(PARSE_ERROR_SOURCE)
    expect(r.layout).toBeNull()
  })
})

// ─── compile() – validation errors ───────────────────────────────────────────

describe('compile() – validation errors (strict mode)', () => {
  it('returns success:false for V1 violation', () => {
    const r = compile(V1_VIOLATION)
    expect(r.success).toBe(false)
  })

  it('mermaid is empty in strict mode', () => {
    const r = compile(V1_VIOLATION)
    expect(r.mermaid).toBe('')
  })

  it('validation errors name the correct rule', () => {
    const r = compile(V1_VIOLATION)
    const v1Errors = r.validation.errors.filter((e) => e.rule === 'V1')
    expect(v1Errors.length).toBeGreaterThan(0)
  })

  it('ast is still populated even when validation fails', () => {
    const r = compile(V1_VIOLATION)
    expect(r.ast).not.toBeNull()
    expect(r.ast!.nodes).toHaveLength(2)
  })

  it('layout is null in strict mode', () => {
    const r = compile(V1_VIOLATION)
    expect(r.layout).toBeNull()
  })
})

describe('compile() – validation errors (non-strict mode)', () => {
  it('still produces mermaid output when strict:false', () => {
    const r = compile(V1_VIOLATION, { strict: false })
    expect(r.mermaid.length).toBeGreaterThan(0)
    expect(r.mermaid).toContain('graph TD')
  })

  it('success is false (errors still present)', () => {
    const r = compile(V1_VIOLATION, { strict: false })
    expect(r.success).toBe(false)
  })

  it('layout is populated when strict:false', () => {
    const r = compile(V1_VIOLATION, { strict: false })
    expect(r.layout).not.toBeNull()
  })

  it('validation errors are still reported', () => {
    const r = compile(V1_VIOLATION, { strict: false })
    expect(r.validation.valid).toBe(false)
    expect(r.validation.errors.length).toBeGreaterThan(0)
  })
})

// ─── compile() – empty source ─────────────────────────────────────────────────

describe('compile() – empty source', () => {
  it('succeeds on empty string', () => {
    const r = compile('')
    expect(r.success).toBe(true)
  })

  it('produces a bare graph directive', () => {
    const r = compile('')
    expect(r.mermaid).toBe('graph TD\n')
  })

  it('ast has zero nodes and edges', () => {
    const r = compile('')
    expect(r.ast!.nodes).toHaveLength(0)
    expect(r.ast!.edges).toHaveLength(0)
  })
})

// ─── compile() – config forwarding ───────────────────────────────────────────

describe('compile() – config forwarding', () => {
  it('forwards render direction to mermaid output', () => {
    const r = compile(SINGLE_NODE, { render: { direction: 'LR' } })
    expect(r.mermaid.startsWith('graph LR')).toBe(true)
  })

  it('forwards render labelFormat to node label', () => {
    const r = compile(SINGLE_NODE, { render: { labelFormat: 'name-only', showGenerationSubgraphs: false } })
    // name-only: just the name, no generation token
    const nodeLine = r.mermaid.split('\n').find((l) => l.includes('A['))!
    expect(nodeLine).toContain('Alice')
    expect(nodeLine).not.toContain('G0')
  })

  it('forwards layout nodeWidth to layout result dimensions', () => {
    const narrow = compile(SINGLE_NODE, { layout: { nodeWidth: 50 } })
    const wide   = compile(SINGLE_NODE, { layout: { nodeWidth: 300 } })
    expect(wide.layout!.width).toBeGreaterThan(narrow.layout!.width)
  })
})

// ─── createFamScript() ────────────────────────────────────────────────────────

describe('createFamScript()', () => {
  it('returns an object with a compile method', () => {
    const fs = createFamScript()
    expect(typeof fs.compile).toBe('function')
  })

  it('compiles valid source', () => {
    const fs = createFamScript()
    const r = fs.compile(SINGLE_NODE)
    expect(r.success).toBe(true)
    expect(r.mermaid).toContain('graph TD')
  })

  it('reuses config across multiple compile calls', () => {
    const fs = createFamScript({ render: { direction: 'BT' } })
    expect(fs.compile(SINGLE_NODE).mermaid.startsWith('graph BT')).toBe(true)
    expect(fs.compile(TWO_GEN).mermaid.startsWith('graph BT')).toBe(true)
  })

  it('instances are independent', () => {
    const fsA = createFamScript({ render: { direction: 'LR' } })
    const fsB = createFamScript({ render: { direction: 'RL' } })
    expect(fsA.compile(SINGLE_NODE).mermaid.startsWith('graph LR')).toBe(true)
    expect(fsB.compile(SINGLE_NODE).mermaid.startsWith('graph RL')).toBe(true)
  })
})

// ─── plugin system ────────────────────────────────────────────────────────────

describe('plugins', () => {
  it('plugin rules run and can block compilation', () => {
    const blockAllPlugin = {
      name: 'block-all',
      rules: [{
        name: 'CUSTOM_BLOCK',
        validate: (_ast: FamScriptAST): ValidationError[] => [
          { rule: 'CUSTOM', message: 'Blocked by custom rule' },
        ],
      }],
    }
    const r = compile(SINGLE_NODE, { plugins: [blockAllPlugin] })
    expect(r.success).toBe(false)
    const customErrors = r.validation.errors.filter((e) => e.rule === 'CUSTOM')
    expect(customErrors).toHaveLength(1)
    expect(customErrors[0]!.message).toBe('Blocked by custom rule')
  })

  it('plugin rules that pass do not block compilation', () => {
    const passPlugin = {
      name: 'pass-all',
      rules: [{
        name: 'PASS',
        validate: (_ast: FamScriptAST): ValidationError[] => [],
      }],
    }
    const r = compile(SINGLE_NODE, { plugins: [passPlugin] })
    expect(r.success).toBe(true)
  })

  it('multiple plugins combine their errors', () => {
    const pluginA = {
      name: 'A',
      rules: [{ name: 'A', validate: (): ValidationError[] => [{ rule: 'PA', message: 'err A' }] }],
    }
    const pluginB = {
      name: 'B',
      rules: [{ name: 'B', validate: (): ValidationError[] => [{ rule: 'PB', message: 'err B' }] }],
    }
    const r = compile(SINGLE_NODE, { plugins: [pluginA, pluginB] })
    const rules = new Set(r.validation.errors.map((e) => e.rule))
    expect(rules.has('PA')).toBe(true)
    expect(rules.has('PB')).toBe(true)
  })

  it('plugin with no rules field does not crash', () => {
    const emptyPlugin = { name: 'empty' }
    expect(() => compile(SINGLE_NODE, { plugins: [emptyPlugin] })).not.toThrow()
  })

  it('createFamScript respects plugins across all compile calls', () => {
    let callCount = 0
    const countingPlugin = {
      name: 'counter',
      rules: [{
        name: 'COUNT',
        validate: (_ast: FamScriptAST): ValidationError[] => {
          callCount++
          return []
        },
      }],
    }
    const fs = createFamScript({ plugins: [countingPlugin] })
    fs.compile(SINGLE_NODE)
    fs.compile(SINGLE_NODE)
    expect(callCount).toBe(2)
  })
})

// ─── result shape invariants ──────────────────────────────────────────────────

describe('result shape invariants', () => {
  it('success:true always has non-empty mermaid', () => {
    const r = compile(SINGLE_NODE)
    if (r.success) expect(r.mermaid.length).toBeGreaterThan(0)
  })

  it('success:false from parse error always has null ast', () => {
    const r = compile(PARSE_ERROR_SOURCE)
    expect(r.ast).toBeNull()
    expect(r.layout).toBeNull()
  })

  it('success:false from validation always has non-null ast', () => {
    const r = compile(V1_VIOLATION)  // strict mode default
    expect(r.ast).not.toBeNull()
  })

  it('validation is always present regardless of outcome', () => {
    for (const src of [SINGLE_NODE, PARSE_ERROR_SOURCE, V1_VIOLATION]) {
      const r = compile(src)
      expect(r.validation).toBeDefined()
      expect(Array.isArray(r.validation.errors)).toBe(true)
    }
  })
})
