import type { FamScriptAST } from '@famscript/parser'
import type { ValidationError } from '../types.js'

/**
 * No person may be their own ancestor.
 * Detects directed cycles in the parent_child subgraph using DFS colouring:
 *   white = unvisited, grey = in current path, black = fully processed.
 * Reaching a grey node means a back-edge exists → cycle.
 */
export function v5Circular(ast: FamScriptAST): ValidationError[] {
  const nodeIds = new Set(ast.nodes.map((n) => n.id))
  const errors: ValidationError[] = []

  // Build parent → [children] adjacency from parent_child edges only
  const children = new Map<string, string[]>()
  for (const edge of ast.edges) {
    if (edge.type !== 'parent_child') continue
    if (!nodeIds.has(edge.from) || !nodeIds.has(edge.to)) continue
    const list = children.get(edge.from) ?? []
    list.push(edge.to)
    children.set(edge.from, list)
  }

  const white = new Set(nodeIds)
  const grey = new Set<string>()
  const black = new Set<string>()
  const reported = new Set<string>()

  function dfs(id: string): void {
    white.delete(id)
    grey.add(id)

    for (const child of children.get(id) ?? []) {
      if (black.has(child)) continue

      if (grey.has(child)) {
        const key = [id, child].sort().join('→')
        if (!reported.has(key)) {
          errors.push({
            rule: 'V5',
            message: `Circular ancestry: "${id}" is an ancestor of "${child}", which is also an ancestor of "${id}"`,
            nodeId: id,
          })
          reported.add(key)
        }
        continue
      }

      if (white.has(child)) dfs(child)
    }

    grey.delete(id)
    black.add(id)
  }

  for (const id of nodeIds) {
    if (white.has(id)) dfs(id)
  }

  return errors
}
