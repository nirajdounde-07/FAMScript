import { compile } from '@famscript/core'
import { formatLintLine, summary } from '../utils/output.js'

export interface CommandResult {
  exitCode: number
  stdout: string
  stderr: string
}

export function lintCommand(source: string, filePath = '<input>'): CommandResult {
  const result = compile(source, { strict: false })

  if (result.validation.valid) {
    return {
      exitCode: 0,
      stdout: `${summary(0)}\n`,
      stderr: '',
    }
  }

  const lines = result.validation.errors.map((e) => formatLintLine(filePath, e))
  const sum   = summary(result.validation.errors.length)
  return {
    exitCode: 1,
    stdout: `${lines.join('\n')}\n\n${sum}\n`,
    stderr: '',
  }
}
