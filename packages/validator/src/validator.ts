import type { FamScriptAST } from '@famscript/parser'
import type { ValidationResult, ValidationRule } from './types.js'
import { v1AgeGap } from './rules/v1-age-gap.js'
import { v2SpouseParity } from './rules/v2-spouse-parity.js'
import { v3GenderRole } from './rules/v3-gender-role.js'
import { v4DuplicateId } from './rules/v4-duplicate-id.js'
import { v5Circular } from './rules/v5-circular.js'
import { v6SiblingParity } from './rules/v6-sibling-parity.js'
import { v7InlawGeneration } from './rules/v7-inlaw-generation.js'
import { v8CousinParity } from './rules/v8-cousin-parity.js'

const builtinRules: ValidationRule[] = [
  { name: 'V1', validate: v1AgeGap },
  { name: 'V2', validate: v2SpouseParity },
  { name: 'V3', validate: v3GenderRole },
  { name: 'V4', validate: v4DuplicateId },
  { name: 'V5', validate: v5Circular },
  { name: 'V6', validate: v6SiblingParity },
  { name: 'V7', validate: v7InlawGeneration },
  { name: 'V8', validate: v8CousinParity },
]

const customRules: ValidationRule[] = []

export function addRule(rule: ValidationRule): void {
  customRules.push(rule)
}

export function validate(ast: FamScriptAST): ValidationResult {
  const errors = [...builtinRules, ...customRules].flatMap((r) => r.validate(ast))
  return { valid: errors.length === 0, errors }
}
