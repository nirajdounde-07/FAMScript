import { compile } from '@famscript/core'
import { pass, fail } from '../utils/output.js'

export type ExportFormat = 'svg' | 'png' | 'pdf' | 'json'

export interface CommandResult {
  exitCode: number
  /** JSON content (json format) or Mermaid string (svg placeholder). Written to file by cli.ts. */
  stdout: string
  stderr: string
}

const NOT_IMPLEMENTED_FORMATS: ExportFormat[] = ['svg', 'png', 'pdf']

export function exportCommand(source: string, format: ExportFormat): CommandResult {
  if ((NOT_IMPLEMENTED_FORMATS as string[]).includes(format)) {
    return {
      exitCode: 1,
      stdout: '',
      stderr: `${fail(`${format.toUpperCase()} export requires Puppeteer/sharp — not available in this version`)}\n`,
    }
  }

  const result = compile(source, { strict: true })

  if (!result.success) {
    const errorCount = result.validation.errors.length
    return {
      exitCode: 1,
      stdout: '',
      stderr: `${fail(`Compilation failed with ${errorCount} error${errorCount !== 1 ? 's' : ''}`)}\n`,
    }
  }

  if (format === 'json') {
    const ast = result.ast!
    return {
      exitCode: 0,
      stdout: JSON.stringify({ nodes: ast.nodes, edges: ast.edges }, null, 2) + '\n',
      stderr: '',
    }
  }

  return {
    exitCode: 1,
    stdout: '',
    stderr: `${fail(`Unknown export format: ${format}`)}\n`,
  }
}
