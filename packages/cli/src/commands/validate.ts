import { compile } from '@famscript/core'
import { pass, fail, formatValidationErrors, summary } from '../utils/output.js'

export interface CommandResult {
  exitCode: number
  stdout: string
  stderr: string
}

export function validateCommand(source: string, filePath = '<input>'): CommandResult {
  // strict:false → always get the complete error list even on partial parse failure
  const result = compile(source, { strict: false })

  if (result.validation.valid) {
    return {
      exitCode: 0,
      stdout: `${pass(`${filePath} — valid`)}\n`,
      stderr: '',
    }
  }

  const errors = formatValidationErrors(result.validation.errors)
  const sum    = summary(result.validation.errors.length)
  return {
    exitCode: 1,
    stdout: '',
    stderr: `${fail(`${filePath} — validation failed`)}\n${errors}\n\n${sum}\n`,
  }
}
