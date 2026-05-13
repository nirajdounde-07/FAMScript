import { compile } from '@famscript/core'
import type { FamScriptConfig } from '@famscript/core'
import { fail, warn, formatValidationErrors } from '../utils/output.js'

export interface RenderOptions {
  direction?: 'TD' | 'LR' | 'BT' | 'RL'
  showGenerationSubgraphs?: boolean
  strict?: boolean
}

export interface CommandResult {
  exitCode: number
  stdout: string
  stderr: string
}

export function renderCommand(source: string, opts: RenderOptions = {}): CommandResult {
  const strict = opts.strict ?? true
  const config: FamScriptConfig = {
    strict,
    render: {
      direction: opts.direction ?? 'TD',
      showGenerationSubgraphs: opts.showGenerationSubgraphs ?? true,
    },
  }

  const result = compile(source, config)

  // Mermaid was produced (non-strict mode rendered despite errors)
  if (result.mermaid) {
    const stderr = result.validation.errors.length > 0
      ? `${warn('Validation warnings')}\n${formatValidationErrors(result.validation.errors)}\n`
      : ''
    return { exitCode: 0, stdout: result.mermaid, stderr }
  }

  const errors = formatValidationErrors(result.validation.errors)
  return {
    exitCode: 1,
    stdout: '',
    stderr: `${fail('Compilation failed')}\n${errors}\n`,
  }
}
