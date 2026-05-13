import { describe, it, expect } from 'vitest'
import type { FamScriptAST, PersonNode, RelationEdge } from '@famscript/parser'
import { validate } from '../src/validator.js'

// ─── helpers ────────────────────────────────────────────────────────────────

function person(
  id: string,
  generation: number,
  opts: Partial<Pick<PersonNode, 'age' | 'gender' | 'status'>> = {},
): PersonNode {
  return {
    id,
    name: id,
    gender: opts.gender ?? 'M',
    generation,
    age: opts.age,
    status: opts.status,
    metadata: {},
  }
}

function edge(from: string, to: string, type: string): RelationEdge {
  return { from, to, type, certainty: 'confirmed' }
}

function ast(nodes: PersonNode[], edges: RelationEdge[]): FamScriptAST {
  return { nodes, edges }
}

function errorsFor(rule: string, result: ReturnType<typeof validate>) {
  return result.errors.filter((e) => e.rule === rule)
}

// ─── V1: age gap ─────────────────────────────────────────────────────────────

describe('V1 – age gap', () => {
  it('passes when parent is exactly 15 years older', () => {
    const a = ast(
      [person('P', 1, { age: 45 }), person('C', 0, { age: 30 })],
      [edge('P', 'C', 'parent_child')],
    )
    expect(errorsFor('V1', validate(a))).toHaveLength(0)
  })

  it('passes when parent is more than 15 years older', () => {
    const a = ast(
      [person('P', 1, { age: 60 }), person('C', 0, { age: 30 })],
      [edge('P', 'C', 'parent_child')],
    )
    expect(errorsFor('V1', validate(a))).toHaveLength(0)
  })

  it('errors when gap is less than 15', () => {
    const a = ast(
      [person('P', 1, { age: 40 }), person('C', 0, { age: 30 })],
      [edge('P', 'C', 'parent_child')],
    )
    const errs = errorsFor('V1', validate(a))
    expect(errs).toHaveLength(1)
    expect(errs[0]?.nodeId).toBe('P')
    expect(errs[0]?.message).toContain('P')
    expect(errs[0]?.message).toContain('C')
  })

  it('skips when either age is absent', () => {
    const a = ast(
      [person('P', 1), person('C', 0, { age: 30 })],
      [edge('P', 'C', 'parent_child')],
    )
    expect(errorsFor('V1', validate(a))).toHaveLength(0)
  })

  it('ignores non-parent_child edges', () => {
    const a = ast(
      [person('A', 0, { age: 30 }), person('B', 0, { age: 28 })],
      [edge('A', 'B', 'married')],
    )
    expect(errorsFor('V1', validate(a))).toHaveLength(0)
  })
})

// ─── V2: spouse parity ───────────────────────────────────────────────────────

describe('V2 – spouse parity', () => {
  it('passes when spouses share the same generation', () => {
    const a = ast(
      [person('H', 0), person('W', 0, { gender: 'F' })],
      [edge('H', 'W', 'married')],
    )
    expect(errorsFor('V2', validate(a))).toHaveLength(0)
  })

  it('errors when spouses are on different generations (married)', () => {
    const a = ast(
      [person('H', 0), person('W', 1, { gender: 'F' })],
      [edge('H', 'W', 'married')],
    )
    const errs = errorsFor('V2', validate(a))
    expect(errs).toHaveLength(1)
    expect(errs[0]?.message).toContain('H')
    expect(errs[0]?.message).toContain('W')
  })

  it('errors when core_couple partners are on different generations', () => {
    const a = ast(
      [person('A', 1), person('B', 2)],
      [edge('A', 'B', 'core_couple')],
    )
    expect(errorsFor('V2', validate(a))).toHaveLength(1)
  })

  it('passes for core_couple on same generation', () => {
    const a = ast(
      [person('A', 1), person('B', 1)],
      [edge('A', 'B', 'core_couple')],
    )
    expect(errorsFor('V2', validate(a))).toHaveLength(0)
  })
})

// ─── V3: gender role ─────────────────────────────────────────────────────────

describe('V3 – gender role', () => {
  it('passes when GF_ prefix matches male gender', () => {
    const a = ast([person('GF_John', 1, { gender: 'M' })], [])
    expect(errorsFor('V3', validate(a))).toHaveLength(0)
  })

  it('errors when GF_ prefix has female gender', () => {
    const a = ast([person('GF_Pat', 1, { gender: 'F' })], [])
    const errs = errorsFor('V3', validate(a))
    expect(errs).toHaveLength(1)
    expect(errs[0]?.nodeId).toBe('GF_Pat')
  })

  it('passes when GM_ prefix matches female gender', () => {
    const a = ast([person('GM_Mary', 1, { gender: 'F' })], [])
    expect(errorsFor('V3', validate(a))).toHaveLength(0)
  })

  it('errors when GM_ prefix has male gender', () => {
    const a = ast([person('GM_Joe', 1, { gender: 'M' })], [])
    expect(errorsFor('V3', validate(a))).toHaveLength(1)
  })

  it('passes when gender is unknown (?)', () => {
    const a = ast([person('GF_Unknown', 1, { gender: '?' })], [])
    expect(errorsFor('V3', validate(a))).toHaveLength(0)
  })

  it('GGF_ takes priority over GF_ prefix match', () => {
    const a = ast([person('GGF_Old', 2, { gender: 'M' })], [])
    expect(errorsFor('V3', validate(a))).toHaveLength(0)
  })

  it('errors for GGM_ with male gender', () => {
    const a = ast([person('GGM_Bob', 2, { gender: 'M' })], [])
    expect(errorsFor('V3', validate(a))).toHaveLength(1)
  })

  it('errors for BRIDE_ with male gender', () => {
    const a = ast([person('BRIDE_X', 0, { gender: 'M' })], [])
    expect(errorsFor('V3', validate(a))).toHaveLength(1)
  })

  it('passes for F_ (father) with male gender', () => {
    const a = ast([person('F_Dad', 1, { gender: 'M' })], [])
    expect(errorsFor('V3', validate(a))).toHaveLength(0)
  })

  it('errors for M_ (mother) with male gender', () => {
    const a = ast([person('M_Mom', 1, { gender: 'M' })], [])
    expect(errorsFor('V3', validate(a))).toHaveLength(1)
  })

  it('no error for node with no recognized prefix', () => {
    const a = ast([person('CHILD_1', 0, { gender: 'F' })], [])
    expect(errorsFor('V3', validate(a))).toHaveLength(0)
  })
})

// ─── V4: duplicate ID ────────────────────────────────────────────────────────

describe('V4 – duplicate ID', () => {
  it('passes when all IDs are unique', () => {
    const a = ast([person('A', 0), person('B', 0)], [])
    expect(errorsFor('V4', validate(a))).toHaveLength(0)
  })

  it('errors once per duplicated ID', () => {
    const a = ast([person('A', 0), person('A', 1), person('B', 0)], [])
    const errs = errorsFor('V4', validate(a))
    expect(errs).toHaveLength(1)
    expect(errs[0]?.nodeId).toBe('A')
    expect(errs[0]?.message).toContain('"A"')
  })

  it('reports each distinct duplicate ID once', () => {
    const a = ast(
      [person('A', 0), person('A', 0), person('B', 0), person('B', 0)],
      [],
    )
    expect(errorsFor('V4', validate(a))).toHaveLength(2)
  })
})

// ─── V5: circular ancestry ───────────────────────────────────────────────────

describe('V5 – circular ancestry', () => {
  it('passes for a valid two-generation tree', () => {
    const a = ast(
      [person('GP', 2), person('P', 1), person('C', 0)],
      [edge('GP', 'P', 'parent_child'), edge('P', 'C', 'parent_child')],
    )
    expect(errorsFor('V5', validate(a))).toHaveLength(0)
  })

  it('errors on a direct self-loop', () => {
    const a = ast([person('A', 0)], [edge('A', 'A', 'parent_child')])
    expect(errorsFor('V5', validate(a))).toHaveLength(1)
  })

  it('errors on a two-node cycle', () => {
    const a = ast(
      [person('A', 0), person('B', 0)],
      [edge('A', 'B', 'parent_child'), edge('B', 'A', 'parent_child')],
    )
    expect(errorsFor('V5', validate(a))).toHaveLength(1)
  })

  it('errors on a three-node cycle', () => {
    const a = ast(
      [person('A', 0), person('B', 0), person('C', 0)],
      [
        edge('A', 'B', 'parent_child'),
        edge('B', 'C', 'parent_child'),
        edge('C', 'A', 'parent_child'),
      ],
    )
    expect(errorsFor('V5', validate(a)).length).toBeGreaterThan(0)
  })

  it('ignores married edges when checking cycles', () => {
    const a = ast(
      [person('A', 0), person('B', 0)],
      [edge('A', 'B', 'married'), edge('B', 'A', 'married')],
    )
    expect(errorsFor('V5', validate(a))).toHaveLength(0)
  })
})

// ─── V6: sibling parity ──────────────────────────────────────────────────────

describe('V6 – sibling parity', () => {
  it('passes when all children of a parent share the same generation', () => {
    const a = ast(
      [person('P', 1), person('C1', 0), person('C2', 0)],
      [edge('P', 'C1', 'parent_child'), edge('P', 'C2', 'parent_child')],
    )
    expect(errorsFor('V6', validate(a))).toHaveLength(0)
  })

  it('errors when siblings are on different generations', () => {
    const a = ast(
      [person('P', 1), person('C1', 0), person('C2', -1)],
      [edge('P', 'C1', 'parent_child'), edge('P', 'C2', 'parent_child')],
    )
    const errs = errorsFor('V6', validate(a))
    expect(errs).toHaveLength(1)
    expect(errs[0]?.nodeId).toBe('P')
  })

  it('passes with a single child (no parity to check)', () => {
    const a = ast(
      [person('P', 1), person('C', 0)],
      [edge('P', 'C', 'parent_child')],
    )
    expect(errorsFor('V6', validate(a))).toHaveLength(0)
  })
})

// ─── V7: in-law generation ───────────────────────────────────────────────────

describe('V7 – in-law generation', () => {
  it('passes when parents of both spouses share the same generation', () => {
    const a = ast(
      [
        person('H', 0), person('W', 0, { gender: 'F' }),
        person('HF', 1), person('WF', 1),
      ],
      [
        edge('H', 'W', 'married'),
        edge('HF', 'H', 'parent_child'),
        edge('WF', 'W', 'parent_child'),
      ],
    )
    expect(errorsFor('V7', validate(a))).toHaveLength(0)
  })

  it('errors when in-laws are on different generations', () => {
    const a = ast(
      [
        person('H', 0), person('W', 0, { gender: 'F' }),
        person('HF', 1), person('WF', 2),
      ],
      [
        edge('H', 'W', 'married'),
        edge('HF', 'H', 'parent_child'),
        edge('WF', 'W', 'parent_child'),
      ],
    )
    const errs = errorsFor('V7', validate(a))
    expect(errs).toHaveLength(1)
    expect(errs[0]?.message).toContain('H')
    expect(errs[0]?.message).toContain('W')
  })

  it('skips the check when one spouse has no parents in the AST', () => {
    const a = ast(
      [person('H', 0), person('W', 0, { gender: 'F' }), person('HF', 1)],
      [
        edge('H', 'W', 'married'),
        edge('HF', 'H', 'parent_child'),
      ],
    )
    expect(errorsFor('V7', validate(a))).toHaveLength(0)
  })

  it('also checks core_couple edges', () => {
    const a = ast(
      [
        person('A', 0), person('B', 0),
        person('AF', 1), person('BF', 2),
      ],
      [
        edge('A', 'B', 'core_couple'),
        edge('AF', 'A', 'parent_child'),
        edge('BF', 'B', 'parent_child'),
      ],
    )
    expect(errorsFor('V7', validate(a))).toHaveLength(1)
  })
})

// ─── V8: cousin parity ───────────────────────────────────────────────────────

describe('V8 – cousin parity', () => {
  it('passes when cousins share the same generation', () => {
    // Two parents at G1; each has a child at G0
    const a = ast(
      [
        person('P1', 1), person('P2', 1),
        person('C1', 0), person('C2', 0),
      ],
      [
        edge('P1', 'C1', 'parent_child'),
        edge('P2', 'C2', 'parent_child'),
      ],
    )
    expect(errorsFor('V8', validate(a))).toHaveLength(0)
  })

  it('errors when cousins are on different generations', () => {
    const a = ast(
      [
        person('P1', 1), person('P2', 1),
        person('C1', 0), person('C2', -1),
      ],
      [
        edge('P1', 'C1', 'parent_child'),
        edge('P2', 'C2', 'parent_child'),
      ],
    )
    const errs = errorsFor('V8', validate(a))
    expect(errs).toHaveLength(1)
    expect(errs[0]?.message).toContain('generation 1')
  })

  it('passes when only one parent exists at a given generation', () => {
    // Only one parent at G1 — no cousin relationship to check
    const a = ast(
      [person('P1', 1), person('C1', 0)],
      [edge('P1', 'C1', 'parent_child')],
    )
    expect(errorsFor('V8', validate(a))).toHaveLength(0)
  })

  it('passes with parents at different generations (unrelated families)', () => {
    const a = ast(
      [
        person('P1', 1), person('C1', 0),
        person('P2', 2), person('C2', 1),
      ],
      [
        edge('P1', 'C1', 'parent_child'),
        edge('P2', 'C2', 'parent_child'),
      ],
    )
    expect(errorsFor('V8', validate(a))).toHaveLength(0)
  })
})

// ─── validate() aggregate ───────────────────────────────────────────────────

describe('validate() result shape', () => {
  it('returns valid:true and empty errors for a clean AST', () => {
    const result = validate(ast([], []))
    expect(result.valid).toBe(true)
    expect(result.errors).toHaveLength(0)
  })

  it('returns valid:false when any rule fires', () => {
    const a = ast(
      [person('A', 0), person('A', 0)],
      [],
    )
    const result = validate(a)
    expect(result.valid).toBe(false)
    expect(result.errors.length).toBeGreaterThan(0)
  })

  it('collects errors from multiple rules simultaneously', () => {
    // V4: duplicate ID + V2: spouse parity mismatch
    const a = ast(
      [
        person('X', 0), person('X', 0),
        person('H', 0), person('W', 1, { gender: 'F' }),
      ],
      [edge('H', 'W', 'married')],
    )
    const result = validate(a)
    const rules = new Set(result.errors.map((e) => e.rule))
    expect(rules.has('V4')).toBe(true)
    expect(rules.has('V2')).toBe(true)
  })
})
