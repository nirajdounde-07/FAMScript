'use client'
import { create } from 'zustand'
import type { ValidationError } from '@famscript/core'
import { SAMPLE_SOURCE } from '../lib/sample'

interface PlaygroundStore {
  source: string
  mermaidSrc: string
  renderedSvg: string
  validationErrors: ValidationError[]
  isValid: boolean
  nodeCount: number
  edgeCount: number

  setSource: (s: string) => void
  setCompiled: (mermaid: string, errors: ValidationError[], nodes: number, edges: number) => void
  setRenderedSvg: (svg: string) => void
}

export const usePlayground = create<PlaygroundStore>((set) => ({
  source: SAMPLE_SOURCE,
  mermaidSrc: '',
  renderedSvg: '',
  validationErrors: [],
  isValid: true,
  nodeCount: 0,
  edgeCount: 0,

  setSource: (source) => set({ source }),

  setCompiled: (mermaidSrc, validationErrors, nodeCount, edgeCount) =>
    set({ mermaidSrc, validationErrors, isValid: validationErrors.length === 0, nodeCount, edgeCount }),

  setRenderedSvg: (renderedSvg) => set({ renderedSvg }),
}))
