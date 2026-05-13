import type { FamScriptAST } from '@famscript/parser'
import type { ValidationError } from '../types.js'

/**
 * ID-prefix conventions imply an expected gender.
 * Ordered from most-specific to least-specific so "GGF_" matches before "GF_".
 * Only fires when the stated gender is not "?" (unknown is always accepted).
 */
const ROLE_PATTERNS: ReadonlyArray<readonly [RegExp, 'M' | 'F', string]> = [
  [/^GROOM_/i, 'M', 'Groom'],
  [/^BRIDE_/i, 'F', 'Bride'],
  [/^GGF_/i, 'M', 'Great-grandfather'],
  [/^GGM_/i, 'F', 'Great-grandmother'],
  [/^GF_/i, 'M', 'Grandfather'],
  [/^GM_/i, 'F', 'Grandmother'],
  [/^HF_/i, 'M', 'Father-in-law (husband side)'],
  [/^HM_/i, 'F', 'Mother-in-law (husband side)'],
  [/^WF_/i, 'M', 'Father-in-law (wife side)'],
  [/^WM_/i, 'F', 'Mother-in-law (wife side)'],
  [/^F_/i, 'M', 'Father'],
  [/^M_/i, 'F', 'Mother'],
]

/** Role-encoded ID prefixes must match stated gender */
export function v3GenderRole(ast: FamScriptAST): ValidationError[] {
  const errors: ValidationError[] = []

  for (const node of ast.nodes) {
    if (node.gender === '?') continue

    for (const [pattern, expected, roleName] of ROLE_PATTERNS) {
      if (pattern.test(node.id)) {
        if (node.gender !== expected) {
          errors.push({
            rule: 'V3',
            message: `Gender role mismatch: "${node.id}" is a ${roleName} (expected ${expected}) but has gender ${node.gender}`,
            nodeId: node.id,
          })
        }
        break
      }
    }
  }

  return errors
}
