'use client'
import { useEffect } from 'react'
import { compile } from '@famscript/core'
import { usePlayground } from '../store/usePlayground'

export function useCompile() {
  const source = usePlayground((s) => s.source)
  const setCompiled = usePlayground((s) => s.setCompiled)
  const mermaidSrc = usePlayground((s) => s.mermaidSrc)
  const setRenderedSvg = usePlayground((s) => s.setRenderedSvg)

  // Debounced compile on source change
  useEffect(() => {
    const id = setTimeout(() => {
      const result = compile(source, { strict: false })
      setCompiled(
        result.mermaid,
        result.validation.errors,
        result.ast?.nodes.length ?? 0,
        result.ast?.edges.length ?? 0,
      )
    }, 300)
    return () => clearTimeout(id)
  }, [source, setCompiled])

  // Mermaid render on compiled string change
  useEffect(() => {
    if (!mermaidSrc) { setRenderedSvg(''); return }
    let cancelled = false
    import('mermaid').then(({ default: mermaid }) => {
      mermaid.initialize({ startOnLoad: false, securityLevel: 'loose', theme: 'dark' })
      return mermaid.render('fam-preview-' + Date.now(), mermaidSrc)
    }).then(({ svg }) => {
      if (!cancelled) setRenderedSvg(svg)
    }).catch(() => {
      if (!cancelled) setRenderedSvg('')
    })
    return () => { cancelled = true }
  }, [mermaidSrc, setRenderedSvg])
}
