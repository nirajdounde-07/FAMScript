'use client'
import { useRef, useEffect } from 'react'
import type { editor } from 'monaco-editor'
import { usePlayground } from '../store/usePlayground'

const LANG_ID = 'famscript'

function registerLanguage(monaco: typeof import('monaco-editor')) {
  if (monaco.languages.getLanguages().some((l) => l.id === LANG_ID)) return

  monaco.languages.register({ id: LANG_ID, extensions: ['.fam'] })

  monaco.languages.setMonarchTokensProvider(LANG_ID, {
    tokenizer: {
      root: [
        [/%%.*$/, 'comment'],
        [/"[^"]*"/, 'string'],
        [/==>|-->|-\.->|---/, 'keyword.operator'],
        [/\|/, 'delimiter'],
        [/G[+-]?\d+/, 'type'],
        [/\b(deceased|missing|living|unknown)\b/, 'keyword'],
        [/[A-Za-z_][A-Za-z0-9_]*/, 'identifier'],
        [/[\[\]]/, 'bracket'],
      ],
    },
  })

  monaco.editor.defineTheme('fam-dark', {
    base: 'vs-dark',
    inherit: true,
    rules: [
      { token: 'comment',          foreground: '64748b', fontStyle: 'italic' },
      { token: 'string',           foreground: 'a3e635' },
      { token: 'keyword.operator', foreground: '818cf8', fontStyle: 'bold' },
      { token: 'type',             foreground: 'f59e0b' },
      { token: 'keyword',          foreground: 'fb923c' },
      { token: 'identifier',       foreground: '93c5fd' },
      { token: 'bracket',          foreground: '94a3b8' },
      { token: 'delimiter',        foreground: '94a3b8' },
    ],
    colors: {
      'editor.background': '#1a1d27',
      'editor.lineHighlightBackground': '#2a2d3a',
      'editorLineNumber.foreground': '#3f4558',
    },
  })
}

export default function EditorPane() {
  const containerRef = useRef<HTMLDivElement>(null)
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null)
  const source = usePlayground((s) => s.source)
  const setSource = usePlayground((s) => s.setSource)

  useEffect(() => {
    if (!containerRef.current) return
    let ed: editor.IStandaloneCodeEditor

    import('monaco-editor').then((monaco) => {
      registerLanguage(monaco)
      ed = monaco.editor.create(containerRef.current!, {
        value: source,
        language: LANG_ID,
        theme: 'fam-dark',
        fontSize: 13,
        fontFamily: '"Fira Code", "Cascadia Code", monospace',
        fontLigatures: true,
        lineNumbers: 'on',
        minimap: { enabled: false },
        scrollBeyondLastLine: false,
        wordWrap: 'on',
        padding: { top: 12, bottom: 12 },
        automaticLayout: true,
      })

      ed.onDidChangeModelContent(() => {
        setSource(ed.getValue())
      })

      editorRef.current = ed
    })

    return () => { ed?.dispose() }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Sync external source changes (e.g. "Load sample") without cursor jump
  useEffect(() => {
    const ed = editorRef.current
    if (!ed) return
    if (ed.getValue() !== source) {
      ed.setValue(source)
    }
  }, [source])

  return (
    <div
      ref={containerRef}
      className="w-full h-full"
      style={{ background: 'var(--surface)' }}
    />
  )
}
