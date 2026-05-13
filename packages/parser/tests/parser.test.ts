import { describe, it, expect } from 'vitest'
import { parse, ParseError } from '../src/parser.js'

describe('nodeDeclaration', () => {
  it('parses all fields', () => {
    const ast = parse('GROOM_SLF_001["Arjun Kumar | 28 | M | G0"]')
    expect(ast.nodes).toHaveLength(1)
    const n = ast.nodes[0]!
    expect(n.id).toBe('GROOM_SLF_001')
    expect(n.name).toBe('Arjun Kumar')
    expect(n.age).toBe(28)
    expect(n.gender).toBe('M')
    expect(n.generation).toBe(0)
    expect(n.status).toBeUndefined()
  })

  it('parses G+1 generation', () => {
    const ast = parse('F_SLF_001["Ramesh Kumar | 55 | M | G+1"]')
    expect(ast.nodes[0]!.generation).toBe(1)
  })

  it('parses G+2 generation', () => {
    const ast = parse('GF_PAT_001["Shyam Lal | 80 | M | G+2"]')
    expect(ast.nodes[0]!.generation).toBe(2)
  })

  it('parses G+3 with deceased status', () => {
    const ast = parse('GGF_PAT_001["Ram Das | 104 | M | G+3 | deceased"]')
    const n = ast.nodes[0]!
    expect(n.generation).toBe(3)
    expect(n.status).toBe('deceased')
  })

  it('parses G-1 generation', () => {
    const ast = parse('CHILD_001["Ravi Kumar | 5 | M | G-1"]')
    expect(ast.nodes[0]!.generation).toBe(-1)
  })

  it('parses unknown age and gender', () => {
    const ast = parse('UNK_MAT_001["Unknown | ? | ? | G+2"]')
    const n = ast.nodes[0]!
    expect(n.age).toBeUndefined()
    expect(n.gender).toBe('?')
    expect(n.generation).toBe(2)
  })

  it('parses female gender', () => {
    const ast = parse('M_SLF_001["Sunita Kumar | 52 | F | G+1"]')
    expect(ast.nodes[0]!.gender).toBe('F')
  })
})

describe('edgeDeclaration', () => {
  it('parses --> with label (parent_child)', () => {
    const ast = parse('F_SLF_001 -->|"Father of"| GROOM_SLF_001')
    expect(ast.edges).toHaveLength(1)
    const e = ast.edges[0]!
    expect(e.from).toBe('F_SLF_001')
    expect(e.to).toBe('GROOM_SLF_001')
    expect(e.type).toBe('parent_child')
    expect(e.label).toBe('Father of')
  })

  it('parses --- with label (married)', () => {
    const ast = parse('F_SLF_001 ---|"Married to"| M_SLF_001')
    expect(ast.edges[0]!.type).toBe('married')
    expect(ast.edges[0]!.label).toBe('Married to')
  })

  it('parses ==> with label (core_couple)', () => {
    const ast = parse('GROOM_SLF_001 ==>|"Married to"| BRIDE_SLF_001')
    expect(ast.edges[0]!.type).toBe('core_couple')
  })

  it('parses -.-> without label (distant)', () => {
    const ast = parse('A -.-> B')
    const e = ast.edges[0]!
    expect(e.type).toBe('distant')
    expect(e.label).toBeUndefined()
    expect(e.from).toBe('A')
    expect(e.to).toBe('B')
  })

  it('sets certainty to confirmed', () => {
    const ast = parse('A --> B')
    expect(ast.edges[0]!.certainty).toBe('confirmed')
  })
})

describe('full program', () => {
  it('parses multiple nodes and edges', () => {
    const src = [
      'GROOM_SLF_001["Arjun Kumar | 28 | M | G0"]',
      'F_SLF_001["Ramesh Kumar | 55 | M | G+1"]',
      'M_SLF_001["Sunita Kumar | 52 | F | G+1"]',
      'F_SLF_001 -->|"Father of"| GROOM_SLF_001',
      'M_SLF_001 -->|"Mother of"| GROOM_SLF_001',
      'F_SLF_001 ---|"Married to"| M_SLF_001',
    ].join('\n')

    const ast = parse(src)
    expect(ast.nodes).toHaveLength(3)
    expect(ast.edges).toHaveLength(3)
  })

  it('skips %% comments', () => {
    const src = [
      '%% FamScript example',
      'GROOM_SLF_001["Arjun Kumar | 28 | M | G0"]',
      '%% edge below',
      'F_SLF_001 -->|"Father of"| GROOM_SLF_001',
    ].join('\n')

    const ast = parse(src)
    expect(ast.nodes).toHaveLength(1)
    expect(ast.edges).toHaveLength(1)
  })

  it('handles empty input', () => {
    const ast = parse('')
    expect(ast.nodes).toHaveLength(0)
    expect(ast.edges).toHaveLength(0)
  })

  it('handles nodes and edges interleaved', () => {
    const src = [
      'A["Alice | 30 | F | G0"]',
      'B["Bob | 32 | M | G0"]',
      'A ==>|"Married to"| B',
      'C["Child | 5 | ? | G-1"]',
      'A -->|"Mother of"| C',
      'B -->|"Father of"| C',
    ].join('\n')

    const ast = parse(src)
    expect(ast.nodes).toHaveLength(3)
    expect(ast.edges).toHaveLength(3)
  })
})

describe('ParseError', () => {
  it('throws ParseError on lex failure', () => {
    expect(() => parse('@@invalid')).toThrow(ParseError)
  })
})
