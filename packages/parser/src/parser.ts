import { EmbeddedActionsParser, tokenMatcher } from 'chevrotain'
import {
  ALL_TOKENS,
  Arrow_Dashed,
  Arrow_Double,
  Arrow_Standard,
  Arrow_Undirected,
  Identifier,
  LSquare,
  Pipe,
  QuotedString,
  RSquare,
  lex,
} from './tokenizer.js'
import type { FamScriptAST, PersonNode, RelationEdge } from './types.js'

export class ParseError extends Error {
  constructor(
    message: string,
    public readonly errors: string[],
  ) {
    super(message)
    this.name = 'ParseError'
  }
}

class FamScriptParser extends EmbeddedActionsParser {
  constructor() {
    super(ALL_TOKENS, { recoveryEnabled: false })
    this.performSelfAnalysis()
  }

  program = this.RULE('program', (): FamScriptAST => {
    const nodes: PersonNode[] = []
    const edges: RelationEdge[] = []

    this.MANY(() => {
      this.OR([
        {
          // node declaration: Identifier followed by '['
          GATE: () => tokenMatcher(this.LA(2), LSquare),
          ALT: () => nodes.push(this.SUBRULE(this.nodeDeclaration)),
        },
        {
          ALT: () => edges.push(this.SUBRULE(this.edgeDeclaration)),
        },
      ])
    })

    return { nodes, edges }
  })

  nodeDeclaration = this.RULE('nodeDeclaration', (): PersonNode => {
    const idTok = this.CONSUME(Identifier)
    this.CONSUME(LSquare)
    const contentTok = this.CONSUME(QuotedString)
    this.CONSUME(RSquare)

    return this.ACTION(() => {
      const id = idTok.image
      const raw = contentTok.image.slice(1, -1) // strip surrounding quotes
      const [nameRaw = 'Unknown', ageRaw = '?', genderRaw = '?', genRaw = 'G0', statusRaw] = raw
        .split('|')
        .map((f) => f.trim())

      const node: PersonNode = {
        id,
        name: nameRaw,
        gender: parseGender(genderRaw),
        generation: parseGeneration(genRaw),
        metadata: {},
      }
      const age = ageRaw === '?' ? undefined : parseIntOrUndefined(ageRaw)
      if (age !== undefined) node.age = age
      const status = parseStatus(statusRaw)
      if (status !== undefined) node.status = status
      return node
    })
  })

  edgeDeclaration = this.RULE('edgeDeclaration', (): RelationEdge => {
    const fromTok = this.CONSUME(Identifier)

    let arrowImage = ''
    this.OR([
      { ALT: () => { arrowImage = this.CONSUME(Arrow_Standard).image } },
      { ALT: () => { arrowImage = this.CONSUME(Arrow_Undirected).image } },
      { ALT: () => { arrowImage = this.CONSUME(Arrow_Double).image } },
      { ALT: () => { arrowImage = this.CONSUME(Arrow_Dashed).image } },
    ])

    let label: string | undefined
    this.OPTION(() => {
      this.CONSUME(Pipe)
      label = this.CONSUME(QuotedString).image.slice(1, -1)
      this.CONSUME2(Pipe)
    })

    const toTok = this.CONSUME2(Identifier)

    return this.ACTION(() => {
      const edge: RelationEdge = {
        from: fromTok.image,
        to: toTok.image,
        type: arrowToRelationType(arrowImage),
        certainty: 'confirmed',
      }
      if (label !== undefined) edge.label = label
      return edge
    })
  })
}

// Singleton — reset `.input` before each parse
const parserInstance = new FamScriptParser()

export function parse(source: string): FamScriptAST {
  const { tokens, errors: lexErrors } = lex(source)

  if (lexErrors.length > 0) {
    throw new ParseError(
      'Lexer errors',
      lexErrors.map((e) => e.message),
    )
  }

  parserInstance.input = tokens
  const ast = parserInstance.program()

  if (parserInstance.errors.length > 0) {
    throw new ParseError(
      'Parse errors',
      parserInstance.errors.map((e) => e.message),
    )
  }

  return ast ?? { nodes: [], edges: [] }
}

// ── helpers ──────────────────────────────────────────────────────────────────

function parseIntOrUndefined(s: string): number | undefined {
  const n = parseInt(s, 10)
  return isNaN(n) ? undefined : n
}

function parseGender(s: string): 'M' | 'F' | '?' {
  const u = s.toUpperCase()
  if (u === 'M') return 'M'
  if (u === 'F') return 'F'
  return '?'
}

function parseGeneration(s: string): number {
  const trimmed = s.trim()
  if (trimmed === 'G0') return 0
  const m = trimmed.match(/^G([+-]\d+)$/)
  if (m?.[1] !== undefined) return parseInt(m[1], 10)
  return 0
}

function parseStatus(s?: string): PersonNode['status'] {
  switch (s?.trim().toLowerCase()) {
    case 'deceased': return 'deceased'
    case 'missing':  return 'missing'
    case 'living':   return 'living'
    case 'unknown':  return 'unknown'
    default:         return undefined
  }
}

function arrowToRelationType(arrow: string): string {
  switch (arrow) {
    case '-->':  return 'parent_child'
    case '---':  return 'married'
    case '==>':  return 'core_couple'
    case '-.->' : return 'distant'
    default:     return 'unknown'
  }
}
