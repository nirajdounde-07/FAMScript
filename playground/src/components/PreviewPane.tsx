'use client'
import { usePlayground } from '../store/usePlayground'

export default function PreviewPane() {
  const renderedSvg = usePlayground((s) => s.renderedSvg)
  const mermaidSrc  = usePlayground((s) => s.mermaidSrc)
  const isValid     = usePlayground((s) => s.isValid)
  const isEmpty     = !mermaidSrc || mermaidSrc === 'graph TD\n'

  return (
    <div
      className="w-full h-full flex items-center justify-center overflow-auto p-6"
      style={{ background: 'var(--bg)' }}
    >
      {isEmpty ? (
        <p style={{ color: 'var(--muted)' }} className="text-sm text-center">
          Start typing in the editor to see your diagram here.
        </p>
      ) : !isValid && !renderedSvg ? (
        <p style={{ color: 'var(--error)' }} className="text-sm text-center">
          Fix validation errors to render the diagram.
        </p>
      ) : renderedSvg ? (
        <div
          id="mermaid-preview"
          dangerouslySetInnerHTML={{ __html: renderedSvg }}
          className="max-w-full"
        />
      ) : (
        <p style={{ color: 'var(--muted)' }} className="text-sm animate-pulse">
          Rendering...
        </p>
      )}
    </div>
  )
}
