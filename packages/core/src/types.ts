import type { FamScriptAST } from '@famscript/parser'
import type { ValidationResult, ValidationRule } from '@famscript/validator'
import type { LayoutResult, LayoutConfig } from '@famscript/layout'
import type { RenderConfig } from '@famscript/renderer-mermaid'

export interface FamScriptPlugin {
  name: string
  /** Additional validation rules contributed by this plugin. */
  rules?: ValidationRule[]
}

export interface FamScriptConfig {
  /** Options forwarded to the layout engine. */
  layout?: Partial<LayoutConfig>
  /** Options forwarded to the Mermaid renderer. */
  render?: Partial<RenderConfig>
  /**
   * When true (default) compilation halts on the first validation error and
   * returns an empty mermaid string. When false, layout and rendering still
   * run so callers can show a diagram alongside the error list.
   */
  strict?: boolean
  /** Plugins that contribute additional validation rules. */
  plugins?: FamScriptPlugin[]
}

export interface CompileResult {
  /** True only when parsing succeeded and there were zero validation errors. */
  success: boolean
  /** Valid Mermaid syntax string, or empty string when compilation failed. */
  mermaid: string
  /** Full validation report including any plugin rule errors. */
  validation: ValidationResult
  /** The parsed AST. Null only when the source could not be tokenised or parsed. */
  ast: FamScriptAST | null
  /** The computed layout. Null when layout was not reached (strict + validation errors, or parse failure). */
  layout: LayoutResult | null
}

export interface FamScript {
  compile(source: string): CompileResult
}
