import chalk from 'chalk'
import type { ValidationError } from '@famscript/validator'

export const sym = {
  pass: chalk.green('✓'),
  fail: chalk.red('✗'),
  warn: chalk.yellow('⚠'),
  info: chalk.cyan('ℹ'),
}

export function pass(msg: string): string  { return `${sym.pass} ${msg}` }
export function fail(msg: string): string  { return `${sym.fail} ${msg}` }
export function warn(msg: string): string  { return `${sym.warn} ${msg}` }
export function info(msg: string): string  { return `${sym.info} ${msg}` }

export function formatValidationErrors(errors: ValidationError[]): string {
  return errors
    .map((e) => {
      const rule = chalk.bold.red(`[${e.rule}]`)
      const node = e.nodeId ? chalk.dim(`  → ${e.nodeId}`) : ''
      return `  ${rule} ${e.message}${node}`
    })
    .join('\n')
}

/** ESLint-style single-line format for the lint command. */
export function formatLintLine(filePath: string, e: ValidationError): string {
  const loc  = chalk.cyan(`${filePath}:0:0`)
  const rule = chalk.dim(`[${e.rule}]`)
  const node = e.nodeId ? chalk.dim(` (${e.nodeId})`) : ''
  return `${loc}: ${chalk.red('error')} ${e.message}${node} ${rule}`
}

export function summary(errorCount: number): string {
  if (errorCount === 0) return chalk.green('No issues found')
  return chalk.red(`${errorCount} error${errorCount !== 1 ? 's' : ''} found`)
}
