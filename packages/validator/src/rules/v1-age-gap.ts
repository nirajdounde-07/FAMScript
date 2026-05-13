import type { FamScriptAST } from '@famscript/parser'
import type { ValidationError } from '../types.js'

/** parent.age must be >= child.age + 15 */
export function v1AgeGap(ast: FamScriptAST): ValidationError[] {
  const nodeById = new Map(ast.nodes.map((n) => [n.id, n]))
  const errors: ValidationError[] = []

  for (const edge of ast.edges) {
    if (edge.type !== 'parent_child') continue

    const parent = nodeById.get(edge.from)
    const child = nodeById.get(edge.to)
    if (!parent || !child) continue
    if (parent.age === undefined || child.age === undefined) continue

    if (parent.age < child.age + 15) {
      errors.push({
        rule: 'V1',
        message: `Age gap too small: "${parent.id}" (age ${parent.age}) must be at least 15 years older than "${child.id}" (age ${child.age})`,
        nodeId: parent.id,
      })
    }
  }

  return errors
}
