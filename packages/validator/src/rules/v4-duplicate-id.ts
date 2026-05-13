import type { FamScriptAST } from '@famscript/parser'
import type { ValidationError } from '../types.js'

/** No two nodes may share the same ID */
export function v4DuplicateId(ast: FamScriptAST): ValidationError[] {
  const seen = new Set<string>()
  const reported = new Set<string>()
  const errors: ValidationError[] = []

  for (const node of ast.nodes) {
    if (seen.has(node.id) && !reported.has(node.id)) {
      errors.push({
        rule: 'V4',
        message: `Duplicate node ID: "${node.id}" appears more than once`,
        nodeId: node.id,
      })
      reported.add(node.id)
    }
    seen.add(node.id)
  }

  return errors
}
