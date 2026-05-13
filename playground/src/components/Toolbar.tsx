'use client'
import { useState } from 'react'
import { usePlayground } from '../store/usePlayground'
import { SAMPLE_SOURCE } from '../lib/sample'

export default function Toolbar() {
  const mermaidSrc = usePlayground((s) => s.mermaidSrc)
  const nodeCount  = usePlayground((s) => s.nodeCount)
  const edgeCount  = usePlayground((s) => s.edgeCount)
  const isValid    = usePlayground((s) => s.isValid)
  const setSource  = usePlayground((s) => s.setSource)
  const [copied, setCopied] = useState(false)

  function copyMermaid() {
    if (!mermaidSrc) return
    navigator.clipboard.writeText(mermaidSrc).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    })
  }

  function exportJson() {
    import('@famscript/core').then(({ compile }) => {
      const source = usePlayground.getState().source
      const result = compile(source, { strict: false })
      if (!result.ast) return
      const blob = new Blob(
        [JSON.stringify({ nodes: result.ast.nodes, edges: result.ast.edges }, null, 2)],
        { type: 'application/json' },
      )
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'famscript-ast.json'
      a.click()
      URL.revokeObjectURL(url)
    })
  }

  return (
    <header
      className="flex items-center justify-between px-4 h-12 shrink-0"
      style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)' }}
    >
      <div className="flex items-center gap-3">
        <span className="font-bold text-sm tracking-wide" style={{ color: 'var(--accent)' }}>
          FamScript
        </span>
        <span className="text-xs hidden sm:block" style={{ color: 'var(--muted)' }}>
          Playground
        </span>
      </div>

      <div className="flex items-center gap-4 text-xs" style={{ color: 'var(--muted)' }}>
        {nodeCount > 0 && (
          <span>{nodeCount} node{nodeCount !== 1 ? 's' : ''} / {edgeCount} edge{edgeCount !== 1 ? 's' : ''}</span>
        )}
        <span
          className="rounded-full px-2 py-0.5 font-semibold"
          style={{
            background: isValid ? '#052e16' : '#3f1c1c',
            color: isValid ? 'var(--success)' : 'var(--error)',
          }}
        >
          {isValid ? 'valid' : 'errors'}
        </span>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={() => setSource(SAMPLE_SOURCE)}
          className="text-xs px-3 py-1 rounded cursor-pointer"
          style={{ background: 'var(--border)', color: 'var(--text)' }}
        >
          Reset
        </button>
        <button
          onClick={copyMermaid}
          disabled={!mermaidSrc}
          className="text-xs px-3 py-1 rounded cursor-pointer disabled:opacity-40"
          style={{ background: 'var(--border)', color: 'var(--text)' }}
        >
          {copied ? 'Copied!' : 'Copy Mermaid'}
        </button>
        <button
          onClick={exportJson}
          className="text-xs px-3 py-1 rounded cursor-pointer"
          style={{ background: 'var(--accent)', color: '#fff' }}
        >
          Export JSON
        </button>
      </div>
    </header>
  )
}
