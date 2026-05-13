'use client'
import dynamic from 'next/dynamic'
import { useCompile } from '../hooks/useCompile'
import PreviewPane from './PreviewPane'
import ValidationPanel from './ValidationPanel'
import Toolbar from './Toolbar'

const EditorPane = dynamic(() => import('./EditorPane'), {
  ssr: false,
  loading: () => (
    <div
      className="w-full h-full flex items-center justify-center text-sm"
      style={{ background: '#1a1d27', color: '#64748b' }}
    >
      Loading editor...
    </div>
  ),
})

export default function Playground() {
  useCompile()

  return (
    <div className="flex flex-col" style={{ height: '100dvh' }}>
      <Toolbar />

      <div className="flex flex-1 min-h-0">
        {/* Editor pane */}
        <div className="flex flex-col" style={{ width: '50%', borderRight: '1px solid var(--border)' }}>
          <div
            className="px-3 py-1 text-xs font-medium shrink-0"
            style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)', color: 'var(--muted)' }}
          >
            family.fam
          </div>
          <div className="flex-1 min-h-0">
            <EditorPane />
          </div>
        </div>

        {/* Preview pane */}
        <div className="flex flex-col" style={{ width: '50%' }}>
          <div
            className="px-3 py-1 text-xs font-medium shrink-0"
            style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)', color: 'var(--muted)' }}
          >
            Preview
          </div>
          <div className="flex-1 min-h-0 overflow-auto">
            <PreviewPane />
          </div>
        </div>
      </div>

      <ValidationPanel />
    </div>
  )
}
