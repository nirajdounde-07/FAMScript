import type { FamScriptAST } from '@famscript/parser'
import type { ValidationError } from '../types.js'

const SPOUSE_EDGE_TYPES = new Set(['married', 'core_couple'])

function genLabel(g: number): string {
  if (g === 0) return 'G0'
  return g > 0 ? `G+${g}` : `G${g}`
}

/** Spouses must belong to the same generation */
export function v2SpouseParity(ast: FamScriptAST): ValidationError[] {
  const nodeById = new Map(ast.nodes.map((n) => [n.id, n]))
  const errors: ValidationError[] = []

  for (const edge of ast.edges) {
    if (!SPOUSE_EDGE_TYPES.has(edge.type)) continue

    const a = nodeById.get(edge.from)
    const b = nodeById.get(edge.to)
    if (!a || !b) continue

    if (a.generation !== b.generation) {
      errors.push({
        rule: 'V2',
        message: `Spouse generation mismatch: "${a.id}" (${genLabel(a.generation)}) and "${b.id}" (${genLabel(b.generation)}) must be at the same generation`,
        nodeId: a.id,
      })
    }
  }

  return errors
}
