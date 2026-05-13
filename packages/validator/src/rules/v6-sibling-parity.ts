import type { FamScriptAST } from '@famscript/parser'
import type { ValidationError } from '../types.js'

/** All children of the same parent must be at the same generation */
export function v6SiblingParity(ast: FamScriptAST): ValidationError[] {
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

  for (const [parentId, childIds] of childrenOf) {
    const gens = childIds
      .map((id) => nodeById.get(id)?.generation)
      .filter((g): g is number => g !== undefined)

    const unique = new Set(gens)
    if (unique.size > 1) {
      errors.push({
        rule: 'V6',
        message: `Sibling generation mismatch: children of "${parentId}" span generations ${[...unique].join(', ')}`,
        nodeId: parentId,
      })
    }
  }

  return errors
}
