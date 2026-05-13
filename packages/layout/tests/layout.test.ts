import { describe, it, expect } from 'vitest'
import type { FamScriptAST, PersonNode, RelationEdge } from '@famscript/parser'
import { computeLayout } from '../src/layout.js'

// ─── helpers ─────────────────────────────────────────────────────────────────

function person(id: string, generation: number): PersonNode {
  return { id, name: id, gender: 'M', generation, metadata: {} }
}

function edge(from: string, to: string, type: string): RelationEdge {
  return { from, to, type, certainty: 'confirmed' }
}

function ast(nodes: PersonNode[], edges: RelationEdge[] = []): FamScriptAST {
  return { nodes, edges }
}

const CFG = { nodeWidth: 100, nodeHeight: 50, horizontalGap: 20, verticalGap: 60, pairGap: 4 }
const UNIT_W = CFG.nodeWidth + CFG.horizontalGap  // 120
const UNIT_H = CFG.nodeHeight + CFG.verticalGap   // 110

// ─── empty / trivial ─────────────────────────────────────────────────────────

describe('empty input', () => {
  it('returns zero dimensions and empty nodes', () => {
    const r = computeLayout(ast([]))
    expect(r.nodes).toHaveLength(0)
    expect(r.width).toBe(0)
    expect(r.height).toBe(0)
  })

  it('passes edges through unchanged', () => {
    const edges = [edge('A', 'B', 'parent_child')]
    const r = computeLayout(ast([], edges))
    expect(r.edges).toBe(edges)
  })
})

// ─── single node ─────────────────────────────────────────────────────────────

describe('single node', () => {
  it('positions a single node at the origin (centered)', () => {
    const r = computeLayout(ast([person('A', 0)]), CFG)
    expect(r.nodes).toHaveLength(1)
    const n = r.nodes[0]!
    expect(n.id).toBe('A')
    expect(n.x).toBe(0)
    expect(n.y).toBe(0)
    expect(n.row).toBe(0)
  })

  it('returns correct dimensions for a single node', () => {
    const r = computeLayout(ast([person('A', 0)]), CFG)
    expect(r.width).toBe(CFG.nodeWidth)
    expect(r.height).toBe(CFG.nodeHeight)
  })
})

// ─── generation → row mapping ────────────────────────────────────────────────

describe('generation → row', () => {
  it('higher generation gets a lower row index (i.e. higher on the canvas)', () => {
    const r = computeLayout(
      ast([person('GP', 2), person('P', 1), person('C', 0)]),
      CFG,
    )
    const byId = new Map(r.nodes.map((n) => [n.id, n]))
    expect(byId.get('GP')!.row).toBeLessThan(byId.get('P')!.row)
    expect(byId.get('P')!.row).toBeLessThan(byId.get('C')!.row)
  })

  it('nodes at the same generation share the same y coordinate', () => {
    const r = computeLayout(
      ast([person('A', 1), person('B', 1), person('C', 0)]),
      CFG,
    )
    const byId = new Map(r.nodes.map((n) => [n.id, n]))
    expect(byId.get('A')!.y).toBe(byId.get('B')!.y)
    expect(byId.get('A')!.y).not.toBe(byId.get('C')!.y)
  })

  it('row y values are spaced by nodeHeight + verticalGap', () => {
    const r = computeLayout(
      ast([person('A', 2), person('B', 1), person('C', 0)]),
      CFG,
    )
    const ys = [...new Set(r.nodes.map((n) => n.y))].sort((a, b) => a - b)
    expect(ys).toHaveLength(3)
    expect(ys[1]! - ys[0]!).toBe(UNIT_H)
    expect(ys[2]! - ys[1]!).toBe(UNIT_H)
  })

  it('negative generations (descendants) get lower rows', () => {
    const r = computeLayout(
      ast([person('S', 0), person('C', -1), person('GC', -2)]),
      CFG,
    )
    const byId = new Map(r.nodes.map((n) => [n.id, n]))
    expect(byId.get('S')!.row).toBeLessThan(byId.get('C')!.row)
    expect(byId.get('C')!.row).toBeLessThan(byId.get('GC')!.row)
  })
})

// ─── spouse pairing ──────────────────────────────────────────────────────────

describe('spouse pairing', () => {
  it('places married spouses adjacent to each other', () => {
    const r = computeLayout(
      ast(
        [person('H', 0), person('W', 0)],
        [edge('H', 'W', 'married')],
      ),
      CFG,
    )
    const byId = new Map(r.nodes.map((n) => [n.id, n]))
    const h = byId.get('H')!
    const w = byId.get('W')!
    // They share the same y row
    expect(h.y).toBe(w.y)
    // x distance = nodeWidth + pairGap (not the full horizontalGap)
    expect(Math.abs(h.x - w.x)).toBe(CFG.nodeWidth + CFG.pairGap)
  })

  it('places core_couple partners adjacent to each other', () => {
    const r = computeLayout(
      ast(
        [person('A', 0), person('B', 0)],
        [edge('A', 'B', 'core_couple')],
      ),
      CFG,
    )
    const byId = new Map(r.nodes.map((n) => [n.id, n]))
    const a = byId.get('A')!
    const b = byId.get('B')!
    expect(Math.abs(a.x - b.x)).toBe(CFG.nodeWidth + CFG.pairGap)
  })

  it('does not pair spouses on different generations', () => {
    // V2 violation — layout still handles it without crashing, just no pairing
    const r = computeLayout(
      ast(
        [person('A', 0), person('B', 1)],
        [edge('A', 'B', 'married')],
      ),
      CFG,
    )
    const byId = new Map(r.nodes.map((n) => [n.id, n]))
    // Different rows — not paired
    expect(byId.get('A')!.y).not.toBe(byId.get('B')!.y)
  })

  it('non-paired sibling nodes are spaced with horizontalGap', () => {
    // Two singles in the same row: x distance = nodeWidth + horizontalGap
    const r = computeLayout(
      ast([person('A', 0), person('B', 0)]),  // no spouse edge
      CFG,
    )
    const byId = new Map(r.nodes.map((n) => [n.id, n]))
    const xDiff = Math.abs(byId.get('A')!.x - byId.get('B')!.x)
    expect(xDiff).toBe(UNIT_W)
  })
})

// ─── parent-child positioning ─────────────────────────────────────────────────

describe('parent-child positioning', () => {
  it('a single parent is centred above its single child', () => {
    const r = computeLayout(
      ast(
        [person('P', 1), person('C', 0)],
        [edge('P', 'C', 'parent_child')],
      ),
      CFG,
    )
    const byId = new Map(r.nodes.map((n) => [n.id, n]))
    // Both rows have 1 node; each gets centred → same x
    expect(byId.get('P')!.x).toBe(byId.get('C')!.x)
  })

  it('child is below parent', () => {
    const r = computeLayout(
      ast(
        [person('P', 1), person('C', 0)],
        [edge('P', 'C', 'parent_child')],
      ),
      CFG,
    )
    const byId = new Map(r.nodes.map((n) => [n.id, n]))
    expect(byId.get('C')!.y).toBeGreaterThan(byId.get('P')!.y)
  })
})

// ─── row centering ────────────────────────────────────────────────────────────

describe('row centering', () => {
  it('a narrow row is centred within the wider canvas', () => {
    // G+1 has 3 nodes, G0 has 1 node → G0 should be centred under the 3-node row
    const r = computeLayout(
      ast([
        person('P1', 1), person('P2', 1), person('P3', 1),
        person('C', 0),
      ]),
      CFG,
    )
    const byId = new Map(r.nodes.map((n) => [n.id, n]))

    // Canvas width = width of the 3-node row
    const canvasWidth = r.width  // 3 * nodeWidth + 2 * horizontalGap = 340
    const c = byId.get('C')!
    // Child x should be roughly at the midpoint (allowing for centering offset)
    const childMid = c.x + CFG.nodeWidth / 2
    expect(childMid).toBeCloseTo(canvasWidth / 2, 0)
  })

  it('a wider bottom row centres the narrower top row', () => {
    const r = computeLayout(
      ast([
        person('P', 1),
        person('C1', 0), person('C2', 0), person('C3', 0),
      ]),
      CFG,
    )
    const byId = new Map(r.nodes.map((n) => [n.id, n]))
    const canvasWidth = r.width
    const pMid = byId.get('P')!.x + CFG.nodeWidth / 2
    expect(pMid).toBeCloseTo(canvasWidth / 2, 0)
  })
})

// ─── determinism ──────────────────────────────────────────────────────────────

describe('determinism', () => {
  it('produces the same layout for the same input', () => {
    const input = ast(
      [
        person('GP1', 2), person('GP2', 2),
        person('F', 1), person('M', 1),
        person('C1', 0), person('C2', 0),
      ],
      [
        edge('GP1', 'F', 'parent_child'),
        edge('GP2', 'M', 'parent_child'),
        edge('F', 'M', 'married'),
        edge('F', 'C1', 'parent_child'),
        edge('F', 'C2', 'parent_child'),
      ],
    )
    const r1 = computeLayout(input, CFG)
    const r2 = computeLayout(input, CFG)
    expect(r1.nodes.map((n) => ({ id: n.id, x: n.x, y: n.y }))).toEqual(
      r2.nodes.map((n) => ({ id: n.id, x: n.x, y: n.y })),
    )
  })
})

// ─── output shape ─────────────────────────────────────────────────────────────

describe('output shape', () => {
  it('every input node appears in the output exactly once', () => {
    const nodes = [person('A', 1), person('B', 1), person('C', 0), person('D', -1)]
    const r = computeLayout(ast(nodes), CFG)
    const outputIds = r.nodes.map((n) => n.id).sort()
    expect(outputIds).toEqual(['A', 'B', 'C', 'D'].sort())
  })

  it('preserves all original PersonNode fields', () => {
    const p: PersonNode = { id: 'X', name: 'Xavier', gender: 'M', generation: 0, age: 30, status: 'living', metadata: { custom: true } }
    const r = computeLayout(ast([p]), CFG)
    const out = r.nodes[0]!
    expect(out.name).toBe('Xavier')
    expect(out.age).toBe(30)
    expect(out.status).toBe('living')
    expect(out.metadata).toEqual({ custom: true })
  })

  it('width and height are positive for non-empty input', () => {
    const r = computeLayout(ast([person('A', 0)]), CFG)
    expect(r.width).toBeGreaterThan(0)
    expect(r.height).toBeGreaterThan(0)
  })

  it('all nodes are within the reported width and height bounds', () => {
    const r = computeLayout(
      ast([
        person('GP', 2), person('P', 1), person('C', 0),
      ]),
      CFG,
    )
    for (const n of r.nodes) {
      expect(n.x).toBeGreaterThanOrEqual(0)
      expect(n.y).toBeGreaterThanOrEqual(0)
      expect(n.x + CFG.nodeWidth).toBeLessThanOrEqual(r.width + 1)
      expect(n.y + CFG.nodeHeight).toBeLessThanOrEqual(r.height + 1)
    }
  })
})

// ─── multi-family crossing minimisation ───────────────────────────────────────

describe('crossing minimisation', () => {
  it('places a child closer to its parent than to an unrelated parent', () => {
    // P1 (gen 1) → C1 (gen 0)
    // P2 (gen 1) → C2 (gen 0)
    // After barycenter sweeps, C1 should be in the same x-neighbourhood as P1,
    // and C2 in the same neighbourhood as P2.
    const r = computeLayout(
      ast(
        [person('P1', 1), person('P2', 1), person('C1', 0), person('C2', 0)],
        [
          edge('P1', 'C1', 'parent_child'),
          edge('P2', 'C2', 'parent_child'),
        ],
      ),
      CFG,
    )
    const byId = new Map(r.nodes.map((n) => [n.id, n]))
    const p1x = byId.get('P1')!.x
    const p2x = byId.get('P2')!.x
    const c1x = byId.get('C1')!.x
    const c2x = byId.get('C2')!.x

    // C1 should be on the same side as P1, C2 on the same side as P2
    const c1CloserToP1 = Math.abs(c1x - p1x) <= Math.abs(c1x - p2x)
    const c2CloserToP2 = Math.abs(c2x - p2x) <= Math.abs(c2x - p1x)
    expect(c1CloserToP1).toBe(true)
    expect(c2CloserToP2).toBe(true)
  })
})
