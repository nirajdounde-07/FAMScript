import type { FamScriptAST } from '@famscript/parser'

export interface ValidationError {
  rule: string
  message: string
  nodeId?: string
}

export interface ValidationResult {
  valid: boolean
  errors: ValidationError[]
}

export interface ValidationRule {
  name: string
  validate(ast: FamScriptAST): ValidationError[]
}
