export type ExportFormat = 'svg' | 'png' | 'pdf' | 'json' | 'html' | 'markdown' | 'gedcom'

export interface ExportOptions {
  format: ExportFormat
  outputPath: string
  width?: number
  height?: number
}
