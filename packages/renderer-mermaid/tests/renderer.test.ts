import { describe, it, expect } from 'vitest'
import type { PositionedNode } from '@famscript/layout'
import type { RelationEdge } from '@famscript/parser'
import type { LayoutResult } from '@famscript/layout'
import { renderToMermaid } from '../src/renderer.js'

// ─── helpers ─────────────────────────────────────────────────────────────────

function pnode(
  id: string,
  generation: number,
  x = 0,
  opts: Partial<Pick<PositionedNode, 'name' | 'age' | 'gender' | 'status'>> = {},
): PositionedNode {
  return {
    id,
    name: opts.name ?? id,
    gender: opts.gender ?? 'M',
    generation,
    age: opts.age,
    status: opts.status,
    metadata: {},
    x,
    y: generation * 110,
    row: -generation,
  }
}

function edge(from: string, to: string, type: string, label?: string): RelationEdge {
  return { from, to, type, label, certainty: 'confirmed' }
}

function layout(nodes: PositionedNode[], edges: RelationEdge[] = []): LayoutResult {
  return { nodes, edges, width: 500, height: 300 }
}

// ─── empty input ─────────────────────────────────────────────────────────────

describe('empty layout', () => {
  it('returns a bare graph directive', () => {
    expect(renderToMermaid(layout([]))).toBe('graph TD\n')
  })

  it('respects direction config on empty input', () => {
    expect(renderToMermaid(layout([]), { direction: 'LR' })).toBe('graph LR\n')
  })
})

// ─── header ──────────────────────────────────────────────────────────────────

describe('graph header', () => {
  it('defaults to TD direction', () => {
    const out = renderToMermaid(layout([pnode('A', 0)]))
    expect(out.startsWith('graph TD')).toBe(true)
  })

  it('uses configured direction', () => {
    const out = renderToMermaid(layout([pnode('A', 0)]), { direction: 'LR' })
    expect(out.startsWith('graph LR')).toBe(true)
  })
})

// ─── node declarations ───────────────────────────────────────────────────────

describe('node declarations', () => {
  it('emits every input node', () => {
    const out = renderToMermaid(layout([pnode('A', 1), pnode('B', 0)]))
    expect(out).toContain('A[')
    expect(out).toContain('B[')
  })

  it('full label includes name, age, gender, generation', () => {
    const out = renderToMermaid(
      layout([pnode('F_DAD', 1, 0, { name: 'Ramesh', age: 55, gender: 'M' })]),
      { labelFormat: 'full' },
    )
    expect(out).toContain('Ramesh')
    expect(out).toContain('55')
    expect(out).toContain('G+1')
  })

  it('full label uses ? when age is absent', () => {
    const out = renderToMermaid(layout([pnode('X', 0)]), { labelFormat: 'full' })
    expect(out).toContain('?')
  })

  it('name-only label omits age and generation', () => {
    const node = pnode('N', 0, 0, { name: 'Alice', age: 30 })
    // Use flat mode so there is no subgraph title that might contain generation text
    const out = renderToMermaid(layout([node]), { labelFormat: 'name-only', showGenerationSubgraphs: false })
    const nodeLine = out.split('\n').find((l) => l.includes('N['))!
    expect(nodeLine).toContain('Alice')
    expect(nodeLine).not.toContain('30')
    expect(nodeLine).not.toContain('G0')
  })

  it('name-age label includes name and age only', () => {
    const node = pnode('N', 0, 0, { name: 'Bob', age: 25 })
    const out = renderToMermaid(layout([node]), { labelFormat: 'name-age', showGenerationSubgraphs: false })
    const nodeLine = out.split('\n').find((l) => l.includes('N['))!
    expect(nodeLine).toContain('Bob')
    expect(nodeLine).toContain('25')
    expect(nodeLine).not.toContain('G0')
  })

  it('appends deceased status to full label', () => {
    const node = pnode('G', 3, 0, { name: 'Ram', age: 104, status: 'deceased' })
    const out = renderToMermaid(layout([node]), { labelFormat: 'full' })
    expect(out).toContain('deceased')
  })

  it('does not append living status to full label', () => {
    const node = pnode('A', 0, 0, { name: 'Alive', status: 'living' })
    const out = renderToMermaid(layout([node]), { labelFormat: 'full' })
    const labelLine = out.split('\n').find((l) => l.includes('Alive'))!
    expect(labelLine).not.toContain('living')
  })
})

// ─── label escaping ───────────────────────────────────────────────────────────

describe('label escaping', () => {
  it('escapes double-quote characters', () => {
    const node = pnode('Q', 0, 0, { name: 'O"Brien' })
    const out = renderToMermaid(layout([node]))
    expect(out).toContain('#quot;')
    expect(out).not.toMatch(/O"Brien/)
  })

  it('escapes angle brackets', () => {
    const node = pnode('Q', 0, 0, { name: 'A<B>C' })
    const out = renderToMermaid(layout([node]))
    expect(out).toContain('#lt;')
    expect(out).toContain('#gt;')
  })

  it('escapes square brackets', () => {
    const node = pnode('Q', 0, 0, { name: 'val[0]' })
    const out = renderToMermaid(layout([node]))
    expect(out).toContain('#lsqb;')
    expect(out).toContain('#rsqb;')
  })
})

// ─── generation subgraphs ────────────────────────────────────────────────────

describe('generation subgraphs', () => {
  it('emits one subgraph per generation', () => {
    const out = renderToMermaid(
      layout([pnode('P', 1), pnode('C', 0)]),
    )
    expect(out).toContain('subgraph gen_p1')
    expect(out).toContain('subgraph gen_0')
  })

  it('subgraph titles use the generation label', () => {
    const out = renderToMermaid(layout([pnode('GP', 2)]))
    expect(out).toContain('"G+2"')
  })

  it('uses gen_n prefix for negative generations', () => {
    const out = renderToMermaid(layout([pnode('GC', -2)]))
    expect(out).toContain('subgraph gen_n2')
  })

  it('each subgraph contains direction LR', () => {
    const out = renderToMermaid(layout([pnode('A', 0)]))
    expect(out).toContain('direction LR')
  })

  it('nodes within a subgraph are ordered by x position', () => {
    // B has x=0, A has x=200 — B should appear before A in the subgraph
    const out = renderToMermaid(
      layout([pnode('A', 0, 200), pnode('B', 0, 0)]),
    )
    const aIdx = out.indexOf('A[')
    const bIdx = out.indexOf('B[')
    expect(bIdx).toBeLessThan(aIdx)
  })

  it('higher generations appear before lower ones in output', () => {
    const out = renderToMermaid(
      layout([pnode('C', 0), pnode('GP', 2), pnode('P', 1)]),
    )
    const gpIdx = out.indexOf('gen_p2')
    const pIdx  = out.indexOf('gen_p1')
    const cIdx  = out.indexOf('gen_0')
    expect(gpIdx).toBeLessThan(pIdx)
    expect(pIdx).toBeLessThan(cIdx)
  })

  it('flat mode omits subgraphs', () => {
    const out = renderToMermaid(
      layout([pnode('A', 1), pnode('B', 0)]),
      { showGenerationSubgraphs: false },
    )
    expect(out).not.toContain('subgraph')
    expect(out).toContain('A[')
    expect(out).toContain('B[')
  })
})

// ─── edge declarations ───────────────────────────────────────────────────────

describe('edge declarations', () => {
  it('emits no edge block when there are no edges', () => {
    const out = renderToMermaid(layout([pnode('A', 0)]))
    expect(out).not.toContain('-->')
    expect(out).not.toContain('---')
  })

  it('parent_child → --> arrow', () => {
    const out = renderToMermaid(
      layout([pnode('P', 1), pnode('C', 0)], [edge('P', 'C', 'parent_child')]),
    )
    expect(out).toContain('P --> C')
  })

  it('married → --- arrow', () => {
    const out = renderToMermaid(
      layout([pnode('H', 0), pnode('W', 0)], [edge('H', 'W', 'married')]),
    )
    expect(out).toContain('H --- W')
  })

  it('core_couple → === arrow', () => {
    const out = renderToMermaid(
      layout([pnode('A', 0), pnode('B', 0)], [edge('A', 'B', 'core_couple')]),
    )
    expect(out).toContain('A === B')
  })

  it('distant → -.-> arrow', () => {
    const out = renderToMermaid(
      layout([pnode('A', 0), pnode('B', 0)], [edge('A', 'B', 'distant')]),
    )
    expect(out).toContain('A -.-> B')
  })

  it('unknown edge type falls back to --> arrow', () => {
    const out = renderToMermaid(
      layout([pnode('A', 0), pnode('B', 0)], [edge('A', 'B', 'custom_type')]),
    )
    expect(out).toContain('A --> B')
  })

  it('includes edge label when showEdgeLabels is true', () => {
    const out = renderToMermaid(
      layout(
        [pnode('P', 1), pnode('C', 0)],
        [edge('P', 'C', 'parent_child', 'Father of')],
      ),
      { showEdgeLabels: true },
    )
    expect(out).toContain('|"Father of"|')
  })

  it('omits edge label when showEdgeLabels is false', () => {
    const out = renderToMermaid(
      layout(
        [pnode('P', 1), pnode('C', 0)],
        [edge('P', 'C', 'parent_child', 'Father of')],
      ),
      { showEdgeLabels: false },
    )
    expect(out).not.toContain('Father of')
    expect(out).toContain('P --> C')
  })

  it('omits label syntax when edge has no label', () => {
    const out = renderToMermaid(
      layout([pnode('P', 1), pnode('C', 0)], [edge('P', 'C', 'parent_child')]),
    )
    expect(out).not.toContain('|"')
  })
})

// ─── status styling ──────────────────────────────────────────────────────────

describe('status styling', () => {
  it('emits deceased classDef and class assignment', () => {
    const node = pnode('GGF', 3, 0, { status: 'deceased' })
    const out = renderToMermaid(layout([node]))
    expect(out).toContain('classDef deceased')
    expect(out).toContain('class GGF deceased')
  })

  it('emits missing classDef and class assignment', () => {
    const node = pnode('UNK', 2, 0, { status: 'missing' })
    const out = renderToMermaid(layout([node]))
    expect(out).toContain('classDef missing')
    expect(out).toContain('class UNK missing')
  })

  it('emits no classDef when no special-status nodes exist', () => {
    const out = renderToMermaid(layout([pnode('A', 0)]))
    expect(out).not.toContain('classDef')
  })

  it('lists multiple deceased nodes in one class line', () => {
    const out = renderToMermaid(
      layout([
        pnode('GGF', 3, 0, { status: 'deceased' }),
        pnode('GGM', 3, 200, { status: 'deceased' }),
      ]),
    )
    const classLine = out.split('\n').find((l) => l.trim().startsWith('class ') && l.includes('deceased'))!
    expect(classLine).toContain('GGF')
    expect(classLine).toContain('GGM')
  })
})

// ─── full example ─────────────────────────────────────────────────────────────

describe('full family example', () => {
  it('produces a valid Mermaid string for a two-generation family', () => {
    const nodes: PositionedNode[] = [
      pnode('F_SLF', 1, 0,   { name: 'Ramesh', age: 55, gender: 'M' }),
      pnode('M_SLF', 1, 208, { name: 'Sunita', age: 52, gender: 'F' }),
      pnode('GROOM', 0, 104, { name: 'Arjun',  age: 28, gender: 'M' }),
    ]
    const edges: RelationEdge[] = [
      edge('F_SLF', 'M_SLF', 'married', 'Married to'),
      edge('F_SLF', 'GROOM', 'parent_child', 'Father of'),
      edge('M_SLF', 'GROOM', 'parent_child', 'Mother of'),
    ]
    const out = renderToMermaid(layout(nodes, edges))

    expect(out).toContain('graph TD')
    expect(out).toContain('subgraph gen_p1')
    expect(out).toContain('subgraph gen_0')
    // showEdgeLabels defaults to true so labels appear inline
    expect(out).toContain('F_SLF ---|"Married to"| M_SLF')
    expect(out).toContain('F_SLF -->|"Father of"| GROOM')
    expect(out).toContain('M_SLF -->|"Mother of"| GROOM')
    // Spot-check label content
    expect(out).toContain('Ramesh')
    expect(out).toContain('G+1')
    // Ends with a newline
    expect(out.endsWith('\n')).toBe(true)
  })
})
