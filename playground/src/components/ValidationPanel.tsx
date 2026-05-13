'use client'
import { usePlayground } from '../store/usePlayground'

export default function ValidationPanel() {
  const errors  = usePlayground((s) => s.validationErrors)
  const isValid = usePlayground((s) => s.isValid)

  if (isValid) {
    return (
      <div
        className="flex items-center gap-2 px-4 py-2 text-xs"
        style={{ background: 'var(--surface)', borderTop: '1px solid var(--border)', color: 'var(--success)' }}
      >
        <span>No validation errors</span>
      </div>
    )
  }

  return (
    <div
      className="overflow-y-auto"
      style={{ background: 'var(--surface)', borderTop: '1px solid var(--border)', maxHeight: '160px' }}
    >
      <div
        className="px-4 py-1 text-xs font-semibold sticky top-0"
        style={{ background: 'var(--surface)', color: 'var(--error)', borderBottom: '1px solid var(--border)' }}
      >
        {errors.length} error{errors.length !== 1 ? 's' : ''}
      </div>
      {errors.map((e, i) => (
        <div
          key={i}
          className="flex items-start gap-3 px-4 py-2 text-xs"
          style={{ borderBottom: '1px solid var(--border)' }}
        >
          <span
            className="shrink-0 rounded px-1 py-0.5 font-mono font-bold text-xs"
            style={{ background: '#3f1c1c', color: 'var(--error)' }}
          >
            {e.rule}
          </span>
          <span style={{ color: 'var(--text)' }}>{e.message}</span>
          {e.nodeId && (
            <span className="ml-auto shrink-0 font-mono" style={{ color: 'var(--muted)' }}>
              {e.nodeId}
            </span>
          )}
        </div>
      ))}
    </div>
  )
}
