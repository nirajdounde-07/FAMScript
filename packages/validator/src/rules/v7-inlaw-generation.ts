import type { FamScriptAST } from '@famscript/parser'
import type { ValidationError } from '../types.js'

const SPOUSE_EDGE_TYPES = new Set(['married', 'core_couple'])

/**
 * In-laws must stay on the spouse's generation.
 * For any married pair (A, B): all parents of A and all parents of B
 * must be at the same generation as each other.
 */
export function v7InlawGeneration(ast: FamScriptAST): ValidationError[] {
  const nodeById = new Map(ast.nodes.map((n) => [n.id, n]))
  const errors: ValidationError[] = []

  // childId → [parentIds]
  const parentsOf = new Map<string, string[]>()
  for (const edge of ast.edges) {
    if (edge.type !== 'parent_child') continue
    const list = parentsOf.get(edge.to) ?? []
    list.push(edge.from)
    parentsOf.set(edge.to, list)
  }

  for (const edge of ast.edges) {
    if (!SPOUSE_EDGE_TYPES.has(edge.type)) continue

    const aParents = (parentsOf.get(edge.from) ?? [])
      .map((id) => nodeById.get(id))
      .filter((n): n is NonNullable<typeof n> => n !== undefined)

    const bParents = (parentsOf.get(edge.to) ?? [])
      .map((id) => nodeById.get(id))
      .filter((n): n is NonNullable<typeof n> => n !== undefined)

    if (aParents.length === 0 || bParents.length === 0) continue

    const aGens = new Set(aParents.map((p) => p.generation))
    const bGens = new Set(bParents.map((p) => p.generation))
    const combined = new Set([...aGens, ...bGens])

    if (combined.size > 1) {
      errors.push({
        rule: 'V7',
        message: `In-law generation mismatch: parents of "${edge.from}" (gens ${[...aGens].join(', ')}) and parents of "${edge.to}" (gens ${[...bGens].join(', ')}) must be at the same generation`,
        nodeId: edge.from,
      })
    }
  }

  return errors
}
