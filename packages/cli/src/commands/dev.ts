import { readFileSync } from 'fs'
import chokidar from 'chokidar'
import { compile } from '@famscript/core'
import { pass, fail, formatValidationErrors, info } from '../utils/output.js'

export function devCommand(filePath: string): void {
  console.log(info(`Watching ${filePath} — press Ctrl+C to stop\n`))

  function recompile(): void {
    let source: string
    try {
      source = readFileSync(filePath, 'utf-8')
    } catch {
      console.error(fail(`Cannot read file: ${filePath}`))
      return
    }

    const result = compile(source, { strict: false })
    const time   = new Date().toLocaleTimeString()

    process.stdout.write('\x1Bc') // clear terminal
    if (result.success) {
      console.log(pass(`Compiled at ${time}\n`))
      console.log(result.mermaid)
    } else {
      console.log(fail(`Errors at ${time}\n`))
      console.log(formatValidationErrors(result.validation.errors))
    }
  }

  chokidar
    .watch(filePath, { ignoreInitial: false })
    .on('add', recompile)
    .on('change', recompile)
    .on('error', (err) => console.error(fail(`Watcher error: ${String(err)}`)))
}
