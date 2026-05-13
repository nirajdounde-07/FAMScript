import type { FamScriptAST } from '@famscript/parser'
import type { ValidationError } from '../types.js'

/**
 * Children of parents at the same generation (i.e. cousins) must themselves
 * share the same generation.
 *
 * Algorithm: group parent nodes by their generation. For each group with 2+
 * parents, collect all their children and verify they are all at one generation.
 */
export function v8CousinParity(ast: FamScriptAST): ValidationError[] {
  const nodeById = new Map(ast.nodes.map((n) => [n.id, n]))
  const errors: ValidationError[] = []

  // parentId → childIds
  const childrenOf = new Map<string, string[]>()
  for (const edge of ast.edges) {
    if (edge.type !== 'parent_child') continue
    const list = childrenOf.get(edge.from) ?? []
    list.push(edge.to)
    childrenOf.set(edge.from, list)
  }

  // group parent IDs by their generation
  const parentsByGen = new Map<number, string[]>()
  for (const node of ast.nodes) {
    if (!childrenOf.has(node.id)) continue
    const list = parentsByGen.get(node.generation) ?? []
    list.push(node.id)
    parentsByGen.set(node.generation, list)
  }

  for (const [parentGen, parentIds] of parentsByGen) {
    if (parentIds.length < 2) continue

    const allChildIds = parentIds.flatMap((pid) => childrenOf.get(pid) ?? [])
    const childGens = allChildIds
      .map((id) => nodeById.get(id)?.generation)
      .filter((g): g is number => g !== undefined)

    const unique = new Set(childGens)
    if (unique.size > 1) {
      errors.push({
        rule: 'V8',
        message: `Cousin generation mismatch: children of parents at generation ${parentGen} span generations ${[...unique].join(', ')}`,
        nodeId: parentIds[0],
      })
    }
  }

  return errors
}
