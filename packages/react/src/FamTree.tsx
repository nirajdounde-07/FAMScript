import React from 'react'
import { compile } from '@famscript/core'

export interface FamTreeProps {
  src?: string
  source?: string
  className?: string
}

export function FamTree({ src: _src, source, className }: FamTreeProps) {
  const result = source ? compile(source) : null

  if (!result?.success) {
    return <div className={className} data-famscript-error />
  }

  return (
    <div
      className={className}
      data-famscript
      dangerouslySetInnerHTML={{ __html: result.mermaid }}
    />
  )
}
