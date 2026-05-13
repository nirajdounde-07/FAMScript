#!/usr/bin/env node
import { readFileSync, writeFileSync, existsSync } from 'fs'
import { resolve } from 'path'
import { Command } from 'commander'
import chalk from 'chalk'
import { renderCommand } from './commands/render.js'
import { validateCommand } from './commands/validate.js'
import { lintCommand } from './commands/lint.js'
import { exportCommand } from './commands/export.js'
import type { ExportFormat } from './commands/export.js'
import { devCommand } from './commands/dev.js'

// ─── helpers ─────────────────────────────────────────────────────────────────

function readFamFile(filePath: string): string {
  const resolved = resolve(filePath)
  if (!existsSync(resolved)) {
    process.stderr.write(chalk.red(`Error: file not found: ${filePath}\n`))
    process.exit(2)
  }
  try {
    return readFileSync(resolved, 'utf-8')
  } catch (err) {
    process.stderr.write(chalk.red(`Error reading file: ${String(err)}\n`))
    process.exit(2)
  }
}

function applyResult(result: { exitCode: number; stdout: string; stderr: string }): never {
  if (result.stdout) process.stdout.write(result.stdout)
  if (result.stderr) process.stderr.write(result.stderr)
  process.exit(result.exitCode)
}

// ─── program ─────────────────────────────────────────────────────────────────

const program = new Command()

program
  .name('famscript')
  .description('FamScript CLI – declarative relationship diagram framework')
  .version('0.0.1')

// ── render ───────────────────────────────────────────────────────────────────

program
  .command('render <file>')
  .description('Compile a .fam file and print Mermaid syntax')
  .option('-o, --output <path>', 'Write output to file instead of stdout')
  .option('-d, --direction <dir>', 'Graph direction: TD | LR | BT | RL', 'TD')
  .option('--no-subgraphs', 'Flat node list without generation subgraphs')
  .option('--no-strict', 'Render even when validation errors exist')
  .action((file: string, opts: { output?: string; direction: string; subgraphs: boolean; strict: boolean }) => {
    const source = readFamFile(file)
    const result = renderCommand(source, {
      direction: opts.direction as 'TD' | 'LR' | 'BT' | 'RL',
      showGenerationSubgraphs: opts.subgraphs,
      strict: opts.strict,
    })

    if (result.exitCode === 0 && opts.output) {
      writeFileSync(resolve(opts.output), result.stdout, 'utf-8')
      process.stdout.write(chalk.green(`✓ Mermaid written to ${opts.output}\n`))
      process.exit(0)
    }

    applyResult(result)
  })

// ── validate ─────────────────────────────────────────────────────────────────

program
  .command('validate <file>')
  .description('Validate a .fam file without rendering')
  .action((file: string) => {
    const source = readFamFile(file)
    applyResult(validateCommand(source, file))
  })

// ── lint ─────────────────────────────────────────────────────────────────────

program
  .command('lint <file>')
  .description('Lint a .fam file (ESLint-style output)')
  .action((file: string) => {
    const source = readFamFile(file)
    applyResult(lintCommand(source, file))
  })

// ── export ───────────────────────────────────────────────────────────────────

program
  .command('export <file>')
  .description('Export a .fam file to SVG, PNG, PDF, or JSON AST')
  .option('--svg',  'Export as SVG')
  .option('--png',  'Export as PNG')
  .option('--pdf',  'Export as PDF')
  .option('--json', 'Export as JSON AST')
  .option('-o, --output <path>', 'Output file path (required for svg/png/pdf; optional for json)')
  .action((file: string, opts: { svg?: boolean; png?: boolean; pdf?: boolean; json?: boolean; output?: string }) => {
    const format: ExportFormat | undefined =
      opts.svg  ? 'svg'  :
      opts.png  ? 'png'  :
      opts.pdf  ? 'pdf'  :
      opts.json ? 'json' : undefined

    if (!format) {
      process.stderr.write('Error: specify an export format: --svg | --png | --pdf | --json\n')
      process.exit(1)
    }

    const source = readFamFile(file)
    const result = exportCommand(source, format)

    if (result.exitCode === 0 && opts.output && result.stdout) {
      writeFileSync(resolve(opts.output), result.stdout, 'utf-8')
      process.stdout.write(chalk.green(`✓ ${format.toUpperCase()} written to ${opts.output}\n`))
      process.exit(0)
    }

    applyResult(result)
  })

// ── dev ──────────────────────────────────────────────────────────────────────

program
  .command('dev <file>')
  .description('Watch a .fam file and recompile on every save')
  .action((file: string) => {
    const resolved = resolve(file)
    if (!existsSync(resolved)) {
      process.stderr.write(chalk.red(`Error: file not found: ${file}\n`))
      process.exit(2)
    }
    devCommand(resolved)
  })

program.parse()
