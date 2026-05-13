import { parse, ParseError } from '@famscript/parser'
import type { FamScriptAST } from '@famscript/parser'
import { validate } from '@famscript/validator'
import type { ValidationError, ValidationRule } from '@famscript/validator'
import { computeLayout } from '@famscript/layout'
import { renderToMermaid } from '@famscript/renderer-mermaid'
import type { CompileResult, FamScript, FamScriptConfig } from './types.js'

// ─── internal helpers ─────────────────────────────────────────────────────────

function collectPluginRules(config: FamScriptConfig): ValidationRule[] {
  return (config.plugins ?? []).flatMap((p) => p.rules ?? [])
}

function runValidation(ast: FamScriptAST, pluginRules: ValidationRule[]) {
  const base = validate(ast)
  if (pluginRules.length === 0) return base
  const pluginErrors = pluginRules.flatMap((r) => r.validate(ast))
  return {
    valid: base.valid && pluginErrors.length === 0,
    errors: [...base.errors, ...pluginErrors],
  }
}

function doCompile(source: string, config: FamScriptConfig): CompileResult {
  const strict = config.strict ?? true
  const pluginRules = collectPluginRules(config)

  // ── 1. Parse ──────────────────────────────────────────────────────────────
  let ast: FamScriptAST
  try {
    ast = parse(source)
  } catch (err) {
    if (err instanceof ParseError) {
      return {
        success: false,
        mermaid: '',
        validation: {
          valid: false,
          errors: err.errors.map((msg): ValidationError => ({ rule: 'PARSE', message: msg })),
        },
        ast: null,
        layout: null,
      }
    }
    throw err
  }

  // ── 2. Validate ───────────────────────────────────────────────────────────
  const validation = runValidation(ast, pluginRules)
  if (!validation.valid && strict) {
    return { success: false, mermaid: '', validation, ast, layout: null }
  }

  // ── 3. Layout ─────────────────────────────────────────────────────────────
  const layout = computeLayout(ast, config.layout)

  // ── 4. Render ─────────────────────────────────────────────────────────────
  const mermaid = renderToMermaid(layout, config.render)

  return { success: validation.valid, mermaid, validation, ast, layout }
}

// ─── public API ───────────────────────────────────────────────────────────────

/**
 * Convenience one-shot compile. Creates an ad-hoc compiler, runs the full
 * pipeline, and returns the result.
 */
export function compile(source: string, config: FamScriptConfig = {}): CompileResult {
  return doCompile(source, config)
}

/**
 * Creates a reusable FamScript compiler instance bound to the given config.
 * Prefer this over the bare `compile()` function when you need to compile
 * multiple sources with the same plugins or options.
 */
export function createFamScript(config: FamScriptConfig = {}): FamScript {
  return {
    compile(source: string): CompileResult {
      return doCompile(source, config)
    },
  }
}
