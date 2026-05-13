export async function exportSvg(_mermaid: string, _outputPath: string): Promise<void> {
  // TODO: use Mermaid native SVG export
}

export async function exportPng(_mermaid: string, _outputPath: string): Promise<void> {
  // TODO: use sharp
}

export async function exportPdf(_mermaid: string, _outputPath: string): Promise<void> {
  // TODO: use Puppeteer
}

export async function exportJson(_source: string, _outputPath: string): Promise<void> {
  // TODO: serialize AST as JSON
}
